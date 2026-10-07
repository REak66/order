const User = require('../models/User');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { getExpectedOrderIsoDate, toLocalIsoDate } = require('../utils/dateUtils');
const Holiday = require('../models/Holiday');

exports.getStats = asyncHandler(async (req, res) => {
    const lunchDate = getExpectedOrderIsoDate();
    
    const totalStaff = await User.countDocuments();
    const orders = await Order.find({ order_date: lunchDate });
    const holiday = await Holiday.findOne({ date: lunchDate, is_active: true });

    const stats = {
        totalStaff,
        lunchDate,
        isHoliday: Boolean(holiday),
        holidayName: holiday ? holiday.name : null,
        ordered: orders.filter(o => o.status === 'ordered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        notOrdered: 0
    };

    stats.notOrdered = stats.totalStaff - stats.ordered - stats.cancelled;

    res.json(stats);
});

exports.getChartData = asyncHandler(async (req, res) => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 7);
    const pastDateIso = toLocalIsoDate(pastDate);

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);
    const futureDateIso = toLocalIsoDate(futureDate);

    const orders = await Order.aggregate([
        {
            $match: {
                status: 'ordered',
                order_date: { $gte: pastDateIso, $lte: futureDateIso }
            }
        },
        {
            $group: {
                _id: "$order_date",
                total: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    const formattedData = orders.map(o => ({
        order_date: o._id,
        total: o.total
    }));

    res.json(formattedData);
});
