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
    getTomorrowDate,
    getTomorrowIsoDate,
    toDisplayDate,
    getTomorrowDisplayDate,
    parseOrderDate,
    toOrderInputDate,
    getExpectedOrderIsoDate,
    isTomorrowOrderDate,
    isTodayOrFutureOrderDate
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
let lastDailyReportDate = null;
let lastOrderReminderDate = null;

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

const isCurrentReportTime = async () => {
    return isCurrentSettingTime('report_time');
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

// ─── Message Helpers ──────────────────────────────────────────────────────────

const getTelegramMention = (ctx) => {
    if (ctx.from?.username) return `@${ctx.from.username}`;

    const fullName = `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim();
    return fullName || 'បុគ្គលិក';
};

const getOrderDateAlert = (ctx) => {
    return `${getTelegramMention(ctx)} សូមពិនិត្យកាលបរិច្ឆេទបញ្ជាទិញម្តងទៀត។ សូមអរគុណ។`;
};

const getOrderClosedAlert = (ctx) => {
    return `${getTelegramMention(ctx)} ពេលវេលាបញ្ជាទិញបានបិទហើយ។ សូមទាក់ទង Admin ដើម្បីបញ្ចូលការបញ្ជាទិញដោយដៃក្នុងប្រព័ន្ធ។`;
};

const getAlreadyDoneAlert = (ctx) => {
    return `${getTelegramMention(ctx)} អ្នកបានធ្វើរួចហើយ។ ⚠️`;
};

const getPastCancelAlert = () => {
    return 'អ្នកមិនអាចលុបការកម្មងកាលពីថ្ងៃមុនបានទេ!!!⚠️';
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
    const username = user.username && user.username !== 'N/A' ? ` @${user.username.replace(/^@/, '')}` : '';
    return `${user.full_name || 'មិនស្គាល់ឈ្មោះ'}${username}`;
};

// ─── Report Builder ───────────────────────────────────────────────────────────

const buildDailyReport = async (date = new Date()) => {
    const lunchDate = getTomorrowDate(date);
    const orderDate = toLocalIsoDate(lunchDate);
    const displayDate = toDisplayDate(lunchDate);
    const users = await User.find({}).sort({ branch: 1, full_name: 1 });
    const orders = await Order.find({ order_date: orderDate, status: 'ordered' });
    let report = `សូមពិនិត្យមើលឈ្មោះអ្នកដែលបានកម្មងបាយ សម្រាប់ថ្ងៃទី ${displayDate}\n\n`;

    BRANCHES.forEach(branch => {
        const orderedUsers = users.filter(user => (
            user.branch === branch.name &&
            orders.some(order => order.user.toString() === user._id.toString())
        ));

        report += `📍 ${branch.reportLabel}\n\n`;

        if (orderedUsers.length === 0) {
            report += 'មិនមានអ្នកបញ្ជាទិញ\n';
        } else {
            report += orderedUsers
                .map((user, index) => `${index + 1}. ${formatStaffName(user)}`)
                .join('\n');
            report += '\n';
        }

        report += '\n';
    });

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

    const groupId = await getGroupId();
    if (!groupId) return;
    if (!groupId.startsWith('-')) return;

    const orderingAllowed = await isOrderingAllowed();
    const shouldMute = !orderingAllowed;
    if (lastGroupMuteState === shouldMute) return;

    try {
        await runningBot.telegram.setChatPermissions(groupId, shouldMute ? {
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
        console.log(`Telegram group ${shouldMute ? 'muted' : 'unmuted'} based on order time settings.`);
    } catch (error) {
        console.error('Group mute sync error:', error.message);
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
    if (!(await isCurrentReportTime())) return;

    const today = toLocalIsoDate();
    if (lastDailyReportDate === today) return;

    console.log('Running daily lunch report...');
    const sent = await sendDailyReport();
    if (sent) {
        lastDailyReportDate = today;
    }
};

const sendOrderReminderIfDue = async () => {
    if (!(await isCurrentSettingTime('order_start_time'))) return;

    const runningBot = await getRunningBot();
    if (!runningBot) return;

    const today = toLocalIsoDate();
    if (lastOrderReminderDate === today) return;

    try {
        const GROUP_ID = await getGroupId();
        if (!GROUP_ID) return;

        await runningBot.telegram.sendMessage(
            GROUP_ID,
            `សូមអ្នកទាំងអស់គ្នាបញ្ជាទិញអាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃស្អែក (${getTomorrowDisplayDate()})។\n\nទម្រង់បញ្ជាទិញ:\n- Name : Full Name\n- Brand : BYD6A\n- Order on ${toOrderInputDate(getTomorrowIsoDate())} ${SYMBOLS.ordered}`
        );
        lastOrderReminderDate = today;
    } catch (error) {
        console.error('Order reminder error:', error.message);
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
            return ctx.reply(`ប្រព័ន្ធបញ្ជាទិញអាហារថ្ងៃត្រង់រួចរាល់!

សម្រាប់បញ្ជាទិញ:
- Name : Full Name
- Brand : BYD6A
- Order on ${tomorrowOrderDate} ${SYMBOLS.ordered}

សម្រាប់លុបការបញ្ជាទិញ:
- Name : Full Name
- Brand : BYD6A
- Cancel on ${tomorrowOrderDate} ${SYMBOLS.cancelled}

លំនាំដើម: មិនបញ្ជាទិញ`);
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
            await ctx.editMessageText(`ការចុះឈ្មោះសម្រាប់ ${branch} បានជោគជ័យ!\n\nឥឡូវនេះអ្នកអាចបញ្ជាទិញអាហារថ្ងៃត្រង់ដោយវាយតាមទម្រង់បញ្ជាទិញ។`);
        } catch (error) {
            console.error('Registration error:', error.message);
            await ctx.answerCbQuery('មានបញ្ហាក្នុងពេលចុះឈ្មោះ។');
        }
    });

    telegramBot.on('text', async (ctx) => {
        if (ctx.chat.type === 'private' && ctx.message.text.startsWith('/')) return;

        const text = ctx.message.text;
        const telegramId = ctx.from.id;

        const orderMatch = text.match(/[-*]\s*Name\s*:\s*(.+)\r?\n[-*]\s*Brand\s*:\s*(.+)\r?\n[-*]\s*Order on\s*(\d{2}-\d{2}-\d{4})\s*.*/i);
        const cancelMatch = text.match(/[-*]\s*Name\s*:\s*(.+)\r?\n[-*]\s*Brand\s*:\s*(.+)\r?\n[-*]\s*Cancel on\s*(\d{2}-\d{2}-\d{4})\s*.*/i);

        if (!orderMatch && !cancelMatch) {
            if (text.includes('Name') || text.includes('Brand') || text.includes('Order on') || text.includes('Cancel on')) {
                return replyToMessage(ctx, 'ទម្រង់មិនត្រឹមត្រូវ។ សូមប្រើតាមគំរូបញ្ជាទិញ/លុបការបញ្ជាទិញ។');
            }
            return;
        }

        if (!(await isOrderingAllowed())) {
            return replyToMessage(ctx, getOrderClosedAlert(ctx));
        }

        const match = orderMatch || cancelMatch;
        const name = match[1].trim();
        const brand = normalizeBranch(match[2]);
        const dateStr = match[3];
        const isOrder = !!orderMatch;

        try {
            const user = await User.findOne({ telegram_id: telegramId });
            if (!user) return replyToMessage(ctx, 'សូមចុច /start ដើម្បីចុះឈ្មោះជាមុនសិន។');

            if (!isValidBranch(brand)) {
                return replyToMessage(ctx, 'សាខាមិនត្រឹមត្រូវ។ សូមប្រើ City Mall, BYD6A, ឬ BYD60M។');
            }

            const isoDate = parseOrderDate(dateStr);

            if (!isoDate) {
                return replyToMessage(ctx, getOrderDateAlert(ctx));
            }

            if (!isOrder && !isTodayOrFutureOrderDate(isoDate)) {
                return replyToMessage(ctx, getPastCancelAlert());
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
                return replyToMessage(ctx, `បញ្ជាក់ការបញ្ជាទិញ ${SYMBOLS.confirm}`);
            }

            await Order.findOneAndUpdate(
                { user: user._id, order_date: isoDate },
                { status: 'cancelled' },
                { upsert: true }
            );
            return replyToMessage(ctx, `បានលុបការបញ្ជាទិញ ${SYMBOLS.blocked}`);
        } catch (error) {
            console.error('Order/Cancel processing error:', error.message);
            return replyToMessage(ctx, 'មានបញ្ហាក្នុងការដំណើរការសំណើរបស់អ្នក។');
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

    const botInfo = await bot.telegram.getMe();
    bot.launch().catch(error => {
        botLaunched = false;
        console.error('Bot polling error:', error.message);
    });

    botToken = configuredToken;
    botLaunched = true;
    console.log(`Telegram Bot started as @${botInfo.username}`);
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

    const groupId = await getGroupId();
    if (!groupId) return false;

    try {
        const displayDate = toDisplayDate(new Date(order.order_date));
        const message = `✅ *Order Confirmed*\n\n` +
            `👤 *Name:* ${user.full_name || 'Unknown'}\n` +
            `🏢 *Branch:* ${user.branch}\n` +
            `📅 *Date:* ${displayDate}\n` +
            `${SYMBOLS.ordered}`;

        await runningBot.telegram.sendMessage(groupId, message, { parse_mode: 'Markdown' });
        return true;
    } catch (error) {
        console.error('Order notification error:', error.message);
        return false;
    }
};

const sendCancellationNotification = async (user, order) => {
    const runningBot = await getRunningBot();
    if (!runningBot) return false;

    const groupId = await getGroupId();
    if (!groupId) return false;

    try {
        const displayDate = toDisplayDate(new Date(order.order_date));
        const message = `❌ *Order Cancelled*\n\n` +
            `👤 *Name:* ${user.full_name || 'Unknown'}\n` +
            `🏢 *Branch:* ${user.branch}\n` +
            `📅 *Date:* ${displayDate}\n` +
            `${SYMBOLS.blocked}`;

        await runningBot.telegram.sendMessage(groupId, message, { parse_mode: 'Markdown' });
        return true;
    } catch (error) {
        console.error('Cancellation notification error:', error.message);
        return false;
    }
};

// ─── Scheduled Tasks ──────────────────────────────────────────────────────────

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

module.exports = {
    launch,
    restart,
    stop,
    syncGroupMuteState,
    sendDailyReport,
    buildDailyReport,
    sendOrderNotification,
    sendCancellationNotification
};
