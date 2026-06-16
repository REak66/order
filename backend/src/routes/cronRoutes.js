const express = require('express');
const router = express.Router();
const botService = require('../services/botService');

// Middleware to verify Vercel Cron headers or custom cron secret if needed
const verifyCron = (req, res, next) => {
    // If running in development, skip verification for easy testing
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
        return next();
    }
    
    // Check if the request is made by Vercel Cron system or matches a secret token
    const isVercelCron = req.headers['x-vercel-cron'] === '1';
    const cronSecret = process.env.CRON_SECRET;
    const isSecretMatch = cronSecret && req.headers['authorization'] === `Bearer ${cronSecret}`;
    
    if (isVercelCron || isSecretMatch) {
        return next();
    }
    
    return res.status(401).json({ error: 'Unauthorized: Cron signature or secret missing' });
};

// 1. Sync group mute state
router.get('/sync-mute', verifyCron, async (req, res) => {
    try {
        console.log('[Cron] Running group mute sync...');
        await botService.getRunningBot();
        await botService.syncGroupMuteState();
        return res.json({ success: true, message: 'Group mute state synchronized' });
    } catch (error) {
        console.error('[Cron] Group mute sync error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// 2. Trigger order reminder
router.get('/reminder', verifyCron, async (req, res) => {
    try {
        console.log('[Cron] Checking/sending order reminder...');
        await botService.getRunningBot();
        await botService.sendOrderReminderIfDue();
        return res.json({ success: true, message: 'Order reminder processed' });
    } catch (error) {
        console.error('[Cron] Order reminder error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// 3. Trigger daily report
router.get('/report', verifyCron, async (req, res) => {
    try {
        console.log('[Cron] Checking/sending daily report...');
        await botService.getRunningBot();
        await botService.sendDailyReportIfDue();
        return res.json({ success: true, message: 'Daily report processed' });
    } catch (error) {
        console.error('[Cron] Daily report error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// 4. Combined tick (runs all three tasks, highly optimized for Hobby tier)
router.get('/tick', verifyCron, async (req, res) => {
    const results = {};
    
    try {
        console.log('[Cron] Executing consolidated cron tick...');
        
        // Ensure bot is initialized and DB settings are loaded
        await botService.getRunningBot();
        
        // Run sync-mute
        try {
            await botService.syncGroupMuteState();
            results.syncMute = 'success';
        } catch (e) {
            results.syncMute = `error: ${e.message}`;
        }
        
        // Run order reminder
        try {
            await botService.sendOrderReminderIfDue();
            results.reminder = 'success';
        } catch (e) {
            results.reminder = `error: ${e.message}`;
        }
        
        // Run daily report
        try {
            await botService.sendDailyReportIfDue();
            results.report = 'success';
        } catch (e) {
            results.report = `error: ${e.message}`;
        }
        
        // Run supply report auto-send
        try {
            await botService.sendSupplyReportIfDue();
            results.supplyReport = 'success';
        } catch (e) {
            results.supplyReport = `error: ${e.message}`;
        }
        
        // Run lunch order reminder
        try {
            await botService.sendLunchReminderIfDue();
            results.lunchReminder = 'success';
        } catch (e) {
            results.lunchReminder = `error: ${e.message}`;
        }
        
        return res.json({ success: true, results });
    } catch (error) {
        console.error('[Cron] Tick failed:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// 5. Telegram Webhook Setup Utility
router.get('/telegram-setup', async (req, res) => {
    try {
        console.log('[Setup] Registering Telegram webhook...');
        const runningBot = await botService.getRunningBot();
        if (!runningBot) {
            return res.status(400).json({ error: 'Telegram Bot is not configured or token is missing.' });
        }
        
        const host = req.get('host');
        // Vercel routes are always https in production, but support http for local testing
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;
        
        await runningBot.telegram.setWebhook(webhookUrl);
        
        return res.json({
            success: true,
            message: 'Telegram webhook registered successfully',
            webhookUrl
        });
    } catch (error) {
        console.error('[Setup] Webhook registration failed:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
