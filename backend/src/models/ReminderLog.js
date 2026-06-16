const mongoose = require('mongoose');

const ReminderLogSchema = new mongoose.Schema({
    message: { type: String, required: true },
    group_id: { type: String, required: true },
    group_label: { type: String, default: 'Unknown' },
    sent_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['success', 'error'], default: 'success' },
    error_message: { type: String, default: '' }
});

ReminderLogSchema.index({ sent_at: -1 });

module.exports = mongoose.model('ReminderLog', ReminderLogSchema);
