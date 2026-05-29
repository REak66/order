const Order = require('../models/Order');
const User = require('../models/User');
const Setting = require('../models/Setting');
const asyncHandler = require('../utils/asyncHandler');
const bot = require('../services/botService');

// Helper: get setting value by key
const getSetting = async (key, defaultValue = '') => {
    const row = await Setting.findOne({ key });
    return row?.value || defaultValue;
};

// Helper: get current time and date components in Cambodia (Asia/Phnom_Penh) timezone
const getCambodiaTimeComponents = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Phnom_Penh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(now);

    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });

    return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour),
        minute: Number(map.minute)
    };
};

// Helper: check if current time is within order window
const isWithinOrderWindow = async () => {
    const startTime = await getSetting('order_start_time', '07:00');
    const endTime = await getSetting('order_end_time', '16:00');

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

// Get today's next business day (for ordering tomorrow's lunch)
const getLunchDate = () => {
    const khTime = getCambodiaTimeComponents();
    // Create Date object in local server timezone representing the Cambodia local date
    const localDate = new Date(khTime.year, khTime.month - 1, khTime.day);

    const next = new Date(localDate);
    next.setDate(localDate.getDate() + 1);

    // Skip weekends — find next Mon if Sat/Sun
    if (next.getDay() === 6) next.setDate(next.getDate() + 2); // Sat → Mon
    if (next.getDay() === 0) next.setDate(next.getDate() + 1); // Sun → Mon

    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    const dd = String(next.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
};

// GET /api/portal/my-order
exports.getMyOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const lunchDate = getLunchDate();
    const windowInfo = await isWithinOrderWindow();

    const order = await Order.findOne({ user: userId, order_date: lunchDate });

    res.json({
        order_date: lunchDate,
        status: order?.status || 'not_ordered',
        order_id: order?._id || null,
        window: windowInfo
    });
});

// POST /api/portal/order
exports.placeOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const lunchDate = getLunchDate();

    const windowInfo = await isWithinOrderWindow();
    if (!windowInfo.allowed) {
        return res.status(403).json({
            message: `Ordering is only allowed between ${windowInfo.startTime} and ${windowInfo.endTime}`,
            window: windowInfo
        });
    }

    const order = await Order.findOneAndUpdate(
        { user: userId, order_date: lunchDate },
        { status: 'ordered', created_at: new Date() },
        { upsert: true, new: true }
    );

    // Send Telegram notification (non-blocking)
    const staffUser = await User.findById(userId);
    if (staffUser) {
        bot.sendOrderNotification(staffUser, order).catch(err =>
            console.error('Portal order notification error:', err.message)
        );
    }

    res.json({ message: 'Order placed successfully', order, window: windowInfo });
});

// POST /api/portal/cancel
exports.cancelOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const lunchDate = getLunchDate();

    const windowInfo = await isWithinOrderWindow();
    if (!windowInfo.allowed) {
        return res.status(403).json({
            message: `Cancellation is only allowed between ${windowInfo.startTime} and ${windowInfo.endTime}`,
            window: windowInfo
        });
    }

    const order = await Order.findOneAndUpdate(
        { user: userId, order_date: lunchDate },
        { status: 'cancelled' },
        { new: true }
    );

    if (!order) {
        return res.status(404).json({ message: 'No order found for today' });
    }

    // Send Telegram notification (non-blocking)
    const staffUser = await User.findById(userId);
    if (staffUser) {
        bot.sendCancellationNotification(staffUser, order).catch(err =>
            console.error('Portal cancel notification error:', err.message)
        );
    }

    res.json({ message: 'Order cancelled successfully', order, window: windowInfo });
});

// PATCH /api/portal/branch
const VALID_BRANCHES = ['City Mall', 'BYD 6A', 'BYD 60M'];

exports.updateBranch = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { branch } = req.body;

    if (!branch || !VALID_BRANCHES.includes(branch)) {
        return res.status(400).json({ message: `Branch must be one of: ${VALID_BRANCHES.join(', ')}` });
    }

    const staff = await User.findByIdAndUpdate(userId, { branch }, { new: true });
    if (!staff) {
        return res.status(404).json({ message: 'Staff not found' });
    }

    // If staff has an active order for tomorrow/today, send Telegram notification about the branch update
    const lunchDate = getLunchDate();
    const activeOrder = await Order.findOne({ user: userId, order_date: lunchDate, status: 'ordered' });
    if (activeOrder) {
        bot.sendBranchUpdateNotification(staff, activeOrder).catch(err =>
            console.error('Portal branch update notification error:', err.message)
        );
    }

    res.json({ message: 'Branch updated', branch: staff.branch });
});
