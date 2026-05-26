const User = require('../models/User');
const Order = require('../models/Order');
const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const TIME_ZONE = process.env.TIME_ZONE || 'Asia/Phnom_Penh';

const toLocalIsoDate = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: TIME_ZONE
    }).format(date);
};

const toIsoDate = (date) => date.toISOString().split('T')[0];

const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

const getMonthDate = (month) => {
    const monthValue = typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)
        ? month
        : toLocalIsoDate().slice(0, 7);
    return new Date(`${monthValue}-01T00:00:00`);
};

const getMonthlyReportMeta = (month, branch) => {
    const targetDate = getMonthDate(month);
    const monthLabel = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '-');
    const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const todayParts = toLocalIsoDate().split('-').map(Number);
    const currentYear = todayParts[0];
    const currentMonth = todayParts[1] - 1;
    const currentDay = todayParts[2];
    let cutoffDay = daysInMonth;

    if (targetDate.getFullYear() === currentYear && targetDate.getMonth() === currentMonth) {
        cutoffDay = currentDay;
    } else if (
        targetDate.getFullYear() > currentYear ||
        (targetDate.getFullYear() === currentYear && targetDate.getMonth() > currentMonth)
    ) {
        cutoffDay = 0;
    }

    return {
        monthLabel,
        daysInMonth,
        cutoffDay,
        branchLabel: branch || 'All Branches',
        titleBranchLabel: branch ? `${branch} Brand` : 'All Branches'
    };
};

const getMonthlyExportRows = (reportData, minRows = 12) => {
    const rowCount = Math.max(reportData.length, minRows);

    return Array.from({ length: rowCount }, (_, index) => ({
        no: index + 1,
        source: reportData[index] || null
    }));
};

const getMonthlyDayStatus = (row, day, cutoffDay) => {
    if (!row || day > cutoffDay) return null;
    return row.days?.[day] === 'ordered' ? 'ordered' : 'not_ordered';
};

const getDateRange = ({ date, startDate, endDate, period, month }) => {
    const today = new Date();
    const tomorrowIsoDate = toLocalIsoDate(addDays(today, 1));
    let start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    let end = endDate ? new Date(`${endDate}T00:00:00`) : null;

    if (period === 'monthly') {
        const monthDate = getMonthDate(month);
        start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    } else if (!start || !end) {
        if (period === 'weekly') {
            const day = (today.getDay() + 6) % 7;
            start = addDays(today, -day);
            end = addDays(start, 6);
        } else {
            const targetDate = date ? new Date(`${date}T00:00:00`) : new Date(`${tomorrowIsoDate}T00:00:00`);
            start = targetDate;
            end = targetDate;
        }
    }

    const dates = [];
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
        dates.push(toIsoDate(cursor));
    }

    return {
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
        dates
    };
};

const getReportData = async ({ date, startDate, endDate, period, branch, month }) => {
    const range = getDateRange({ date, startDate, endDate, period, month });
    const usersQuery = branch ? { branch } : {};
    const users = await User.find(usersQuery).sort({ branch: 1, full_name: 1 });
    const orders = await Order.find({
        order_date: { $gte: range.startDate, $lte: range.endDate }
    }).populate('user');
    const isMonthlyReport = period === 'monthly';
    const isSummaryReport = period === 'weekly';

    if (isMonthlyReport) {
        return users.map(user => {
            const days = {};
            let total = 0;

            range.dates.forEach(orderDate => {
                const day = Number(orderDate.split('-')[2]);
                const order = orders.find(o => (
                    o.user &&
                    o.user._id.toString() === user._id.toString() &&
                    o.order_date === orderDate
                ));
                const status = order?.status === 'ordered' ? 'ordered' : 'not_ordered';
                days[day] = status;
                if (status === 'ordered') total += 1;
            });

            return {
                report_type: 'monthly_matrix',
                full_name: user.full_name,
                branch: user.branch,
                days,
                total
            };
        });
    }

    if (isSummaryReport) {
        const branches = [...new Set(users.map(user => user.branch))];

        return range.dates.flatMap(orderDate => branches.map(branchName => {
            const branchUsers = users.filter(user => user.branch === branchName);
            const branchOrders = orders.filter(order => (
                order.user &&
                order.user.branch === branchName &&
                order.order_date === orderDate
            ));
            const ordered = branchOrders.filter(order => order.status === 'ordered').length;
            const cancelled = branchOrders.filter(order => order.status === 'cancelled').length;

            return {
                report_type: 'summary',
                order_date: orderDate,
                branch: branchName,
                total_staff: branchUsers.length,
                ordered,
                cancelled,
                not_ordered: branchUsers.length - ordered - cancelled
            };
        }));
    }

    return range.dates.flatMap(orderDate => users.map(user => {
        const order = orders.find(o => (
            o.user &&
            o.user._id.toString() === user._id.toString() &&
            o.order_date === orderDate
        ));

        return {
            report_type: 'detail',
            user_id: user._id,
            full_name: user.full_name,
            branch: user.branch,
            order_date: orderDate,
            status: order ? order.status : 'not_ordered'
        };
    }));
};

exports.getLunchReports = async (req, res) => {
    const { date, startDate, endDate, period, branch, month } = req.query;

    try {
        const reportData = await getReportData({ date, startDate, endDate, period, branch, month });
        res.json(reportData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.upsertManualOrder = async (req, res) => {
    const { userId, orderDate, status = 'ordered', branch } = req.body;

    if (!userId || !orderDate || !/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
        return res.status(400).json({ message: 'Staff and order date are required' });
    }

    if (!['ordered', 'cancelled', 'not_ordered'].includes(status)) {
        return res.status(400).json({ message: 'Invalid order status' });
    }

    if (branch && !['City Mall', 'BYD 6A', 'BYD 60M'].includes(branch)) {
        return res.status(400).json({ message: 'Invalid branch' });
    }

    if (status === 'cancelled' && orderDate !== toLocalIsoDate()) {
        return res.status(400).json({ message: 'Cancel order is allowed only for today.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        if (branch && user.branch !== branch) {
            user.branch = branch;
            await user.save();
        }

        if (status === 'not_ordered') {
            await Order.findOneAndDelete({ user: userId, order_date: orderDate });
            return res.json({ message: 'Manual order cleared', user });
        }

        const order = await Order.findOneAndUpdate(
            { user: userId, order_date: orderDate },
            { status },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        res.json({ message: 'Manual order saved', order, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.exportExcel = async (req, res) => {
    const { date, startDate, endDate, period, branch, month, template } = req.query;
    const exportPeriod = template === 'monthly' ? 'monthly' : period;

    try {
        const reportData = await getReportData({ date, startDate, endDate, period: exportPeriod, branch, month });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Lunch Report');
        const isMonthlyReport = exportPeriod === 'monthly';
        const isSummaryReport = exportPeriod === 'weekly';

        if (isMonthlyReport) {
            const { monthLabel, daysInMonth, cutoffDay, titleBranchLabel } = getMonthlyReportMeta(month, branch);
            const monthlyRows = getMonthlyExportRows(reportData);
            const columns = [
                { header: 'No', key: 'no', width: 5 },
                { header: 'Staff Name', key: 'full_name', width: 20 },
                { header: 'Brand', key: 'branch', width: 13 },
                ...Array.from({ length: daysInMonth }, (_, index) => ({
                    header: String(index + 1),
                    key: `day_${index + 1}`,
                    width: 5
                })),
                { header: 'Total', key: 'total', width: 10 }
            ];

            worksheet.columns = columns.map(({ header, ...column }) => column);
            worksheet.mergeCells(1, 1, 1, columns.length);
            worksheet.getCell(1, 1).value = `Report For ${monthLabel} (${titleBranchLabel})`;
            worksheet.getCell(1, 1).font = { bold: true, size: 16, name: 'Times New Roman' };
            worksheet.getCell(1, 1).alignment = { horizontal: 'center' };
            worksheet.getRow(2).values = columns.map(column => column.header);
            worksheet.getRow(2).font = { bold: true, size: 12, name: 'Times New Roman' };
            worksheet.getRow(1).height = 28;
            worksheet.getRow(2).height = 26;

            monthlyRows.forEach(({ no, source }) => {
                const values = {
                    no,
                    full_name: source?.full_name || '',
                    branch: source?.branch || '',
                    total: source ? source.total : ''
                };

                for (let day = 1; day <= daysInMonth; day += 1) {
                    values[`day_${day}`] = '';
                }

                const excelRow = worksheet.addRow(values);

                for (let day = 1; day <= daysInMonth; day += 1) {
                    const status = getMonthlyDayStatus(source, day, cutoffDay);
                    const cell = excelRow.getCell(3 + day);
                    if (status === 'ordered') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
                    } else if (status === 'not_ordered') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
                    }
                }
            });

            worksheet.views = [{ state: 'frozen', ySplit: 2, xSplit: 3 }];

            worksheet.eachRow(row => {
                row.height = row.number > 2 ? 28 : row.height;
                row.eachCell({ includeEmpty: true }, cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.font = cell.font || { name: 'Times New Roman', size: 12 };
                    cell.alignment = {
                        horizontal: row.number > 2 && (cell.col === 2 || cell.col === 3) ? 'left' : 'center',
                        vertical: 'middle'
                    };
                });
            });
        } else {

            worksheet.columns = isSummaryReport
                ? [
                    { header: 'Order Date', key: 'order_date', width: 16 },
                    { header: 'Branch', key: 'branch', width: 18 },
                    { header: 'Total Staff', key: 'total_staff', width: 14 },
                    { header: 'Ordered', key: 'ordered', width: 14 },
                    { header: 'Cancelled', key: 'cancelled', width: 14 },
                    { header: 'Not Ordered', key: 'not_ordered', width: 14 }
                ]
                : [
                    { header: 'Staff Name', key: 'full_name', width: 28 },
                    { header: 'Branch', key: 'branch', width: 18 },
                    { header: 'Order Date', key: 'order_date', width: 16 },
                    { header: 'Status', key: 'status', width: 16 }
                ];

            worksheet.getRow(1).font = { bold: true };
            reportData.forEach(row => worksheet.addRow(row));
        }

        const filenameDate = exportPeriod === 'monthly' && month
            ? month
            : startDate && endDate ? `${startDate}-to-${endDate}` : (date || exportPeriod || 'today');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=lunch-report-${filenameDate}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.exportPDF = async (req, res) => {
    const { date, startDate, endDate, period, branch, month, template } = req.query;
    const exportPeriod = template === 'monthly' ? 'monthly' : period;

    try {
        const reportData = await getReportData({ date, startDate, endDate, period: exportPeriod, branch, month });
        const filenameDate = exportPeriod === 'monthly' && month
            ? month
            : startDate && endDate ? `${startDate}-to-${endDate}` : (date || exportPeriod || 'today');
        const isMonthlyReport = exportPeriod === 'monthly';
        const isSummaryReport = exportPeriod === 'weekly';
        const doc = isMonthlyReport
            ? new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
            : new jsPDF();

        if (isMonthlyReport) {
            const { monthLabel, daysInMonth, cutoffDay, titleBranchLabel } = getMonthlyReportMeta(month, branch);
            const monthlyRows = getMonthlyExportRows(reportData);
            const head = [[
                'No',
                'Staff Name',
                'Brand',
                ...Array.from({ length: daysInMonth }, (_, index) => String(index + 1)),
                'Total'
            ]];
            const body = monthlyRows.map(({ no, source }) => [
                no,
                source?.full_name || '',
                source?.branch || '',
                ...Array.from({ length: daysInMonth }, () => ''),
                source ? source.total : ''
            ]);
            const dayColumnStart = 3;
            const dayColumnEnd = dayColumnStart + daysInMonth - 1;
            const totalColumnIndex = daysInMonth + 3;

            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.text(
                `Report For ${monthLabel} (${titleBranchLabel})`,
                doc.internal.pageSize.getWidth() / 2,
                12,
                { align: 'center' }
            );

            doc.autoTable({
                startY: 20,
                head,
                body,
                theme: 'grid',
                tableWidth: 'auto',
                margin: { left: 3, right: 3 },
                styles: {
                    font: 'times',
                    fontSize: 7.5,
                    cellPadding: 1,
                    halign: 'center',
                    valign: 'middle',
                    lineColor: [0, 0, 0],
                    lineWidth: 0.15,
                    textColor: [0, 0, 0],
                    minCellHeight: 7
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fillColor: [255, 255, 255]
                },
                columnStyles: {
                    0: { cellWidth: 7 },
                    1: { cellWidth: 24, halign: 'left' },
                    2: { cellWidth: 18, halign: 'left' },
                    [totalColumnIndex]: { cellWidth: 9 }
                },
                didParseCell: (data) => {
                    if (
                        data.section === 'body' &&
                        (data.column.index === 1 || data.column.index === 2)
                    ) {
                        data.cell.styles.halign = 'left';
                    }

                    if (
                        data.section === 'body' &&
                        data.column.index >= dayColumnStart &&
                        data.column.index <= dayColumnEnd
                    ) {
                        const sourceRow = monthlyRows[data.row.index]?.source;
                        const day = data.column.index - dayColumnStart + 1;
                        const status = getMonthlyDayStatus(sourceRow, day, cutoffDay);

                        if (status === 'ordered') {
                            data.cell.styles.fillColor = [0, 176, 80];
                        } else if (status === 'not_ordered') {
                            data.cell.styles.fillColor = [255, 0, 0];
                        }
                    }
                }
            });
        } else {
            doc.setFontSize(16);
            doc.text('Lunch Report', 14, 16);
            doc.setFontSize(10);
            doc.text(`Range: ${filenameDate}`, 14, 24);
            doc.text(`Branch: ${branch || 'All Branches'}`, 14, 30);

            doc.autoTable({
                startY: 38,
                head: [isSummaryReport
                    ? ['Order Date', 'Branch', 'Total Staff', 'Ordered', 'Cancelled', 'Not Ordered']
                    : ['Staff Name', 'Branch', 'Order Date', 'Status']
                ],
                body: isSummaryReport
                ? reportData.map(row => [
                    row.order_date || '',
                    row.branch || '',
                    row.total_staff ?? 0,
                    row.ordered ?? 0,
                    row.cancelled ?? 0,
                    row.not_ordered ?? 0
                ])
                : reportData.map(row => [
                    row.full_name || '',
                    row.branch || '',
                    row.order_date || '',
                    row.status || 'not_ordered'
                ])
            });
        }

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=lunch-report-${filenameDate}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
