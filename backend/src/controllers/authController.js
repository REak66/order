const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const asyncHandler = require('../utils/asyncHandler');
require('dotenv').config();

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
        { id: admin._id, username: admin.username },
        process.env.JWT_SECRET || 'your_jwt_secret_key_here',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
        token,
        admin: {
            id: admin._id,
            username: admin.username
        }
    });
});

exports.getMe = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
    }
    res.json(admin);
});
