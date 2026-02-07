# 🚀 Quick Start - End-to-End Setup

## ⚡ Fast Setup (5 minutes)

### 1. Database Migration
```bash
cd backend
yarn prisma migrate dev --name add_settings_model
yarn prisma generate
```

### 2. Start Services
```bash
# Terminal 1 - Backend
cd backend
yarn start:dev

# Terminal 2 - Frontend  
cd frontend
yarn dev
```

### 3. Test End-to-End Flow

#### Step 1: Admin Updates Price
1. Go to `http://localhost:3000/login`
2. Login: `admin` / `admin123`
3. Click "Settings" tab
4. Change price from `1.00` to `2.50`
5. Click "Save Settings" ✅

#### Step 2: User Sees New Price
1. Go to `http://localhost:3000/subscribe`
2. Check prices:
   - 1 Month = KES 2.50 ✅
   - 3 Months = KES 7.50 ✅

#### Step 3: User Registers
1. Fill form and select 3 months
2. Total shows: KES 7.50 ✅
3. Submit registration
4. Check admin dashboard → Payment created for 7.50 KES ✅

## ✅ Verification

All working if:
- ✅ Admin can change price in Settings tab
- ✅ Subscribe page shows updated price
- ✅ Registration uses correct price
- ✅ Payment amount matches

## 🐛 Troubleshooting

**Settings not saving?**
```bash
cd backend
yarn prisma migrate dev --name add_settings_model
```

**Price not updating?**
- Clear browser cache
- Check backend logs for errors
- Verify API: `curl http://localhost:3001/subscriptions/price`

---

**Ready to test!** 🎉
