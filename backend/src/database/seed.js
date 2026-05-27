const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('./db');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Setting = require('../models/Setting');
const Order = require('../models/Order');

const TIME_ZONE = process.env.TIME_ZONE || 'Asia/Phnom_Penh';

// Helper to format Date to YYYY-MM-DD in the local timezone
const toLocalIsoDate = (date) => {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: TIME_ZONE
    }).format(date);
};

const seedData = async () => {
    try {
        console.log('Connecting to database...');
        await connectDB();

        // 1. Clear existing collections
        console.log('Clearing old database records (Users, Orders, Admins)...');
        await User.deleteMany({});
        await Order.deleteMany({});
        await Admin.deleteMany({});

        // 2. Seed Default Settings (same as app.js logic)
        console.log('Seeding default settings...');
        const defaultSettings = [
            { key: 'bot_token', value: process.env.BOT_TOKEN || 'placeholder_bot_token' },
            { key: 'group_id', value: process.env.TELEGRAM_GROUP_ID || 'placeholder_group_id' },
            { key: 'order_start_time', value: '07:00' },
            { key: 'order_end_time', value: '16:00' },
            { key: 'report_time', value: '16:20' }
        ];

        for (const setting of defaultSettings) {
            await Setting.findOneAndUpdate(
                { key: setting.key },
                { $set: setting },
                { upsert: true, new: true }
            );
        }
        console.log('Settings seeded/updated.');

        // 3. Seed Admin
        console.log('Seeding admin user...');
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await Admin.create({
            username: adminUsername,
            password: hashedPassword
        });
        console.log(`Admin user '${adminUsername}' created.`);

        // 4. Seed Staff/Users
        console.log('Seeding staff users...');
        const mockUsers = [
            { telegram_id: 111111, username: 'vireak_chao', full_name: 'Chao Vireak', branch: 'City Mall' },
            { telegram_id: 222222, username: 'sokha_ly', full_name: 'Ly Sokha', branch: 'BYD 6A' },
            { telegram_id: 333333, username: 'dara_chann', full_name: 'Chann Dara', branch: 'BYD 60M' },
            { telegram_id: 444444, username: 'bopha_reach', full_name: 'Reach Bopha', branch: 'City Mall' },
            { telegram_id: 555555, username: 'chantha_som', full_name: 'Som Chantha', branch: 'BYD 6A' },
            { telegram_id: 666666, username: 'sothea_nguon', full_name: 'Nguon Sothea', branch: 'BYD 60M' },
            { telegram_id: 777777, username: 'piseth_heng', full_name: 'Heng Piseth', branch: 'City Mall' },
            { telegram_id: 888888, username: 'kalyan_sem', full_name: 'Sem Kalyan', branch: 'BYD 6A' },
            { telegram_id: 999999, username: 'roth_lim', full_name: 'Lim Roth', branch: 'BYD 60M' },
            { telegram_id: 101010, username: 'chetra_oun', full_name: 'Oun Chetra', branch: 'City Mall' },
            { telegram_id: 202020, username: 'serey_vuth', full_name: 'Vuth Serey', branch: 'BYD 6A' },
            { telegram_id: 303030, username: 'narith_kem', full_name: 'Kem Narith', branch: 'BYD 60M' },
            { telegram_id: 404040, username: 'sophal_meas', full_name: 'Meas Sophal', branch: 'City Mall' },
            { telegram_id: 505050, username: 'leakhena_te', full_name: 'Te Leakhena', branch: 'BYD 6A' },
            { telegram_id: 606060, username: 'visal_seng', full_name: 'Seng Visal', branch: 'BYD 60M' }
        ];

        const seededUsers = await User.insertMany(mockUsers);
        console.log(`${seededUsers.length} staff users seeded successfully.`);

        // 5. Seed Order History (past 14 days + tomorrow)
        console.log('Seeding order history...');
        const ordersToInsert = [];
        const today = new Date();

        // Let's create orders for each day in range [-14, 1] (where 1 is tomorrow)
        for (let dayOffset = -14; dayOffset <= 1; dayOffset++) {
            const currentDayDate = new Date();
            currentDayDate.setDate(today.getDate() + dayOffset);
            
            // Format to YYYY-MM-DD
            const orderDateStr = toLocalIsoDate(currentDayDate);

            // Seed mock orders for this day
            for (const user of seededUsers) {
                // Randomly choose status to make the metrics dynamic:
                // 70% 'ordered', 10% 'cancelled', 20% 'not_ordered'
                const rand = Math.random();
                let status = 'ordered';
                if (rand < 0.1) {
                    status = 'cancelled';
                } else if (rand < 0.3) {
                    status = 'not_ordered';
                }

                // If 'not_ordered', we optionally create it or skip it (app reports handle missing as not_ordered,
                // but let's insert for complete coverage or skip random ones to keep DB clean).
                // Let's seed actual documents to fully test statuses
                ordersToInsert.push({
                    user: user._id,
                    order_date: orderDateStr,
                    status: status,
                    created_at: currentDayDate
                });
            }
        }

        const seededOrders = await Order.insertMany(ordersToInsert);
        console.log(`${seededOrders.length} orders seeded successfully.`);

        console.log('\n=========================================');
        console.log('   DATABASE SEEDING COMPLETED SUCCESSFULLY!');
        console.log('=========================================');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
