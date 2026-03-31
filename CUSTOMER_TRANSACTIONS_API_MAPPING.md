# Customer Transactions - API Mapping Guide

## Quick Reference

### Status Mapping

| UI Display | API Key (status_key) | Filter Value to Send |
| ---------- | -------------------- | -------------------- |
| Completed  | `success`            | `status=success`     |
| Pending    | `pending`            | `status=pending`     |
| Refunded   | `refunded`           | `status=refunded`    |
| Failed     | `failed`             | `status=failed`      |
| Cancelled  | `cancelled`          | `status=cancelled`   |
| All Status | -                    | `status=` (empty)    |

**Important:** API returns `success` for completed transactions, not `completed`.

### Payment Method Mapping

| UI Display    | API Key (payment_method_key) | Filter Value to Send   |
| ------------- | ---------------------------- | ---------------------- |
| Card Payment  | `stripe`                     | `method=stripe`        |
| Bank Transfer | `bank_transfer`              | `method=bank_transfer` |
| PayPal        | `paypal`                     | `method=paypal`        |
| Klarna        | `klarna`                     | `method=klarna`        |
| TrueLayer     | `truelayer`                  | `method=truelayer`     |
| All Methods   | -                            | `method=` (empty)      |

**Important:** API uses `stripe` for card payments, not `card_payment`.

## API Response Structure

### Success Response

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": 268,
      "date": "5 days ago",
      "transaction_id": "cs_test_...",
      "amount": "£50.00",
      "amount_raw": 50,
      "currency": "GBP",
      "status": "Pending",
      "status_key": "pending",
      "payment_method": "Card Payment",
      "payment_method_key": "stripe",
      "description": "Full payment for Event Booking EV-004",
      "booking_id": 44,
      "booking_number": "EV-004",
      "created_at": "2026-01-09T12:17:27.000000Z",
      "paid_at": null
    }
  ],
  "links": {
    "first": "...",
    "last": "...",
    "prev": null,
    "next": null
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "per_page": 10,
    "to": 3,
    "total": 3,
    "links": [...]
  },
  "summary": {
    "total": 3,
    "amount": "3760.00"
  }
}
```

## Filter Examples

### Example 1: Get all transactions (no filters)

```
GET /customer/transactions?page=1&per_page=10&search=&status=&payment_date=&method=
```

### Example 2: Get completed transactions only

```
GET /customer/transactions?page=1&per_page=10&search=&status=success&payment_date=&method=
```

### Example 3: Get card payments from specific date

```
GET /customer/transactions?page=1&per_page=10&search=&status=&payment_date=2026-01-08&method=stripe
```

### Example 4: Search with filters

```
GET /customer/transactions?page=1&per_page=10&search=EV-004&status=pending&payment_date=&method=
```

## Key Changes Made

### 1. Transaction Interface Updated

- Added `date` field (e.g., "5 days ago")
- Split amount into `amount` (formatted) and `amount_raw` (number)
- Added `status` (display) and `status_key` (API key)
- Added `payment_method` (display) and `payment_method_key` (API key)
- Added `booking_number` field
- Changed `updated_at` to `paid_at`

### 2. Status Values

- Changed from `completed` to `success` in filter dropdown
- Added both `success` and `completed` to STATUS_CONFIG for backward compatibility
- Updated TransactionStatus type to include both

### 3. Payment Methods

- Changed from `card_payment` to `stripe` in filter dropdown
- This matches what the backend expects

### 4. Filter Logic

- "all" option in dropdowns sends empty string to API
- Undefined/null filters also send empty strings
- This allows API to return unfiltered data

### 5. Response Handling

- Use `summary.total` and `summary.amount` from API
- Don't calculate statistics client-side
- Use provided `date` field instead of formatting `created_at`

## Testing Checklist

- [x] Status filter sends correct API keys
- [x] Payment method filter sends correct API keys
- [x] "All" options send empty strings
- [x] Search works with debounce
- [x] Date filter sends YYYY-MM-DD format
- [x] Pagination uses meta information
- [x] Summary displays from API response
- [x] Transaction list displays correctly
- [x] Status badges show correct colors

## Common Issues & Solutions

### Issue: Filter not working

**Check:**

1. Are you sending the correct API key? (e.g., `success` not `completed`)
2. Is "all" being converted to empty string?
3. Check network tab to see actual query params sent

### Issue: Status badge not showing correct color

**Check:**

1. STATUS_CONFIG has both `success` and `completed` mappings
2. Using `status_key` not `status` for color mapping

### Issue: Payment method not filtering

**Check:**

1. Using `stripe` not `card_payment` in filter
2. Check if API expects different key format

## API Endpoint

```
GET /customer/transactions
```

### Query Parameters

All parameters are optional:

- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 10)
- `search` - Search query (empty for all)
- `status` - Status key: `success`, `pending`, `refunded`, `failed`, `cancelled` (empty for all)
- `payment_date` - Date in YYYY-MM-DD format (empty for all)
- `method` - Method key: `stripe`, `bank_transfer`, `paypal`, `klarna`, `truelayer` (empty for all)
