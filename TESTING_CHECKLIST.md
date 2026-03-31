# 🧪 Payment Gateway Connection - Testing Checklist

## ✅ Two Issues Fixed Today

### Issue #1: Payment Gateway Not Showing in Checkout UI ✅ FIXED
**Problem:** When only 1 payment gateway was available, it would auto-select but hide the UI  
**Solution:** Updated `PaymentGatewaySelector` component to always show UI when only 1 gateway exists  
**File:** `src/app/(public)/vendor/checkout/_components/payment-gateway-selector.tsx`

### Issue #2: Payment Gateway Connection Flow ✅ FIXED
**Problem:** Missing `source` parameter and incorrect account ID handling in OAuth flow  
**Solution:** Complete refactor of connection flow with proper localStorage handling  
**Files Modified:**
- `src/services/vendor/payment-gateway/payment-gateway.service.ts`
- `src/app/(protected)/vendor/settings/_components/payment-gateways/payment-gateway-manager.tsx`
- `src/app/(protected)/vendor/settings/return/page.tsx`

---

## 🧪 Testing Instructions

### Test #1: Checkout Payment Gateway Visibility

#### Steps:
1. **Navigate to checkout page:**
   ```
   vendor.eventwizz.com:3000/vendor/checkout
   ```

2. **Expected Behavior:**
   - ✅ Payment Method section is visible
   - ✅ Stripe is displayed with blue border (selected)
   - ✅ Shows "✓" checkmark icon
   - ✅ Displays "2.9% + 30¢" fee
   - ✅ Shows "Instant" processing time
   - ✅ "Secure Checkout" button is enabled (not greyed out)

3. **Previous Behavior (Bug):**
   - ❌ Payment Method section was hidden
   - ❌ Button was greyed out with "Select Payment Method" text

#### Screenshots to Take:
- [ ] Full checkout page with payment gateway visible
- [ ] Close-up of payment gateway selector
- [ ] "Secure Checkout" button enabled state

---

### Test #2: Stripe Connection Flow

#### Steps:

**A. Initiate Connection:**
1. Navigate to: `/vendor/settings?tab=payment-gateways`
2. Click **"Connect Stripe"** button
3. **Check Console:**
   ```javascript
   // Should log:
   "🔄 Connecting to Stripe with source: settings"
   ```
4. **Check localStorage:**
   ```javascript
   localStorage.getItem("stripe_account_id")
   // Should return: "acct_xxx..."
   ```
5. Verify popup window opens with Stripe onboarding URL

**B. Complete Onboarding:**
6. Fill in business details in Stripe popup
7. Submit onboarding form
8. Wait for redirect to return page

**C. Verify Return Handler:**
9. Should redirect to: `/vendor/settings/return?gateway=stripe`
10. **Check Console:**
    ```javascript
    // Should log:
    "Processing Stripe return with account ID: acct_xxx"
    ```
11. **Check API Call:**
    ```
    GET /vendor/payment-gateway/return/stripe?account=acct_xxx
    ```
12. Should see "Connection Successful!" screen
13. Popup should auto-close after 1.5 seconds

**D. Verify Parent Window:**
14. Back on settings page, should see:
    - ✅ Success toast: "Stripe connected successfully!"
    - ✅ Stripe card shows "Active" status
    - ✅ Enable/Disable toggle available
    - ✅ Account details displayed

#### Console Checks:
```javascript
// After connection:
localStorage.getItem("stripe_account_id")        // Should be null (cleaned up)
localStorage.getItem("stripe_connection_success") // Should be null (cleaned up)
```

#### Screenshots to Take:
- [ ] Settings page before connection
- [ ] Stripe onboarding popup
- [ ] Return handler success screen
- [ ] Settings page after successful connection
- [ ] Stripe card showing "Active" status

---

### Test #3: PayPal Connection Flow

#### Steps:
Same as Stripe test, but:
- Click **"Connect PayPal"** button
- localStorage key: `paypal_merchant_id`
- Return URL: `/vendor/settings/return?gateway=paypal`

#### Screenshots to Take:
- [ ] PayPal connection flow
- [ ] PayPal active status

---

### Test #4: TrueLayer Connection Flow

#### Steps:
Same as Stripe test, but:
- Click **"Connect TrueLayer"** button
- No localStorage key (uses URL params)
- Full page redirect (not popup)
- Return URL: `/vendor/settings/return?gateway=truelayer&account=xxx`

#### Screenshots to Take:
- [ ] TrueLayer connection flow
- [ ] TrueLayer active status

---

## 🔍 Debugging Commands

### Check localStorage:
```javascript
// Open browser console and run:
console.log({
  stripe_account_id: localStorage.getItem("stripe_account_id"),
  paypal_merchant_id: localStorage.getItem("paypal_merchant_id"),
  stripe_success: localStorage.getItem("stripe_connection_success"),
  paypal_success: localStorage.getItem("paypal_connection_success"),
  settings_payment: localStorage.getItem("settings_payment_setup"),
});
```

### Monitor API Calls:
```javascript
// In browser DevTools Network tab, filter by:
- payment-gateway/connect
- payment-gateway/return
```

### Check Payload:
```javascript
// Connect API payload should include:
{
  "payment_gateway": "stripe",
  "source": "settings",     // ✅ This is NEW
  "replace_id": 123         // Optional
}
```

---

## 🐛 Common Issues & Solutions

### Issue: "Missing account information"
**Cause:** `stripe_account_id` not stored in localStorage  
**Check:**
```javascript
localStorage.getItem("stripe_account_id")
```
**Solution:** Ensure connect API response includes `stripe_account_id`

---

### Issue: Parent window doesn't detect success
**Cause:** Success flag not set  
**Check:**
```javascript
localStorage.getItem("stripe_connection_success")
```
**Solution:** Verify return handler completes successfully

---

### Issue: Button still greyed out after connection
**Cause:** Payment gateways not refetched  
**Solution:** Check if `refetch()` is called after success

---

### Issue: Popup blocked
**Cause:** Browser blocking popups  
**Solution:** Allow popups for the domain

---

## ✅ Acceptance Criteria

### Checkout Page:
- [ ] Payment gateway selector always visible (even with 1 gateway)
- [ ] Stripe shows as selected with checkmark
- [ ] "Secure Checkout" button is enabled
- [ ] No console errors

### Payment Gateway Connection:
- [ ] Connect button opens OAuth popup
- [ ] `source: "settings"` included in payload
- [ ] Account ID stored in localStorage
- [ ] Return handler retrieves account ID correctly
- [ ] Return API called with correct account ID
- [ ] Success toast appears
- [ ] Payment gateway list refreshes
- [ ] Stripe shows as "Active"
- [ ] localStorage cleaned up after success

### Error Handling:
- [ ] Clear error messages for missing account ID
- [ ] Proper error handling for API failures
- [ ] User-friendly error messages

---

## 📊 API Response Validation

### Connect API Response:
```json
{
  "status": true,
  "message": "Stripe connection initiated",
  "data": {
    "stripe_account_id": "acct_xxx",      // ✅ Must be present
    "onboarding_url": "https://...",      // ✅ Must be present
    "return_url": "https://...",
    "gateway": "stripe"
  }
}
```

### Return API Response:
```json
{
  "status": true,
  "message": "Stripe onboarding completed successfully.",
  "data": {
    "status": "active",                   // ✅ Should be "active"
    "charges_enabled": true,              // ✅ Should be true
    "payouts_enabled": true,              // ✅ Should be true
    "connection_status": "connected",     // ✅ Should be "connected"
    "details_submitted": true,            // ✅ Should be true
    "stripe_account_id": "acct_xxx"
  }
}
```

---

## 🎬 Video Recording Checklist

When recording the test:
1. [ ] Start from settings page
2. [ ] Show payment gateway list (empty or with existing)
3. [ ] Click "Connect Stripe"
4. [ ] Show popup opening
5. [ ] Complete onboarding form
6. [ ] Show return handler success screen
7. [ ] Show parent window success toast
8. [ ] Show Stripe card as "Active"
9. [ ] Navigate to checkout page
10. [ ] Show payment gateway selector visible
11. [ ] Show "Secure Checkout" button enabled
12. [ ] Complete a test checkout

---

## 📝 Test Results Template

### Test Date: ___________
### Tested By: ___________

| Test | Status | Notes |
|------|--------|-------|
| Checkout UI shows payment gateway | ⬜ Pass / ⬜ Fail | |
| Stripe connection flow | ⬜ Pass / ⬜ Fail | |
| PayPal connection flow | ⬜ Pass / ⬜ Fail | |
| TrueLayer connection flow | ⬜ Pass / ⬜ Fail | |
| localStorage cleanup | ⬜ Pass / ⬜ Fail | |
| Error handling | ⬜ Pass / ⬜ Fail | |
| Console errors | ⬜ Pass / ⬜ Fail | |

### Overall Status: ⬜ PASS / ⬜ FAIL

### Issues Found:
1. 
2. 
3. 

### Screenshots Attached:
- [ ] Checkout page with payment gateway
- [ ] Stripe connection success
- [ ] Settings page with active Stripe

---

**Ready for Testing!** 🚀

All code changes are complete and linter errors are cleared.  
Follow this checklist to ensure everything works as expected.
