# WhatsApp Business API Setup Guide

This guide will help you set up WhatsApp Business API integration using Meta's WhatsApp Business Platform.

## Overview

The application uses Meta's WhatsApp Business API (Graph API) to send automated messages to users after successful subscription payments. This includes sending WhatsApp group invite links.

## Prerequisites

1. A Facebook Business Account
2. A WhatsApp Business Account (can be created through Meta Business Suite)
3. Access to Meta for Developers (developers.facebook.com)

## Step-by-Step Setup

### Step 1: Create a WhatsApp Business Account

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Create or select a Business Account
3. Add WhatsApp as a product
4. Follow the setup wizard to create your WhatsApp Business Account

### Step 2: Get Your Credentials

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new App or select an existing one
3. Add "WhatsApp" product to your app
4. Navigate to WhatsApp > API Setup

You'll need:
- **Phone Number ID**: Found in API Setup page (e.g., `975035425686298`)
- **Access Token**: Temporary token (60 minutes) or Permanent token
- **WhatsApp Business Account ID**: Found in Business Settings

### Step 3: Get a Permanent Access Token

**Option A: Using System User (Recommended for Production)**

1. Go to Business Settings > System Users
2. Create a new System User
3. Generate a token for the System User
4. Assign WhatsApp permissions to the System User
5. Copy the permanent access token

**Option B: Using Test Credentials (For Development)**

1. Go to WhatsApp > API Setup
2. Click "Send test messages"
3. Generate a temporary access token (valid for 60 minutes)
4. Use the test phone number ID provided

### Step 4: Configure Environment Variables

Add the following to your backend `.env` file:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_API_VERSION=v22.0
WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/your_group_invite_link
```

**Example with your credentials:**
```env
WHATSAPP_ACCESS_TOKEN=EAAcdkWThkrcBQr08GpGzCzJZAhC41BseSjHQL5SaEDgIz2w3kkCoBYxoS9PaB3V8aeoc1rZC4x05jZCizdLBoNdDPFC7n0ZBvy9GoRwphSQzqVSTpblRIPpHCgHBBhVmVBPIaoMSZCKONmtbRyUKEWqFRiKZB5YJXbWPXiOuYWdaC5rfjeC6OW9R8EG2TBMXMneETgcdOZBrAmbDWpS1lDRAZAN0ZC05g07BFrf2kgq3hZAfaDH85ZCg095ZCnkwyyCSP6mMlCdJZBaLxheDMS9NV1AaJ
WHATSAPP_PHONE_NUMBER_ID=975035425686298
WHATSAPP_API_VERSION=v22.0
WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/your_group_link_here
```

### Step 5: Get Your WhatsApp Group Link

1. Open WhatsApp on your phone
2. Go to your group
3. Tap group name > Invite via link
4. Copy the invite link
5. Add it to `WHATSAPP_GROUP_LINK` in your `.env` file

### Step 6: Test the Integration

1. Start your backend server:
```bash
cd backend
npm run start:dev
```

2. Make a test subscription payment
3. After successful payment, check the backend logs for WhatsApp message status
4. The user should receive a WhatsApp message with the group invite link

## API Endpoints Used

The service uses Meta's Graph API:

```
POST https://graph.facebook.com/v22.0/{phone-number-id}/messages
```

### Request Format

```json
{
  "messaging_product": "whatsapp",
  "to": "254712345678",
  "type": "text",
  "text": {
    "body": "Your message here"
  }
}
```

### Response Format

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "254712345678",
      "wa_id": "254712345678"
    }
  ],
  "messages": [
    {
      "id": "wamid.xxx"
    }
  ]
}
```

## Phone Number Format

The API requires phone numbers in international format **without** the `+` sign:

- ✅ Correct: `254712345678` (Kenya)
- ❌ Wrong: `+254712345678`
- ❌ Wrong: `0712345678`
- ❌ Wrong: `712345678`

The service automatically formats phone numbers to the correct format.

## Message Types Supported

### 1. Text Messages (Currently Used)
Sends plain text messages with group invite links.

### 2. Template Messages (Future)
For pre-approved message templates. Requires template approval from Meta.

Example:
```typescript
await whatsappService.sendTemplateMessage(
  '254712345678',
  'welcome_template',
  'en_US',
  [
    { type: 'text', text: 'John Doe' },
    { type: 'text', text: '123456' }
  ]
);
```

## Error Handling

Common errors and solutions:

### Error: "Invalid OAuth access token"
- **Solution**: Regenerate your access token
- **Cause**: Token expired or invalid

### Error: "Recipient phone number not in allowed list"
- **Solution**: Add recipient to test numbers in Meta for Developers
- **Cause**: Using test credentials with unverified numbers

### Error: "Message failed to send"
- **Solution**: Check phone number format and API credentials
- **Cause**: Invalid phone number or API configuration

### Error: "Rate limit exceeded"
- **Solution**: Wait before sending more messages
- **Cause**: Too many requests in short time

## Production Considerations

### 1. Permanent Access Token
- Use System User tokens for production
- Store tokens securely (use environment variables)
- Rotate tokens periodically

### 2. Webhook Setup (Optional)
To receive messages from users, set up webhooks:
1. Configure webhook URL in Meta for Developers
2. Verify webhook signature
3. Handle incoming messages

### 3. Template Messages
For production, use approved templates:
1. Create message templates in Meta Business Suite
2. Wait for approval (usually 24-48 hours)
3. Use template names in `sendTemplateMessage()`

### 4. Rate Limits
- Free tier: 1,000 conversations per month
- Paid tier: Based on your plan
- Monitor usage in Meta Business Suite

## Troubleshooting

### Messages Not Sending

1. **Check Logs**: Look for error messages in backend logs
2. **Verify Credentials**: Ensure access token and phone number ID are correct
3. **Check Phone Format**: Ensure phone numbers are in correct format
4. **Test API**: Use curl to test API directly:

```bash
curl -i -X POST \
  "https://graph.facebook.com/v22.0/975035425686298/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "254712345678",
    "type": "text",
    "text": {
      "body": "Test message"
    }
  }'
```

### Access Token Expired

1. Go to Meta for Developers
2. Navigate to WhatsApp > API Setup
3. Generate a new access token
4. Update `.env` file
5. Restart backend server

### Phone Number Not Verified

If using test credentials:
1. Go to WhatsApp > API Setup
2. Add recipient phone number to test numbers list
3. Wait for verification code
4. Enter code to verify number

## Security Best Practices

1. **Never commit tokens to Git**: Use `.env` files (already in `.gitignore`)
2. **Use environment variables**: Never hardcode credentials
3. **Rotate tokens regularly**: Change access tokens periodically
4. **Monitor usage**: Check Meta Business Suite for unusual activity
5. **Use HTTPS**: Always use HTTPS in production

## Additional Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api)
- [Meta Business Suite](https://business.facebook.com/)
- [WhatsApp Business API Pricing](https://developers.facebook.com/docs/whatsapp/pricing)

## Support

For issues with:
- **WhatsApp API**: Check Meta for Developers documentation
- **Application Integration**: Check backend logs and error messages
- **Phone Number Format**: Ensure numbers are in international format without `+`

---

**Last Updated**: January 27, 2026
