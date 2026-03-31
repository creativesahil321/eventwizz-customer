# Payment Gateway Connection Flow Documentation

## Overview
This document explains the complete flow for connecting payment gateways (Stripe, PayPal, TrueLayer) in the EventWizz system.

---

## 🔄 Complete Connection Flow

### Step 1: Initiate Connection
**Location:** `payment-gateway-manager.tsx`

When a vendor clicks "Connect" on a payment gateway:

```typescript
// POST /vendor/payment-gateway/connect
const response = await vendorPaymentGatewayService.connectPaymentGateway(
  "stripe",  // gateway: "stripe" | "paypal" | "truelayer"
  "settings" // source: "settings" | "onboarding"
);
```

**Payload Sent:**
```json
{
  "payment_gateway": "stripe",
  "source": "settings",
  "replace_id": 123  // optional: only when replacing existing account
}
```

**Response Received:**
```json
{
  "status": true,
  "message": "Stripe connection initiated",
  "data": {
    "status": "pending",
    "charges_enabled": false,
    "payouts_enabled": false,
    "connection_status": "pending",
    "details_submitted": false,
    "stripe_account_id": "acct_xxx",
    "onboarding_url": "https://connect.stripe.com/...",
    "account_id": "acct_xxx",
    "gateway": "stripe",
    "return_url": "https://yourdomain.com/vendor/settings/return?gateway=stripe",
    "refresh_url": "https://yourdomain.com/vendor/settings?gateway=stripe&refresh=1"
  }
}
```

### Step 2: Store Account ID & Open OAuth Window
**Location:** `payment-gateway-manager.tsx`

```typescript
// Store the stripe_account_id for later use
const stripe_account_id = response.data?.stripe_account_id || response.data?.account_id;
localStorage.setItem("stripe_account_id", stripe_account_id);

// Open OAuth window
const stripeWindow = window.open(
  response.data.onboarding_url,
  "_blank",
  "width=800,height=800"
);
```

### Step 3: User Completes OAuth in Popup
The user completes the Stripe/PayPal/TrueLayer onboarding in the popup window.

After completion, Stripe/PayPal redirects to:
```
https://yourdomain.com/vendor/settings/return?gateway=stripe
```

### Step 4: Return Handler Processes Connection
**Location:** `settings/return/page.tsx`

```typescript
// Get the stored stripe_account_id from localStorage
const accountId = localStorage.getItem("stripe_account_id") || "";

// Call the return API with the account ID
const response = await vendorPaymentGatewayService.handlePaymentGatewayReturn(
  "stripe",
  accountId
);
```

**API Call:**
```
GET /vendor/payment-gateway/return/stripe?account=acct_xxx
```

**Response:**
```json
{
  "status": true,
  "message": "Stripe onboarding completed successfully.",
  "data": {
    "status": "active",
    "charges_enabled": true,
    "payouts_enabled": true,
    "connection_status": "connected",
    "details_submitted": true,
    "stripe_account_id": "acct_1SzcPSBu5bjKYDAb"
  }
}
```

### Step 5: Success Handling & Cleanup
**Location:** `settings/return/page.tsx`

```typescript
if (response.status) {
  // Set success flag for parent window
  localStorage.setItem("stripe_connection_success", "true");
  
  // Clean up stored account ID
  localStorage.removeItem("stripe_account_id");
  localStorage.removeItem("settings_payment_setup");
  
  // Update session
  await updateSession({ has_payment_provider: true });
  
  // Close popup window
  window.close();
}
```

### Step 6: Parent Window Detects Success
**Location:** `payment-gateway-manager.tsx`

```typescript
// Poll for window close
const checkInterval = setInterval(() => {
  if (stripeWindow.closed) {
    clearInterval(checkInterval);
    
    // Check if connection was successful
    const connectionSuccess = localStorage.getItem("stripe_connection_success");
    if (connectionSuccess === "true") {
      localStorage.removeItem("stripe_connection_success");
      toast.success("Stripe connected successfully!");
      
      // Refetch payment gateways
      refetch();
      updateSession({ has_payment_provider: true });
    }
  }
}, 1000);
```

---

## 📋 API Endpoints

### 1. Connect Payment Gateway
**Endpoint:** `POST /vendor/payment-gateway/connect`

**Request:**
```json
{
  "payment_gateway": "stripe",
  "source": "settings",
  "replace_id": 123  // optional
}
```

**Response:**
```json
{
  "status": true,
  "message": "Stripe connection initiated",
  "data": {
    "stripe_account_id": "acct_xxx",
    "onboarding_url": "https://connect.stripe.com/...",
    "return_url": "https://yourdomain.com/vendor/settings/return?gateway=stripe"
  }
}
```

### 2. Verify Payment Gateway Connection
**Endpoint:** `GET /vendor/payment-gateway/return/{gateway}?account={account_id}`

**Example:**
```
GET /vendor/payment-gateway/return/stripe?account=acct_xxx
```

**Response:**
```json
{
  "status": true,
  "message": "Stripe onboarding completed successfully.",
  "data": {
    "status": "active",
    "charges_enabled": true,
    "payouts_enabled": true,
    "connection_status": "connected",
    "details_submitted": true,
    "stripe_account_id": "acct_1SzcPSBu5bjKYDAb"
  }
}
```

---

## 🔑 Key Implementation Details

### 1. LocalStorage Keys Used

| Key | Purpose | When Set | When Cleared |
|-----|---------|----------|--------------|
| `stripe_account_id` | Store Stripe account ID for return handler | After connect API call | After successful connection |
| `paypal_merchant_id` | Store PayPal merchant ID for return handler | After connect API call | After successful connection |
| `stripe_connection_success` | Signal success to parent window | In return handler | In parent window after detection |
| `settings_payment_setup` | Track if connecting from settings | Before OAuth redirect | After return |

### 2. Service Layer Functions

#### `connectPaymentGateway()`
```typescript
vendorPaymentGatewayService.connectPaymentGateway(
  gateway: "stripe" | "paypal" | "truelayer",
  source: "settings" | "onboarding" = "settings",
  replaceId?: number
)
```

**Purpose:** Initiate OAuth connection flow
**Returns:** `onboarding_url`, `stripe_account_id`, etc.

#### `handlePaymentGatewayReturn()`
```typescript
vendorPaymentGatewayService.handlePaymentGatewayReturn(
  gateway: "stripe" | "paypal" | "truelayer",
  accountId: string
)
```

**Purpose:** Verify and finalize connection after OAuth
**Returns:** Connection status and account details

---

## 🎯 Critical Points

### ✅ Must Do:
1. **Always store the account ID** (`stripe_account_id` or `merchant_id`) from the initial connect response
2. **Use the stored account ID** in the return handler, not from URL params
3. **Include `source` parameter** in connect payload ("settings" or "onboarding")
4. **Clean up localStorage** after successful connection
5. **Refetch payment gateways** after successful connection

### ❌ Don't Do:
1. Don't rely on URL parameters for account ID in return handler
2. Don't forget to clean up localStorage keys
3. Don't skip the source parameter
4. Don't call the return API without the account ID

---

## 🔍 Debugging Tips

### Check Connection Status:
```typescript
// 1. Check localStorage for stored IDs
console.log("Stripe Account ID:", localStorage.getItem("stripe_account_id"));

// 2. Check connection success flag
console.log("Success Flag:", localStorage.getItem("stripe_connection_success"));

// 3. Verify API response structure
console.log("Connect Response:", response);
```

### Common Issues:

1. **"Missing account information" error**
   - **Cause:** `stripe_account_id` not stored in localStorage
   - **Fix:** Ensure `localStorage.setItem()` is called after connect API

2. **Parent window doesn't detect success**
   - **Cause:** Success flag not set in localStorage
   - **Fix:** Ensure return handler sets `stripe_connection_success`

3. **Connection shows as pending**
   - **Cause:** Return API not called or called with wrong account ID
   - **Fix:** Verify account ID is retrieved from localStorage, not URL

---

## 🧪 Testing Flow

### Manual Test Steps:

1. **Open Settings Page**
   ```
   /vendor/settings?tab=payment-gateways
   ```

2. **Click "Connect Stripe"**
   - Verify connect API is called
   - Check localStorage for `stripe_account_id`
   - Verify popup opens

3. **Complete Stripe Onboarding**
   - Fill in business details
   - Submit onboarding form

4. **Verify Return Handler**
   - Check return URL is called
   - Verify account ID is retrieved from localStorage
   - Check return API response

5. **Verify Parent Window**
   - Check success toast appears
   - Verify payment gateway list refreshes
   - Confirm Stripe shows as "Active"

---

## 📝 File Structure

```
src/
├── services/
│   └── vendor/
│       └── payment-gateway/
│           └── payment-gateway.service.ts    # API service layer
├── app/
│   └── (protected)/
│       └── vendor/
│           └── settings/
│               ├── _components/
│               │   └── payment-gateways/
│               │       └── payment-gateway-manager.tsx  # Main component
│               └── return/
│                   └── page.tsx              # OAuth return handler
└── core/
    └── endpoints.ts                          # API endpoint definitions
```

---

## 🚀 Future Improvements

1. **Add retry mechanism** for failed connections
2. **Implement timeout handling** for OAuth window
3. **Add connection status polling** for pending accounts
4. **Support multiple active accounts** per gateway
5. **Add webhook handlers** for async status updates

---

## 📚 Related Documentation

- [Payment Gateway Backend Guide](./PAYMENT_GATEWAY_BACKEND_GUIDE.md)
- [Checkout Auto-Save Fix](./CHECKOUT_AUTO_SAVE_FIX.md)
- [API Endpoints Documentation](./src/services/core/endpoints.ts)

---

**Last Updated:** February 2026  
**Version:** 2.0  
**Author:** EventWizz Development Team
