const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    order_date: String, // YYYY-MM-DD
    status: { type: String, enum: ['ordered', 'cancelled', 'not_ordered'], default: 'ordered' },
    created_at: { type: Date, default: Date.now }
});

OrderSchema.index({ user: 1, order_date: 1 }, { unique: true });

module.exports = mongoose.model('Order', OrderSchema);
