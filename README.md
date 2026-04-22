# Makulutu

A full-stack creator platform (subscriptions, shoutouts, M-Pesa checkout, creator workspaces, and admin tools). The repo folders may still use a legacy name; the product name is **Makulutu**.

If you already deployed with an older database name or platform slug, point `DATABASE_URL` at your existing DB and set `PLATFORM_CREATOR_SLUG` / `ADMIN_USERNAME` to match your data instead of migrating blindly.

## Features

- 🎮 **Portfolio Website**: Beautiful landing page showcasing the streamer
- 💳 **Subscription System**: Monthly subscriptions (1 KSH/month) with multi-month payment options
- 📱 **M-Pesa Integration**: STK Push payments via MegaPay API with automatic webhook confirmation
- 🔔 **Webhook Support**: Automatic payment confirmation and subscription activation
- 👥 **User Management**: User registration with TikTok username, M-Pesa, and WhatsApp numbers
- 📊 **Admin Panel**: Comprehensive dashboard with search, filters, and pagination
- ⏰ **Auto-Expiration**: Automatic subscription expiration handling via scheduled tasks
- 📲 **WhatsApp Integration**: Automated group invite link sending after successful payment
- ✅ **Success Page**: Beautiful confirmation page after payment completion
- 🔍 **Advanced Search**: Search and filter users, subscriptions, and payments
- 📄 **Pagination**: Efficient data loading with pagination support
- 🛡️ **Error Handling**: Comprehensive error handling and logging
- 📚 **API Documentation**: Complete API documentation included

## Tech Stack

### Backend
- **NestJS** - Node.js framework
- **PostgreSQL** - Database
- **TypeORM** - ORM
- **MegaPay API** - M-Pesa payment processing

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hook Form** - Form handling
- **Zod** - Validation

## Project Structure

```
.
├── backend/          # NestJS backend API
│   ├── src/
│   │   ├── user/           # User management
│   │   ├── subscription/   # Subscription logic
│   │   ├── payment/        # Payment processing
│   │   ├── megapay/        # MegaPay integration
│   │   ├── admin/          # Admin endpoints
│   │   └── tasks/          # Scheduled tasks
│   └── package.json
├── frontend/        # Next.js frontend
│   ├── app/         # Next.js app directory
│   ├── lib/         # API utilities
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- MegaPay account with API credentials

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=gamer_portfolio

# MegaPay API
MEGAPAY_API_KEY=your_api_key_here
MEGAPAY_EMAIL=your_email@example.com
MEGAPAY_BASE_URL=https://megapay.co.ke/backend/v1

# JWT (optional for future auth)
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# WhatsApp Business API (optional - for sending invite links)
# See WHATSAPP_SETUP.md for detailed setup instructions
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_API_VERSION=v22.0
WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/your_group_invite_link

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Webhook
WEBHOOK_BASE_URL=http://localhost:3001
```

4. Start the backend server:
```bash
npm run start:dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file (optional, defaults are set):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### Database Setup

The database will be automatically created and synchronized when you start the backend (in development mode). Make sure PostgreSQL is running and the database credentials in `.env` are correct.

## MegaPay Webhook Configuration

1. Log in to your MegaPay account at https://megapay.co.ke/user
2. Navigate to Account Settings or API Settings
3. Enter your webhook URL: `https://your-domain.com/megapay/webhook`
4. For local development, use a tool like ngrok to expose your local server:
   ```bash
   ngrok http 3001
   ```
   Then use the ngrok URL in MegaPay settings

## API Endpoints

### Public Endpoints

- `POST /subscriptions/register` - Register and initiate subscription payment
- `GET /payments/:id/status` - Check payment status

### Admin Endpoints

- `GET /admin/dashboard` - Get dashboard statistics
- `GET /admin/users` - Get all users
- `GET /admin/subscriptions` - Get all subscriptions
- `GET /admin/payments` - Get all payments

### Webhook

- `POST /megapay/webhook` - MegaPay payment webhook

## Subscription Flow

1. User fills out subscription form (name, TikTok username, M-Pesa number, WhatsApp number, months)
2. System creates user (if new) or uses existing user
3. Payment is created and STK Push is initiated
4. User completes payment on their phone
5. MegaPay sends webhook notification
6. System confirms payment and creates/extends subscription
7. WhatsApp invite link is sent (when implemented)

## Admin Panel

Access the admin panel at: `http://localhost:3000/admin`

The admin panel provides:
- Dashboard with statistics
- User management
- Subscription management
- Payment history

## Scheduled Tasks

The system includes a scheduled task that runs daily at midnight to check and expire subscriptions that have passed their end date.

## WhatsApp Integration

The system is ready for WhatsApp integration. You can add your WhatsApp API service in the `payment.service.ts` file in the `handleSuccessfulPayment` method. Common services include:
- Twilio WhatsApp API
- WhatsApp Business API
- Custom WhatsApp integration

## Production Deployment

### Backend

1. Set `NODE_ENV=production` in `.env`
2. Set `synchronize: false` in TypeORM config (use migrations instead)
3. Build the application:
   ```bash
   npm run build
   ```
4. Start with:
   ```bash
   npm run start:prod
   ```

### Frontend

1. Build the application:
   ```bash
   npm run build
   ```
2. Start with:
   ```bash
   npm start
   ```

## Environment Variables

### Backend Required Variables
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `MEGAPAY_API_KEY`, `MEGAPAY_EMAIL`

### Frontend Required Variables
- `NEXT_PUBLIC_API_URL` (optional, defaults to http://localhost:3001)

## License

MIT

## Support

For issues or questions, please open an issue on the repository.
