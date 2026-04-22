# Installation Guide

## Quick Start

### 1. Install SweetAlert2

```bash
cd frontend
yarn add sweetalert2
# or
npm install sweetalert2
```

### 2. Install All Dependencies

**Backend:**
```bash
cd backend
yarn install
# or
npm install
```

**Frontend:**
```bash
cd frontend
yarn install
# or
npm install
```

### 3. Set Up Environment Variables

**Backend** (`.env` file):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/makulutu
MEGAPAY_API_KEY=your_api_key
MEGAPAY_EMAIL=your_email@example.com
MEGAPAY_BASE_URL=https://megapay.co.ke/backend/v1
WEBHOOK_BASE_URL=http://localhost:3001
NGROK_URL=https://your-ngrok-url.ngrok.io  # Optional for development
# WhatsApp Business API (Optional - see WHATSAPP_SETUP.md for setup)
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_API_VERSION=v22.0
WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/your_group_link
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`.env.local` file):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Generate Prisma Client

```bash
cd backend
yarn prisma generate
```

### 5. Run Database Migrations (if needed)

```bash
cd backend
yarn prisma migrate dev
```

### 6. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
yarn start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn dev
```

**Terminal 3 - ngrok (for webhook testing):**
```bash
ngrok http 3001
```

Then update `NGROK_URL` in backend `.env` with the ngrok URL.

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Admin Panel**: http://localhost:3000/admin
- **Subscribe Page**: http://localhost:3000/subscribe

## Features Included

All features are now implemented! See `FEATURES_ADDED.md` for the complete list.

## Troubleshooting

### SweetAlert2 not working
- Make sure you've installed it: `yarn add sweetalert2`
- Check browser console for errors
- Verify imports are correct

### Payment webhook not receiving
- Check ngrok is running
- Verify `NGROK_URL` in `.env` matches ngrok URL
- Check backend logs for webhook requests
- Test webhook endpoint: `GET /megapay/webhook/test`

### Database connection errors
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run `yarn prisma generate` again

## Next Steps

1. Configure MegaPay webhook URL in their dashboard
2. Set up WhatsApp API (optional)
3. Test the complete payment flow
4. Deploy to production using `DEPLOYMENT.md`
