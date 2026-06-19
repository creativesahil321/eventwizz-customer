# Transactions API Integration

## Overview
The Transactions section has been successfully integrated with the Laravel backend API. It now fetches real-time transaction data, displays earnings, and supports filtering and pagination.

## API Endpoint
```
GET /vendor/transactions?page={page}&per_page={per_page}&search={search}&status={status}&booking_date={booking_date}
```

## Response Structure
```typescript
{
  status: boolean;
  message: string;
  data: Array<{
    payment_id: number;
    booking_number: string;
    transaction_id: string;
    booking_date: string; // Format: "12-18-2025 05:55PM"
    event_date: string; // Format: "02-14-2026"
    full_name: string;
    email: string;
    card_brand: string; // "visa", "mastercard", etc.
    cardLast4: string; // Last 4 digits
    status: string; // "success", "Pending", "failed", etc.
    amount: string; // Format: "3675.00"
    platform_fee: string; // Format: "201.25"
  }>;
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
  earnings: string; // Total earnings (e.g., "4925.00")
}
```

## Files Created/Modified

### New Files
1. **`src/services/vendor/transactions/transactions.service.ts`**
   - Service layer for API calls
   - `fetchVendorTransactions()` - Fetch transactions with filters
   - `exportTransactionsCSV()` - Export transactions to CSV

2. **`src/services/vendor/transactions/index.ts`**
   - Export barrel file

### Modified Files
1. **`src/app/(protected)/vendor/transactions/_lib/types.ts`**
   - Updated `Transaction` type to match API response
   - Added `TransactionMeta` interface
   - Updated `TransactionsParams` to include `booking_date`

2. **`src/app/(protected)/vendor/transactions/_lib/queries.ts`**
   - Replaced mock data with TanStack Query hook
   - Created `useVendorTransactions()` hook
   - Integrated with service layer

3. **`src/app/(protected)/vendor/transactions/_components/columns.tsx`**
   - Updated column accessors to match API fields
   - Changed `txn_id` → `transaction_id`
   - Changed `service_fee` → `platform_fee`
   - Added `card_brand` and `cardLast4` display
   - Updated date parsing for API format
   - Added support for "success" and "Pending" status

4. **`src/app/(protected)/vendor/transactions/_components/transactions-data-table.tsx`**
   - Integrated `useVendorTransactions` hook
   - Added `onEarningsUpdate` callback prop
   - Removed manual data fetching
   - Added proper TypeScript typing
   - Added error state handling

5. **`src/app/(protected)/vendor/transactions/page.tsx`**
   - Added earnings state management
   - Integrated earnings display from API
   - Passed `onEarningsUpdate` to data table
   - Changed currency symbol from $ to £

## Features

### Dynamic Data
- ✅ Real-time data from Laravel API
- ✅ Automatic refetching on filter changes
- ✅ Loading states
- ✅ Error handling

### Filters
- ✅ Search by transaction ID or booking number
- ✅ Filter by status (success, Pending, failed, refunded)
- ✅ Filter by booking date
- ✅ Pagination (30 records per page)

### Display
- ✅ Transaction details in table format
- ✅ Payment method with card brand and last 4 digits
- ✅ Color-coded status badges
- ✅ Formatted amounts in GBP (£)
- ✅ Platform fee display
- ✅ Total earnings at the top

### Sorting
- ✅ Client-side sorting for all columns
- ✅ Custom date sorting for API date formats
- ✅ Amount sorting

### Actions
- ✅ Download receipt button (placeholder for future implementation)

## Usage

### Fetching Transactions
```typescript
const { data, isLoading, isError } = useVendorTransactions({
  search: "EV-007",
  status: "success",
  booking_date: "2025-12-18",
  page: 1,
  per_page: 30,
});
```

### Accessing Data
```typescript
const transactions = data?.data || [];
const earnings = data?.earnings || "0.00";
const meta = data?.meta;
```

## Next Steps

1. **CSV Export**: Implement actual CSV export functionality
2. **Receipt Download**: Integrate with receipt generation API
3. **Date Range Filter**: Add "to" date for date range filtering
4. **Advanced Filters**: Add more filter options (amount range, payment method, etc.)
5. **Refund Action**: Add refund functionality for eligible transactions

## Testing

To test the integration:
1. Navigate to `/vendor/transactions`
2. Verify data loads from API
3. Test search functionality
4. Test status filter
5. Test date filter
6. Verify earnings display
7. Test pagination
8. Test sorting on different columns

## Notes

- All dates from the API are displayed as-is (no conversion)
- Currency is hardcoded to GBP (£)
- Status colors support both "success" and "Pending" (case-sensitive)
- Platform fee is displayed instead of service fee
- Pagination is client-side (data is fetched per page from API)

