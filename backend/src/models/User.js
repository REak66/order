const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    telegram_id: { type: Number, sparse: true },
    username: String,
    password: { type: String },
    is_first_login: { type: Boolean, default: true },
    full_name: { type: String, required: true },
    branch: { 
        type: String, 
        enum: ['City Mall', 'BYD 6A', 'BYD 60M'],
        default: 'City Mall'
    },
    role: { type: String, enum: ['staff', 'admin'], default: 'staff' },
    byd_id: { type: String, default: '' },
    hx_id: { type: String, default: '' },
    position: { type: String, default: '' },
    department: { type: String, default: '' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
