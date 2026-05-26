const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    telegram_id: { type: Number, unique: true },
    username: String,
    full_name: String,
    branch: { 
        type: String, 
        enum: ['City Mall', 'BYD 6A', 'BYD 60M'],
        default: 'City Mall'
    },
    role: { type: String, default: 'staff' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
