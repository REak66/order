const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Admin login
exports.login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.trim() });
    
    if (!admin) {
        console.log(`Login failed: User '${username}' not found.`);
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: admin._id, username: admin.username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
        token,
        admin: {
            id: admin._id,
            username: admin.username,
            role: 'admin'
        }
    });
});

// Staff login — identified by phone number
exports.staffLogin = asyncHandler(async (req, res) => {
    const { phone_number } = req.body;

    if (!phone_number) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    const staff = await User.findOne({ phone_number: phone_number.trim() });

    if (!staff) {
        return res.status(401).json({ message: 'Phone number not found. Please register first.' });
    }

    const token = jwt.sign(
        { id: staff._id, role: 'staff', full_name: staff.full_name, branch: staff.branch },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
        token,
        user: {
            id: staff._id,
            full_name: staff.full_name,
            branch: staff.branch,
            phone_number: staff.phone_number,
            role: 'staff'
        }
    });
});

// Staff self-registration
exports.staffRegister = asyncHandler(async (req, res) => {
    const { full_name, branch, phone_number } = req.body;

    if (!full_name || !branch || !phone_number) {
        return res.status(400).json({ message: 'Full name, branch, and phone number are required' });
    }

    const existing = await User.findOne({ phone_number: phone_number.trim() });
    if (existing) {
        return res.status(409).json({ message: 'This phone number is already registered. Please sign in.' });
    }

    const staff = await User.create({
        full_name: full_name.trim(),
        branch,
        phone_number: phone_number.trim(),
        role: 'staff'
    });

    const token = jwt.sign(
        { id: staff._id, role: 'staff', full_name: staff.full_name, branch: staff.branch },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
        token,
        user: {
            id: staff._id,
            full_name: staff.full_name,
            branch: staff.branch,
            phone_number: staff.phone_number,
            role: 'staff'
        }
    });
});

// Get current admin
exports.getMe = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
    }
    res.json({ ...admin.toObject(), role: 'admin' });
});

// Get current staff user
exports.getStaffMe = asyncHandler(async (req, res) => {
    const staff = await User.findById(req.user.id);
    if (!staff) {
        return res.status(404).json({ message: 'Staff not found' });
    }
    res.json({ ...staff.toObject(), role: 'staff' });
});
