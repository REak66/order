const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const User = require('../models/User');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const { BRANCHES, SYMBOLS, BRANCH_ALIASES } = require('../utils/constants');
const {
    TIME_ZONE,
    toLocalIsoDate,
    toDisplayDate,
    toOrderInputDate,
    getExpectedOrderIsoDate,
    getLunchDate
} = require('../utils/dateUtils');
require('dotenv').config();

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
    bot_token: '',
    group_id: '',
    order_start_time: '07:00',
    order_end_time: '16:00',
    report_time: '16:20'
};

/** Permissions granted when a group is unmuted. */
const FULL_CHAT_PERMISSIONS = {
    can_send_messages: true,
    can_send_audios: true,
    can_send_documents: true,
    can_send_photos: true,
    can_send_videos: true,
    can_send_video_notes: true,
    can_send_voice_notes: true,
    can_send_polls: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
    can_invite_users: true
};

const REPORT_FOOTER = 'ប្រសិនបើមិនឃើញឈ្មោះរបស់អ្នកសូមទាក់ទង់មកកាន់ @SreyNeang2701 និង @Thaivouchkim សូមអរគុណ!!!';

// ─── Module-level state ───────────────────────────────────────────────────────

let bot = null;
let botToken = '';
let botLaunched = false;
let lastGroupMuteState = null;
let webhookCallbackCache = null;

// ─── Persistent State (DB-backed, safe for serverless) ───────────────────────

const getPersistentState = async (key) => {
    try {
        const setting = await Setting.findOne({ key });
        return setting?.value || null;
    } catch (error) {
        console.error(`Error reading persistent state for key ${key}:`, error.message);
        return null;
    }
};

const setPersistentState = async (key, value) => {
    try {
        await Setting.findOneAndUpdate(
            { key },
            { value, updated_at: new Date() },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error(`Error writing persistent state for key ${key}:`, error.message);
    }
};

// ─── Validation Helpers ───────────────────────────────────────────────────────

const isPlaceholderToken = (token) =>
    !token || token === 'your_telegram_bot_token_here';

const isValidGroupId = (groupId) =>
    typeof groupId === 'string' && /^-?\d+$/.test(groupId.trim());

// ─── Settings Helpers ─────────────────────────────────────────────────────────

const getSettingValue = async (key) => {
    const setting = await Setting.findOne({ key });
    return setting?.value || DEFAULT_SETTINGS[key] || '';
};

const getConfiguredBotToken = async () => {
    const envToken = process.env.BOT_TOKEN;
    if (!isPlaceholderToken(envToken)) return envToken.trim();

    const dbToken = await getSettingValue('bot_token');
    return isPlaceholderToken(dbToken) ? '' : dbToken.trim();
};

const getGroupId = async () => {
    const dbGroupId = await getSettingValue('group_id');
    if (isValidGroupId(dbGroupId)) return dbGroupId.trim();

    const envGroupId = process.env.TELEGRAM_GROUP_ID || '';
    return isValidGroupId(envGroupId) ? envGroupId.trim() : '';
};

/**
 * Returns the branch-specific override for a given setting key,
 * falling back to the global setting if the branch has no custom value.
 */
const getBranchSettingValue = async (branchName, key) => {
    const branchKey = branchName.toLowerCase().replace(/\s+/g, '_');
    const customEnabled = await getSettingValue(`branch_enabled_${branchKey}`);
    if (customEnabled === 'true') {
        const val = await Setting.findOne({ key: `branch_${key}_${branchKey}` });
        if (val?.value?.trim()) return val.value.trim();
    }
    return getSettingValue(key);
};

/**
 * Returns the branch-specific Telegram group ID, or null if not configured.
 */
const getBranchGroupId = async (branchName) => {
    const branchKey = branchName.toLowerCase().replace(/\s+/g, '_');
    const customEnabled = await getSettingValue(`branch_enabled_${branchKey}`);
    if (customEnabled === 'true') {
        const setting = await Setting.findOne({ key: `branch_group_id_${branchKey}` });
        if (setting?.value && isValidGroupId(setting.value)) return setting.value.trim();
    }
    return null;
};

// ─── Time / Schedule Helpers ──────────────────────────────────────────────────

const parseTimeToMinutes = (time) => {
    if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [hours, minutes] = time.split(':').map(Number);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
};

const getLocalMinutes = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: TIME_ZONE
    }).formatToParts(date);

    const hours = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const minutes = Number(parts.find(p => p.type === 'minute')?.value || 0);
    return hours * 60 + minutes;
};

const isTimeInRange = (currentMinutes, startMinutes, endMinutes) => {
    if (startMinutes === endMinutes) return true;
    if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    // Wraps midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const isOrderingAllowed = async (date = new Date()) => {
    const startMinutes = parseTimeToMinutes(await getSettingValue('order_start_time'));
    const endMinutes = parseTimeToMinutes(await getSettingValue('order_end_time'));
    if (startMinutes === null || endMinutes === null) return false;
    return isTimeInRange(getLocalMinutes(date), startMinutes, endMinutes);
};

const isBranchOrderingAllowed = async (branchName, date = new Date()) => {
    const startMinutes = parseTimeToMinutes(await getBranchSettingValue(branchName, 'order_start_time'));
    const endMinutes = parseTimeToMinutes(await getBranchSettingValue(branchName, 'order_end_time'));
    if (startMinutes === null || endMinutes === null) return false;
    return isTimeInRange(getLocalMinutes(date), startMinutes, endMinutes);
};

// ─── Message / Format Helpers ─────────────────────────────────────────────────

const formatStaffName = (user) => user.full_name || 'មិនស្គាល់ឈ្មោះ';

/** Resolves an ISO date string from a Date or string value */
const resolveOrderDate = (date) =>
    typeof date === 'string' ? date : getLunchDate(date);

/** Parses an ISO date string into a display-ready Date object */
const isoToDisplayDate = (orderDate) => {
    const [year, month, day] = orderDate.split('-');
    return toDisplayDate(new Date(`${year}-${month}-${day}T00:00:00`));
};

// ─── Report Builders ──────────────────────────────────────────────────────────

/**
 * Shared helper that fetches all users and orders for a given date,
 * returning per-branch ordered-user lists and a total count.
 */
const fetchReportData = async (orderDate) => {
    const users = await User.find({}).sort({ branch: 1, full_name: 1 });
    const orders = await Order.find({ order_date: orderDate, status: 'ordered' });

    const orderedUserIds = new Set(orders.map(o => o.user.toString()));
    const isOrdered = (user) => orderedUserIds.has(user._id.toString());

    const branchData = BRANCHES.map(branch => {
        const orderedUsers = users.filter(u => u.branch === branch.name && isOrdered(u));
        return { branch, orderedUsers, count: orderedUsers.length };
    });

    const totalSum = branchData.reduce((sum, { count }) => sum + count, 0);

    return { branchData, totalSum };
};

const buildDailyReport = async (date = new Date()) => {
    const orderDate = resolveOrderDate(date);
    const displayDate = isoToDisplayDate(orderDate);
    const { branchData, totalSum } = await fetchReportData(orderDate);

    let report = `សូមពិនិត្យមើលឈ្មោះអ្នកដែលបានកម្មង់បាយ សម្រាប់ថ្ងៃទី ${displayDate}\n\n`;

    const branchReports = branchData.map(({ branch, orderedUsers, count }) => {
        let text = `📍 ${branch.reportLabel}: ${count} នាក់\n\n`;
        text += orderedUsers.length === 0
            ? 'មិនមានអ្នកកម្មង់'
            : orderedUsers.map((u, i) => `${i + 1}. ${formatStaffName(u)}`).join('\n');
        return text;
    });

    report += branchReports.join('\n\n') + '\n\n';
    report += `សរុបចំនួនដែលបានកម្មង់: ${totalSum} នាក់\n\n`;
    report += REPORT_FOOTER;

    return report.trim();
};

/**
 * Like buildDailyReport but only shows names for branches that have orders
 * (branches with 0 orders only show the count when the total is also 0).
 */
const buildDailySum = async (date = new Date()) => {
    const orderDate = resolveOrderDate(date);
    const displayDate = isoToDisplayDate(orderDate);
    const { branchData, totalSum } = await fetchReportData(orderDate);

    let report = `សូមពិនិត្យមើលឈ្មោះអ្នកដែលបានកម្មង់បាយ សម្រាប់ថ្ងៃទី ${displayDate}\n\n`;

    const branchReports = branchData.map(({ branch, orderedUsers, count }) => {
        let text = `📍 ${branch.reportLabel}: ${count} នាក់`;
        if (count > 0) {
            text += '\n\n' + orderedUsers.map((u, i) => `${i + 1}. ${formatStaffName(u)}`).join('\n');
        } else if (totalSum === 0) {
            text += '\n\nមិនមានអ្នកកម្មង់';
        }
        return text;
    });

    report += branchReports.join('\n\n') + '\n\n';
    report += `សរុបចំនួនដែលបានកម្មង់: ${totalSum} នាក់\n\n`;
    report += REPORT_FOOTER;

    return report.trim();
};

const buildDailyReportForBranch = async (branchName, date = new Date()) => {
    const orderDate = resolveOrderDate(date);
    const displayDate = isoToDisplayDate(orderDate);
    const users = await User.find({ branch: branchName }).sort({ full_name: 1 });
    const orders = await Order.find({ order_date: orderDate, status: 'ordered' });
    const branch = BRANCHES.find(b => b.name === branchName) || { name: branchName, reportLabel: branchName };

    const orderedUserIds = new Set(orders.map(o => o.user.toString()));
    const orderedUsers = users.filter(u => orderedUserIds.has(u._id.toString()));
    const count = orderedUsers.length;

    let report = `សូមពិនិត្យមើលឈ្មោះអ្នកដែលបានកម្មង់បាយ សម្រាប់ថ្ងៃទី ${displayDate}\n\n`;
    report += `📍 ${branch.reportLabel}: ${count} នាក់\n\n`;
    report += count === 0
        ? 'មិនមានអ្នកកម្មង់\n\n'
        : orderedUsers.map((u, i) => `${i + 1}. ${formatStaffName(u)}`).join('\n') + '\n\n';
    report += `សរុបចំនួនដែលបានកម្មង់: ${count} នាក់\n\n`;
    report += REPORT_FOOTER;

    return report.trim();
};

// ─── Bot Lifecycle ────────────────────────────────────────────────────────────

const getRunningBot = async () => {
    if (bot) return bot;

    const configuredToken = await getConfiguredBotToken();
    if (!configuredToken) {
        console.warn('Telegram bot is not running. Check BOT_TOKEN or saved bot_token setting.');
        return null;
    }

    try {
        bot = new Telegraf(configuredToken);
        registerHandlers(bot);
        botToken = configuredToken;
        return bot;
    } catch (error) {
        console.error('Failed to initialize Telegram bot on demand:', error.message);
        return null;
    }
};

const launch = async () => {
    const configuredToken = await getConfiguredBotToken();
    if (!configuredToken) {
        console.warn('Telegram Bot not started: BOT_TOKEN or Settings > Bot Token is missing.');
        return false;
    }

    if (botLaunched && configuredToken === botToken) return true;

    await stop('restart');
    bot = new Telegraf(configuredToken);
    registerHandlers(bot);
    botToken = configuredToken;
    botLaunched = true;

    if (process.env.VERCEL) {
        console.log('Running on Vercel: Telegram Bot configured for webhooks.');
    } else {
        try {
            const botInfo = await bot.telegram.getMe();
            bot.launch().catch(error => {
                botLaunched = false;
                console.error('Bot polling error:', error.message);
            });
            console.log(`Telegram Bot started as @${botInfo.username} (Long Polling)`);
        } catch (error) {
            console.error('Bot launch failed:', error.message);
            botLaunched = false;
        }
    }

    await syncGroupMuteState();
    return true;
};

const stop = async (reason = 'stop') => {
    if (!bot) return;
    try {
        bot.stop(reason);
    } catch (error) {
        console.error('Bot stop error:', error.message);
    } finally {
        bot = null;
        botToken = '';
        botLaunched = false;
        lastGroupMuteState = null;
        webhookCallbackCache = null;
    }
};

const restart = async () => {
    await stop('settings changed');
    return launch();
};

// ─── Bot Handlers ─────────────────────────────────────────────────────────────

const registerHandlers = (telegramBot) => {
    telegramBot.catch((error, ctx) => {
        console.error(`Telegram update ${ctx.update?.update_id || 'unknown'} error:`, error.message);
    });
    telegramBot.command('chatid', async (ctx) => {
        return ctx.reply(`លេខសម្គាល់ក្រុម Chat ID: ${ctx.chat.id}`);
    });
};

// ─── Group Mute Sync ─────────────────────────────────────────────────────────

/** Sets chat permissions for a group (mute or full access). */
const setChatMuteState = async (runningBot, groupId, shouldMute) => {
    await runningBot.telegram.setChatPermissions(
        groupId,
        shouldMute ? { can_send_messages: false } : FULL_CHAT_PERMISSIONS
    );
};

const syncGroupMuteState = async () => {
    const runningBot = await getRunningBot();
    if (!runningBot) return;

    const mainGroupId = await getGroupId();

    // 1. Sync branch-specific groups
    for (const branch of BRANCHES) {
        const branchGroupId = await getBranchGroupId(branch.name);
        if (!branchGroupId || branchGroupId === mainGroupId) continue;

        const shouldMute = !(await isBranchOrderingAllowed(branch.name));
        const branchKey = branch.name.toLowerCase().replace(/\s+/g, '_');
        const stateKey = `last_mute_state_${branchKey}`;
        const lastMute = await getPersistentState(stateKey);

        if (lastMute === String(shouldMute)) continue;

        try {
            await setChatMuteState(runningBot, branchGroupId, shouldMute);
            await setPersistentState(stateKey, String(shouldMute));
            console.log(`Branch group ${branch.name} (${branchGroupId}) ${shouldMute ? 'muted' : 'unmuted'}.`);
        } catch (error) {
            console.error(`Mute sync error for branch ${branch.name}:`, error.message);
        }
    }

    // 2. Sync main group
    if (mainGroupId?.startsWith('-')) {
        const shouldMute = !(await isOrderingAllowed());
        if (lastGroupMuteState === shouldMute) return;

        try {
            await setChatMuteState(runningBot, mainGroupId, shouldMute);
            lastGroupMuteState = shouldMute;
            console.log(`Main group ${shouldMute ? 'muted' : 'unmuted'}.`);
        } catch (error) {
            console.error('Main group mute sync error:', error.message);
        }
    }
};

// ─── Message Replace Helper ──────────────────────────────────────────────────────

/**
 * Deletes the previously stored report message for a group (if any),
 * then sends a new message and persists the new message_id.
 */
const replaceGroupMessage = async (runningBot, groupId, text, parseMode = null) => {
    const stateKey = `last_msg_id_${groupId}`;
    const lastMsgId = await getPersistentState(stateKey);

    if (lastMsgId) {
        try {
            await runningBot.telegram.deleteMessage(groupId, Number(lastMsgId));
            console.log(`[replace] Deleted old message ${lastMsgId} in group ${groupId}`);
        } catch (err) {
            console.warn(`[replace] Could not delete msg ${lastMsgId} in ${groupId}:`, err.message);
        }
    } else {
        console.log(`[replace] No previous message stored for group ${groupId}, sending fresh.`);
    }

    const opts = parseMode ? { parse_mode: parseMode } : {};
    const sent = await runningBot.telegram.sendMessage(groupId, text, opts);
    await setPersistentState(stateKey, String(sent.message_id));
    console.log(`[replace] Stored new message_id ${sent.message_id} for group ${groupId}`);
    return sent;
};

// ─── Scheduled Messaging ──────────────────────────────────────────────────────

const sendDailyReport = async () => {
    const runningBot = await getRunningBot();
    if (!runningBot) return false;

    const groupId = await getGroupId();
    if (!groupId) return false;

    try {
        const report = await buildDailyReport();
        await replaceGroupMessage(runningBot, groupId, report);
        return true;
    } catch (error) {
        console.error('Report error:', error.message);
        return false;
    }
};

/**
 * Generic helper: runs `action(groupId)` if the current local time matches
 * `settingMinutes` and the state key has not been set to `today`.
 */
const runIfDueToday = async (settingMinutes, stateKey, today, action) => {
    if (settingMinutes === null || getLocalMinutes() !== settingMinutes) return;
    const lastSent = await getPersistentState(stateKey);
    if (lastSent === today) return;
    await action();
    await setPersistentState(stateKey, today);
};

const sendDailyReportIfDue = async () => {
    const runningBot = await getRunningBot();
    if (!runningBot) return;

    const today = toLocalIsoDate();

    // 1. Branch reports
    for (const branch of BRANCHES) {
        const branchGroupId = await getBranchGroupId(branch.name);
        if (!branchGroupId) continue;

        const branchReportTime = await getBranchSettingValue(branch.name, 'report_time');
        const settingMinutes = parseTimeToMinutes(branchReportTime);
        const branchKey = branch.name.toLowerCase().replace(/\s+/g, '_');

        await runIfDueToday(settingMinutes, `last_report_date_${branchKey}`, today, async () => {
            const report = await buildDailyReportForBranch(branch.name);
            await replaceGroupMessage(runningBot, branchGroupId, report);
            console.log(`Sent daily report for branch ${branch.name} to group ${branchGroupId}`);
        });
    }

    // 2. Main group report
    const mainGroupId = await getGroupId();
    if (mainGroupId) {
        const mainMinutes = parseTimeToMinutes(await getSettingValue('report_time'));
        await runIfDueToday(mainMinutes, 'last_report_date', today, async () => {
            const report = await buildDailyReport();
            await replaceGroupMessage(runningBot, mainGroupId, report);
            console.log(`Sent main daily report to group ${mainGroupId}`);
        });
    }
};

const sendOrderReminderIfDue = async () => {
    const runningBot = await getRunningBot();
    if (!runningBot) return;

    const today = toLocalIsoDate();
    const nextLunchDateStr = getLunchDate(new Date());
    const displayDate = isoToDisplayDate(nextLunchDateStr);

    // 1. Branch reminders
    for (const branch of BRANCHES) {
        const branchGroupId = await getBranchGroupId(branch.name);
        if (!branchGroupId) continue;

        const branchStartTime = await getBranchSettingValue(branch.name, 'order_start_time');
        const settingMinutes = parseTimeToMinutes(branchStartTime);
        const branchKey = branch.name.toLowerCase().replace(/\s+/g, '_');

        await runIfDueToday(settingMinutes, `last_reminder_date_${branchKey}`, today, async () => {
            await runningBot.telegram.sendMessage(
                branchGroupId,
                `សូមអ្នកទាំងអស់គ្នាកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃស្អែក (${displayDate}) សម្រាប់សាខា ${branch.name} តាមរយៈគេហទំព័រ (Website)។`
            );
            console.log(`Sent order reminder for branch ${branch.name} to group ${branchGroupId}`);
        });
    }

    // 2. Main group reminder
    const mainGroupId = await getGroupId();
    if (mainGroupId) {
        const mainMinutes = parseTimeToMinutes(await getSettingValue('order_start_time'));
        await runIfDueToday(mainMinutes, 'last_reminder_date', today, async () => {
            await runningBot.telegram.sendMessage(
                mainGroupId,
                `សូមអ្នកទាំងអស់គ្នាកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃស្អែក (${displayDate})។\n\nទម្រង់កម្មង់:\n- ឈ្មោះ : Full Name\n- សាខា : BYD6A\n- កម្មង់នៅថ្ងៃទី : ${toOrderInputDate(nextLunchDateStr)} ${SYMBOLS.ordered}`
            );
            console.log(`Sent main order reminder to group ${mainGroupId}`);
        });
    }
};

// ─── Notification Helpers ─────────────────────────────────────────────────────

/**
 * Sends a plain (non-replacing) message to both the branch and main group.
 * Used for one-off notification headers.
 */
const sendToGroups = async (runningBot, mainGroupId, branchGroupId, message) => {
    if (branchGroupId) {
        await runningBot.telegram.sendMessage(branchGroupId, message);
    }
    if (mainGroupId && mainGroupId !== branchGroupId) {
        await runningBot.telegram.sendMessage(mainGroupId, message);
    }
};

/**
 * Sends an updated report to both the branch and main group,
 * replacing (deleting) the previous report message in each group.
 */
const sendReportToGroups = async (runningBot, mainGroupId, branchGroupId, report) => {
    if (branchGroupId) {
        await replaceGroupMessage(runningBot, branchGroupId, report);
    }
    if (mainGroupId && mainGroupId !== branchGroupId) {
        await replaceGroupMessage(runningBot, mainGroupId, report);
    }
};

/**
 * Shared notification sender.
 * Sends TWO messages: (1) a short notification header, (2) the full daily report.
 */
const sendNotification = async (user, order, buildHeader) => {
    const runningBot = await getRunningBot();
    if (!runningBot) return false;

    const mainGroupId = await getGroupId();
    const branchGroupId = await getBranchGroupId(user.branch);

    try {
        const orderDate = resolveOrderDate(order.order_date);
        const displayDate = isoToDisplayDate(orderDate);
        const header = buildHeader(user, displayDate);
        const report = await buildDailySum(orderDate);

        // Message 1: notification header (always new)
        await sendToGroups(runningBot, mainGroupId, branchGroupId, header);
        // Message 2: full updated report (replaces old report)
        await sendReportToGroups(runningBot, mainGroupId, branchGroupId, report);
        return true;
    } catch (error) {
        console.error('Notification error:', error.message);
        return false;
    }
};

const sendOrderNotification = (user, order) =>
    sendNotification(user, order, (u, date) =>
        `✅ Order Confirmed\n\n` +
        `👤 ឈ្មោះ: ${u.full_name || 'Unknown'}\n` +
        `🏢 សាខា: ${u.branch}\n` +
        `📅 ថ្ងៃទី: ${date}`
    );

const sendCancellationNotification = (user, order) =>
    sendNotification(user, order, (u, date) =>
        `❌ Order Cancelled\n\n` +
        `👤 ឈ្មោះ: ${u.full_name || 'Unknown'}\n` +
        `🏢 សាខា: ${u.branch}\n` +
        `📅 ថ្ងៃទី: ${date}`
    );

const sendBranchUpdateNotification = async (user, order, oldBranch = null) => {
    const runningBot = await getRunningBot();
    if (!runningBot) return false;

    const mainGroupId = await getGroupId();
    const newBranchGroupId = await getBranchGroupId(user.branch);
    const oldBranchGroupId = oldBranch ? await getBranchGroupId(oldBranch) : null;

    try {
        const orderDate = resolveOrderDate(order.order_date);
        const displayDate = isoToDisplayDate(orderDate);

        const header =
            `🔄 Branch Updated\n\n` +
            `👤 ឈ្មោះ: ${user.full_name || 'Unknown'}\n` +
            `🏢 សាខាថ្មី: ${user.branch}\n` +
            `📅 ថ្ងៃទី: ${displayDate}`;

        const fullReport = await buildDailySum(orderDate);

        // Collect unique group IDs to notify
        const groupsToNotify = new Set();
        if (newBranchGroupId) groupsToNotify.add(newBranchGroupId);
        if (oldBranchGroupId && oldBranchGroupId !== newBranchGroupId) groupsToNotify.add(oldBranchGroupId);
        if (mainGroupId && !groupsToNotify.has(mainGroupId)) groupsToNotify.add(mainGroupId);

        for (const gid of groupsToNotify) {
            // Message 1: notification header (always new)
            await runningBot.telegram.sendMessage(gid, header);
            // Message 2: full updated report (replaces old report)
            await replaceGroupMessage(runningBot, gid, fullReport);
        }

        return true;
    } catch (error) {
        console.error('Branch update notification error:', error.message);
        return false;
    }
};

// ─── Report Update ────────────────────────────────────────────────────────────

/**
 * Re-sends updated daily reports to relevant groups when an order is
 * created, cancelled, or branch-changed.
 *
 * @param {object} user - The user document (must have `.branch`)
 * @param {string} orderDate - ISO date string (e.g. '2025-01-15')
 * @param {string|null} oldBranch - Previous branch name if a branch change occurred
 */
const sendDailyReportUpdate = async (user, orderDate, oldBranch = null) => {
    const runningBot = await getRunningBot();
    if (!runningBot) return;

    const today = toLocalIsoDate();
    const lunchDate = getExpectedOrderIsoDate();

    /**
     * Returns true if the daily report for this group has already been
     * sent today and thus needs to be re-sent with updated data.
     */
    const hasReportBeenSent = async (oDate, branchName = null) => {
        if (oDate < lunchDate) return true;
        if (oDate !== lunchDate) return false;

        const stateKey = branchName
            ? `last_report_date_${branchName.toLowerCase().replace(/\s+/g, '_')}`
            : 'last_report_date';
        return (await getPersistentState(stateKey)) === today;
    };

    const mainGroupId = await getGroupId();

    // 1. Re-send main group report
    if (mainGroupId && await hasReportBeenSent(orderDate)) {
        try {
            const report = await buildDailyReport(orderDate);
            await replaceGroupMessage(runningBot, mainGroupId, report);
            console.log(`Sent updated main report for date ${orderDate} to group ${mainGroupId}`);
        } catch (error) {
            console.error('Error sending main report update:', error.message);
        }
    }

    // 2. Re-send new branch group report
    if (user?.branch) {
        const newBranchGroupId = await getBranchGroupId(user.branch);
        if (newBranchGroupId && newBranchGroupId !== mainGroupId && await hasReportBeenSent(orderDate, user.branch)) {
            try {
                const report = await buildDailyReportForBranch(user.branch, orderDate);
                await replaceGroupMessage(runningBot, newBranchGroupId, report);
                console.log(`Sent updated report for branch ${user.branch} to group ${newBranchGroupId}`);
            } catch (error) {
                console.error(`Error sending branch report update for ${user.branch}:`, error.message);
            }
        }
    }

    // 3. Re-send old branch group report (if branch was changed)
    if (oldBranch && oldBranch !== user?.branch) {
        const oldBranchGroupId = await getBranchGroupId(oldBranch);
        if (oldBranchGroupId && oldBranchGroupId !== mainGroupId && await hasReportBeenSent(orderDate, oldBranch)) {
            try {
                const report = await buildDailyReportForBranch(oldBranch, orderDate);
                await replaceGroupMessage(runningBot, oldBranchGroupId, report);
                console.log(`Sent updated report for old branch ${oldBranch} to group ${oldBranchGroupId}`);
            } catch (error) {
                console.error(`Error sending report update for old branch ${oldBranch}:`, error.message);
            }
        }
    }
};

// ─── Webhook Middleware (Vercel) ──────────────────────────────────────────────

const handleWebhook = async (req, res, next) => {
    const runningBot = await getRunningBot();
    if (!runningBot) return res.status(500).send('Bot not initialized');

    if (!webhookCallbackCache) {
        webhookCallbackCache = runningBot.webhookCallback('/api/telegram-webhook');
    }
    return webhookCallbackCache(req, res, next);
};

// ─── Scheduled Tasks (Non-Vercel / persistent environments only) ──────────────

if (!process.env.VERCEL) {
    const CRON_OPTS = { timezone: TIME_ZONE };
    cron.schedule('* * * * *', () => sendOrderReminderIfDue(), CRON_OPTS);
    cron.schedule('* * * * *', () => sendDailyReportIfDue(), CRON_OPTS);
    cron.schedule('* * * * *', () => syncGroupMuteState(), CRON_OPTS);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    launch,
    restart,
    stop,
    getRunningBot,
    handleWebhook,
    syncGroupMuteState,
    sendDailyReport,
    buildDailyReport,
    buildDailySum,
    sendOrderNotification,
    sendCancellationNotification,
    sendBranchUpdateNotification,
    sendDailyReportUpdate,
    sendOrderReminderIfDue,
    sendDailyReportIfDue,
    getBranchSettingValue,
    getGroupId,
    getBranchGroupId,
    isBranchOrderingAllowed,
    buildDailyReportForBranch
};