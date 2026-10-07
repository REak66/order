const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // 'YYYY-MM-DD'
    name: { type: String, required: true },               // e.g. "Khmer New Year Day 1"
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Holiday', HolidaySchema);
