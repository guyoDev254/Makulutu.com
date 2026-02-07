# Quick Setup Guide

## Step 1: Database Setup

1. Install PostgreSQL if not already installed
2. Create a database:
```sql
CREATE DATABASE gamer_portfolio;
```

## Step 2: Backend Setup

```bash
cd backend
npm install
```

Create `.env` file with your configuration (see README.md for all variables).

## Step 3: Frontend Setup

```bash
cd frontend
npm install
```

## Step 4: MegaPay Configuration

1. Sign up at https://megapay.co.ke
2. Link your M-Pesa Till, Paybill, or Bank Account
3. Get your API Key from the dashboard
4. Add API Key and Email to backend `.env` file
5. Configure webhook URL in MegaPay dashboard:
   - Production: `https://your-domain.com/megapay/webhook`
   - Development: Use ngrok: `ngrok http 3001` then use the ngrok URL

## Step 5: Run the Application

### Terminal 1 - Backend
```bash
cd backend
npm run start:dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

## Step 6: Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Admin Panel: http://localhost:3000/admin

## WhatsApp Integration (Optional)

To enable WhatsApp invite links:

1. Choose a WhatsApp API provider (Twilio, WhatsApp Business API, etc.)
2. Add credentials to backend `.env`:
   - `WHATSAPP_API_URL`
   - `WHATSAPP_API_KEY`
   - `WHATSAPP_GROUP_LINK` (your WhatsApp group invite link)
3. Update `whatsapp.service.ts` with your provider's API format

Example for Twilio:
- Install: `npm install twilio`
- Add to `.env`:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_NUMBER`
- Uncomment the Twilio method in `whatsapp.service.ts`

## Testing

1. Go to http://localhost:3000/subscribe
2. Fill out the subscription form
3. Complete payment on your phone via M-Pesa STK Push
4. Check admin panel at http://localhost:3000/admin to see the transaction

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

### MegaPay STK Push Not Working
- Verify API key and email are correct
- Check phone number format (should be 254XXXXXXXXX or 0XXXXXXXXX)
- Ensure you have sufficient balance in your M-Pesa account

### Webhook Not Receiving Notifications
- Use ngrok for local development
- Ensure webhook URL is publicly accessible
- Check backend logs for webhook requests
