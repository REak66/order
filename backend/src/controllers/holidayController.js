const Holiday = require('../models/Holiday');
const asyncHandler = require('../utils/asyncHandler');
const { CAMBODIA_HOLIDAYS_2026 } = require('../utils/cambodiaHolidays2026');

// GET /api/holidays - List all holidays
exports.getAllHolidays = asyncHandler(async (req, res) => {
    const { year, activeOnly } = req.query;
    const query = {};

    if (year) {
        query.date = { $regex: `^${year}` };
    }
    if (activeOnly === 'true') {
        query.is_active = true;
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.json(holidays);
});

// POST /api/holidays - Create a holiday
exports.createHoliday = asyncHandler(async (req, res) => {
    const { date, name, description, is_active } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) is required' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Holiday name is required' });
    }

    const existing = await Holiday.findOne({ date });
    if (existing) {
        return res.status(400).json({ message: `Holiday already exists on ${date}` });
    }

    const holiday = await Holiday.create({
        date,
        name: name.trim(),
        description: description ? description.trim() : '',
        is_active: is_active !== undefined ? Boolean(is_active) : true
    });

    res.status(201).json(holiday);
});

// PUT /api/holidays/:id - Update a holiday
exports.updateHoliday = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, name, description, is_active } = req.body;

    const holiday = await Holiday.findById(id);
    if (!holiday) {
        return res.status(404).json({ message: 'Holiday not found' });
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Check if another holiday has this date
        const conflict = await Holiday.findOne({ date, _id: { $ne: id } });
        if (conflict) {
            return res.status(400).json({ message: `Another holiday already exists on ${date}` });
        }
        holiday.date = date;
    }

    if (name && name.trim()) {
        holiday.name = name.trim();
    }
    if (description !== undefined) {
        holiday.description = description.trim();
    }
    if (is_active !== undefined) {
        holiday.is_active = Boolean(is_active);
    }

    await holiday.save();
    res.json(holiday);
});

// DELETE /api/holidays/:id - Delete a holiday
exports.deleteHoliday = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) {
        return res.status(404).json({ message: 'Holiday not found' });
    }
    res.json({ message: 'Holiday deleted successfully' });
});

// POST /api/holidays/seed-cambodia-2026 - Bulk import / upsert Cambodia 2026 public holidays
exports.seedCambodia2026 = asyncHandler(async (req, res) => {
    let importedCount = 0;
    let existingCount = 0;

    for (const h of CAMBODIA_HOLIDAYS_2026) {
        const existing = await Holiday.findOne({ date: h.date });
        if (existing) {
            existingCount++;
            continue;
        }
        await Holiday.create({
            date: h.date,
            name: h.name,
            description: h.description,
            is_active: true
        });
        importedCount++;
    }

    const allHolidays = await Holiday.find().sort({ date: 1 });
    res.json({
        success: true,
        message: `Imported ${importedCount} holidays (${existingCount} already existed).`,
        importedCount,
        existingCount,
        holidays: allHolidays
    });
});
