const mongoose = require('mongoose');

const PositionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Position', PositionSchema);
