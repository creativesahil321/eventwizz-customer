# Vendor Booking Adjustment System

## Overview
This module allows vendors to view and adjust customer bookings from their dashboard. Vendors can manage booking details, update ticket counts, and handle customer requests for changes.

## Features

### 1. **Enhanced Booking History Table**
- **New Action Buttons:**
  - 👁️ **View** - Quick view of booking details
  - ⚙️ **Adjust** - Edit and modify booking (highlighted in primary color)
  - 📥 **Download** - Export booking data
  - ✉️ **Mail** - Send email to customer

- **Color-Coded Status Badges:**
  - Payment Status: Green (Paid), Orange (Pending), Red (Failed)
  - Order Status: Green (Completed), Blue (Processing), Red (Cancelled)

### 2. **Adjust Booking Page** (`/vendor/booking-history/[id]`)

#### Customer Information Display:
- Customer Name
- Email Address
- Phone Number
- Location
- Booking Date
- Created Date

#### Booking Details:
- **Event Dates Section:**
  - Multiple dates support with accordion view
  - Each date shows:
    - Tables breakdown with capacity
    - Ticket counts
    - Drinks included
    - People allocation per table
    - Payment status per date

- **Payment Summary:**
  - Paid amount
  - Discount applied
  - Balance remaining
  - Total amount
  - Quick stats (tables, tickets, total people)

#### Edit Mode Features:
- Toggle edit mode with "Edit Booking" button
- Adjust ticket counts with +/- buttons
- Save or cancel changes
- Real-time UI updates

### 3. **Professional UI/UX**
- Clean card-based layout
- Tab-based navigation (Booking Info | Payment Summary)
- Responsive design (mobile-first)
- Visual feedback for actions
- Loading states and error handling

## File Structure

```
booking-history/
├── page.tsx                          # Main booking history list
├── _components/
│   ├── columns.tsx                   # Table columns with new actions
│   ├── history-data-table.tsx       # Data table with navigation logic
│   └── ...
├── _lib/
│   ├── types.ts                      # Updated with new action types
│   ├── actions.ts                    # API actions with filtering
│   └── ...
└── [id]/
    ├── page.tsx                      # Adjust booking page wrapper
    └── _components/
        └── adjust-booking-content.tsx # Main adjustment UI component
```

## How It Works

### 1. **From Booking History Table:**
```typescript
// User clicks "Adjust" button
// → Navigates to /vendor/booking-history/{booking_id}
// → Loads booking details
// → Shows comprehensive booking info
```

### 2. **Edit Workflow:**
```typescript
// 1. Click "Edit Booking" button
// 2. UI switches to edit mode
// 3. Adjust tickets/details using +/- buttons
// 4. Click "Save Changes" or "Cancel"
// 5. Data syncs with backend API
```

### 3. **Data Flow:**
```
Booking History Table
    ↓ (click Adjust)
Adjust Booking Page
    ↓ (loads data)
Display Customer & Booking Info
    ↓ (click Edit)
Enable Edit Mode
    ↓ (make changes)
Save to Backend API
    ↓ (success)
Update UI & Show Toast
```

## Integration with Backend

### Current Implementation:
- Using **mock data** for demonstration
- Replace `mockBookingData` with actual API call

### To Integrate:
1. Create API service in `_lib/queries.ts`:
```typescript
export const useBookingDetails = (bookingId: string) => {
  return useQuery({
    queryKey: ["vendor-booking", bookingId],
    queryFn: () => fetchBookingDetails(bookingId),
  });
};
```

2. Create mutation for updates:
```typescript
export const useUpdateBooking = () => {
  return useMutation({
    mutationFn: (data: UpdateBookingData) => updateBooking(data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(["vendor-booking"]);
    },
  });
};
```

## Customer Data Shown to Vendor

### Essential Information:
1. **Identity:**
   - Full name
   - Email address
   - Phone number

2. **Booking Details:**
   - Event name & location
   - Booking ID (for reference)
   - Booking date & created date

3. **Financial Information:**
   - Total amount
   - Paid amount
   - Balance/pending amount
   - Discount applied

4. **Booking Composition:**
   - Number of tables (with capacity breakdown)
   - Number of tickets
   - Total people count
   - People allocation per table
   - Drinks included

5. **Status Information:**
   - Payment status (Paid/Pending/Partial)
   - Order status (Completed/Processing/Cancelled)
   - Per-date payment status

## Benefits of This Approach

✅ **Unified Interface**: One page for viewing and editing
✅ **Clear Separation**: List view → Detail view → Edit mode
✅ **Professional UI**: Clean, modern design matching the brand
✅ **Mobile Responsive**: Works on all device sizes
✅ **Easy to Extend**: Add new fields or sections easily
✅ **Customer Context**: Vendors see full customer information
✅ **Action History**: Can track what was adjusted
✅ **Flexible**: Can adjust tickets, tables, payments, etc.

## Next Steps (When Backend Ready)

1. Replace mock data with real API calls
2. Add real-time validation
3. Implement booking adjustment history log
4. Add email notifications to customers when bookings are adjusted
5. Add permission checks for different vendor roles
6. Implement audit trail for booking changes

## Usage Example

```typescript
// Vendor clicks "Adjust" on a booking
// → Page loads with bookingId from URL
// → Fetches booking details from API
// → Displays comprehensive booking info
// → Vendor clicks "Edit Booking"
// → Makes changes (e.g., adds 2 more tickets)
// → Clicks "Save Changes"
// → API updates booking
// → Customer receives notification email
// → Booking history table updates automatically
```

## Notes

- This implementation follows the **same pattern** as the customer booking view
- Uses **list format** (table) in history, detailed view for adjustments
- All customer data is visible to help vendors make informed decisions
- Edit mode is **toggle-based** for safety (explicit save/cancel)
- Toast notifications provide feedback for all actions

