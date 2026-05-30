const User = require("../models/User");
const Order = require("../models/Order");
const ExcelJS = require("exceljs");
const { jsPDF } = require("jspdf");
require("jspdf-autotable");
const asyncHandler = require("../utils/asyncHandler");
const {
  toLocalIsoDate,
  getDateRange,
  getMonthDate,
  getMonthlyReportMeta,
  getMonthlyExportRows,
  getMonthlyDayStatus,
  toDisplayDate,
  parseOrderDate,
} = require("../utils/dateUtils");
const { STATUSES, SYMBOLS } = require("../utils/constants");
const botService = require("../services/botService");

const getUserPrice = (user) => {
  // Flat price of $1 per order for all users
  return 1;
};

const sortSummaryUsers = (users) => {
  return users.slice().sort((a, b) => {
    const departmentCompare = (a.department || "").localeCompare(
      b.department || "",
      undefined,
      { sensitivity: "base" },
    );
    if (departmentCompare !== 0) return departmentCompare;
    const positionCompare = (a.position || "").localeCompare(
      b.position || "",
      undefined,
      { sensitivity: "base" },
    );
    if (positionCompare !== 0) return positionCompare;
    return (a.full_name || "").localeCompare(b.full_name || "", undefined, {
      sensitivity: "base",
    });
  });
};

const getReportData = async ({
  date,
  startDate,
  endDate,
  period,
  branch,
  month,
  status,
}) => {
  const range = getDateRange({ date, startDate, endDate, period, month });
  const usersQuery = branch ? { branch } : {};
  const users = await User.find(usersQuery).sort({ branch: 1, full_name: 1 });
  const orders = await Order.find({
    order_date: { $gte: range.startDate, $lte: range.endDate },
  }).populate("user");
  const isMonthlyReport = period === "monthly";
  const isSummaryReport = period === "weekly";

  if (period === "summary") {
    const sortedUsers = sortSummaryUsers(users);
    return sortedUsers.map((user) => {
      const userOrders = orders.filter(
        (order) =>
          order.user &&
          order.user._id.toString() === user._id.toString() &&
          order.status === "ordered",
      );
      const totalMeal = userOrders.length;
      const price = getUserPrice(user);
      const totalAmount = totalMeal * price;

      return {
        report_type: "summary_report",
        user_id: user._id,
        byd_id: user.byd_id,
        hx_id: user.hx_id,
        full_name: user.full_name,
        position: user.position,
        department: user.department,
        branch: user.branch,
        price,
        total_meal: totalMeal,
        free_amount: 0,
        total_amount: totalAmount,
      };
    });
  }

  if (isMonthlyReport) {
    return users.map((user) => {
      const days = {};
      let total = 0;

      range.dates.forEach((orderDate) => {
        const day = Number(orderDate.split("-")[2]);
        const order = orders.find(
          (o) =>
            o.user &&
            o.user._id.toString() === user._id.toString() &&
            o.order_date === orderDate,
        );
        const status = order?.status === "ordered" ? "ordered" : "not_ordered";
        days[day] = status;
        if (status === "ordered") total += 1;
      });

      const price = getUserPrice(user);

      return {
        report_type: "monthly_matrix",
        user_id: user._id,
        full_name: user.full_name,
        branch: user.branch,
        byd_id: user.byd_id,
        hx_id: user.hx_id,
        position: user.position,
        department: user.department,
        price,
        days,
        total_meal: total,
        total_cost: total * price,
      };
    });
  }

  if (isSummaryReport) {
    const branches = [...new Set(users.map((user) => user.branch))];

    return range.dates.flatMap((orderDate) =>
      branches.map((branchName) => {
        const branchUsers = users.filter((user) => user.branch === branchName);
        const branchOrders = orders.filter(
          (order) =>
            order.user &&
            order.user.branch === branchName &&
            order.order_date === orderDate,
        );
        const ordered = branchOrders.filter(
          (order) => order.status === "ordered",
        ).length;
        const cancelled = branchOrders.filter(
          (order) => order.status === "cancelled",
        ).length;

        return {
          report_type: "summary",
          order_date: orderDate,
          branch: branchName,
          total_staff: branchUsers.length,
          ordered,
          cancelled,
          not_ordered: branchUsers.length - ordered - cancelled,
        };
      }),
    );
  }

  let results = range.dates.flatMap((orderDate) =>
    users.map((user) => {
      const order = orders.find(
        (o) =>
          o.user &&
          o.user._id.toString() === user._id.toString() &&
          o.order_date === orderDate,
      );

      return {
        report_type: "detail",
        user_id: user._id,
        full_name: user.full_name,
        branch: user.branch,
        order_date: orderDate,
        status: order ? order.status : "not_ordered",
      };
    }),
  );

  if (status) {
    results = results.filter((r) => r.status === status);
  }

  return results;
};

exports.getLunchReports = asyncHandler(async (req, res) => {
  const { date, startDate, endDate, period, branch, month, status } = req.query;
  const reportData = await getReportData({
    date,
    startDate,
    endDate,
    period,
    branch,
    month,
    status,
  });
  res.json(reportData);
});

exports.upsertManualOrder = asyncHandler(async (req, res) => {
  const { userId, orderDate, status = "ordered", branch } = req.body;

  if (!userId || !orderDate || !/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
    return res
      .status(400)
      .json({ message: "Staff and order date are required" });
  }

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  if (branch && !["City Mall", "BYD 6A", "BYD 60M"].includes(branch)) {
    return res.status(400).json({ message: "Invalid branch" });
  }

  if (status === "cancelled" && orderDate !== toLocalIsoDate()) {
    return res
      .status(400)
      .json({ message: "Cancel order is allowed only for today." });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "Staff not found" });
  }

  if (branch && user.branch !== branch) {
    user.branch = branch;
    await user.save();
  }

  if (status === "not_ordered") {
    const existingOrder = await Order.findOne({
      user: userId,
      order_date: orderDate,
    });
    const previousStatus = existingOrder?.status;

    await Order.findOneAndDelete({ user: userId, order_date: orderDate });

    if (previousStatus === "ordered") {
      try {
        await botService.sendCancellationNotification(user, {
          order_date: orderDate,
        });
      } catch (error) {
        console.error(
          "Failed to send cancellation notification:",
          error.message,
        );
      }
    }
    return res.json({ message: "Manual order cleared", user });
  }

  // Check if order already exists
  const existingOrder = await Order.findOne({
    user: userId,
    order_date: orderDate,
  });
  const isNewOrder = !existingOrder;
  const previousStatus = existingOrder?.status;

  const order = await Order.findOneAndUpdate(
    { user: userId, order_date: orderDate },
    { status },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  // Send Telegram notification if order is placed or status changed to 'ordered'
  if (status === "ordered" && (isNewOrder || previousStatus !== "ordered")) {
    try {
      await botService.sendOrderNotification(user, order);
    } catch (error) {
      console.error("Failed to send order notification:", error.message);
      // Don't fail the request if notification fails
    }
  }

  // Send Telegram notification if order is cancelled
  if (status === "cancelled" && previousStatus !== "cancelled") {
    try {
      await botService.sendCancellationNotification(user, order);
    } catch (error) {
      console.error("Failed to send cancellation notification:", error.message);
      // Don't fail the request if notification fails
    }
  }

  res.json({ message: "Manual order saved", order, user });
});

const getSummaryDateHeader = (startDate, endDate) => {
  try {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const getOrdinal = (d) => {
      if (d > 3 && d < 21) return "th";
      switch (d % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };
    const startStr = `${String(start.getDate()).padStart(2, "0")}${getOrdinal(start.getDate())}`;
    const endStr = `${String(end.getDate()).padStart(2, "0")}${getOrdinal(end.getDate())}`;
    const monthYear = end.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return `${startStr}-${endStr} ${monthYear}`;
  } catch (e) {
    return "Period";
  }
};

exports.exportExcel = asyncHandler(async (req, res) => {
  const { date, startDate, endDate, period, branch, month, template, status } =
    req.query;
  const exportPeriod = template === "monthly" ? "monthly" : period;

  const reportData = await getReportData({
    date,
    startDate,
    endDate,
    period: exportPeriod,
    branch,
    month,
    status,
  });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Lunch Report");
  const isMonthlyReport = exportPeriod === "monthly";
  const isSummaryReport = exportPeriod === "summary";

  if (isMonthlyReport) {
    const targetDate = getMonthDate(month);
    const { monthLabel, daysInMonth, cutoffDay, titleBranchLabel } =
      getMonthlyReportMeta(month, branch);
    const monthlyRows = getMonthlyExportRows(reportData);

    const columns = [
      { header: "No", key: "no", width: 6 },
      { header: "Name", key: "full_name", width: 22 },
      { header: "Price", key: "price", width: 10 },
      ...Array.from({ length: daysInMonth }, (_, index) => ({
        header: `${targetDate.getMonth() + 1}/${index + 1}`,
        key: `day_${index + 1}`,
        width: 5,
      })),
      { header: "Total Meal", key: "total_meal", width: 12 },
      { header: "Total Cost", key: "total_cost", width: 12 },
    ];

    worksheet.columns = columns.map(({ header, ...column }) => column);
    worksheet.mergeCells(1, 1, 1, columns.length);

    worksheet.getCell(1, 1).value =
      `Daily Report Meal of ${targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
    worksheet.getCell(1, 1).font = {
      bold: true,
      size: 16,
      name: "Times New Roman",
    };
    worksheet.getCell(1, 1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.getRow(2).values = columns.map((column) => column.header);
    worksheet.getRow(2).font = {
      bold: true,
      size: 11,
      name: "Times New Roman",
    };
    worksheet.getRow(2).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.getRow(1).height = 32;
    worksheet.getRow(2).height = 28;

    monthlyRows.forEach(({ no, source }) => {
      const price = source ? getUserPrice(source) : 0;
      const priceLabel = price === 0 ? "$ -" : `$ ${price.toFixed(2)}`;
      const totalMeal = source ? source.total_meal : 0;
      const totalCostLabel =
        price === 0 ? "$ -" : `$ ${(totalMeal * price).toFixed(2)}`;

      const values = {
        no,
        full_name: source?.full_name || "",
        price: priceLabel,
        total_meal: source ? totalMeal : "",
        total_cost: source ? totalCostLabel : "",
      };

      for (let day = 1; day <= daysInMonth; day += 1) {
        values[`day_${day}`] = "";
      }

      const excelRow = worksheet.addRow(values);

      for (let day = 1; day <= daysInMonth; day += 1) {
        const status = getMonthlyDayStatus(source, day, cutoffDay);
        const cell = excelRow.getCell(3 + day); // 1-based index (no is 1, full_name is 2, price is 3, days start at 4)
        if (status === "ordered") {
          cell.value = 1;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE2EFDA" },
          }; // soft green
        } else if (status === "not_ordered") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFCE4D6" },
          }; // soft orange/red
        }
      }
    });

    // Bottom row for TOTAL ORDER:
    const bottomRowValues = {
      full_name: "TOTAL ORDER:",
    };
    for (let day = 1; day <= daysInMonth; day++) {
      let dayCount = 0;
      reportData.forEach((source) => {
        const status = getMonthlyDayStatus(source, day, cutoffDay);
        if (status === "ordered") {
          dayCount += 1;
        }
      });
      bottomRowValues[`day_${day}`] = dayCount;
    }

    let overallTotalCost = 0;
    reportData.forEach((source) => {
      const price = getUserPrice(source);
      const totalMeal = source.total_meal || 0;
      overallTotalCost += totalMeal * price;
    });
    bottomRowValues["total_cost"] = `$ ${overallTotalCost.toFixed(2)}`;

    const bottomExcelRow = worksheet.addRow(bottomRowValues);
    bottomExcelRow.font = { bold: true, name: "Times New Roman", size: 11 };

    // Borders and styles
    worksheet.views = [{ state: "frozen", ySplit: 2, xSplit: 3 }];
    worksheet.eachRow((row) => {
      row.height = row.number > 2 ? 26 : row.height;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.font = cell.font || { name: "Times New Roman", size: 11 };
        cell.alignment = {
          horizontal: row.number > 2 && cell.col === 2 ? "left" : "center",
          vertical: "middle",
        };
      });
    });
  } else if (isSummaryReport) {
    // Summary Report Design
    const targetDate = getMonthDate(month);
    const { monthLabel, daysInMonth } = getMonthlyReportMeta(month, branch);

    // Calculate date range labels
    const monthName = targetDate
      .toLocaleDateString("en-US", { month: "long", year: "numeric" })
      .toUpperCase();
    const yearName = targetDate.getFullYear();
    const monthNum = String(targetDate.getMonth() + 1).padStart(2, "0");

    const dateRangeHeader = getSummaryDateHeader(startDate, endDate);

    const columns = [
      { header: "Nº", key: "no", width: 6 },
      { header: "BYD ID", key: "byd_id", width: 14 },
      { header: "HX ID", key: "hx_id", width: 14 },
      { header: "Name", key: "full_name", width: 22 },
      {
        header: "Positions",
        key: "position",
        width: 24,
        alignment: { horizontal: "center" },
      },
      {
        header: "Department",
        key: "department",
        width: 18,
        alignment: { horizontal: "center" },
      },
      { header: "Price Charge\nfrom Staff", key: "price", width: 16 },
      { header: dateRangeHeader, key: "total_meal", width: 18 },
      {
        header: "Free for Staff\n(Marketing Budget)",
        key: "free_amount",
        width: 20,
      },
      { header: "Total Amount", key: "total_amount", width: 16 },
    ];

    worksheet.columns = columns.map(({ header, ...column }) => column);

    // Merged Title and Subtitle rows
    worksheet.mergeCells(1, 1, 1, columns.length);
    worksheet.getCell(1, 1).value = `STAFF MEAL REPORT FOR ${monthName}`;
    worksheet.getCell(1, 1).font = {
      bold: true,
      size: 16,
      name: "Times New Roman",
    };
    worksheet.getCell(1, 1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.mergeCells(2, 1, 2, columns.length);
    worksheet.getCell(2, 1).value = `${yearName} 年 ${monthNum}月员工膳食报告`;
    worksheet.getCell(2, 1).font = {
      bold: true,
      size: 14,
      name: "Times New Roman",
    };
    worksheet.getCell(2, 1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.getRow(1).height = 32;
    worksheet.getRow(2).height = 28;

    // Header Row (Row 3)
    worksheet.getRow(3).values = columns.map((column) => column.header);
    worksheet.getRow(3).height = 36;
    worksheet.getRow(3).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      name: "Times New Roman",
      size: 11,
    };
    worksheet.getRow(3).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    // Dark blue fill for header cells
    worksheet.getRow(3).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E78" }, // Dark blue
      };
    });

    let totalMealsSum = 0;
    let totalStaffPaySum = 0;

    reportData.forEach((row, index) => {
      totalMealsSum += row.total_meal || 0;
      totalStaffPaySum += row.total_amount || 0;

      const price = row.price;
      const priceLabel = price === 0 ? "$ -" : `$ ${price.toFixed(2)}`;
      const freeLabel =
        row.free_amount === 0 ? "$ -" : `$ ${row.free_amount.toFixed(2)}`;
      const totalLabel =
        row.total_amount === 0 ? "$ -" : `$ ${row.total_amount.toFixed(2)}`;

      worksheet.addRow({
        no: index + 1,
        byd_id: row.byd_id || "",
        hx_id: row.hx_id || "",
        full_name: row.full_name || "",
        position: row.position || "",
        department: row.department || "",
        price: priceLabel,
        total_meal: row.total_meal || 0,
        free_amount: freeLabel,
        total_amount: totalLabel,
      });
    });

    // Merge same department and position cells in the Excel export
    if (reportData.length > 0) {
      const dataStartRow = 4;
      const departmentCol = 6;
      const positionCol = 5;
      let deptGroupStart = dataStartRow;
      let posGroupStart = dataStartRow;

      reportData.forEach((row, index) => {
        const rowIndex = dataStartRow + index;
        const nextRow = reportData[index + 1];
        const nextDepartment = nextRow?.department || "";
        const nextPosition = nextRow?.position || "";
        const currentDepartment = row.department || "";
        const currentPosition = row.position || "";
        const sameDepartmentNext = nextDepartment === currentDepartment;
        const samePositionNext =
          sameDepartmentNext && nextPosition === currentPosition;

        if (!samePositionNext) {
          if (rowIndex > posGroupStart) {
            worksheet.mergeCells(
              posGroupStart,
              positionCol,
              rowIndex,
              positionCol,
            );
          }
          posGroupStart = rowIndex + 1;
        }

        if (!sameDepartmentNext) {
          if (rowIndex > deptGroupStart) {
            worksheet.mergeCells(
              deptGroupStart,
              departmentCol,
              rowIndex,
              departmentCol,
            );
          }
          deptGroupStart = rowIndex + 1;
          posGroupStart = rowIndex + 1;
        }
      });
    }

    // Row N + 1: TOTAL Staff Pay:
    const totalStaffPayRow = worksheet.addRow({
      price: "TOTAL Staff Pay:",
      total_meal: totalMealsSum,
      total_amount:
        totalStaffPaySum === 0 ? "$ -" : `$ ${totalStaffPaySum.toFixed(2)}`,
    });
    totalStaffPayRow.font = { bold: true, name: "Times New Roman", size: 11 };
    totalStaffPayRow.height = 26;

    totalStaffPayRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFD966" }, // Gold
      };
    });

    // Row N + 2: TOTAL Full Price:
    const totalFullPriceRow = worksheet.addRow({
      full_name: "TOTAL Full Price:",
      price: "$ 3.25",
      total_meal: `$ ${(totalMealsSum * 3.25).toFixed(2)}`,
      free_amount: "$ -",
      total_amount: "---",
    });
    totalFullPriceRow.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      name: "Times New Roman",
      size: 11,
    };
    totalFullPriceRow.height = 26;

    totalFullPriceRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E78" }, // Dark blue
      };
    });

    // Row N + 3: TOTAL:
    const overallTotalRow = worksheet.addRow({
      free_amount: "TOTAL:",
      total_amount: `$ ${(totalMealsSum * 3.25).toFixed(2)}`,
    });
    overallTotalRow.font = { bold: true, name: "Times New Roman", size: 11 };
    overallTotalRow.height = 26;

    // Apply borders and alignment for all data cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell.font = cell.font || { name: "Times New Roman", size: 11 };

          if (cell.col === 4) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else if (cell.col === 5 || cell.col === 6) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      }
    });

    // Add Term & Conditions box at the bottom
    worksheet.addRow([]); // Blank row

    const tcTitleRow = worksheet.addRow(["PRICE, TERM & CONDITIONS"]);
    worksheet.mergeCells(
      tcTitleRow.number,
      1,
      tcTitleRow.number,
      columns.length,
    );
    tcTitleRow.height = 24;
    tcTitleRow.getCell(1).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      name: "Times New Roman",
      size: 11,
    };
    tcTitleRow.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    tcTitleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    tcTitleRow.getCell(1).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    const tcLine1 = worksheet.addRow(["Chinese Food Full Price: 3.25$/Box"]);
    worksheet.mergeCells(tcLine1.number, 1, tcLine1.number, columns.length);
    tcLine1.height = 22;
    tcLine1.getCell(1).font = { bold: true, name: "Times New Roman", size: 11 };
    tcLine1.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    tcLine1.getCell(1).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    const tcLine2 = worksheet.addRow([
      "Supervisor & Manager Level, Leader Level, Staff Level Charge = 1$ All",
    ]);
    worksheet.mergeCells(tcLine2.number, 1, tcLine2.number, columns.length);
    tcLine2.height = 22;
    tcLine2.getCell(1).font = { bold: true, name: "Times New Roman", size: 11 };
    tcLine2.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    tcLine2.getCell(1).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  } else {
    worksheet.columns = isSummaryReport
      ? [
          { header: "Order Date", key: "order_date", width: 16 },
          { header: "Branch", key: "branch", width: 18 },
          { header: "Total Staff", key: "total_staff", width: 14 },
          { header: "Ordered", key: "ordered", width: 14 },
          { header: "Cancelled", key: "cancelled", width: 14 },
          { header: "Not Ordered", key: "not_ordered", width: 14 },
        ]
      : [
          { header: "Staff Name", key: "full_name", width: 28 },
          { header: "Branch", key: "branch", width: 18 },
          { header: "Order Date", key: "order_date", width: 16 },
          { header: "Status", key: "status", width: 16 },
        ];

    worksheet.getRow(1).font = { bold: true };
    reportData.forEach((row) => worksheet.addRow(row));
  }

  const filenameDate =
    exportPeriod === "monthly" && month
      ? month
      : startDate && endDate
        ? `${startDate}-to-${endDate}`
        : date || exportPeriod || "today";
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=lunch-report-${filenameDate}.xlsx`,
  );

  await workbook.xlsx.write(res);
  res.end();
});

exports.exportPDF = asyncHandler(async (req, res) => {
  const { date, startDate, endDate, period, branch, month, template, status } =
    req.query;
  const exportPeriod = template === "monthly" ? "monthly" : period;

  const reportData = await getReportData({
    date,
    startDate,
    endDate,
    period: exportPeriod,
    branch,
    month,
    status,
  });
  const filenameDate =
    exportPeriod === "monthly" && month
      ? month
      : startDate && endDate
        ? `${startDate}-to-${endDate}`
        : date || exportPeriod || "today";
  const isMonthlyReport = exportPeriod === "monthly";
  const isSummaryReport = exportPeriod === "summary";

  // Always use landscape A4 for monthly and summary; portrait A4 for others
  const doc =
    isMonthlyReport || isSummaryReport
      ? new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      : new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm landscape, 210mm portrait
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm landscape, 297mm portrait
  const pageMargin = 8;
  const tableWidth = pageWidth - pageMargin * 2;

  if (isMonthlyReport) {
    const { monthLabel, daysInMonth, cutoffDay, titleBranchLabel } =
      getMonthlyReportMeta(month, branch);
    const monthlyRows = getMonthlyExportRows(reportData);

    const head = [
      [
        "No",
        "Staff Name",
        "Price",
        ...Array.from({ length: daysInMonth }, (_, index) => String(index + 1)),
        "Total Meal",
        "Total Cost",
      ],
    ];

    const body = monthlyRows.map(({ no, source }) => {
      const price = source ? getUserPrice(source) : 0;
      const priceLabel = price === 0 ? "$ -" : `$ ${price.toFixed(2)}`;
      const totalMeal = source ? source.total_meal : 0;
      const totalCostLabel =
        price === 0 ? "$ -" : `$ ${(totalMeal * price).toFixed(2)}`;
      return [
        no,
        source?.full_name || "",
        priceLabel,
        ...Array.from({ length: daysInMonth }, () => ""),
        totalMeal,
        totalCostLabel,
      ];
    });

    // Add TOTAL ORDER bottom row
    let overallTotalCost = 0;
    reportData.forEach((source) => {
      const price = getUserPrice(source);
      const totalMeal = source.total_meal || 0;
      overallTotalCost += totalMeal * price;
    });

    const totalOrderRow = [
      "",
      "TOTAL ORDER:",
      "",
      ...Array.from({ length: daysInMonth }, (_, dayIndex) => {
        const day = dayIndex + 1;
        let dayCount = 0;
        reportData.forEach((source) => {
          const status = getMonthlyDayStatus(source, day, cutoffDay);
          if (status === "ordered") dayCount += 1;
        });
        return dayCount;
      }),
      "",
      `$ ${overallTotalCost.toFixed(2)}`,
    ];
    body.push(totalOrderRow);

    const dayColumnStart = 3;
    const dayColumnEnd = dayColumnStart + daysInMonth - 1;
    const totalMealColumnIndex = daysInMonth + 3;
    const totalCostColumnIndex = daysInMonth + 4;

    // Fixed columns: No(7) + Price(12) + TotalMeal(12) + TotalCost(14) = 45mm
    // Remaining width split between Name and day columns
    const fixedWidth = 7 + 12 + 12 + 14; // 45mm
    const remainingWidth = tableWidth - fixedWidth;
    // Name gets ~10% of remaining, day columns share the rest equally
    const nameWidth = Math.max(
      22,
      parseFloat((remainingWidth * 0.12).toFixed(2)),
    );
    const dayColWidth = parseFloat(
      ((remainingWidth - nameWidth) / daysInMonth).toFixed(2),
    );

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(
      `Daily Report Meal of ${getMonthDate(month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
      pageWidth / 2,
      12,
      { align: "center" },
    );

    doc.autoTable({
      startY: 20,
      head,
      body,
      theme: "grid",
      tableWidth: "custom",
      margin: { left: pageMargin, right: pageMargin },
      styles: {
        font: "times",
        fontSize: 7,
        cellPadding: 0.8,
        halign: "center",
        valign: "middle",
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        textColor: [0, 0, 0],
        minCellHeight: 7,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 7 },
        1: { cellWidth: nameWidth, halign: "left" },
        2: { cellWidth: 12, halign: "center" },
        // Day columns: dynamically sized to fill remaining space
        ...Object.fromEntries(
          Array.from({ length: daysInMonth }, (_, i) => [
            dayColumnStart + i,
            { cellWidth: dayColWidth },
          ]),
        ),
        [totalMealColumnIndex]: { cellWidth: 12 },
        [totalCostColumnIndex]: { cellWidth: 14 },
      },
      didParseCell: (data) => {
        const isBottomRow = data.row.index === body.length - 1;

        if (data.section === "body" && isBottomRow) {
          data.cell.styles.fontStyle = "bold";
          return;
        }

        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.halign = "left";
        }

        if (
          data.section === "body" &&
          data.column.index >= dayColumnStart &&
          data.column.index <= dayColumnEnd
        ) {
          const sourceRow = monthlyRows[data.row.index]?.source;
          const day = data.column.index - dayColumnStart + 1;
          const status = getMonthlyDayStatus(sourceRow, day, cutoffDay);

          if (status === "ordered") {
            data.cell.styles.fillColor = [226, 239, 218]; // soft green
            data.cell.text = ["1"];
          } else if (status === "not_ordered") {
            data.cell.styles.fillColor = [252, 228, 214]; // soft orange/red
          }
        }
      },
    });
  } else if (isSummaryReport) {
    const dateRangeHeader = getSummaryDateHeader(startDate, endDate);
    const targetDate = getMonthDate(month);
    const monthName = targetDate
      .toLocaleDateString("en-US", { month: "long", year: "numeric" })
      .toUpperCase();

    const head = [
      [
        "No",
        "BYD ID",
        "HX ID",
        "Name",
        "Position",
        "Department",
        "Price Charge",
        dateRangeHeader,
        "Free for Staff",
        "Total Amount",
      ],
    ];

    let totalMealsSum = 0;
    let totalStaffPaySum = 0;

    // Build body with FULL values always (no blanking) — merge drawn manually
    const body = reportData.map((row, index) => {
      totalMealsSum += row.total_meal || 0;
      totalStaffPaySum += row.total_amount || 0;

      const price = row.price;
      const priceLabel = price === 0 ? "$ -" : `$ ${price.toFixed(2)}`;
      const freeLabel =
        row.free_amount === 0 ? "$ -" : `$ ${row.free_amount.toFixed(2)}`;
      const totalLabel =
        row.total_amount === 0 ? "$ -" : `$ ${row.total_amount.toFixed(2)}`;

      return [
        index + 1,
        row.byd_id || "",
        row.hx_id || "",
        row.full_name || "",
        row.position || "", // col 4 — Position
        row.department || "", // col 5 — Department
        priceLabel,
        row.total_meal || 0,
        freeLabel,
        totalLabel,
      ];
    });

    const dataRowCount = body.length; // number of real data rows before summary rows

    // Pre-compute merge groups for Position (col 4) and Department (col 5)
    // A group is { colIndex, startRow, endRow, label }
    const mergeGroups = [];
    const buildGroups = (colIndex, keyFn) => {
      if (dataRowCount === 0) return;
      let groupStart = 0;
      for (let i = 1; i <= dataRowCount; i++) {
        const same = i < dataRowCount && keyFn(i) === keyFn(groupStart);
        if (!same) {
          mergeGroups.push({
            colIndex,
            startRow: groupStart,
            endRow: i - 1,
            label: keyFn(groupStart),
          });
          groupStart = i;
        }
      }
    };

    // Department groups (col 5)
    buildGroups(5, (i) => reportData[i]?.department || "");
    // Position groups (col 4) — scoped within same department boundary
    buildGroups(
      4,
      (i) =>
        `${reportData[i]?.department || ""}|||${reportData[i]?.position || ""}`,
    );
    // Strip the department prefix from position labels
    mergeGroups.forEach((g) => {
      if (g.colIndex === 4) g.label = g.label.split("|||")[1] || "";
    });

    // 3 summary rows at the bottom
    const staffPayRow = [
      "",
      "",
      "",
      "",
      "",
      "",
      "TOTAL Staff Pay:",
      totalMealsSum,
      "",
      totalStaffPaySum === 0 ? "$ -" : `$ ${totalStaffPaySum.toFixed(2)}`,
    ];
    const fullPriceRow = [
      "",
      "",
      "",
      "TOTAL Full Price:",
      "",
      "",
      "$ 3.25",
      `$ ${(totalMealsSum * 3.25).toFixed(2)}`,
      "$ -",
      "",
    ];
    const overallTotalRow = [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "TOTAL:",
      `$ ${(totalMealsSum * 3.25).toFixed(2)}`,
    ];

    body.push(staffPayRow);
    body.push(fullPriceRow);
    body.push(overallTotalRow);

    const totalStaffPayIndex = body.length - 3;
    const totalFullPriceIndex = body.length - 2;
    const overallTotalIndex = body.length - 1;

    // --- Proportional column widths that always fill tableWidth ---
    // Ratios: No, BYDID, HXID, Name, Position, Department, Price, Meals, Free, Total
    const colRatios = [
      0.028, 0.064, 0.064, 0.142, 0.149, 0.125, 0.093, 0.1, 0.114, 0.121,
    ];
    const colWidths = colRatios.map((r) =>
      parseFloat((r * tableWidth).toFixed(2)),
    );

    // Track per-cell pixel positions for merge drawing (populated in didDrawCell)
    // Key: "rowIndex_colIndex" → { x, y, w, h }
    const cellPositions = {};

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(`STAFF MEAL REPORT FOR ${monthName}`, pageWidth / 2, 12, {
      align: "center",
    });

    doc.autoTable({
      startY: 20,
      head,
      body,
      theme: "grid",
      tableWidth: "custom",
      margin: { left: pageMargin, right: pageMargin },
      styles: {
        font: "times",
        fontSize: 8.5,
        cellPadding: 1.5,
        halign: "center",
        valign: "middle",
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [31, 78, 120],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: colWidths[0] },
        1: { cellWidth: colWidths[1] },
        2: { cellWidth: colWidths[2] },
        3: { cellWidth: colWidths[3], halign: "left" },
        4: { cellWidth: colWidths[4], halign: "center" },
        5: { cellWidth: colWidths[5], halign: "center" },
        6: { cellWidth: colWidths[6] },
        7: { cellWidth: colWidths[7] },
        8: { cellWidth: colWidths[8] },
        9: { cellWidth: colWidths[9] },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;

        // Blank out non-first rows of merged groups so only the first row shows text
        if (data.column.index === 4 || data.column.index === 5) {
          const ri = data.row.index;
          if (ri >= dataRowCount) return; // skip summary rows
          const isFirstInGroup = mergeGroups.some(
            (g) =>
              g.colIndex === data.column.index &&
              g.startRow === ri &&
              g.endRow > ri, // only blank when span > 1
          );
          const isMidGroup = mergeGroups.some(
            (g) =>
              g.colIndex === data.column.index &&
              ri > g.startRow &&
              ri <= g.endRow,
          );
          if (isMidGroup) {
            data.cell.text = []; // blank text for non-first rows in group
          }
          if (isFirstInGroup || isMidGroup) {
            data.cell.styles.halign = "center";
            data.cell.styles.valign = "middle";
          }
        }

        // Summary row styles
        if (data.row.index === totalStaffPayIndex) {
          data.cell.styles.fillColor = [255, 217, 102];
          data.cell.styles.fontStyle = "bold";
        } else if (data.row.index === totalFullPriceIndex) {
          data.cell.styles.fillColor = [31, 78, 120];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        } else if (data.row.index === overallTotalIndex) {
          data.cell.styles.fontStyle = "bold";
        }
      },

      didDrawCell: (data) => {
        if (data.section !== "body") return;

        // Record every body cell exact drawn position
        cellPositions[`${data.row.index}_${data.column.index}`] = {
          x: data.cell.x,
          y: data.cell.y,
          w: data.cell.width,
          h: data.cell.height,
        };

        // Skip merge overdraw entirely for the 3 coloured summary rows at the bottom
        // so their gold/blue fill is never wiped by the white merge rectangle
        if (data.row.index >= totalStaffPayIndex) return;

        // When we reach the LAST data row of a multi-row merge group, overdraw it
        mergeGroups.forEach((g) => {
          if (
            g.colIndex !== data.column.index ||
            data.row.index !== g.endRow ||
            g.startRow === g.endRow // single-row span: nothing to merge
          )
            return;

          const first = cellPositions[`${g.startRow}_${g.colIndex}`];
          const last = cellPositions[`${g.endRow}_${g.colIndex}`];
          if (!first || !last) return;

          const lw = 0.15; // line width matching grid theme
          const x = first.x;
          const y = first.y;
          const w = first.w;
          const totalH = last.y + last.h - first.y;

          // 1. White fill inset by half line-width: erases interior horizontal grid lines
          doc.setFillColor(255, 255, 255);
          doc.rect(x + lw, y + lw, w - lw * 2, totalH - lw * 2, "F");

          // 2. Redraw four outer edges individually for clean pixel-perfect alignment
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(lw);
          doc.line(x, y, x + w, y); // top
          doc.line(x, y + totalH, x + w, y + totalH); // bottom
          doc.line(x, y, x, y + totalH); // left
          doc.line(x + w, y, x + w, y + totalH); // right

          // 3. Label centered horizontally and vertically in the merged area
          doc.setFont("times", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(0, 0, 0);
          doc.text(g.label, x + w / 2, y + totalH / 2, {
            align: "center",
            baseline: "middle",
          });
        });
      },
    });
  } else {
    // Portrait A4 — detail / weekly report
    doc.setFontSize(16);
    doc.text("Lunch Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Range: ${filenameDate}`, 14, 24);
    doc.text(`Branch: ${branch || "All Branches"}`, 14, 30);
    doc.text(
      `Status: ${
        status
          ? status === "not_ordered"
            ? "Not Ordered"
            : status.charAt(0).toUpperCase() + status.slice(1)
          : "All Statuses"
      }`,
      14,
      36,
    );

    // Proportional widths for portrait A4 (210mm - 16mm margins = 194mm)
    const detailTableWidth = pageWidth - pageMargin * 2;

    doc.autoTable({
      startY: 44,
      head: [
        exportPeriod === "weekly"
          ? [
              "Order Date",
              "Branch",
              "Total Staff",
              "Ordered",
              "Cancelled",
              "Not Ordered",
            ]
          : ["Staff Name", "Branch", "Order Date", "Status"],
      ],
      body:
        exportPeriod === "weekly"
          ? reportData.map((row) => [
              row.order_date || "",
              row.branch || "",
              row.total_staff ?? 0,
              row.ordered ?? 0,
              row.cancelled ?? 0,
              row.not_ordered ?? 0,
            ])
          : reportData.map((row) => [
              row.full_name || "",
              row.branch || "",
              row.order_date || "",
              row.status || "not_ordered",
            ]),
      theme: "grid",
      tableWidth: "custom",
      margin: { left: pageMargin, right: pageMargin },
      styles: {
        font: "times",
        fontSize: 10,
        cellPadding: 2,
        halign: "center",
        valign: "middle",
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [31, 78, 120],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles:
        exportPeriod === "weekly"
          ? {
              // 6 columns filling detailTableWidth
              0: { cellWidth: parseFloat((detailTableWidth * 0.2).toFixed(2)) },
              1: { cellWidth: parseFloat((detailTableWidth * 0.2).toFixed(2)) },
              2: {
                cellWidth: parseFloat((detailTableWidth * 0.15).toFixed(2)),
              },
              3: {
                cellWidth: parseFloat((detailTableWidth * 0.15).toFixed(2)),
              },
              4: {
                cellWidth: parseFloat((detailTableWidth * 0.15).toFixed(2)),
              },
              5: {
                cellWidth: parseFloat((detailTableWidth * 0.15).toFixed(2)),
              },
            }
          : {
              // 4 columns filling detailTableWidth
              0: {
                cellWidth: parseFloat((detailTableWidth * 0.35).toFixed(2)),
                halign: "left",
              },
              1: { cellWidth: parseFloat((detailTableWidth * 0.2).toFixed(2)) },
              2: {
                cellWidth: parseFloat((detailTableWidth * 0.25).toFixed(2)),
              },
              3: { cellWidth: parseFloat((detailTableWidth * 0.2).toFixed(2)) },
            },
    });
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=lunch-report-${filenameDate}.pdf`,
  );
  res.send(pdfBuffer);
});
