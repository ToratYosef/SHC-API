# Routes Migration Summary

All routes from `functions/routes/` have been successfully converted to TypeScript in the `server/routes/` folder.

## Build & Run Commands

### Development
```bash
npm run dev
```
Runs the server in development mode with hot reloading using tsx.

### Production Build
```bash
npm run build
```
This command does two things:
1. Builds the Vite frontend
2. Bundles the backend using esbuild into `dist/index.js`

### Production Run
```bash
npm start
```
Runs the production build from `dist/index.js`.

### Other Useful Commands
- `npm run seed` - Seed the database
- `npm run check` - TypeScript type checking
- `npm test` - Run tests
- `npm run db:push` - Push database schema changes

---

## Converted Routes

All routes are now accessible under the `/api` prefix.

### 1. **Emails Routes** (`/api`)
**File:** `server/routes/emails.ts`

- `POST /api/send-email` - Send a custom email
- `POST /api/test-emails` - Send test emails
- `POST /api/orders/:id/send-condition-email` - Send condition-specific email to customer
- `POST /api/orders/:id/fmi-cleared` - Mark FMI status as cleared

**Services Used:**
- `server/services/email.ts` - Nodemailer email service
- `server/helpers/emailTemplates.ts` - Email templates

---

### 2. **IMEI Routes** (`/api`)
**File:** `server/routes/imei.ts`

- `POST /api/check-esn` - Check IMEI/ESN status, carrier lock, and device info

**Services Used:**
- `server/services/phonecheck.ts` - PhoneCheck API integration
- `server/services/email.ts` - For blacklist notifications

---

### 3. **Labels Routes** (`/api`)
**File:** `server/routes/labels.ts`

- `POST /api/generate-label/:id` - Generate shipping labels (kit or email)
- `POST /api/orders/:id/return-label` - Generate return shipping label

**Services Used:**
- `server/services/shipstation.ts` - ShipStation API integration
- `server/services/email.ts` - For label email notifications

---

### 4. **Orders Routes** (`/api`)
**File:** `server/routes/orders.ts`

- `POST /api/fetch-pdf` - Fetch PDF content
- `GET /api/orders` - Get all orders (with filters)
- `GET /api/orders/needs-printing` - Get orders that need printing
- `POST /api/orders/needs-printing/bundle` - Create print bundle
- `POST /api/merge-print` - Merge PDFs for printing
- `GET /api/merge-print/:orderIds` - Get merged print by order IDs
- `GET /api/orders/:id` - Get single order by ID
- `GET /api/orders/find` - Find orders by query parameters
- `GET /api/orders/by-user/:userId` - Get orders for specific user
- `POST /api/submit-order` - Submit new order
- `GET /api/promo-codes/:code` - Get promo code details
- `POST /api/generate-label/:id` - Generate label via ShipEngine
- `POST /api/orders/:id/void-label` - Void shipping label
- `GET /api/packing-slip/:id` - Get packing slip PDF
- `GET /api/print-bundle/:id` - Get complete print bundle
- `POST /api/repair-label-generated` - Repair label_generated status orders
- `POST /api/orders/repair-label-generated` - Alias for repair endpoint

---

### 5. **Webhook Routes** (`/api`)
**File:** `server/routes/webhook.ts`

- `POST /api/webhook/shipstation` - ShipStation webhook handler (with signature verification)

---

## Total Routes Converted

**24 routes** across **5 route files** (wholesale removed)

## Services & Helpers Created

### Services (`server/services/`)
1. **email.ts** - Nodemailer email service with TypeScript types
2. **phonecheck.ts** - PhoneCheck API integration for IMEI/ESN checks
3. **shipstation.ts** - ShipStation API integration for label generation

### Helpers (`server/helpers/`)
1. **emailTemplates.ts** - Email HTML templates with variable replacement

## Route Registration

All routes are registered in `server/routes.ts`:

```typescript
app.use("/api", createEmailsRouter());
app.use("/api", createImeiRouter());
app.use("/api", createLabelsRouter());
app.use("/api", createOrdersRouter());
app.use("/api", createWebhookRouter());
```

## Next Steps

Each route file contains TODO comments for database integration:

1. **Connect to your database** - Replace TODO comments with actual database queries for orders
2. **Add cloud storage** - Implement label PDF upload to Firebase Storage or S3
3. **Add authentication middleware** - Secure routes that require auth
4. **Implement PDF generation** - For packing slips and custom labels
5. **Add error handling** - Improve error messages and logging

## Environment Variables Required

```env
# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# ShipStation
SHIPSTATION_KEY=your-shipstation-api-key
SHIPSTATION_SECRET=your-shipstation-api-secret
SHIPSTATION_WEBHOOK_SECRET=your-webhook-secret

# PhoneCheck
PHONECHECK_USERNAME=your-phonecheck-username
PHONECHECK_PASSWORD=your-phonecheck-password
PHONECHECK_API_KEY=your-phonecheck-api-key

# Session
SESSION_SECRET=your-session-secret

# CORS
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com

# Node Environment
NODE_ENV=development
PORT=5000
```

## Dependencies Installed

The following packages were added to support the migrated routes:
- `axios` - HTTP client for API calls
- `nodemailer` - Email sending
- `@types/nodemailer` - TypeScript types for nodemailer

## Testing

You can test the routes using:

### Send Email
```bash
curl -X POST http://localhost:5000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>This is a test</p>"
  }'
```

### Check IMEI
```bash
curl -X POST http://localhost:5000/api/check-esn \
  -H "Content-Type: application/json" \
  -d '{
    "imei": "123456789012345",
    "orderId": "TEST-123",
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  }'
```

### Generate Label
```bash
curl -X POST http://localhost:5000/api/generate-label/TEST-123 \
  -H "Content-Type: application/json"
```

## Changes from Functions Folder

- **Removed**: All wholesale routes and functionality
- **Added**: Proper TypeScript types for all services
- **Updated**: Uses environment variables instead of Firebase Functions config
- **Modernized**: Uses ES6 modules instead of CommonJS
- **Simplified**: Direct service imports instead of dependency injection
