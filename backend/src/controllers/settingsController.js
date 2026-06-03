const Setting = require('../models/Setting');
const bot = require('../services/botService');
const asyncHandler = require('../utils/asyncHandler');

const DEFAULT_SETTINGS = {
    bot_token: '',
    group_id: '',
    order_start_time: '07:00',
    order_end_time: '16:00',
    report_time: '16:20'
};

const TIME_SETTING_KEYS = ['order_start_time', 'order_end_time', 'report_time'];

const normalizeTimeValue = (value) => {
    if (typeof value !== 'string') return null;

    const match = value.trim().match(/^(\d{2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;

    return `${match[1]}:${match[2]}`;
};

const normalizeGroupId = (value) => {
    if (value === undefined || value === null || value === '') return '';

    const groupId = String(value).trim();
    return /^-?\d+$/.test(groupId) ? groupId : null;
};

exports.getSettings = asyncHandler(async (req, res) => {
    const rows = await Setting.find();
    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach(row => {
        settings[row.key] = row.value || DEFAULT_SETTINGS[row.key] || '';
    });
    res.json(settings);
});

exports.updateSettings = asyncHandler(async (req, res) => {
    const settings = { ...req.body };
    const shouldRestartBot = Object.prototype.hasOwnProperty.call(settings, 'bot_token');

    // Dynamically validate global and branch-specific times and group IDs
    for (const [key, value] of Object.entries(settings)) {
        if (key.includes('order_start_time') || key.includes('order_end_time') || key.includes('report_time')) {
            if (value !== undefined && value !== null && value !== '') {
                const normalizedTime = normalizeTimeValue(value);
                if (!normalizedTime) {
                    return res.status(400).json({ message: `${key} must be a valid HH:mm time` });
                }
                settings[key] = normalizedTime;
            }
        }
        
        if (key.includes('group_id')) {
            if (value !== undefined && value !== null && value !== '') {
                const normalizedGroupId = normalizeGroupId(value);
                if (normalizedGroupId === null) {
                    return res.status(400).json({ message: `${key} must be numeric` });
                }
                settings[key] = normalizedGroupId;
            }
        }
    }

    // Fetch existing settings to detect changes in times
    const existingSettings = await Setting.find();

    for (const [key, value] of Object.entries(settings)) {
        await Setting.findOneAndUpdate(
            { key },
            { value: value !== undefined && value !== null ? String(value) : '', updated_at: Date.now() },
            { upsert: true }
        );
    }

    // If report_time was changed, clear last_report_date to allow immediate testing/triggering
    const oldReportTime = existingSettings.find(s => s.key === 'report_time')?.value || '';
    if (settings.report_time && settings.report_time !== oldReportTime) {
        await Setting.deleteOne({ key: 'last_report_date' });
        console.log(`Cleared last_report_date because report_time changed from ${oldReportTime} to ${settings.report_time}`);
    }

    // If order_start_time was changed, clear last_reminder_date
    const oldOrderStartTime = existingSettings.find(s => s.key === 'order_start_time')?.value || '';
    if (settings.order_start_time && settings.order_start_time !== oldOrderStartTime) {
        await Setting.deleteOne({ key: 'last_reminder_date' });
        console.log(`Cleared last_reminder_date because order_start_time changed from ${oldOrderStartTime} to ${settings.order_start_time}`);
    }

    // Handle branch-specific changes to clear report/reminder dates
    for (const [key, value] of Object.entries(settings)) {
        if (key.startsWith('branch_report_time_')) {
            const oldVal = existingSettings.find(s => s.key === key)?.value || '';
            if (value && value !== oldVal) {
                const branchSlug = key.replace('branch_report_time_', '');
                await Setting.deleteOne({ key: `last_report_date_${branchSlug}` });
                console.log(`Cleared last_report_date_${branchSlug} because report_time changed to ${value}`);
            }
        }
        if (key.startsWith('branch_order_start_time_')) {
            const oldVal = existingSettings.find(s => s.key === key)?.value || '';
            if (value && value !== oldVal) {
                const branchSlug = key.replace('branch_order_start_time_', '');
                await Setting.deleteOne({ key: `last_reminder_date_${branchSlug}` });
                console.log(`Cleared last_reminder_date_${branchSlug} because order_start_time changed to ${value}`);
            }
        }
    }

    if (shouldRestartBot) {
        bot.restart().catch(error => {
            console.error('Bot restart error:', error.message);
        });
    }

    res.json({ message: 'Settings updated' });
});

exports.sendReportNow = asyncHandler(async (req, res) => {
    const runningBot = await bot.getRunningBot();
    if (!runningBot) {
        return res.status(400).json({ message: 'Telegram bot is not configured or running.' });
    }

    const { toLocalIsoDate } = require('../utils/dateUtils');
    const today = toLocalIsoDate();
    let sentMain = false;
    let sentBranches = [];

    // 1. Send main daily report
    const mainGroupId = await bot.getGroupId();
    if (mainGroupId) {
        try {
            const report = await bot.buildDailyReport();
            await runningBot.telegram.sendMessage(mainGroupId, report);
            
            // Set last_report_date
            await Setting.findOneAndUpdate(
                { key: 'last_report_date' },
                { value: today, updated_at: new Date() },
                { upsert: true }
            );
            sentMain = true;
        } catch (error) {
            console.error('Failed to send main report via Send Now:', error.message);
        }
    }

    // 2. Send branch-specific reports
    const { BRANCHES } = require('../utils/constants');
    for (const branch of BRANCHES) {
        const branchGroupId = await bot.getBranchGroupId(branch.name);
        if (branchGroupId) {
            try {
                const report = await bot.buildDailyReportForBranch(branch.name);
                await runningBot.telegram.sendMessage(branchGroupId, report);

                // Set last_report_date_${branchKey}
                const branchKey = branch.name.toLowerCase().replace(/\s+/g, '_');
                const stateKey = `last_report_date_${branchKey}`;
                await Setting.findOneAndUpdate(
                    { key: stateKey },
                    { value: today, updated_at: new Date() },
                    { upsert: true }
                );
                sentBranches.push(branch.name);
            } catch (error) {
                console.error(`Failed to send branch report for ${branch.name} via Send Now:`, error.message);
            }
        }
    }

    if (!sentMain && sentBranches.length === 0) {
        return res.status(400).json({ message: 'No valid Telegram Group ID configured for main group or active branches.' });
    }

    res.json({
        message: 'Daily report(s) sent successfully',
        main: sentMain,
        branches: sentBranches
    });
});
