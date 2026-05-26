const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: String,
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Setting', SettingSchema);
