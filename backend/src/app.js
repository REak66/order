const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const connectDB = require('./database/db');
const bot = require('./services/botService');
const Admin = require('./models/Admin');
const Setting = require('./models/Setting');
require('dotenv').config();

const app = express();

// CORS — allow local dev + the deployed Vercel frontend
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://order-swart-seven.vercel.app',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.get('/', (req, res) => {
    res.json({ message: 'Order Lunch backend is running' });
});

app.use('/auth', authRoutes);
app.use('/staff', staffRoutes);
app.use('/reports', reportRoutes);
app.use('/settings', settingsRoutes);
app.use('/dashboard', dashboardRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

// Global Error Handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Initialize Database
const initDatabase = async () => {
    try {
        // Default Settings
        const defaultSettings = [
            { key: 'bot_token', value: '' },
            { key: 'group_id', value: '' },
            { key: 'order_start_time', value: '07:00' },
            { key: 'order_end_time', value: '16:00' },
            { key: 'report_time', value: '16:20' }
        ];

        for (const setting of defaultSettings) {
            await Setting.findOneAndUpdate(
                { key: setting.key },
                { $setOnInsert: setting },
                { upsert: true }
            );
        }

        // Seed Admin
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        const adminExists = await Admin.findOne({ username });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await Admin.create({ username, password: hashedPassword });
            console.log(`Admin user '${username}' seeded.`);
        }

        console.log('Database initialized.');
    } catch (error) {
        console.error('Error initializing database:', error.message);
    }
};

// Start Bot and Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        await initDatabase();

        bot.launch().catch(err => console.error('Bot launch error:', err.message));

        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Set a different PORT in backend/.env or stop the existing process.`);
                process.exit(1);
            }
            throw error;
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
process.once('SIGUSR2', async () => {
    await bot.stop('SIGUSR2');
    process.kill(process.pid, 'SIGUSR2');
});

module.exports = app;
