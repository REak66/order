const User = require('../models/User');
const Order = require('../models/Order');

const TIME_ZONE = process.env.TIME_ZONE || 'Asia/Phnom_Penh';

const toLocalIsoDate = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: TIME_ZONE
    }).format(date);
};

const getTomorrowIsoDate = () => {
    return toLocalIsoDate(new Date(Date.now() + (24 * 60 * 60 * 1000)));
};

exports.getStats = async (req, res) => {
    try {
        const lunchDate = getTomorrowIsoDate();
        
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getChartData = async (req, res) => {
    try {
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
