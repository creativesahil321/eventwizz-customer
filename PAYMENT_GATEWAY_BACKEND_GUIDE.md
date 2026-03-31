# Payment Gateway Setup - Backend Implementation Guide

## Overview

This document describes the required backend API endpoints for the Payment Gateway Setup feature in the Vendor Dashboard Settings.

---

## Login API – Include payment provider flags (required for vendors)

So the frontend can show/hide the “Payment Gateway Setup Required” alert, the **login response** should include this field for **vendor** users (same level as `on_boarding_step`, `token`, etc.):

| Field                  | Type      | Description                                                                                                                             |
| ---------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `has_payment_provider` | `boolean` | `true` if the vendor has at least one payment gateway connected (Stripe, PayPal, or TrueLayer) with status `active`. Otherwise `false`. |

**Example login response (relevant part):**

```json
{
  "status": true,
  "data": {
    "user": { ... },
    "token": "...",
    "active_role": "vendor",
    "account_type": "vendor",
    "on_boarding_step": 11,
    "vendor_location_id": 1,
    "has_payment_provider": true
  }
}
```

- **`has_payment_provider`** – Derived from your payment gateway records (e.g. any of stripe/paypal/truelayer with status `active` for this vendor).

The frontend uses it to:

- Hide the dashboard “Payment Gateway Setup Required” alert when `has_payment_provider === true`.
- After a vendor connects a gateway in Settings, it calls `updateSession({ has_payment_provider: true })` so the alert disappears without re-login.

---

## Required API Endpoints

### 1. Get Payment Gateways Status

**Endpoint:** `GET /vendor/payment-gateways`

**Description:** Returns the current status of all payment gateways for the authenticated vendor.

**Response Format:**

```json
{
  "status": true,
  "message": "Payment gateways retrieved successfully",
  "data": {
    "payment_gateways": {
      "stripe": {
        "status": "active" | "pending" | "under_review" | "restricted" | undefined,
        "account_id": "acct_xxxxxxxxxxxxx"
      },
      "paypal": {
        "status": "active" | "pending" | "under_review" | "restricted" | undefined,
        "account_id": "merchant_id_xxxxx"
      },
      "truelayer": {
        "status": "active" | "pending" | "under_review" | "restricted" | undefined,
        "account_id": "account_xxxxx",
        "bank": {
          "bank_name": "Example Bank",
          "account_masked": "**** **** 1234"
        }
      },
      "worldpay": {
        "status": undefined,
        "account_id": ""
      },
      "klarna": {
        "status": undefined,
        "account_id": ""
      }
    }
  },
  "errors": []
}
```

**Status Values:**

- `undefined` or `null` - Not connected
- `"pending"` - Connection initiated but not completed
- `"under_review"` - Submitted for review by payment provider
- `"active"` - Fully connected and operational
- `"restricted"` - Connected but has restrictions

---

### 2. Connect Payment Gateway

**Endpoint:** `POST /vendor/payment-gateways/connect`

**Description:** Initiates the connection flow for a payment gateway (OAuth or authorization).

**Request Body:**

```json
{
  "payment_gateway": "stripe" | "paypal" | "truelayer" | "worldpay" | "klarna"
}
```

**Response Format:**

For Stripe/PayPal (OAuth):

```json
{
  "status": true,
  "message": "Stripe connection initiated",
  "data": {
    "onboarding_url": "https://connect.stripe.com/oauth/authorize?...",
    "account_id": "acct_xxxxxxxxxxxxx",
    "gateway": "stripe",
    "connection_status": "pending"
  },
  "errors": []
}
```

For TrueLayer (Bank Authorization):

```json
{
  "status": true,
  "message": "TrueLayer authorization initiated",
  "data": {
    "auth_url": "https://auth.truelayer.com/?...",
    "account_id": "account_xxxxx",
    "gateway": "truelayer",
    "connection_status": "pending"
  },
  "errors": []
}
```

---

### 3. Handle Payment Gateway Return

**Endpoint:** `GET /vendor/payment-gateways/return?gateway={gateway}&{additional_params}`

**Description:** Handles the OAuth/authorization callback from payment providers.

**Query Parameters:**

- `gateway` (required): Payment gateway name (stripe, paypal, truelayer)
- Additional params depend on the gateway (e.g., `code`, `state`, `account_id`, etc.)

**Response Format:**

```json
{
  "status": true,
  "message": "Stripe connected successfully",
  "data": {
    "account_id": "acct_xxxxxxxxxxxxx",
    "connected": true,
    "gateway": "stripe"
  },
  "errors": []
}
```

---

### 4. Disconnect Payment Gateway (Optional)

**Endpoint:** `DELETE /vendor/payment-gateways/disconnect/{gateway}`

**Description:** Disconnects a payment gateway.

**URL Parameters:**

- `gateway`: Payment gateway name (stripe, paypal, truelayer, worldpay, klarna)

**Response Format:**

```json
{
  "status": true,
  "message": "Stripe disconnected successfully",
  "errors": []
}
```

---

## Integration Notes

### Reusing Existing Onboarding Endpoints

The system can reuse the existing onboarding endpoints:

- `POST /vendor/onboarding/payment-gateway-connect` → Can be aliased to `/vendor/payment-gateways/connect`
- `GET /vendor/onboarding/return` → Can be aliased to `/vendor/payment-gateways/return`

**Implementation Approach:**

1. **Option A: Create Aliases**
   - Keep onboarding endpoints as-is
   - Create new routes that call the same controller methods
   - Ensures backward compatibility

2. **Option B: Unified Endpoints**
   - Modify existing endpoints to work for both onboarding and dashboard
   - Detect context (onboarding vs settings) via session data
   - Single source of truth for payment gateway logic

### Return URL Configuration

When initiating payment gateway connections from the settings page:

- **Onboarding Return URL:** `/on-boarding/return/{gateway}`
- **Settings Return URL:** `/vendor/settings/return?gateway={gateway}`

The backend should detect where the connection was initiated and redirect accordingly.

**Suggested Implementation:**

```php
// Store origin in session or pass as state parameter
if (request from onboarding) {
    $returnUrl = "/on-boarding/return/{gateway}";
} else {
    $returnUrl = "/vendor/settings/return?gateway={gateway}";
}
```

---

## Session Data Updates

When a vendor successfully connects a payment gateway, update their session:

- `has_payment_provider: true`
- `payment_setup_skipped: false`

This allows the frontend to hide the payment setup alert on the dashboard.

---

## Testing Checklist

- [ ] Vendor can fetch payment gateway status
- [ ] Vendor can initiate Stripe connection from settings
- [ ] Vendor can initiate PayPal connection from settings
- [ ] Vendor can initiate TrueLayer connection from settings
- [ ] OAuth return from Stripe redirects to `/vendor/settings/return`
- [ ] OAuth return from PayPal redirects to `/vendor/settings/return`
- [ ] TrueLayer authorization return redirects to `/vendor/settings/return`
- [ ] Payment gateway status shows correct values (pending, active, under_review)
- [ ] Multiple gateways can be connected simultaneously
- [ ] Session is updated with `has_payment_provider: true` after connection
- [ ] Dashboard alert disappears after payment gateway is connected

---

## Error Handling

All error responses should follow the standard format:

```json
{
  "status": false,
  "message": "Error message here",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

Common error scenarios:

- Payment provider API is down
- Invalid credentials
- Vendor already has this gateway connected
- Gateway account is restricted or disabled
- OAuth state mismatch
- Invalid return parameters

---

## Frontend Implementation

The frontend implementation includes:

1. **Settings Page:** `/vendor/settings` with Payment Gateways tab
2. **Payment Gateway Manager:** UI for connecting/viewing gateway status
3. **Return Handler:** `/vendor/settings/return` page for OAuth callbacks
4. **Dashboard Alert:** Prominent alert for vendors without payment setup
5. **Service Layer:** `vendorPaymentGatewayService` for API calls
6. **React Query:** Caching and state management for gateway status

All frontend files have been created and are ready to integrate once the backend endpoints are available.
