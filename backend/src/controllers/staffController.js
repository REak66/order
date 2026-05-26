const User = require('../models/User');

exports.getAllStaff = async (req, res) => {
    try {
        const staff = await User.find().sort({ created_at: -1 });
        res.json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addStaff = async (req, res) => {
    const { telegram_id, username, full_name, branch } = req.body;

    try {
        const staff = await User.create({ telegram_id, username, full_name, branch });
        res.status(201).json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateStaff = async (req, res) => {
    const { id } = req.params;
    const { telegram_id, username, full_name, branch } = req.body;

    try {
        const staff = await User.findByIdAndUpdate(id, { telegram_id, username, full_name, branch }, { new: true });
        res.json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteStaff = async (req, res) => {
    const { id } = req.params;

    try {
        await User.findByIdAndDelete(id);
        res.json({ message: 'Staff deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
