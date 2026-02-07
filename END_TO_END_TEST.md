# ✅ End-to-End Test Guide

## 🎯 Complete Flow Testing

This guide ensures all features work end-to-end from admin settings to user registration.

## 📋 Pre-requisites

1. **Database Migration**
   ```bash
   cd backend
   yarn prisma migrate dev --name add_settings_model
   yarn prisma generate
   ```

2. **Start Backend**
   ```bash
   cd backend
   yarn start:dev
   ```

3. **Start Frontend**
   ```bash
   cd frontend
   yarn dev
   ```

## 🔄 Complete End-to-End Flow

### Step 1: Admin Updates Default Price

1. **Login to Admin Dashboard**
   - Go to `http://localhost:3000/login`
   - Login with credentials (default: `admin` / `admin123`)

2. **Navigate to Settings**
   - Click on "Settings" tab in admin dashboard
   - You should see current default monthly price (defaults to 1 KES)

3. **Update Price**
   - Change price from `1.00` to `2.50`
   - Click "Save Settings"
   - Should see success message: "Default monthly price updated to KES 2.50"

4. **Verify Settings Saved**
   - Refresh page
   - Settings tab should still show `2.50 KES`
   - Price persisted in database ✅

### Step 2: User Sees New Price

1. **Open Subscribe Page**
   - Go to `http://localhost:3000/subscribe` (in new tab/incognito)
   - Page loads and fetches price from API

2. **Verify Price Display**
   - Check subscription duration options:
     - 1 Month - KES 2.50 ✅
     - 2 Months - KES 5.00 ✅
     - 3 Months - KES 7.50 ✅
     - 6 Months - KES 15.00 ✅
     - 12 Months - KES 30.00 ✅
   - Total amount updates correctly when selecting duration ✅

### Step 3: User Registers with New Price

1. **Fill Registration Form**
   - Name: Test User
   - TikTok Username: @testuser
   - M-Pesa Mobile: 254712345678
   - WhatsApp Number: 254712345678
   - Select: 3 Months

2. **Verify Amount**
   - Total should show: KES 7.50
   - Click "Subscribe Now"

3. **Check Backend Processing**
   - Backend receives registration
   - Uses price from settings: 2.50 KES
   - Calculates: 2.50 × 3 = 7.50 KES ✅
   - Creates payment for 7.50 KES ✅

4. **Verify Payment Created**
   - Go back to admin dashboard
   - Check Payments tab
   - Should see payment for 7.50 KES ✅

### Step 4: Admin Creates Subscription Manually

1. **Go to Subscriptions Tab**
   - Click "Create Subscription"
   - Select a user
   - Set amount: `5.00` (admin sets directly)
   - Set months: `2`
   - Click "Create Subscription"

2. **Verify Created**
   - Subscription created with 5.00 KES (not calculated from settings)
   - Admin has full control ✅

### Step 5: Admin Edits Subscription

1. **Edit Existing Subscription**
   - Click edit icon on any subscription
   - Change amount to `10.00`
   - Apply 10% discount
   - See preview: Final amount = 9.00 KES ✅
   - Click "Save Changes"

2. **Verify Updated**
   - Subscription updated with 9.00 KES ✅
   - Table refreshes automatically ✅

### Step 6: Admin Edits Pending Payment

1. **Find Pending Payment**
   - Go to Payments tab
   - Find a payment with status "PENDING"
   - Click edit icon

2. **Update Payment**
   - Change amount to `3.00`
   - Change months to `2`
   - Click "Save Changes"

3. **Verify Updated**
   - Payment updated ✅
   - Only pending payments can be edited ✅

## ✅ Verification Checklist

### Backend Endpoints
- [ ] `GET /admin/settings` - Returns current settings
- [ ] `PUT /admin/settings` - Updates settings successfully
- [ ] `GET /subscriptions/price` - Returns current monthly price
- [ ] `POST /subscriptions/register` - Uses settings price when monthlyPrice not provided
- [ ] `POST /admin/subscriptions/create` - Admin can set amount directly
- [ ] `PUT /admin/subscriptions/:id` - Updates subscription with discount
- [ ] `PUT /admin/payments/:id` - Updates pending payment

### Frontend Features
- [ ] Settings tab loads current price
- [ ] Settings form validates price > 0
- [ ] Settings save successfully
- [ ] Settings persist after refresh
- [ ] Subscribe page fetches price on load
- [ ] Subscribe page displays correct prices
- [ ] Total amount calculates correctly
- [ ] Registration uses correct price
- [ ] Admin can create subscriptions with custom amount
- [ ] Admin can edit subscriptions with discounts
- [ ] Admin can edit pending payments
- [ ] All tables refresh after edits

### Data Flow
- [ ] Admin updates price → Database updated ✅
- [ ] User visits subscribe → Fetches price from API ✅
- [ ] User registers → Backend uses settings price ✅
- [ ] Payment created with correct amount ✅
- [ ] Subscription created with correct amount ✅

## 🐛 Common Issues & Fixes

### Issue: Settings not saving
**Fix**: Check database migration ran successfully
```bash
yarn prisma migrate dev --name add_settings_model
```

### Issue: Subscribe page shows old price
**Fix**: Clear browser cache or check API endpoint
```bash
curl http://localhost:3001/subscriptions/price
```

### Issue: Price not updating in form
**Fix**: Check useEffect dependency array includes `reset`

### Issue: Backend error "Settings not found"
**Fix**: Settings model doesn't exist. Run migration or create default:
```sql
INSERT INTO settings (id, key, value) VALUES (gen_random_uuid(), 'default_monthly_price', '1');
```

## 📊 Test Scenarios

### Scenario 1: Change Price Multiple Times
1. Set price to 2.50 → Save ✅
2. Set price to 5.00 → Save ✅
3. Set price to 1.00 → Save ✅
4. Verify subscribe page shows latest price ✅

### Scenario 2: Price Persistence
1. Set price to 3.00 → Save ✅
2. Refresh admin page ✅
3. Close browser ✅
4. Reopen → Price still 3.00 ✅

### Scenario 3: Concurrent Users
1. Admin sets price to 2.50 ✅
2. User A visits subscribe → Sees 2.50 ✅
3. Admin changes to 5.00 ✅
4. User B visits subscribe → Sees 5.00 ✅
5. User A refreshes → Sees 5.00 ✅

## 🎯 Success Criteria

All features work end-to-end when:
- ✅ Admin can update price from web interface
- ✅ Price persists in database
- ✅ Users see updated price immediately
- ✅ New registrations use updated price
- ✅ Admin can override price for individual subscriptions
- ✅ All edits refresh data correctly
- ✅ No hardcoded values remain

---

**Status**: ✅ Ready for Testing
**Last Updated**: January 27, 2026
