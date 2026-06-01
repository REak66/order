const { Telegraf, Markup } = require('telegraf');
const cron = require('node-cron');
const User = require('../models/User');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const {
    BRANCHES,
    SYMBOLS,
    BRANCH_ALIASES
} = require('../utils/constants');
const {
    TIME_ZONE,
    toLocalIsoDate,
    getTomorrowIsoDate,
    toDisplayDate,
    parseOrderDate,
    toOrderInputDate,
    getExpectedOrderIsoDate,
    isTomorrowOrderDate,
    getLunchDate
} = require('../utils/dateUtils');
require('dotenv').config();

const DEFAULT_SETTINGS = {
    bot_token: '',
    group_id: '',
    order_start_time: '07:00',
    order_end_time: '16:00',
    report_time: '16:20'
};

let bot = null;
let botToken = '';
let botLaunched = false;
let lastGroupMuteState = null;

// Persistent state helpers for Serverless stateless environments
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

const isPlaceholderToken = (token) => {
    return !token || token === 'your_telegram_bot_token_here';
};

const isValidGroupId = (groupId) => {
    return typeof groupId === 'string' && /^-?\d+$/.test(groupId.trim());
};

const isValidBranch = (branch) => {
    return BRANCHES.some(item => item.name === branch);
};

const normalizeBranch = (brand) => {
    return BRANCH_ALIASES[brand.trim().toLowerCase()] || brand.trim();
};

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

// ─── Time / Schedule Helpers ──────────────────────────────────────────────────

const parseTimeToMinutes = (time) => {
    if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return null;

    const [hours, minutes] = time.split(':').map(Number);
    if (hours > 23 || minutes > 59) return null;

    return (hours * 60) + minutes;
};

const getLocalMinutes = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: TIME_ZONE
    }).formatToParts(date);

    const hours = Number(parts.find(part => part.type === 'hour')?.value || 0);
    const minutes = Number(parts.find(part => part.type === 'minute')?.value || 0);
    return (hours * 60) + minutes;
};

const isCurrentSettingTime = async (settingKey) => {
    const settingMinutes = parseTimeToMinutes(await getSettingValue(settingKey));
    if (settingMinutes === null) return false;

    return getLocalMinutes() === settingMinutes;
};


const isTimeInRange = (currentMinutes, startMinutes, endMinutes) => {
    if (startMinutes === endMinutes) return true;
    if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const isOrderingAllowed = async (date = new Date()) => {
    const startMinutes = parseTimeToMinutes(await getSettingValue('order_start_time'));
    const endMinutes = parseTimeToMinutes(await getSettingValue('order_end_time'));

    if (startMinutes === null || endMinutes === null) return false;

    return isTimeInRange(getLocalMinutes(date), startMinutes, endMinutes);
};

const getBranchSettingValue = async (branchName, key) => {
    const normalizedBranchKey = branchName.toLowerCase().replace(/\s+/g, '_');
    const customEnabled = await getSettingValue(`branch_enabled_${normalizedBranchKey}`);
    if (customEnabled === 'true') {
        const val = await Setting.findOne({ key: `branch_${key}_${normalizedBranchKey}` });
        if (val && val.value !== undefined && val.value !== null && val.value.trim() !== '') {
            return val.value.trim();
        }
    }
    return getSettingValue(key);
};

const getBranchGroupId = async (branchName) => {
    const normalizedBranchKey = branchName.toLowerCase().replace(/\s+/g, '_');
    const customEnabled = await getSettingValue(`branch_enabled_${normalizedBranchKey}`);
    if (customEnabled === 'true') {
        const dbGroupId = await Setting.findOne({ key: `branch_group_id_${normalizedBranchKey}` });
        if (dbGroupId && dbGroupId.value && isValidGroupId(dbGroupId.value)) {
            return dbGroupId.value.trim();
        }
    }
    return null;
};

const isBranchOrderingAllowed = async (branchName, date = new Date()) => {
    const startTimeStr = await getBranchSettingValue(branchName, 'order_start_time');
    const endTimeStr = await getBranchSettingValue(branchName, 'order_end_time');

    const startMinutes = parseTimeToMinutes(startTimeStr);
    const endMinutes = parseTimeToMinutes(endTimeStr);

    if (startMinutes === null || endMinutes === null) return false;

    return isTimeInRange(getLocalMinutes(date), startMinutes, endMinutes);
};

const buildDailyReportForBranch = async (branchName, date = new Date()) => {
    const orderDate = getLunchDate(date);
    const [year, month, day] = orderDate.split('-');
    const lunchDate = new Date(`${year}-${month}-${day}T00:00:00`);
    const displayDate = toDisplayDate(lunchDate);
    const users = await User.find({ branch: branchName }).sort({ full_name: 1 });
    const orders = await Order.find({ order_date: orderDate, status: 'ordered' });
    const branch = BRANCHES.find(b => b.name === branchName) || { name: branchName, reportLabel: branchName };

    const orderedUsers = users.filter(user => (
        orders.some(order => order.user.toString() === user._id.toString())
    ));

    const count = orderedUsers.length;

    let report = `សូមពិនិត្យមើលឈ្មោះអ្នកដែលបានកម្មង់បាយ សម្រាប់ថ្ងៃទី ${displayDate}\n\n`;
    report += `📍 ${branch.reportLabel}: ${count} នាក់\n\n`;

    if (orderedUsers.length === 0) {
        report += 'មិនមានអ្នកកម្មង់\n\n';
    } else {
        report += orderedUsers
            .map((user, index) => `${index + 1}. ${formatStaffName(user)}`)
            .join('\n');
        report += '\n\n';
    }

    if (count > 0) {
        report += `សរុបចំនួនដែលបានកម្មង់: ${count} នាក់\n\n`;
    } else {
        report += `សរុបចំនួនដែលបានកម្មង់: 0 នាក់\n\n`;
    }

    report += 'ប្រសិនបើមិនឃើញឈ្មោះរបស់អ្នកសូមទាក់ទង់មកកាន់ @SreyNeang2701 និង @Thaivouchkim សូមអរគុណ!!!';
    return report.trim();
};

// ─── Message Helpers ──────────────────────────────────────────────────────────

const getTelegramMention = (ctx) => {
    if (ctx.from?.username) return `@${ctx.from.username}`;

    const fullName = `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim();
    return fullName || 'បុគ្គលិក';
};

const getOrderDateAlert = (ctx) => {
    return `${getTelegramMention(ctx)} សូមពិនិត្យកាលបរិច្ឆេទកម្មង់ម្តងទៀត។ សូមអរគុណ។`;
};

const getOrderClosedAlert = (ctx) => {
    return `${getTelegramMention(ctx)} ពេលវេលាកម្មង់បានបិទហើយ។ សូមទាក់ទង Admin @SreyNeang2701 និង @Thaivouchkim ដើម្បីការកម្មង់ដោយដៃក្នុងប្រព័ន្ធ។`;
};

const getAlreadyDoneAlert = (ctx) => {
    return `${getTelegramMention(ctx)} អ្នកបានធ្វើរួចហើយ។ ⚠️`;
};


const replyToMessage = async (ctx, message) => {
    const messageId = ctx.message?.message_id;
    if (!messageId) return ctx.reply(message);

    try {
        return await ctx.reply(message, {
            reply_to_message_id: messageId,
            allow_sending_without_reply: true
        });
    } catch (error) {
        if (error.description?.includes('message to be replied not found')) {
            return ctx.reply(message);
        }
        throw error;
    }
};

const formatStaffName = (user) => {
    return user.full_name || 'មិនស្គាល់ឈ្មោះ';
};

// ─── Report Builder ───────────────────────────────────────────────────────────

const buildDailyReport = async (date = new Date()) => {
    const orderDate = getLunchDate(date);
    const [year, month, day] = orderDate.split('-');
    const lunchDate = new Date(`${year}-${month}-${day}T00:00:00`);
    const displayDate = toDisplayDate(lunchDate);
    const users = await User.find({}).sort({ branch: 1, full_name: 1 });
    const orders = await Order.find({ order_date: orderDate, status: 'ordered' });

    let report = `សូមពិនិត្យមើលឈ្មោះអ្នកដែលបានកម្មង់បាយ សម្រាប់ថ្ងៃទី ${displayDate}\n\n`;

    const branchReports = BRANCHES.map(branch => {
        const orderedUsers = users.filter(user => (
            user.branch === branch.name &&
            orders.some(order => order.user.toString() === user._id.toString())
        ));

        const count = orderedUsers.length;
        let branchText = `📍 ${branch.reportLabel}: ${count} នាក់\n\n`;
        if (orderedUsers.length === 0) {
            branchText += 'មិនមានអ្នកកម្មង់';
        } else {
            branchText += orderedUsers
                .map((user, index) => `${index + 1}. ${formatStaffName(user)}`)
                .join('\n');
        }
        return branchText;
    });

    report += branchReports.join('\n\n') + '\n\n';

    const totalSum = users.filter(user =>
        BRANCHES.some(branch => branch.name === user.branch) &&
        orders.some(order => order.user.toString() === user._id.toString())
    ).length;

    if (totalSum > 0) {
        report += `សរុបចំនួនដែលបានកម្មង់: ${totalSum} នាក់\n\n`;
    } else {
        report += `សរុបចំនួនដែលបានកម្មង់: 0 នាក់\n\n`;
    }

    report += 'ប្រសិនបើមិនឃើញឈ្មោះរបស់អ្នកសូមទាក់ទង់មកកាន់ @SreyNeang2701 និង @Thaivouchkim សូមអរគុណ!!!';

    return report.trim();
};

const buildDailySum = async (date = new Date()) => {
    const orderDate = getLunchDate(date);
    const [year, month, day] = orderDate.split('-');
    const lunchDate = new Date(`${year}-${month}-${day}T00:00:00`);
    const displayDate = toDisplayDate(lunchDate);
    const users = await User.find({}).sort({ branch: 1, full_name: 1 });
    const orders = await Order.find({ order_date: orderDate, status: 'ordered' });

    let report = `សូមពិនិត្យមើលឈ្មោះអ្នកដែលបានកម្មង់បាយ សម្រាប់ថ្ងៃទី ${displayDate}\n\n`;
    const totalSum = users.filter(user =>
        BRANCHES.some(branch => branch.name === user.branch) &&
        orders.some(order => order.user.toString() === user._id.toString())
    ).length;

    const branchReports = BRANCHES.map(branch => {
        const orderedUsers = users.filter(user => (
            user.branch === branch.name &&
            orders.some(order => order.user.toString() === user._id.toString())
        ));

        const count = orderedUsers.length;
        let branchText = `📍 ${branch.reportLabel}: ${count} នាក់`;

        if (count > 0) {
            branchText += '\n\n' + orderedUsers
                .map((user, index) => `${index + 1}. ${formatStaffName(user)}`)
                .join('\n');
        } else if (totalSum === 0) {
            branchText += '\n\nមិនមានអ្នកកម្មង់';
        }
        return branchText;
    });

    report += branchReports.join('\n\n') + '\n\n';

    if (totalSum > 0) {
        report += `សរុបចំនួនដែលបានកម្មង់: ${totalSum} នាក់\n\n`;
    } else {
        report += `សរុបចំនួនដែលបានកម្មង់: 0 នាក់\n\n`;
    }
    report += 'ប្រសិនបើមិនឃើញឈ្មោះរបស់អ្នកសូមទាក់ទង់មកកាន់ @SreyNeang2701 និង @Thaivouchkim សូមអរគុណ!!!';

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

const syncGroupMuteState = async () => {
    const runningBot = await getRunningBot();
    if (!runningBot) return;

    // 1. Sync for branch-specific groups
    for (const branch of BRANCHES) {
        const branchGroupId = await getBranchGroupId(branch.name);
        const mainGroupId = await getGroupId();
        if (branchGroupId && branchGroupId !== mainGroupId) {
            const orderingAllowed = await isBranchOrderingAllowed(branch.name);
            const shouldMute = !orderingAllowed;

            const branchKey = branch.name.toLowerCase().replace(/\s+/g, '_');
            const stateKey = `last_mute_state_${branchKey}`;
            const lastMute = await getPersistentState(stateKey);

            if (lastMute === String(shouldMute)) continue;

            try {
                await runningBot.telegram.setChatPermissions(branchGroupId, shouldMute ? {
                    can_send_messages: false
                } : {
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
                });

                await setPersistentState(stateKey, String(shouldMute));
                console.log(`Telegram group for branch ${branch.name} (${branchGroupId}) ${shouldMute ? 'muted' : 'unmuted'} based on branch time settings.`);
            } catch (error) {
                console.error(`Group mute sync error for branch ${branch.name}:`, error.message);
            }
        }
    }

    // 2. Sync for main group
    const mainGroupId = await getGroupId();
    if (mainGroupId && mainGroupId.startsWith('-')) {
        const orderingAllowed = await isOrderingAllowed();
        const shouldMute = !orderingAllowed;
        if (lastGroupMuteState !== shouldMute) {
            try {
                await runningBot.telegram.setChatPermissions(mainGroupId, shouldMute ? {
                    can_send_messages: false
                } : {
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
                });

                lastGroupMuteState = shouldMute;
                console.log(`Main Telegram group ${shouldMute ? 'muted' : 'unmuted'} based on main order time settings.`);
            } catch (error) {
                console.error('Main group mute sync error:', error.message);
            }
        }
    }
};

const sendDailyReport = async () => {
    const runningBot = await getRunningBot();
    if (!runningBot) return false;

    const GROUP_ID = await getGroupId();
    if (!GROUP_ID) return false;

    try {
        const report = await buildDailyReport();
        await runningBot.telegram.sendMessage(GROUP_ID, report);
        return true;
    } catch (error) {
        console.error('Report error:', error.message);
        return false;
    }
};

const sendDailyReportIfDue = async () => {
    const today = toLocalIsoDate();
    const runningBot = await getRunningBot();
    if (!runningBot) return;

    // 1. Process for each branch
    for (const branch of BRANCHES) {
        const branchReportTime = await getBranchSettingValue(branch.name, 'report_time');
        const settingMinutes = parseTimeToMinutes(branchReportTime);
        if (settingMinutes !== null && getLocalMinutes() === settingMinutes) {
            const branchKey = branch.name.toLowerCase().replace(/\s+/g, '_');
            const stateKey = `last_report_date_${branchKey}`;
            const lastSent = await getPersistentState(stateKey);
            if (lastSent !== today) {
                const branchGroupId = await getBranchGroupId(branch.name);
                if (branchGroupId) {
                    try {
                        const report = await buildDailyReportForBranch(branch.name);
                        await runningBot.telegram.sendMessage(branchGroupId, report);
                        await setPersistentState(stateKey, today);
                        console.log(`Sent daily report for branch ${branch.name} to group ${branchGroupId}`);
                    } catch (error) {
                        console.error(`Daily report error for branch ${branch.name}:`, error.message);
                    }
                }
            }
        }
    }

    // 2. Process for main group
    const mainReportTime = await getSettingValue('report_time');
    const mainMinutes = parseTimeToMinutes(mainReportTime);
    if (mainMinutes !== null && getLocalMinutes() === mainMinutes) {
        const lastSent = await getPersistentState('last_report_date');
        if (lastSent !== today) {
            const mainGroupId = await getGroupId();
            if (mainGroupId) {
                try {
                    const report = await buildDailyReport();
                    await runningBot.telegram.sendMessage(mainGroupId, report);
                    await setPersistentState('last_report_date', today);
                    console.log(`Sent main daily report to group ${mainGroupId}`);
                } catch (error) {
                    console.error('Main daily report error:', error.message);
                }
            }
        }
    }
};

const sendOrderReminderIfDue = async () => {
    const today = toLocalIsoDate();
    const runningBot = await getRunningBot();
    if (!runningBot) return;

    // 1. Process for each branch
    for (const branch of BRANCHES) {
        const branchStartTime = await getBranchSettingValue(branch.name, 'order_start_time');
        const settingMinutes = parseTimeToMinutes(branchStartTime);
        if (settingMinutes !== null && getLocalMinutes() === settingMinutes) {
            const branchKey = branch.name.toLowerCase().replace(/\s+/g, '_');
            const stateKey = `last_reminder_date_${branchKey}`;
            const lastSent = await getPersistentState(stateKey);
            if (lastSent !== today) {
                const branchGroupId = await getBranchGroupId(branch.name);
                if (branchGroupId) {
                    const nextLunchDateStr = getLunchDate(new Date());
                    const [year, month, day] = nextLunchDateStr.split('-');
                    const nextLunchDate = new Date(`${year}-${month}-${day}T00:00:00`);
                    const displayDate = toDisplayDate(nextLunchDate);

                    try {
                        await runningBot.telegram.sendMessage(
                            branchGroupId,
                            `សូមអ្នកទាំងអស់គ្នាកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃស្អែក (${displayDate}) សម្រាប់សាខា ${branch.name}។\n\nទម្រង់កម្មង់:\n- ឈ្មោះ : Full Name\n- សាខា : ${branch.name.replace(/\s+/g, '')}\n- កម្មង់នៅថ្ងៃទី : ${toOrderInputDate(nextLunchDateStr)} ${SYMBOLS.ordered}`
                        );
                        await setPersistentState(stateKey, today);
                        console.log(`Sent order reminder for branch ${branch.name} to group ${branchGroupId}`);
                    } catch (error) {
                        console.error(`Order reminder error for branch ${branch.name}:`, error.message);
                    }
                }
            }
        }
    }

    // 2. Process for main group
    const mainStartTime = await getSettingValue('order_start_time');
    const mainMinutes = parseTimeToMinutes(mainStartTime);
    if (mainMinutes !== null && getLocalMinutes() === mainMinutes) {
        const lastSent = await getPersistentState('last_reminder_date');
        if (lastSent !== today) {
            const mainGroupId = await getGroupId();
            if (mainGroupId) {
                const nextLunchDateStr = getLunchDate(new Date());
                const [year, month, day] = nextLunchDateStr.split('-');
                const nextLunchDate = new Date(`${year}-${month}-${day}T00:00:00`);
                const displayDate = toDisplayDate(nextLunchDate);

                try {
                    await runningBot.telegram.sendMessage(
                        mainGroupId,
                        `សូមអ្នកទាំងអស់គ្នាកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃស្អែក (${displayDate})។\n\nទម្រង់កម្មង់:\n- ឈ្មោះ : Full Name\n- សាខា : BYD6A\n- កម្មង់នៅថ្ងៃទី : ${toOrderInputDate(nextLunchDateStr)} ${SYMBOLS.ordered}`
                    );
                    await setPersistentState('last_reminder_date', today);
                    console.log(`Sent main order reminder to group ${mainGroupId}`);
                } catch (error) {
                    console.error('Main order reminder error:', error.message);
                }
            }
        }
    }
};

// ─── Bot Handlers ─────────────────────────────────────────────────────────────

const registerHandlers = (telegramBot) => {
    telegramBot.catch((error, ctx) => {
        console.error(`Telegram update ${ctx.update?.update_id || 'unknown'} error:`, error.message);
    });

    telegramBot.command('start', async (ctx) => {
        const telegramId = ctx.from.id;
        const fullName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();

        try {
            const user = await User.findOne({ telegram_id: telegramId });

            if (!user) {
                return ctx.reply(`សូមស្វាគមន៍ ${fullName}! សូមជ្រើសរើសសាខារបស់អ្នកដើម្បីចុះឈ្មោះ:`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('City Mall', 'reg_City Mall')],
                        [Markup.button.callback('BYD 6A', 'reg_BYD 6A')],
                        [Markup.button.callback('BYD 60M', 'reg_BYD 60M')]
                    ])
                );
            }

            const tomorrowOrderDate = toOrderInputDate(getTomorrowIsoDate());
            return ctx.reply(`ប្រព័ន្ធកម្មងអាហារថ្ងៃត្រង់រួចរាល់!

សម្រាប់បកម្មង់:
- ឈ្មោះ : Full Name
- សាខា : BYD6A
- កម្មង់ថ្ងៃទី : ${tomorrowOrderDate} ${SYMBOLS.ordered}

សម្រាប់លុបការកម្មង់:
- ឈ្មោះ : Full Name
- សាខា : BYD6A
- លុបថ្ងៃទី : ${tomorrowOrderDate} ${SYMBOLS.cancelled}

លំនាំដើម: មិនកម្មង់`);
        } catch (error) {
            console.error('Bot start error:', error.message);
        }
    });

    telegramBot.action(/reg_(.+)/, async (ctx) => {
        const branch = ctx.match[1];
        const telegramId = ctx.from.id;
        const username = ctx.from.username || 'N/A';
        const fullName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();

        try {
            await User.findOneAndUpdate(
                { telegram_id: telegramId },
                { username, full_name: fullName, branch },
                { upsert: true, new: true }
            );
            await ctx.answerCbQuery(`បានចុះឈ្មោះទៅ ${branch}!`);
            await ctx.editMessageText(`ការចុះឈ្មោះសម្រាប់ ${branch} បានជោគជ័យ!\n\nឥឡូវនេះអ្នកអាចកម្មងអាហារថ្ងៃត្រង់ដោយវាយតាមទម្រង់កម្មង់។`);
        } catch (error) {
            console.error('Registration error:', error.message);
            await ctx.answerCbQuery('មានបញ្ហាក្នុងពេលចុះឈ្មោះ។');
        }
    });

    telegramBot.on('text', async (ctx, next) => {
        if (ctx.message.text && ctx.message.text.startsWith('/')) return next();

        const text = ctx.message.text;
        const telegramId = ctx.from.id;

        const orderMatch = text.match(/[-*]\s*(?:Name|ឈ្មោះ)\s*:\s*(.+)\r?\n[-*]\s*(?:Brand|សាខា)\s*:\s*(.+)\r?\n[-*]\s*(?:Order on|កម្មង់ថ្ងៃទី|កម្មង់នៅថ្ងៃទី|កាលបរិច្ឆេទ)\s*:?\s*(\d{2}-\d{2}-\d{4})\s*.*/i);
        const cancelMatch = text.match(/[-*]\s*(?:Name|ឈ្មោះ)\s*:\s*(.+)\r?\n[-*]\s*(?:Brand|សាខា)\s*:\s*(.+)\r?\n[-*]\s*(?:Cancel on|លុបថ្ងៃទី)\s*:?\s*(\d{2}-\d{2}-\d{4})\s*.*/i);

        if (!orderMatch && !cancelMatch) {
            const hasKeyword = ['Name', 'Brand', 'Order on', 'Cancel on', 'ឈ្មោះ', 'សាខា', 'កម្មង់ថ្ងៃទី', 'កម្មង់នៅថ្ងៃទី', 'កាលបរិច្ឆេទ', 'លុបថ្ងៃទី'].some(keyword => text.includes(keyword));
            if (hasKeyword) {
                return replyToMessage(ctx, 'ទម្រង់មិនត្រឹមត្រូវ។ សូមប្រើតាមគំរូកម្មង់/លុបកម្មង់។');
            }
            return;
        }

        const match = orderMatch || cancelMatch;
        const name = match[1].trim();
        const brand = normalizeBranch(match[2]);
        const dateStr = match[3];
        const isOrder = !!orderMatch;

        if (!isValidBranch(brand)) {
            return replyToMessage(ctx, 'សាខាមិនត្រឹមត្រូវ។ សូមប្រើ City Mall, BYD6A, ឬ BYD60M។');
        }

        if (!(await isBranchOrderingAllowed(brand))) {
            return replyToMessage(ctx, getOrderClosedAlert(ctx));
        }

        try {
            const user = await User.findOne({ telegram_id: telegramId });
            if (!user) return replyToMessage(ctx, 'សូមចុច /start ដើម្បីចុះឈ្មោះជាមុនសិន។');

            const isoDate = parseOrderDate(dateStr);

            if (!isoDate) {
                return replyToMessage(ctx, getOrderDateAlert(ctx));
            }

            if (!isOrder) {
                const today = toLocalIsoDate();
                const expectedOrderDate = getExpectedOrderIsoDate();
                if (isoDate <= today) {
                    return replyToMessage(ctx, `${getTelegramMention(ctx)} កាលបរិច្ឆេទកម្មង់ បានផុតកំណត់សម្រាប់លុប។ សូមអរគុណ។ ${SYMBOLS.blocked}`);
                }
                if (isoDate > expectedOrderDate) {
                    return replyToMessage(ctx, `${getTelegramMention(ctx)} កាលបរិច្ឆេទមិនទាន់បានកម្មង់។ សូមអរគុណ។ ${SYMBOLS.blocked}`);
                }
            }

            await User.findByIdAndUpdate(user._id, {
                full_name: name,
                branch: brand
            });

            if (isOrder) {
                const expectedOrderDate = getExpectedOrderIsoDate();

                if (!isTomorrowOrderDate(isoDate)) {
                    return replyToMessage(ctx, getOrderDateAlert(ctx));
                }

                const existingOrder = await Order.findOne({
                    user: user._id,
                    order_date: expectedOrderDate,
                    status: 'ordered'
                });

                if (existingOrder) {
                    return replyToMessage(ctx, getAlreadyDoneAlert(ctx));
                }

                await Order.findOneAndUpdate(
                    { user: user._id, order_date: expectedOrderDate },
                    { status: 'ordered' },
                    { upsert: true }
                );
                return;
            }

            await Order.findOneAndUpdate(
                { user: user._id, order_date: isoDate },
                { status: 'cancelled' },
                { upsert: true }
            );
            return;
        } catch (error) {
            console.error('Order/Cancel processing error:', error.message);
            return replyToMessage(ctx, 'មានបញ្ហាក្នុងការដំណើរការការកម្មង់របស់អ្នក។');
        }
    });

    telegramBot.command('report', async (ctx) => {
        try {
            const report = await buildDailyReport();
            return ctx.reply(report);
        } catch (error) {
            console.error('Manual report error:', error.message);
            return ctx.reply('មានបញ្ហាក្នុងការបង្កើតរបាយការណ៍។');
        }
    });

    telegramBot.command('sum', async (ctx) => {
        try {
            const report = await buildDailySum();
            return ctx.reply(report);
        } catch (error) {
            console.error('Manual sum report error:', error.message);
            return ctx.reply('មានបញ្ហាក្នុងការបង្កើតរបាយការណ៍សរុប។');
        }
    });

    telegramBot.command('chatid', async (ctx) => {
        return ctx.reply(`លេខសម្គាល់ក្រុម Chat ID: ${ctx.chat.id}`);
    });
};

// ─── Launch / Stop / Restart ──────────────────────────────────────────────────

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

// ─── Notification Helpers ────────────────────────────────────────────────────

const sendOrderNotification = async (user, order) => {
    const runningBot = await getRunningBot();
    if (!runningBot) return false;

    const mainGroupId = await getGroupId();
    const branchGroupId = await getBranchGroupId(user.branch);

    try {
        const displayDate = toDisplayDate(new Date(order.order_date));
        const message = `✅ *Order Confirmed*\n\n` +
            `👤 *ឈ្មោះ:* ${user.full_name || 'Unknown'}\n` +
            `🏢 *សាខា:* ${user.branch}\n` +
            `📅 *ថ្ងៃទី:* ${displayDate}`;

        if (branchGroupId) {
            await runningBot.telegram.sendMessage(branchGroupId, message, { parse_mode: 'Markdown' });
        }
        if (mainGroupId && mainGroupId !== branchGroupId) {
            await runningBot.telegram.sendMessage(mainGroupId, message, { parse_mode: 'Markdown' });
        }
        return true;
    } catch (error) {
        console.error('Order notification error:', error.message);
        return false;
    }
};

const sendCancellationNotification = async (user, order) => {
    const runningBot = await getRunningBot();
    if (!runningBot) return false;

    const mainGroupId = await getGroupId();
    const branchGroupId = await getBranchGroupId(user.branch);

    try {
        const displayDate = toDisplayDate(new Date(order.order_date));
        const message = `❌ *Order Cancelled*\n\n` +
            `👤 *ឈ្មោះ:* ${user.full_name || 'Unknown'}\n` +
            `🏢 *សាខា:* ${user.branch}\n` +
            `📅 *ថ្ងៃទី:* ${displayDate}`;

        if (branchGroupId) {
            await runningBot.telegram.sendMessage(branchGroupId, message, { parse_mode: 'Markdown' });
        }
        if (mainGroupId && mainGroupId !== branchGroupId) {
            await runningBot.telegram.sendMessage(mainGroupId, message, { parse_mode: 'Markdown' });
        }
        return true;
    } catch (error) {
        console.error('Cancellation notification error:', error.message);
        return false;
    }
};

const sendBranchUpdateNotification = async (user, order) => {
    const runningBot = await getRunningBot();
    if (!runningBot) return false;

    const mainGroupId = await getGroupId();
    const branchGroupId = await getBranchGroupId(user.branch);

    try {
        const displayDate = toDisplayDate(new Date(order.order_date));
        const message = `🔄 *Branch Updated*\n\n` +
            `👤 *ឈ្មោះ:* ${user.full_name || 'Unknown'}\n` +
            `🏢 *សាខាថ្មី:* ${user.branch}\n` +
            `📅 *ថ្ងៃទី:* ${displayDate}`;

        if (branchGroupId) {
            await runningBot.telegram.sendMessage(branchGroupId, message, { parse_mode: 'Markdown' });
        }
        if (mainGroupId && mainGroupId !== branchGroupId) {
            await runningBot.telegram.sendMessage(mainGroupId, message, { parse_mode: 'Markdown' });
        }
        return true;
    } catch (error) {
        console.error('Branch update notification error:', error.message);
        return false;
    }
};

// ─── Webhook Middleware for Vercel ───────────────────────────────────────────
let webhookCallbackCache = null;

const handleWebhook = async (req, res, next) => {
    const runningBot = await getRunningBot();
    if (!runningBot) {
        return res.status(500).send('Bot not initialized');
    }
    if (!webhookCallbackCache) {
        webhookCallbackCache = runningBot.webhookCallback('/api/telegram-webhook');
    }
    return webhookCallbackCache(req, res, next);
};

// ─── Scheduled Tasks (Only active in persistent environments, e.g., Local Dev) ──
if (!process.env.VERCEL) {
    // Auto order reminder at admin-configured order start time Cambodia time.
    cron.schedule('* * * * *', () => {
        sendOrderReminderIfDue();
    }, { timezone: TIME_ZONE });

    // Auto report at admin-configured time Cambodia time.
    cron.schedule('* * * * *', () => {
        sendDailyReportIfDue();
    }, { timezone: TIME_ZONE });

    // Keep Telegram group permissions aligned with order time settings.
    cron.schedule('* * * * *', () => {
        syncGroupMuteState();
    }, { timezone: TIME_ZONE });
}

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
    sendOrderReminderIfDue,
    sendDailyReportIfDue,
    getBranchSettingValue,
    getBranchGroupId,
    isBranchOrderingAllowed,
    buildDailyReportForBranch
};

