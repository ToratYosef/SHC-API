# SHC-API Deployment Guide

## Quick Deploy to Render

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository `ToratYosef/SHC-API`
   - Render will automatically detect `render.yaml`
   - Add environment variables in Render dashboard:
     - `DATABASE_URL`: Your Neon PostgreSQL connection string
     - `EMAIL_USER`: sales@secondhandcell.com
     - `EMAIL_PASS`: Your Gmail app password
     - `EMAIL_FROM`: "SecondHandCell <sales@secondhandcell.com>"
     - `SHIPENGINE_KEY`: Your ShipEngine API key
     - `PHONECHECK_USERNAME`: aecells1
     - `PHONECHECK_API_KEY`: Your PhoneCheck API key
     - `STRIPE_SECRET_KEY`: Your Stripe secret key
     - `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
     - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
   - Click "Apply" to deploy

3. **Your API will be live at**: `https://shc-api.onrender.com`

## Alternative: Deploy to Railway

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and Deploy**:
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Add Environment Variables**:
   ```bash
   railway variables set DATABASE_URL="postgresql://..."
   railway variables set EMAIL_USER="sales@secondhandcell.com"
   # ... add all other env vars
   ```

## Alternative: Deploy to Fly.io

1. **Install Fly CLI**: https://fly.io/docs/hands-on/install-flyctl/

2. **Deploy**:
   ```bash
   fly launch
   fly secrets set DATABASE_URL="postgresql://..."
   # ... add all other env vars
   fly deploy
   ```

## Environment Variables Required

All variables from `server/.env`:
- `DATABASE_URL`
- `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
- `SHIPENGINE_KEY`, `SHIPENGINE_KEY_TEST`
- `SHIPENGINE_FROM_*` (address details)
- `PHONECHECK_USERNAME`, `PHONECHECK_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SESSION_SECRET`
- `CORS_ORIGINS`
- `APP_FRONTEND_URL`

## Post-Deployment

After deployment, update your frontend to point to the new API URL in your Firebase config.
