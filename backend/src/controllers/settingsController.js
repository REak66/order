const Setting = require('../models/Setting');
const bot = require('../services/botService');

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

exports.getSettings = async (req, res) => {
    try {
        const rows = await Setting.find();
        const settings = { ...DEFAULT_SETTINGS };
        rows.forEach(row => {
            settings[row.key] = row.value || DEFAULT_SETTINGS[row.key] || '';
        });
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateSettings = async (req, res) => {
    const settings = { ...req.body };
    const shouldRestartBot = Object.prototype.hasOwnProperty.call(settings, 'bot_token');

    try {
        for (const key of TIME_SETTING_KEYS) {
            if (!Object.prototype.hasOwnProperty.call(settings, key)) continue;

            const normalizedTime = normalizeTimeValue(settings[key]);
            if (!normalizedTime) {
                return res.status(400).json({ message: `${key} must be a valid HH:mm time` });
            }

            settings[key] = normalizedTime;
        }

        if (Object.prototype.hasOwnProperty.call(settings, 'group_id')) {
            const normalizedGroupId = normalizeGroupId(settings.group_id);
            if (normalizedGroupId === null) {
                return res.status(400).json({ message: 'Group ID must be numeric' });
            }

            settings.group_id = normalizedGroupId;
        }

        for (const [key, value] of Object.entries(settings)) {
            await Setting.findOneAndUpdate(
                { key },
                { value, updated_at: Date.now() },
                { upsert: true }
            );
        }

        if (shouldRestartBot) {
            bot.restart().catch(error => {
                console.error('Bot restart error:', error.message);
            });
        }

        res.json({ message: 'Settings updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
