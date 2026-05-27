const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.getAllStaff = asyncHandler(async (req, res) => {
    const staff = await User.find().sort({ created_at: -1 });
    res.json(staff);
});

exports.addStaff = asyncHandler(async (req, res) => {
    const { telegram_id, username, full_name, branch } = req.body;
    const staff = await User.create({ telegram_id, username, full_name, branch });
    res.status(201).json(staff);
});

exports.updateStaff = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { telegram_id, username, full_name, branch } = req.body;
    const staff = await User.findByIdAndUpdate(id, { telegram_id, username, full_name, branch }, { new: true });
    res.json(staff);
});

exports.deleteStaff = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: 'Staff deleted' });
});
