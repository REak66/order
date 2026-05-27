#!/usr/bin/env node

/**
 * Test Order Placement via API
 * Tests the full flow of creating an order and receiving Telegram notification
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5002/api';
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lunch_order_db';

async function testOrderPlacement() {
    try {
        console.log('🧪 Testing Order Placement with Telegram Notification...\n');

        // Connect to MongoDB to create test user
        await mongoose.connect(mongoUri);
        const User = require('./src/models/User');

        // Create test user
        console.log('👤 Creating test user...');
        const testUser = await User.findOneAndUpdate(
            { telegram_id: 888888 },
            {
                telegram_id: 888888,
                username: 'apitest',
                full_name: 'API Test User',
                branch: 'BYD 6A'
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Test user created: ${testUser.full_name}\n`);

        // Get auth token (use admin credentials)
        console.log('🔑 Authenticating...');
        const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        const token = authResponse.data.token;
        console.log('✅ Authenticated\n');

        // Create order via API
        console.log('📋 Creating order via API...');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const orderDate = tomorrow.toISOString().split('T')[0];

        const orderResponse = await axios.post(
            `${API_BASE_URL}/reports/manual-order`,
            {
                userId: testUser._id.toString(),
                orderDate: orderDate,
                status: 'ordered',
                branch: 'BYD 6A'
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        console.log('✅ Order created successfully!');
        console.log(`   Order ID: ${orderResponse.data.order._id}`);
        console.log(`   Status: ${orderResponse.data.order.status}`);
        console.log(`   Order Date: ${orderResponse.data.order.order_date}\n`);

        console.log('💬 Check the Telegram group - you should see an order confirmation message!');
        console.log('   Message should contain:');
        console.log('   - ✅ Order Confirmed');
        console.log('   - User name, branch, and order date\n');

        // Wait a moment for notification
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('✅ Test completed!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response?.data) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testOrderPlacement();
