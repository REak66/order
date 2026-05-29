const User = require('../models/User');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { getExpectedOrderIsoDate } = require('../utils/dateUtils');

exports.getStats = asyncHandler(async (req, res) => {
    const lunchDate = getExpectedOrderIsoDate();
    
    const totalStaff = await User.countDocuments();
    const orders = await Order.find({ order_date: lunchDate });

    const stats = {
        totalStaff,
        lunchDate,
        ordered: orders.filter(o => o.status === 'ordered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        notOrdered: 0
    };

    stats.notOrdered = stats.totalStaff - stats.ordered - stats.cancelled;

    res.json(stats);
});

exports.getChartData = asyncHandler(async (req, res) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const orders = await Order.aggregate([
        {
            $match: {
                status: 'ordered',
                created_at: { $gte: sevenDaysAgo }
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
