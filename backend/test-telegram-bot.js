#!/usr/bin/env node

/**
 * Telegram Bot Test Script
 * Tests bot connection and sends test message
 */

const { Telegraf } = require('telegraf');
require('dotenv').config();

const BOT_TOKEN = '8702984374:AAH_LxuikY-P6VWDqe7rMPp1RggGih2Mh08';
const CHAT_ID = '-5286480236';

async function testTelegramBot() {
    try {
        console.log('🤖 Testing Telegram Bot...\n');

        // Create bot instance
        const bot = new Telegraf(BOT_TOKEN);

        // Get bot info
        console.log('📡 Fetching bot information...');
        const botInfo = await bot.telegram.getMe();
        console.log(`✅ Bot connected as: @${botInfo.username}`);
        console.log(`   Bot ID: ${botInfo.id}`);
        console.log(`   First Name: ${botInfo.first_name}\n`);

        // Get chat info
        console.log('📡 Fetching chat information...');
        const chatInfo = await bot.telegram.getChat(CHAT_ID);
        console.log(`✅ Chat: ${chatInfo.title || chatInfo.first_name || 'Direct Message'}`);
        console.log(`   Chat ID: ${chatInfo.id}`);
        console.log(`   Chat Type: ${chatInfo.type}\n`);

        // Send test message
        console.log('📤 Sending test message...');
        const message = await bot.telegram.sendMessage(
            CHAT_ID,
            '🧪 **Test Message from Order Lunch Bot**\n\n' +
            'This is a test message to verify the Telegram bot is working correctly.\n\n' +
            '✅ Bot connection successful!\n' +
            `📅 Test time: ${new Date().toLocaleString()}\n\n` +
            '🎉 Your bot is ready to receive orders!',
            { parse_mode: 'Markdown' }
        );
        console.log(`✅ Message sent successfully!`);
        console.log(`   Message ID: ${message.message_id}`);
        console.log(`   Chat ID: ${message.chat.id}\n`);

        console.log('✅ All tests passed! Bot is working correctly.\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error testing bot:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.statusCode);
            console.error('Response description:', error.response.description);
        }
        process.exit(1);
    }
}

testTelegramBot();
