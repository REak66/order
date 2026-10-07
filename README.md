# Staff Lunch Order System (ប្រព័ន្ធគ្រប់គ្រងការកម្មង់អាហារថ្ងៃត្រង់)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.19-blue.svg?logo=express)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_/_Mongoose-47A248.svg?logo=mongodb)](https://www.mongodb.com/)
[![Telegraf](https://img.shields.io/badge/Telegram_Bot-Telegraf_v4-2CA5E0.svg?logo=telegram)](https://telegraf.js.org/)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel-black.svg?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern full-stack lunch ordering and management system designed for multi-branch organizations. The platform pairs a smart, bilingual **Telegram Bot** for employee self-service with a responsive **Web Admin Workspace & Staff Portal** for real-time tracking, supplier management, and exportable reports.

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features](#-key-features)
  - [Telegram Bot](#-telegram-bot)
  - [Web Admin Dashboard](#-web-admin-dashboard)
  - [Staff Portal](#-staff-portal)
- [Supported Branches](#-supported-branches)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Environment Configuration](#-environment-configuration)
- [Getting Started (Local Development)](#-getting-started-local-development)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Database Seeding](#2-database-seeding)
  - [3. Frontend Setup](#3-frontend-setup)
- [Telegram Bot Setup & Usage](#-telegram-bot-setup--usage)
  - [Bot Commands](#bot-commands)
  - [Ordering via Telegram Chat](#ordering-via-telegram-chat)
- [Automated Cron Tasks & Webhooks](#-automated-cron-tasks--webhooks)
- [Deployment](#-deployment)
  - [Deploy to Vercel](#deploy-to-vercel-recommended)
  - [Deploy to Linux / Ubuntu VPS](#deploy-to-linux--ubuntu-vps-pm2--nginx)
- [Contributing & License](#-license)

---

## 🚀 Overview & Architecture

The application is structured as a full-stack monorepo:

```
┌────────────────────────────────┐         ┌─────────────────────────────────┐
│     Staff via Telegram         │         │      Staff & Admin Browsers     │
│   (Group Chat or Direct Bot)   │         │ (Staff Portal & Admin Dashboard)│
└───────────────┬────────────────┘         └────────────────┬────────────────┘
                │ Telegram Webhook / Polling                │ HTTPS / REST API
                ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Express.js Backend API                            │
│  - Telegraf Bot Engine        - JWT Authentication      - Cron Orchestrator │
│  - Order & Standby Validator  - Report Generator (XLSX) - Mute Controller   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Mongoose ODM
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             MongoDB Database                                │
│   (Admins, Users, Orders, Holidays, Positions, Departments, Settings)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🤖 Telegram Bot
- **Bilingual Message Parsing**: Parses ordering requests in both Khmer and English (`Name: ...`, `Brand: ...`, `Order on DD-MM-YYYY ✅`).
- **Multi-Branch Auto-Detection**: Recognizes aliases for all company branches (e.g., `BYD 6A`, `City Mall`, `BYD 60M`).
- **Telegram ID Auto-Binding**: Automatically associates staff accounts with their Telegram ID upon first order.
- **Standby Duty Rules for Public Holidays**: Restricts orders on Cambodia national holidays strictly to active standby staff.
- **Automated Group Mute / Unmute**: Automatically restricts message permissions in the Telegram group after the cut-off time and restores them when ordering hours open.
- **Scheduled Automated Reminders**: Dispatches scheduled reminder alerts before cut-off deadlines.
- **Daily & Supplier Lunch Reports**: Automatically posts formatted daily lunch summaries and supplier numbers to the designated Telegram group.

### 📊 Web Admin Dashboard
- **Analytics & Trends**: Real-time stats on orders by branch, food type distributions, daily order activity, and participation rates.
- **Staff Directory Management**: Add, edit, remove staff members; assign departments, positions, branches, and toggle public holiday **Standby Duty**.
- **Manual Order Override**: Admins can place, cancel, or adjust orders on behalf of staff members across single or multiple dates.
- **Public Holiday Management**: Integrated Cambodia 2026 holiday calendar with support for custom holidays and active/inactive toggles.
- **Branch & Supplier Schedule Settings**: Configure independent order windows (`order_start_time`, `order_end_time`), report generation time, advance order horizons, and weekend rules per branch.
- **Exporting**: One-click export of daily or date-range lunch reports to formatted **Excel (`.xlsx`)** spreadsheets and **PDF** documents.
- **Bot Diagnostics & Controls**: Test Telegram bot connections, trigger manual syncs, and verify group settings directly from the UI.

### 👤 Staff Portal
- **Lightweight Self-Service**: Mobile-first portal allowing staff to authenticate, check menu details, place lunch orders for upcoming days, and review personal ordering history.

---

## 🏢 Supported Branches

The system comes pre-configured with support for multi-branch environments:

| Branch Name | Report Label | Recognized Aliases |
| :--- | :---: | :--- |
| **BYD 6A** | `6A` | `6A`, `BYD 6A`, `byd6a` |
| **City Mall** | `CityMall` | `City Mall`, `citymall`, `city mall` |
| **BYD 60M** | `60M` | `60M`, `BYD 60M`, `byd60m` |

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express.js 4, Telegraf 4, Mongoose 9, JWT, bcryptjs, ExcelJS, jsPDF, node-cron, Morgan |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, FlyonUI, Framer Motion, Lucide Icons, Recharts, Axios, date-fns |
| **Database** | MongoDB (Local or MongoDB Atlas) |
| **Timezone** | `Asia/Phnom_Penh` (UTC+7) |
| **Hosting** | Vercel (Monorepo Serverless) or Linux VPS (Node.js + PM2 + Nginx) |

---

## 📁 Project Structure

```text
Order_Lunch/
├── backend/                     # Node.js Express API & Telegram Bot
│   ├── src/
│   │   ├── app.js               # Server entry point & route registration
│   │   ├── controllers/         # Request handlers (auth, staff, reports, settings, etc.)
│   │   ├── database/            # MongoDB connection & seed scripts
│   │   ├── middleware/          # JWT authentication, error handling
│   │   ├── models/              # Mongoose schemas (User, Order, Setting, Holiday, etc.)
│   │   ├── routes/              # Express API endpoints
│   │   ├── services/            # Telegram botService, scheduler, notification logic
│   │   └── utils/               # Constants, Cambodia holiday calendar, date helpers
│   ├── .env.example             # Backend environment template
│   ├── package.json             # Backend dependencies & scripts
│   └── vercel.json              # Backend Vercel serverless configuration
├── frontend/                    # React + Vite Web Application
│   ├── src/
│   │   ├── components/          # Reusable UI widgets, modals, charts, buttons
│   │   ├── context/             # AuthContext, ThemeContext
│   │   ├── layouts/             # DashboardLayout & navigation sidebars
│   │   ├── pages/               # Dashboard, Staff, ManualOrder, Reports, Holidays, Settings
│   │   ├── utils/               # Client-side helpers and API clients
│   │   ├── App.jsx              # Application router & route guards
│   │   └── main.jsx             # React DOM entry
│   ├── .env.example             # Frontend environment template
│   ├── package.json             # Frontend dependencies & scripts
│   ├── tailwind.config.js       # Tailwind CSS & FlyonUI theme configuration
│   └── vite.config.js           # Vite build pipeline
├── DEPLOYMENT.md                # Comprehensive Vercel deployment manual
├── vercel.json                  # Root Vercel monorepo configuration
└── package.json                 # Monorepo build orchestrator
```

---

## 📋 Prerequisites

Before running the project locally or deploying, ensure you have:
1. **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
2. **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017` or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection string
3. **Telegram Bot Token**: Created via [@BotFather](https://t.me/BotFather) on Telegram
4. **Telegram Group Chat ID**: The numeric ID of the group receiving lunch reports

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and update the variables:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | API server listening port | `5002` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `MONGO_URI` | MongoDB connection URI | `mongodb://localhost:27017/lunch_order_db` |
| `JWT_SECRET` | Secret key for signing admin and staff JWTs | `super_secret_jwt_key_here` |
| `JWT_EXPIRES_IN` | Duration before token expiration | `7d` |
| `BOT_TOKEN` | Telegram Bot token provided by @BotFather | `8702984374:AAH_...` |
| `TELEGRAM_GROUP_ID` | Telegram chat ID for reminders & reports | `-1001234567890` |
| `TIME_ZONE` | Primary organization timezone | `Asia/Phnom_Penh` |
| `ADMIN_USERNAME` | Default master administrator username | `admin` |
| `ADMIN_PASSWORD` | Default master administrator password | `admin123` |
| `FRONTEND_URL` | Allowed CORS origin for web application | `http://localhost:5173` |
| `CRON_SECRET` | Secret bearer token protecting external cron calls | `generate_with_openssl_rand_hex_32` |

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL pointing to Express backend API | `http://localhost:5002/api` |

---

## 🏃 Getting Started (Local Development)

### 1. Backend Setup

```bash
cd backend
npm install
```

Make sure your `backend/.env` is configured properly.

### 2. Database Seeding

Populate the database with default configurations, administrative accounts, departments, positions, and the Cambodian holiday calendar:

```bash
npm run db:seed
```

> **Default Admin Credentials**:
> - **Username**: `admin`
> - **Password**: `admin123` *(change this upon first login)*

Start the backend in development mode with hot-reload:

```bash
npm run dev
# The API will be available at http://localhost:5002
```

### 3. Frontend Setup

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
# The Web Dashboard will be available at http://localhost:5173
```

---

## 💬 Telegram Bot Setup & Usage

### Adding the Bot to Your Group
1. Create a bot using [@BotFather](https://t.me/BotFather) and copy the HTTP API token to `BOT_TOKEN`.
2. Add the bot to your company lunch Telegram group.
3. **Promote the bot to Administrator** with permissions to delete/pin messages and modify chat permissions (required for group auto-mute/unmute features).
4. Send `/chatid` in the group to get the group's ID, then update `TELEGRAM_GROUP_ID` in your backend `.env` or in the **Admin Settings** page.

### Bot Commands

| Command | Scope | Description |
| :--- | :--- | :--- |
| `/chatid` | Group / Private | Returns the current chat's numeric ID |
| `/holidays` | Group / Private | Lists upcoming official holidays and standby order policies |
| `/standby` | Private | Checks the caller's standby duty status for upcoming holidays |

### Ordering via Telegram Chat

Staff can order directly in the group or privately by texting the bot using natural language or template formats:

**Khmer Format:**
```text
- Name : សុខ សាន
- Branch : BYD 6A
- Order on 08-10-2026 ✅
```

**English Format:**
```text
- Name : Sok San
- Branch : City Mall
- Order on 08-10-2026 ✅
```

**Multiple Dates in One Message:**
```text
- Name : Sok San
- Branch : BYD 60M
- Order on 08-10-2026, 09-10-2026 ✅
```

---

## ⏰ Automated Cron Tasks & Webhooks

When deployed to serverless environments such as Vercel, background `node-cron` intervals cannot run indefinitely. The system provides dedicated HTTP cron endpoints that can be triggered by external schedulers (e.g., Vercel Cron or [cron-job.org](https://cron-job.org)):

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/cron/tick` | `GET` | Consolidated tick: checks mute sync, reminders, and daily report |
| `/api/cron/sync-mute` | `GET` | Evaluates ordering window and mutes/unmutes group chat |
| `/api/cron/reminder` | `GET` | Dispatches scheduled reminder messages to un-ordered staff |
| `/api/cron/report` | `GET` | Dispatches daily lunch summaries and food counts to Telegram group |
| `/api/cron/telegram-setup` | `GET` | Automatically registers the Telegram webhook with Telegram servers |

> **Security Note**: When calling `/api/cron/*` endpoints in production, provide the header `Authorization: Bearer <CRON_SECRET>` or trigger via Vercel Cron.

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

The project includes root-level `vercel.json` configurations designed for unified monorepo deployment:

1. Push your repository to GitHub or GitLab.
2. Import your project into [Vercel](https://vercel.com/).
3. In Project Settings, configure your Environment Variables (`MONGO_URI`, `JWT_SECRET`, `BOT_TOKEN`, `TELEGRAM_GROUP_ID`, `CRON_SECRET`, etc.).
4. Deploy the project.
5. Visit `https://your-deployment.vercel.app/api/telegram-setup` once after deployment to activate Telegram webhook mode.

For step-by-step instructions, see the complete [Vercel Deployment Guide](file:///Users/THARY-VIREAK/Documents/Project/Phanit/Order_Lunch/DEPLOYMENT.md).

### Deploy to Linux / Ubuntu VPS (PM2 + Nginx)

1. **Clone and Install**:
   ```bash
   git clone <repo-url> /var/www/order-lunch
   cd /var/www/order-lunch/backend && npm install --production
   cd /var/www/order-lunch/frontend && npm install && npm run build
   ```

2. **Run Backend with PM2**:
   ```bash
   pm2 start backend/src/app.js --name "lunch-backend"
   pm2 save && pm2 startup
   ```

3. **Configure Nginx**:
   Set up Nginx as a reverse proxy for the API (`/api` -> port `5002`) and serve the frontend static build from `frontend/dist`.

4. **SSL**:
   Secure with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
