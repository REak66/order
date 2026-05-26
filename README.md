<<<<<<< HEAD
# order
=======
# Staff Lunch Order System

A professional Telegram Bot and Web Admin Dashboard for managing staff lunch orders.

## Features

- **Telegram Bot**: 
  - Staff registration by branch.
  - One-click lunch ordering and cancellation via inline buttons.
  - Automatic 12:00 PM cutoff for orders.
  - Automated daily lunch reports sent to a specified group.
  - Reminders for staff who haven't ordered.

- **Admin Dashboard**:
  - Real-time statistics and order trends.
  - Comprehensive staff management (Add/Edit/Delete/Branch Assignment).
  - Filterable lunch reports (by Date and Branch).
  - Export reports to Excel and PDF.
  - Bot and system configuration.

## Tech Stack

- **Backend**: Node.js, Express.js, Telegraf, MongoDB/Mongoose, JWT, ExcelJS, jsPDF.
- **Frontend**: React.js, Vite, Tailwind CSS, Lucide Icons, Recharts.

## Setup Instructions

### 1. Database Setup
- Install and run MongoDB locally, or provide a MongoDB connection string.
- The app uses the `lunch_order_db` database by default.

### 2. Backend Setup
- Navigate to `backend/`.
- Run `npm install`.
- Copy `.env.example` to `.env` and fill in your details:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `BOT_TOKEN` (From @BotFather)
  - `TELEGRAM_GROUP_ID` (ID of the group where reports should be sent)
- Run `npm start` or `npm run dev`.

### 3. Frontend Setup
- Navigate to `frontend/`.
- Run `npm install`.
- Run `npm run dev` for development or `npm run build` for production.

## Telegram Bot Usage
1. Add the bot to your company group.
2. Staff should send `/start` to the bot (privately or in group).
3. Follow registration steps to select a branch.
4. Use the inline buttons to manage lunch orders daily before 12:00 PM.

## Deployment Guide (Ubuntu)
1. **Node.js**: Install via NVM.
2. **Database**: Install MongoDB or use a hosted MongoDB connection string.
3. **PM2**: Use PM2 to manage the backend process.
   ```bash
   pm2 start src/app.js --name "lunch-backend"
   ```
4. **Nginx**: Setup Nginx as a reverse proxy for the backend and to serve the built frontend.
   - Example configuration in `docs/nginx.conf`.
5. **SSL**: Use Certbot (Let's Encrypt) to secure the dashboard.

## License
MIT
>>>>>>> d90732d (Initial commit)
