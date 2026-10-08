// models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    order_date: String, // YYYY-MM-DD
    status: {
        type: String,
        enum: ['ordered', 'cancelled', 'not_ordered'],
        default: 'ordered'
    },
    food_type: {
        type: String,
        enum: ['Khmer Food', 'Chinese Food'],
        default: 'Chinese Food',
        required: true
    },
    telegram_notified: {
        type: Boolean,
        default: false
    },
    telegram_notified_at: {
        type: Date
    },
    created_at: { type: Date, default: Date.now }
});

OrderSchema.index({ user: 1, order_date: 1 }, { unique: true });
OrderSchema.index({ order_date: 1, status: 1 });
OrderSchema.index({ order_date: 1, status: 1, telegram_notified: 1 });

module.exports = mongoose.model('Order', OrderSchema);