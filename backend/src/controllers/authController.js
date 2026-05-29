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

// Staff login — identified by username and password
exports.staffLogin = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const staff = await User.findOne({ username: new RegExp(`^${username.trim()}$`, 'i') });

    if (!staff) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (!staff.password) {
        return res.status(401).json({ message: 'Your account does not have a password configured. Please contact your admin.' });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid username or password' });
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
            username: staff.username,
            role: 'staff',
            is_first_login: staff.is_first_login
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
// Get all admins
exports.getAdmins = asyncHandler(async (req, res) => {
    const admins = await Admin.find({}).select('username');
    res.json(admins);
});

// Change admin or staff password
exports.changePassword = asyncHandler(async (req, res) => {
    const { targetUserId, targetType, newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ message: 'New password is required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Resolve target account to update
    const resolvedType = targetType || 'admin';
    const resolvedUserId = targetUserId || req.admin.id;

    if (resolvedType === 'admin') {
        const targetAdmin = await Admin.findById(resolvedUserId);
        if (!targetAdmin) {
            return res.status(404).json({ message: 'Target Admin not found' });
        }
        targetAdmin.password = await bcrypt.hash(newPassword, 10);
        await targetAdmin.save();
    } else if (resolvedType === 'staff') {
        const targetStaff = await User.findById(resolvedUserId);
        if (!targetStaff) {
            return res.status(404).json({ message: 'Target Staff not found' });
        }
        targetStaff.password = await bcrypt.hash(newPassword, 10);
        targetStaff.is_first_login = true; // prompt them to change it on their next login if reset
        await targetStaff.save();
    } else {
        return res.status(400).json({ message: 'Invalid target type' });
    }

    res.json({ message: 'Password updated successfully' });
});

