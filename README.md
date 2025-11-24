# SHC-API

SecondHandCell API - Express.js backend with PostgreSQL (Neon), Stripe payments, email notifications, and shipping integrations.

## Features

- 🗄️ **PostgreSQL Database** with Drizzle ORM (Neon serverless)
- 📧 **Email Service** via Nodemailer (Gmail SMTP)
- 💳 **Stripe Integration** for payment processing
- 📦 **Shipping Services**: ShipStation & ShipEngine APIs
- 📱 **IMEI/ESN Validation** via PhoneCheck API
- 🔐 **Session Management** with express-session
- 🚀 **Modern TypeScript** setup with Vite

## Quick Start

1. **Clone and Install**:
   ```bash
   git clone https://github.com/ToratYosef/SHC-API.git
   cd SHC-API
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Setup Database**:
   ```bash
   npm run db:push    # Push schema to Neon PostgreSQL
   npm run seed       # Seed initial data
   ```

4. **Run Development Server**:
   ```bash
   npm run dev        # Full app with Vite
   # OR
   npm run dev:api    # API only (faster)
   ```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for:
- ✅ Render (recommended)
- Railway
- Fly.io
- Vercel

**Quick Deploy to Render**:
1. Push code to GitHub
2. Connect repository to Render
3. Render auto-detects `render.yaml`
4. Add environment variables
5. Deploy! 🎉

## API Routes

### Device Management
- `GET /api/device-categories` - List all categories
- `GET /api/device-models` - List all device models
- `GET /api/device-variants/:id` - Get variant details

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/:id/generate-label` - Generate shipping label
- `POST /api/orders/:id/void-label` - Void shipping label

### Email
- `POST /api/send-email` - Send transactional email
- `POST /api/orders/:id/send-condition-email` - Send device condition notification

### IMEI Validation
- `POST /api/check-esn` - Validate device IMEI/ESN

### Webhooks
- `POST /api/webhook/shipstation` - ShipStation webhook handler

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` - Neon PostgreSQL connection string
- `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` - Email configuration
- `SHIPENGINE_KEY` - ShipEngine API key
- `PHONECHECK_API_KEY` - PhoneCheck API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `SESSION_SECRET` - Session encryption secret
- `CORS_ORIGINS` - Allowed CORS origins

## Scripts

```bash
npm run dev          # Development with Vite
npm run build        # Build for production
npm run build:api    # Build API only
npm run start        # Start production server
npm run start:api    # Start API server only
npm run seed         # Seed database
npm run db:push      # Push schema to database
npm run check        # TypeScript type checking
```

## Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Language**: TypeScript
- **Build**: Vite + esbuild
- **Email**: Nodemailer
- **Payments**: Stripe
- **Shipping**: ShipStation, ShipEngine
- **Device Validation**: PhoneCheck

## Project Structure

```
SHC-API/
├── server/
│   ├── routes/          # API route handlers
│   ├── services/        # External API integrations
│   ├── helpers/         # Email templates, utilities
│   ├── db.ts           # Database connection
│   ├── storage.ts      # Data access layer
│   └── index.ts        # Server entry point
├── shared/
│   └── schema.ts       # Drizzle schema definitions
├── dist/               # Built output
└── package.json
```

## License

MIT
