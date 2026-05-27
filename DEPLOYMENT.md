# Vercel Deployment Guide

## Pre-Deployment Checklist

### 1. **Environment Variables Setup** ✓

Set these in your Vercel project settings (Settings → Environment Variables):

**Backend Variables:**

- `MONGO_URI` - MongoDB connection string (already configured in .env)
- `JWT_SECRET` - Your JWT secret key (change from 'your_jwt_secret_key_here')
- `BOT_TOKEN` - Telegram bot token
- `TELEGRAM_GROUP_ID` - Telegram group ID for reports
- `ADMIN_USERNAME` - Admin username (default: 'admin')
- `ADMIN_PASSWORD` - Admin password (change from 'admin123')
- `FRONTEND_URL` - Set to your Vercel frontend URL (e.g., https://orderlunch.vercel.app)
- `NODE_ENV` - Set to 'production'

**Frontend Variables:**

- `VITE_API_URL` - Set to your deployed backend URL (e.g., https://orderlunch.vercel.app/api)

### 2. **Project Structure** ✓

Your project is configured as a monorepo with:

- `/backend` - Node.js/Express API
- `/frontend` - React/Vite application

### 3. **Build Scripts** ✓

- Backend: Uses `npm start` (src/app.js)
- Frontend: Uses `npm run build` (Vite build)

## Deployment Steps

### Step 1: Push to Git

```bash
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI**

```bash
npm install -g vercel
cd /Users/THARY-VIREAK/Documents/Project/Phanit/Order_Lunch
vercel --prod
```

**Option B: Using Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Configure:
   - Framework: **Monorepo** (Custom)
   - Build settings should auto-detect from vercel.json
   - Add environment variables from Step 1

### Step 3: Set Environment Variables in Vercel Dashboard

1. Go to your project → Settings → Environment Variables
2. Add all backend and frontend variables listed above
3. Make sure variables are set for Production environment

### Step 4: Verify Deployment

After deployment completes:

1. Check backend: `https://your-domain.vercel.app/` (should return JSON message)
2. Check frontend: `https://your-domain.vercel.app/` (should load the login page)
3. Test API calls by logging in to the admin dashboard

## Configuration Files Added

- **vercel.json** - Root configuration for monorepo
- **backend/vercel.json** - Backend-specific build settings
- **frontend/.env.production** - Production environment variables
- **.vercelignore** - Files to ignore during deployment

## Important Notes

1. **Database**: Your MongoDB connection string is set in `.env`. Ensure your MongoDB Atlas IP whitelist includes Vercel's IP ranges (or allow all: 0.0.0.0/0)

2. **API Routes**: All API calls should go through `/api/*` prefix (configured in vercel.json)

3. **CORS**: Backend CORS is configured to allow your Vercel frontend URL

4. **Port**: Backend will run on port 3000 on Vercel (dynamically assigned)

5. **Max Duration**: API functions have 60-second timeout - adjust if needed

## Troubleshooting

**Issue: 404 on API routes**

- Check if API route is correct: `/api/auth/login`
- Verify `vercel.json` routing is configured

**Issue: CORS errors**

- Ensure `FRONTEND_URL` environment variable is set correctly in backend
- Check allowed origins in `src/app.js`

**Issue: Database connection fails**

- Verify MongoDB connection string is correct
- Check IP whitelist in MongoDB Atlas
- Ensure database user credentials are correct

**Issue: Static files not loading**

- Clear browser cache
- Check frontend build artifacts exist (`dist/` folder)

## Rollback

If deployment fails, you can rollback from Vercel Dashboard:

1. Go to Deployments → find previous successful deployment
2. Click on it → "Redeploy"

## Next Steps

After successful deployment:

1. Update production secrets (change default admin credentials)
2. Monitor logs in Vercel Dashboard
3. Set up error tracking (Sentry, etc.)
4. Configure custom domain if needed
