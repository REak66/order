const TIME_ZONE = process.env.TIME_ZONE || 'Asia/Phnom_Penh';

const toLocalIsoDate = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: TIME_ZONE
    }).format(date);
};

const toIsoDate = (date) => toLocalIsoDate(date);

const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

const getTomorrowDate = (date = new Date()) => {
    return new Date(date.getTime() + (24 * 60 * 60 * 1000));
};

const getTomorrowIsoDate = (date = new Date()) => {
    return toLocalIsoDate(getTomorrowDate(date));
};

const toDisplayDate = (date = new Date()) => {
    return date.toLocaleDateString('en-GB', { timeZone: TIME_ZONE });
};

const getTomorrowDisplayDate = () => {
    return toDisplayDate(getTomorrowDate());
};

const parseOrderDate = (dateStr) => {
    const [day, month, year] = dateStr.split('-');
    if (!day || !month || !year) return null;

    const date = new Date(`${year}-${month}-${day}T00:00:00`);
    if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== Number(year) ||
        date.getMonth() + 1 !== Number(month) ||
        date.getDate() !== Number(day)
    ) {
        return null;
    }

    return `${year}-${month}-${day}`;
};

const toOrderInputDate = (isoDate) => {
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
};

const getLunchDate = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    
    const year = Number(map.year);
    const month = Number(map.month);
    const day = Number(map.day);
    
    const localDate = new Date(year, month - 1, day);
    const next = new Date(localDate);
    next.setDate(localDate.getDate() + 1);

    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    const dd = String(next.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
};

const getExpectedOrderIsoDate = () => {
    return getLunchDate(new Date());
};

const isTomorrowOrderDate = (orderIsoDate) => {
    return orderIsoDate === getExpectedOrderIsoDate();
};

const isTodayOrFutureOrderDate = (orderIsoDate) => {
    return orderIsoDate >= toLocalIsoDate(new Date());
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

module.exports = {
    TIME_ZONE,
    toLocalIsoDate,
    toIsoDate,
    addDays,
    getTomorrowDate,
    getTomorrowIsoDate,
    toDisplayDate,
    getTomorrowDisplayDate,
    parseOrderDate,
    toOrderInputDate,
    getExpectedOrderIsoDate,
    isTomorrowOrderDate,
    isTodayOrFutureOrderDate,
    getMonthDate,
    getMonthlyReportMeta,
    getMonthlyExportRows,
    getMonthlyDayStatus,
    getDateRange,
    getLunchDate
};
