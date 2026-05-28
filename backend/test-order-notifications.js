#!/usr/bin/env node

/**
 * Test Script for Order Notifications
 * Tests the order placement and Telegram notification flow
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Initialize database connection
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lunch_order_db';

async function testOrderNotifications() {
    try {
        console.log('📋 Testing Order Notifications...\n');

        // Connect to MongoDB
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Import models and services
        const User = require('./src/models/User');
        const Order = require('./src/models/Order');
        const botService = require('./src/services/botService');
        const { toLocalIsoDate, getTomorrowIsoDate } = require('./src/utils/dateUtils');

        // Create or get test user
        console.log('👤 Setting up test user...');
        const testUser = await User.findOneAndUpdate(
            { telegram_id: 999999 },
            {
                telegram_id: 999999,
                username: 'testuser',
                full_name: 'Test User',
                branch: 'City Mall'
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Test user ready: ${testUser.full_name} (${testUser.branch})\n`);

        // Test 1: Send Order Notification
        console.log('📤 Test 1: Sending order notification...');
        const tomorrow = getTomorrowIsoDate();
        const testOrder = await Order.findOneAndUpdate(
            { user: testUser._id, order_date: tomorrow },
            { status: 'ordered' },
            { upsert: true, new: true }
        );
        
        const orderResult = await botService.sendOrderNotification(testUser, testOrder);
        if (orderResult) {
            console.log('✅ Order notification sent successfully\n');
        } else {
            console.log('⚠️ Order notification could not be sent (bot may not be running)\n');
        }

        // Test 2: Send Cancellation Notification
        console.log('📤 Test 2: Sending cancellation notification...');
        const today = toLocalIsoDate();
        const todayOrder = await Order.findOneAndUpdate(
            { user: testUser._id, order_date: today },
            { status: 'cancelled' },
            { upsert: true, new: true }
        );
        
        const cancelResult = await botService.sendCancellationNotification(testUser, todayOrder);
        if (cancelResult) {
            console.log('✅ Cancellation notification sent successfully\n');
        } else {
            console.log('⚠️ Cancellation notification could not be sent (bot may not be running)\n');
        }

        console.log('✅ All notification tests completed!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

testOrderNotifications();
