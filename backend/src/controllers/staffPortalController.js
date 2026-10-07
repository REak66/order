const Order = require('../models/Order');
const User = require('../models/User');
const Setting = require('../models/Setting');
const asyncHandler = require('../utils/asyncHandler');
const bot = require('../services/botService');
const bcrypt = require('bcryptjs');
const { getLunchDate, getCambodiaTimeComponents, addDaysToIso } = require('../utils/dateUtils');
const { checkDateEligibility } = require('../utils/eligibilityEngine');

// Helper: get setting value by key
const getSetting = async (key, defaultValue = '') => {
    const row = await Setting.findOne({ key });
    return row?.value || defaultValue;
};

// Helper: check if current time is within order window
const isWithinOrderWindow = async (userId) => {
    let branch = null;
    if (userId) {
        const user = await User.findById(userId);
        if (user) {
            branch = user.branch;
        }
    }

    let startTime = '';
    let endTime = '';

    if (branch) {
        const branchSlug = branch.toLowerCase().replace(/\s+/g, '_');
        const customEnabled = await getSetting(`branch_enabled_${branchSlug}`);
        if (customEnabled === 'true') {
            startTime = await getSetting(`branch_order_start_time_${branchSlug}`);
            endTime = await getSetting(`branch_order_end_time_${branchSlug}`);
        }
    }

    if (!startTime) startTime = await getSetting('order_start_time', '07:00');
    if (!endTime) endTime = await getSetting('order_end_time', '16:00');

    const khTime = getCambodiaTimeComponents();
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const currentMinutes = khTime.hour * 60 + khTime.minute;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return {
        allowed: currentMinutes >= startMinutes && currentMinutes <= endMinutes,
        startTime,
        endTime,
        currentTime: `${String(khTime.hour).padStart(2, '0')}:${String(khTime.minute).padStart(2, '0')}`
    };
};

// Helper: short display date e.g. "Oct 8"
const formatDateForDisplay = (isoDate) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

// Helper: full date e.g. "Wednesday, October 8, 2026"
const formatDateFull = (isoDate) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    });
};

// Helper: short day name e.g. "Wed"
const getDayName = (isoDate) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
};

// Helper: is the ISO date a weekend?
const isWeekendDate = (isoDate) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return dow === 0 || dow === 6;
};


// GET /api/portal/my-order
exports.getMyOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const lunchDate = getLunchDate();
    const windowInfo = await isWithinOrderWindow(userId);
    const user = await User.findById(userId);

    // Build the ordering horizon (tomorrow → max_advance_days ahead OR fixed date range)
    const horizonMode = await getSetting('order_horizon_mode', 'rolling');
    const rangeStart = await getSetting('order_range_start_date', '');
    const rangeEnd = await getSetting('order_range_end_date', '');

    const khParts = getCambodiaTimeComponents();
    const todayIso = `${khParts.year}-${String(khParts.month).padStart(2, '0')}-${String(khParts.day).padStart(2, '0')}`;

    const horizonDays = [];

    if (horizonMode === 'date_range' && rangeStart && rangeEnd) {
        let curr = rangeStart < todayIso ? todayIso : rangeStart;
        let loopCount = 0;
        while (curr <= rangeEnd && loopCount < 60) {
            const weekend = isWeekendDate(curr);
            const dayEligibility = await checkDateEligibility({ targetDate: curr, user });
            const existingOrder = await Order.findOne({ user: userId, order_date: curr });

            horizonDays.push({
                date: curr,
                dayName: getDayName(curr),
                formattedDate: formatDateForDisplay(curr),
                fullFormattedDate: formatDateFull(curr),
                isWeekend: weekend,
                holiday: dayEligibility.holiday || null,
                eligibility: dayEligibility,
                status: existingOrder?.status || 'not_ordered'
            });

            curr = addDaysToIso(curr, 1);
            loopCount++;
        }
    } else {
        const maxAdvanceDaysStr = await getSetting('max_advance_days', '7');
        const maxAdvanceDays = parseInt(maxAdvanceDaysStr, 10) || 7;

        for (let i = 1; i <= maxAdvanceDays; i++) {
            const dateStr = addDaysToIso(todayIso, i);
            const weekend = isWeekendDate(dateStr);
            const dayEligibility = await checkDateEligibility({ targetDate: dateStr, user });
            const existingOrder = await Order.findOne({ user: userId, order_date: dateStr });

            horizonDays.push({
                date: dateStr,
                dayName: getDayName(dateStr),
                formattedDate: formatDateForDisplay(dateStr),
                fullFormattedDate: formatDateFull(dateStr),
                isWeekend: weekend,
                holiday: dayEligibility.holiday || null,
                eligibility: dayEligibility,
                status: existingOrder?.status || 'not_ordered'
            });
        }
    }

    const effectiveLunchDate = horizonDays.length > 0 ? horizonDays[0].date : lunchDate;
    const eligibility = await checkDateEligibility({ targetDate: effectiveLunchDate, user });
    const order = await Order.findOne({ user: userId, order_date: effectiveLunchDate });

    res.json({
        order_date: effectiveLunchDate,
        status: order?.status || 'not_ordered',
        order_id: order?._id || null,
        window: windowInfo,
        eligibility,
        is_standby: Boolean(user?.is_standby),
        horizon_mode: horizonMode,
        range_start: rangeStart,
        range_end: rangeEnd,
        horizon: horizonDays
    });
});

// POST /api/portal/order  (supports order_dates[] for multi-date)
exports.placeOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const lunchDate = getLunchDate();

    const windowInfo = await isWithinOrderWindow(userId);
    if (!windowInfo.allowed) {
        return res.status(403).json({
            message: `Ordering is only allowed between ${windowInfo.startTime} and ${windowInfo.endTime}`,
            window: windowInfo
        });
    }

    const staffUser = await User.findById(userId);

    // Accept order_dates array (multi-date) or fall back to single lunchDate
    const requestedDates = Array.isArray(req.body.order_dates) && req.body.order_dates.length > 0
        ? req.body.order_dates
        : [lunchDate];

    const results = [];
    const errors = [];

    for (const dateStr of requestedDates) {
        const dateEligibility = await checkDateEligibility({ targetDate: dateStr, user: staffUser });
        if (!dateEligibility.eligible) {
            errors.push({ date: dateStr, message: dateEligibility.message });
            continue;
        }

        const ord = await Order.findOneAndUpdate(
            { user: userId, order_date: dateStr },
            { status: 'ordered', created_at: new Date() },
            { upsert: true, returnDocument: 'after' }
        );
        results.push(ord);

        // Send Telegram notification (non-blocking)
        if (staffUser) {
            bot.sendOrderNotification(staffUser, ord).catch(err =>
                console.error('Portal order notification error:', err.message)
            );
        }
    }

    if (results.length === 0) {
        return res.status(403).json({
            message: errors[0]?.message || 'No eligible dates to order',
            errors
        });
    }

    const msg = results.length === 1
        ? 'Order placed successfully'
        : `Orders placed for ${results.length} date(s)`;

    res.json({ message: msg, orders: results, errors, window: windowInfo });
});

// POST /api/portal/cancel  (supports order_dates[] for multi-date)
exports.cancelOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const lunchDate = getLunchDate();

    const windowInfo = await isWithinOrderWindow(userId);
    if (!windowInfo.allowed) {
        return res.status(403).json({
            message: `Cancellation is only allowed between ${windowInfo.startTime} and ${windowInfo.endTime}`,
            window: windowInfo
        });
    }

    const requestedDates = Array.isArray(req.body.order_dates) && req.body.order_dates.length > 0
        ? req.body.order_dates
        : [lunchDate];

    const results = [];
    const notFound = [];

    for (const dateStr of requestedDates) {
        const ord = await Order.findOneAndUpdate(
            { user: userId, order_date: dateStr },
            { status: 'cancelled' },
            { returnDocument: 'after' }
        );

        if (!ord) {
            notFound.push(dateStr);
            continue;
        }
        results.push(ord);

        // Send Telegram notification (non-blocking)
        const staffUser = await User.findById(userId);
        if (staffUser) {
            bot.sendCancellationNotification(staffUser, ord).catch(err =>
                console.error('Portal cancel notification error:', err.message)
            );
        }
    }

    if (results.length === 0) {
        return res.status(404).json({ message: 'No active orders found for the selected dates' });
    }

    const msg = results.length === 1
        ? 'Order cancelled successfully'
        : `Cancelled ${results.length} order(s)`;

    res.json({ message: msg, orders: results, notFound, window: windowInfo });
});

// PATCH /api/portal/branch
const VALID_BRANCHES = ['City Mall', 'BYD 6A', 'BYD 60M'];

exports.updateBranch = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { branch } = req.body;

    if (!branch || !VALID_BRANCHES.includes(branch)) {
        return res.status(400).json({ message: `Branch must be one of: ${VALID_BRANCHES.join(', ')}` });
    }

    // Capture old branch before updating
    const existingStaff = await User.findById(userId);
    if (!existingStaff) {
        return res.status(404).json({ message: 'Staff not found' });
    }
    const oldBranch = existingStaff.branch;

    const staff = await User.findByIdAndUpdate(userId, { branch }, { returnDocument: 'after' });

    // If staff has an active order for today, send Telegram notification about the branch update
    const lunchDate = getLunchDate();
    const activeOrder = await Order.findOne({ user: userId, order_date: lunchDate, status: 'ordered' });
    if (activeOrder) {
        bot.sendBranchUpdateNotification(staff, activeOrder, oldBranch).catch(err =>
            console.error('Portal branch update notification error:', err.message)
        );
    }

    res.json({ message: 'Branch updated', branch: staff.branch });
});

exports.changePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password || password.trim().length < 4) {
        return res.status(400).json({ message: 'Password must be at least 4 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const staff = await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword, is_first_login: false },
        { returnDocument: 'after' }
    );

    if (!staff) {
        return res.status(404).json({ message: 'Staff user not found' });
    }

    res.json({ message: 'Password updated successfully' });
});
