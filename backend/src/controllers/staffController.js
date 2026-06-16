const User = require('../models/User');
const Position = require('../models/Position');
const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');

exports.getAllStaff = asyncHandler(async (req, res) => {
    const staff = await User.find().sort({ created_at: -1 }).select('-telegram_id');
    res.json(staff);
});

exports.addStaff = asyncHandler(async (req, res) => {
    const { username, full_name, branch, password, byd_id, hx_id, position, department } = req.body;

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
        username: normalizedUsername,
        full_name,
        branch,
        password: hashedPassword,
        is_first_login: true,
        byd_id: byd_id || '',
        hx_id: hx_id || '',
        position: position || '',
        department: department || ''
    });
    res.status(201).json(staff);
});

exports.updateStaff = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, full_name, branch, password, byd_id, hx_id, position, department } = req.body;

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
        branch,
        byd_id: byd_id || '',
        hx_id: hx_id || '',
        position: position || '',
        department: department || ''
    };

    if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
        updateData.is_first_login = true;
    }

    const staff = await User.findByIdAndUpdate(
        id,
        updateData,
        { returnDocument: 'after' }
    );
    res.json(staff);
});

exports.deleteStaff = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: 'Staff deleted' });
});

// Position Controllers
exports.getAllPositions = asyncHandler(async (req, res) => {
    const positions = await Position.find().sort({ name: 1 });
    res.json(positions);
});

exports.addPosition = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Position name is required' });
    }
    const normalized = name.trim();
    const existing = await Position.findOne({ name: new RegExp(`^${normalized}$`, 'i') });
    if (existing) {
        return res.status(400).json({ message: 'Position already exists' });
    }
    const position = await Position.create({ name: normalized });
    res.status(201).json(position);
});

exports.deletePosition = asyncHandler(async (req, res) => {
    const { name } = req.params;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Position name is required' });
    }
    const normalized = name.trim();
    const result = await Position.findOneAndDelete({ name: new RegExp(`^${normalized}$`, 'i') });
    if (!result) {
        return res.status(404).json({ message: 'Position not found' });
    }
    res.json({ message: 'Position deleted successfully' });
});

// Department Controllers
exports.getAllDepartments = asyncHandler(async (req, res) => {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
});

exports.addDepartment = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Department name is required' });
    }
    const normalized = name.trim();
    const existing = await Department.findOne({ name: new RegExp(`^${normalized}$`, 'i') });
    if (existing) {
        return res.status(400).json({ message: 'Department already exists' });
    }
    const department = await Department.create({ name: normalized });
    res.status(201).json(department);
});

exports.deleteDepartment = asyncHandler(async (req, res) => {
    const { name } = req.params;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Department name is required' });
    }
    const normalized = name.trim();
    const result = await Department.findOneAndDelete({ name: new RegExp(`^${normalized}$`, 'i') });
    if (!result) {
        return res.status(404).json({ message: 'Department not found' });
    }
    res.json({ message: 'Department deleted successfully' });
});

exports.importStaffBulk = asyncHandler(async (req, res) => {
    const staffList = Array.isArray(req.body) ? req.body : (req.body.staffList || []);

    if (staffList.length === 0) {
        return res.status(400).json({ message: 'No staff data provided to import' });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const skippedList = [];

    // Let's process sequentially to avoid database race conditions and hash passwords safely
    for (const member of staffList) {
        const { username, full_name, branch, password, byd_id, hx_id, position, department } = member;

        if (!username || !String(username).trim()) {
            skippedCount++;
            skippedList.push({ name: full_name || 'Unknown', reason: 'Missing username' });
            continue;
        }

        if (!full_name || !String(full_name).trim()) {
            skippedCount++;
            skippedList.push({ name: 'Unknown', reason: 'Missing full name' });
            continue;
        }

        const normalizedUsername = String(username).trim();
        
        // Skip duplicate check if username is 'N/A'
        if (normalizedUsername.toLowerCase() !== 'n/a') {
            const existingUser = await User.findOne({ username: new RegExp(`^${normalizedUsername}$`, 'i') });
            if (existingUser) {
                skippedCount++;
                skippedList.push({ name: full_name, username: normalizedUsername, reason: 'Username already taken' });
                continue;
            }
        }

        // Validate branch
        const validBranches = ['City Mall', 'BYD 6A', 'BYD 60M'];
        const normalizedBranch = validBranches.includes(branch) ? branch : 'City Mall';

        // Hash password
        let hashedPassword;
        const rawPassword = password ? String(password).trim() : '';
        if (rawPassword !== '') {
            hashedPassword = await bcrypt.hash(rawPassword, 10);
        } else {
            hashedPassword = await bcrypt.hash('123456', 10);
        }

        // Create user
        await User.create({
            username: normalizedUsername,
            full_name: String(full_name).trim(),
            branch: normalizedBranch,
            password: hashedPassword,
            is_first_login: true,
            byd_id: byd_id ? String(byd_id).trim() : '',
            hx_id: hx_id ? String(hx_id).trim() : '',
            position: position ? String(position).trim() : '',
            department: department ? String(department).trim() : ''
        });

        importedCount++;
    }

    res.json({
        success: true,
        importedCount,
        skippedCount,
        skippedList
    });
});
