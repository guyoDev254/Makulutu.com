# WhatsApp Business API Credentials

## Your Current Credentials

**⚠️ IMPORTANT**: These are temporary test credentials. For production, you'll need permanent credentials.

### Access Token
```
EAAcdkWThkrcBQr08GpGzCzJZAhC41BseSjHQL5SaEDgIz2w3kkCoBYxoS9PaB3V8aeoc1rZC4x05jZCizdLBoNdDPFC7n0ZBvy9GoRwphSQzqVSTpblRIPpHCgHBBhVmVBPIaoMSZCKONmtbRyUKEWqFRiKZB5YJXbWPXiOuYWdaC5rfjeC6OW9R8EG2TBMXMneETgcdOZBrAmbDWpS1lDRAZAN0ZC05g07BFrf2kgq3hZAfaDH85ZCg095ZCnkwyyCSP6mMlCdJZBaLxheDMS9NV1AaJ
```

**Note**: This token expires in 60 minutes. You'll need to generate a permanent token for production.

### Phone Number ID
```
975035425686298
```

### WhatsApp Business Account ID
```
653953747739943
```

### Test Phone Number
```
+1 555 188 5431
```

## Quick Setup

Add these to your `backend/.env` file:

```env
WHATSAPP_ACCESS_TOKEN=EAAcdkWThkrcBQr08GpGzCzJZAhC41BseSjHQL5SaEDgIz2w3kkCoBYxoS9PaB3V8aeoc1rZC4x05jZCizdLBoNdDPFC7n0ZBvy9GoRwphSQzqVSTpblRIPpHCgHBBhVmVBPIaoMSZCKONmtbRyUKEWqFRiKZB5YJXbWPXiOuYWdaC5rfjeC6OW9R8EG2TBMXMneETgcdOZBrAmbDWpS1lDRAZAN0ZC05g07BFrf2kgq3hZAfaDH85ZCg095ZCnkwyyCSP6mMlCdJZBaLxheDMS9NV1AaJ
WHATSAPP_PHONE_NUMBER_ID=975035425686298
WHATSAPP_API_VERSION=v22.0
WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/YOUR_GROUP_LINK_HERE
```

## Testing

### Test with cURL

```bash
curl -i -X POST \
  "https://graph.facebook.com/v22.0/975035425686298/messages" \
  -H "Authorization: Bearer EAAcdkWThkrcBQr08GpGzCzJZAhC41BseSjHQL5SaEDgIz2w3kkCoBYxoS9PaB3V8aeoc1rZC4x05jZCizdLBoNdDPFC7n0ZBvy9GoRwphSQzqVSTpblRIPpHCgHBBhVmVBPIaoMSZCKONmtbRyUKEWqFRiKZB5YJXbWPXiOuYWdaC5rfjeC6OW9R8EG2TBMXMneETgcdOZBrAmbDWpS1lDRAZAN0ZC05g07BFrf2kgq3hZAfaDH85ZCg095ZCnkwyyCSP6mMlCdJZBaLxheDMS9NV1AaJ" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "254712345678",
    "type": "text",
    "text": {
      "body": "Hello! This is a test message from your subscription platform."
    }
  }'
```

**Replace `254712345678` with the recipient's phone number in international format (without +)**

## Next Steps

1. ✅ Add credentials to `.env` file
2. ✅ Add your WhatsApp group invite link
3. ✅ Restart backend server
4. ✅ Test with a subscription payment
5. ⚠️ Generate permanent access token for production (see WHATSAPP_SETUP.md)

## Important Notes

- **Token Expiry**: The access token expires in 60 minutes
- **Test Numbers**: You can only send to verified test numbers with temporary tokens
- **Production**: You'll need permanent credentials for production use
- **Phone Format**: Use international format without `+` (e.g., `254712345678`)

For detailed setup instructions, see `WHATSAPP_SETUP.md`
