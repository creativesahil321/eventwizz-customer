# Customer Transactions - Dynamic API Implementation

## Summary

Implemented dynamic customer transactions with proper filtering, pagination, and API integration.

## Changes Made

### 1. API Endpoint Configuration

**File:** `src/services/core/endpoints.ts`

- Updated `CUSTOMER.TRANSACTIONS.GET_ALL` endpoint to support dynamic query parameters:
  - `page` - Current page number
  - `per_page` - Items per page
  - `search` - Search query
  - `status` - Transaction status filter
  - `payment_date` - Date filter
  - `method` - Payment method filter

**Endpoint:** `/customer/transactions?page={page}&per_page={per_page}&search={search}&status={status}&payment_date={payment_date}&method={method}`

### 2. Transaction Service

**File:** `src/services/customer/transactions/transaction.service.ts`

- Replaced dummy data with real API calls
- Implemented `fetchCustomerTransactions()` function
- Updated `transactionService` methods:
  - `getTransactions()` - Fetches transactions with filters
  - `getTransactionStats()` - Calculates transaction statistics
  - `getTransactionById()` - Retrieves single transaction

### 3. Constants & Types

**Files:**

- `src/app/(protected)/_shared/transactions/_lib/constants.ts`
- `src/app/(protected)/_shared/transactions/_lib/types.ts`

**Updated Payment Methods (API Keys):**

- `stripe` - Card Payment (API uses "stripe" for card payments)
- `bank_transfer` - Bank Transfer
- `paypal` - PayPal
- `klarna` - Klarna
- `truelayer` - TrueLayer

**Important:** The API uses `stripe` as the payment method key for card payments, not `card_payment`.

**Transaction Statuses (API Keys):**

- `success` - Completed transactions (mapped to "Completed" in UI)
- `pending` - Pending transactions
- `refunded` - Refunded transactions
- `failed` - Failed transactions
- `cancelled` - Cancelled transactions

**Important:** The API uses `success` as the status key for completed transactions, not `completed`.

**Added:**

- `payment_date` field to `TransactionFilters` interface

### 4. UI Components

**File:** `src/app/(protected)/_shared/transactions/_components/transactions-data-table.tsx`

**Changes:**

- ✅ Added search input with debounce (500ms)
- ✅ Added date picker filter
- ✅ Removed "Type" dropdown filter
- ✅ Kept Status and Method filters
- ✅ Added Reset button for clearing all filters
- ✅ Improved responsive layout

**Filter Features:**

1. **Search** - Real-time search with debounce
2. **Date** - Date picker for filtering by payment date
3. **Status** - Dropdown for transaction status
4. **Method** - Dropdown for payment method
5. **Reset** - Clear all active filters

### 5. Index Export

**File:** `src/services/customer/transactions/index.ts`

- Created index file for clean imports

## API Integration

### Filter Behavior

**Important:** When filters are set to "all", we send **empty strings** to the API, not the word "all":

- Status = "all" → sends `status=` (empty)
- Method = "all" → sends `method=` (empty)
- This way the API returns all data without filtering

### Request Format

```
GET /customer/transactions?page=1&per_page=10&search=&status=success&payment_date=2026-01-15&method=stripe
```

**With "all" filters (empty strings):**

```
GET /customer/transactions?page=1&per_page=10&search=&status=&payment_date=&method=
```

### Query Parameters

| Parameter    | Type   | Required | Description                     |
| ------------ | ------ | -------- | ------------------------------- |
| page         | number | Yes      | Current page number             |
| per_page     | number | Yes      | Items per page                  |
| search       | string | No       | Search query                    |
| status       | string | No       | completed/pending/etc.          |
| payment_date | string | No       | Date in YYYY-MM-DD format       |
| method       | string | No       | bank_transfer/card_payment/etc. |

### Expected Response Format

```typescript
{
  status: boolean;
  message: string;
  data: Transaction[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    path: string;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
  };
  summary: {
    total: number;
    amount: string; // e.g., "3760.00"
  };
}
```

### Transaction Data Structure

```typescript
{
  id: number;
  date: string; // e.g., "5 days ago"
  transaction_id: string;
  amount: string; // Formatted: "£50.00"
  amount_raw: number;
  currency: string; // e.g., "GBP"
  status: string; // Display: "Pending", "Completed"
  status_key: string; // API key: "pending", "success"
  payment_method: string; // Display: "Card Payment"
  payment_method_key: string; // API key: "stripe", "bank_transfer", etc.
  description: string;
  booking_id: number;
  booking_number: string; // e.g., "EV-004"
  created_at: string;
  paid_at: string | null;
}
```

## Usage

The customer transactions page will now:

1. Fetch real data from the API
2. Support search functionality with debounce
3. Filter by date, status, and payment method
4. Handle pagination properly
5. Display loading states
6. Show error messages if API fails
7. Allow resetting all filters

## Testing Checklist

- [ ] Search functionality works
- [ ] Date filter works
- [ ] Status filter works (all 5 statuses)
- [ ] Method filter works (all 5 methods)
- [ ] Pagination works correctly
- [ ] Reset button clears all filters
- [ ] Loading states display properly
- [ ] Error handling works
- [ ] Responsive layout works on mobile

## Notes

- Search has 500ms debounce to prevent excessive API calls
- Empty filter values are sent as empty strings to the API
- "all" filter values are converted to empty strings before API call
- The shared transaction component is used by both customer and vendor sections
