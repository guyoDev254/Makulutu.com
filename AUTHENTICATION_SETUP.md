# 🔐 Authentication & Authorization Setup Guide

This guide will help you set up authentication and authorization for the admin panel.

## Overview

The application now includes:
- ✅ JWT-based authentication for admin panel
- ✅ Role-based access control (RBAC)
- ✅ Protected admin endpoints
- ✅ Login/logout functionality
- ✅ Password hashing with bcrypt
- ✅ Session management

## Step 1: Install Dependencies

```bash
cd backend
yarn add @nestjs/jwt @nestjs/passport passport passport-jwt
yarn add -D @types/passport-jwt
```

## Step 2: Update Database Schema

Run Prisma migrations to add the Admin model:

```bash
cd backend
yarn prisma migrate dev --name add_admin_model
yarn prisma generate
```

## Step 3: Seed Admin User

Create a default admin user:

```bash
cd backend
yarn prisma:seed
```

**Default Credentials:**
- Username: `admin`
- Email: `admin@example.com`
- Password: `admin123`

⚠️ **IMPORTANT**: Change these credentials in production!

### Custom Admin Credentials

You can set custom credentials using environment variables:

```bash
ADMIN_USERNAME=your_username ADMIN_EMAIL=your_email@example.com ADMIN_PASSWORD=your_secure_password yarn prisma:seed
```

## Step 4: Configure Environment Variables

Add JWT configuration to your `backend/.env`:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Admin Seed Credentials (optional, defaults provided)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

**Generate a secure JWT secret:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32
```

## Step 5: Start the Application

```bash
# Terminal 1 - Backend
cd backend
yarn start:dev

# Terminal 2 - Frontend
cd frontend
yarn dev
```

## Step 6: Access Admin Panel

1. Navigate to `http://localhost:3000/admin`
2. You'll be redirected to the login page
3. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`

## API Endpoints

### Authentication Endpoints

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "role": "SUPER_ADMIN",
    "lastLogin": "2026-01-27T12:00:00Z"
  }
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

#### Change Password
```http
PATCH /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "admin123",
  "newPassword": "newSecurePassword123"
}
```

### Protected Admin Endpoints

All admin endpoints now require authentication:

```http
GET /admin/dashboard
GET /admin/users
GET /admin/subscriptions
GET /admin/payments
Authorization: Bearer <token>
```

## Frontend Authentication

### Login Page
- URL: `/login`
- Automatically redirects to `/admin` after successful login
- Stores JWT token in localStorage

### Admin Dashboard
- Protected route - redirects to `/login` if not authenticated
- Shows logged-in admin username
- Logout button in header

### Token Management
- Token stored in `localStorage` as `adminToken`
- Automatically included in API requests via axios interceptor
- Auto-redirects to login on 401 (unauthorized) responses

## Security Features

### ✅ Implemented
- Password hashing with bcrypt (10 rounds)
- JWT token-based authentication
- Protected admin endpoints
- Role-based access control (ready for future roles)
- Token expiration (configurable)
- Auto-logout on token expiration

### 🔒 Best Practices
1. **Change default credentials** immediately
2. **Use strong JWT secret** (32+ characters, random)
3. **Set appropriate token expiration** (7d default)
4. **Use HTTPS in production**
5. **Regularly rotate JWT secrets**
6. **Monitor admin access logs**

## Creating Additional Admin Users

You can create additional admin users programmatically:

```typescript
// In your backend code or a script
import { AuthService } from './auth/auth.service';

const authService = new AuthService(prismaService, jwtService);

await authService.createAdmin(
  'newadmin',
  'newadmin@example.com',
  'securePassword123',
  'ADMIN' // or 'SUPER_ADMIN'
);
```

Or use Prisma directly:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hashedPassword = await bcrypt.hash('securePassword123', 10);

await prisma.admin.create({
  data: {
    username: 'newadmin',
    email: 'newadmin@example.com',
    password: hashedPassword,
    role: 'ADMIN',
  },
});
```

## Troubleshooting

### "Invalid credentials" error
- Check username and password are correct
- Verify admin user exists in database
- Check admin account is active (`isActive: true`)

### "Unauthorized" error on admin endpoints
- Verify JWT token is included in Authorization header
- Check token hasn't expired
- Verify JWT_SECRET matches between token creation and validation

### Can't access admin panel
- Clear browser localStorage
- Check backend is running
- Verify CORS is configured correctly
- Check browser console for errors

### Database migration errors
- Ensure PostgreSQL is running
- Check database connection string
- Verify Prisma schema is correct
- Try: `yarn prisma migrate reset` (⚠️ deletes all data)

## Production Checklist

- [ ] Change default admin credentials
- [ ] Generate strong JWT_SECRET
- [ ] Set appropriate JWT_EXPIRES_IN
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Set up monitoring/logging
- [ ] Regular security audits
- [ ] Backup admin credentials securely

## Next Steps

1. ✅ Authentication is complete
2. Consider adding:
   - Password reset functionality
   - Two-factor authentication (2FA)
   - Activity logging
   - Session management
   - Rate limiting

---

**Last Updated**: January 27, 2026
