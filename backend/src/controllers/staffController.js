const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');

exports.getAllStaff = asyncHandler(async (req, res) => {
    const staff = await User.find().sort({ created_at: -1 });
    res.json(staff);
});

exports.addStaff = asyncHandler(async (req, res) => {
    const { telegram_id, username, full_name, branch, password } = req.body;

    if (!username || !username.trim()) {
        return res.status(400).json({ message: 'Username is required' });
    }

    const normalizedUsername = username.trim();
    if (normalizedUsername.toLowerCase() !== 'n/a') {
        const existingUser = await User.findOne({ username: new RegExp(`^${normalizedUsername}$`, 'i') });
        if (existingUser) {
            return res.status(400).json({ message: 'Username is already taken' });
        }
    }

    let hashedPassword;
    if (password && password.trim() !== '') {
        hashedPassword = await bcrypt.hash(password, 10);
    } else {
        // Default to '123456' if no password is provided
        hashedPassword = await bcrypt.hash('123456', 10);
    }

    const staff = await User.create({
        telegram_id,
        username: normalizedUsername,
        full_name,
        branch,
        password: hashedPassword,
        is_first_login: true
    });
    res.status(201).json(staff);
});

exports.updateStaff = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { telegram_id, username, full_name, branch, password } = req.body;

    if (!username || !username.trim()) {
        return res.status(400).json({ message: 'Username is required' });
    }

    const normalizedUsername = username.trim();
    if (normalizedUsername.toLowerCase() !== 'n/a') {
        const existingUser = await User.findOne({
            username: new RegExp(`^${normalizedUsername}$`, 'i'),
            _id: { $ne: id }
        });
        if (existingUser) {
            return res.status(400).json({ message: 'Username is already taken' });
        }
    }

    const updateData = {
        username: normalizedUsername,
        full_name,
        branch
    };

    if (telegram_id !== undefined) {
        updateData.telegram_id = telegram_id;
    }

    if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
        updateData.is_first_login = true;
    }

    const staff = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    );
    res.json(staff);
});

exports.deleteStaff = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: 'Staff deleted' });
});
