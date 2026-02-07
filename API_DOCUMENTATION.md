# API Documentation

## Base URL
- Development: `http://localhost:3001`
- Production: `https://your-domain.com`

## Authentication
Currently, the API does not require authentication. For production, consider implementing JWT authentication.

## Endpoints

### Public Endpoints

#### Register Subscription
```http
POST /subscriptions/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "tiktokUsername": "johndoe",
  "mpesaMobile": "254712345678",
  "whatsappNumber": "254712345678",
  "months": 1,
  "monthlyPrice": 1
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "tiktokUsername": "johndoe",
    ...
  },
  "payment": {
    "id": "uuid",
    "amount": 1,
    "status": "PENDING",
    ...
  },
  "message": "STK Push initiated. Please complete payment on your phone."
}
```

#### Check Payment Status
```http
GET /payments/:id/status
```

**Response:**
```json
{
  "id": "uuid",
  "status": "completed",
  "amount": 1,
  "months": 1,
  "completedAt": "2026-01-27T12:00:00Z",
  ...
}
```

### Admin Endpoints

#### Dashboard Statistics
```http
GET /admin/dashboard
```

**Response:**
```json
{
  "users": {
    "total": 100,
    "active": 95
  },
  "subscriptions": {
    "total": 150,
    "active": 120,
    "expired": 30
  },
  "payments": {
    "total": 200,
    "completed": 180,
    "pending": 10,
    "failed": 10,
    "totalAmount": 5000
  }
}
```

#### Get All Users
```http
GET /admin/users?page=1&limit=10&search=john
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search by name, TikTok username, or phone number

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### Get All Subscriptions
```http
GET /admin/subscriptions?page=1&limit=10&status=ACTIVE&search=john
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status (ACTIVE, EXPIRED, CANCELLED)
- `search` (optional): Search by user name or TikTok username

#### Get All Payments
```http
GET /admin/payments?page=1&limit=10&status=completed&search=transaction123
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status (completed, pending, failed)
- `search` (optional): Search by user name, TikTok username, transaction ID, or reference

### Webhook Endpoints

#### MegaPay Webhook
```http
POST /megapay/webhook
```

**Payload (from MegaPay):**
```json
{
  "ResponseCode": 0,
  "ResponseDescription": "Success",
  "MerchantRequestID": "string",
  "CheckoutRequestID": "string",
  "TransactionID": "string",
  "TransactionAmount": 1,
  "TransactionReceipt": "string",
  "TransactionDate": "string",
  "TransactionReference": "uuid",
  "Msisdn": "254712345678"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Webhook processed"
}
```

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "timestamp": "2026-01-27T12:00:00.000Z",
  "path": "/subscriptions/register",
  "method": "POST",
  "message": "Error message here",
  "details": {}
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

Currently not implemented. For production, consider adding rate limiting to prevent abuse.

## Webhook Security

For production, implement webhook signature verification to ensure requests are from MegaPay.
