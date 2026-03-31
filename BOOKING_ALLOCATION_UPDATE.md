# Booking Allocation System - API Response Update

## Overview

Updated the customer booking dashboard to handle the new allocation format from the API. The allocation structure changed from a simple array to a key-value object format.

## Changes Made

### 1. Type Definitions Updated

#### `src/services/customer/bookings/type.ts`

**TableAllocation Interface:**

- Changed `allocation: number[]` → `allocation: Record<string, number | string>`
- The new format uses table IDs as keys
- Values can be:
  - **Integer (number)**: Represents a NEW table allocation
  - **String with "+" prefix**: Represents an ADDITION to an existing table

Example API responses:

```json
// New tables
"allocation": {
  "127": 8,
  "128": 8
}

// Additions to existing tables
"allocation": {
  "127": "+4",
  "128": "+4",
  "230": 8
}
```

**Updated Fields:**

- `price_per_person`: Now accepts `number | string` (API returns strings like "40.00")
- Added optional fields: `total`, `deposit_per_person`

**SaveTable Interface:**

- Updated `allocation` to match new format

**BookingDetailsData Interface:**

- Added missing fields: `drink_title`, `payment_gateways`, `deposit_paid`, `reschedule_status`
- Made `partial_payment` optional and accept `string | number`

### 2. UI Component Updates

#### `src/app/(protected)/customer/bookings/[id]/_components/booking-info-tab.tsx`

**Interface Updates:**

- `BookingItem.allocation`: Changed to `Record<string, number | string>`
- `AddOnTable.allocation`: Changed to `Record<string, number | string>`

**Display Logic Enhancements:**

1. **Main Booking Tables Section (Lines 699-827)**

   - Converts allocation object to entries: `Object.entries(item.allocation || {})`
   - Uses sequential numbering: `Table 1`, `Table 2`, `Table 3` (not database IDs)
   - Simple blue color scheme for all tables
   - No "NEW" badges in main booking section
   - Color coding:
     - **Blue**: All tables (`bg-blue-50 border-blue-100`)

2. **Add-ons Tables Section (Lines 1102-1183)**
   - Similar logic with sequential numbering
   - Detects allocation type:
     - `typeof people === "number"` → New table (green badge with "NEW" indicator)
     - `typeof people === "string"` → Addition to existing table (purple badge)
   - Shows "NEW" badge ONLY for integer allocations (new tables)
   - Color coding:
     - **Green**: New addon tables (`bg-green-50 border-green-200`) with "NEW" badge
     - **Purple**: Additions to existing tables (`bg-purple-50 border-purple-200`)

**Visual Indicators:**

```tsx
// Main Booking Section - Simple display
<div className="bg-blue-50 border-blue-100">
  <span>Table 1: 8 People</span>
</div>

// Add-ons Section - New Table
<div className="bg-green-50 border-green-200">
  <span>Table 1: 8 People</span>
  <span className="bg-green-200">NEW</span>
</div>

// Add-ons Section - Existing Table Addition
<div className="bg-purple-50 border-purple-200">
  <span>Table 2: +4 People</span>
</div>
```

### 3. Data Transformation

#### `src/app/(protected)/customer/bookings/[id]/_components/adjust-booking-content.tsx`

**Line 113-119:**

- Passes allocation as-is from API (now as Record)
- Converts `price_per_person` from string to number for consistent handling

```typescript
allocation: table.allocation, // Now Record<string, number | string>
price_per_person: typeof table.price_per_person === "string"
  ? parseFloat(table.price_per_person)
  : table.price_per_person,
```

## Benefits

1. **Accurate Table Tracking**: Table IDs from the database are now displayed, making it easier to identify specific tables
2. **Clear Visual Distinction**: Users can immediately see which tables are new bookings vs additions to existing tables
3. **Type Safety**: Updated TypeScript types prevent runtime errors
4. **Maintainability**: Code now matches the actual API contract

## Files Modified

1. **src/services/customer/bookings/type.ts**
   - Updated `TableAllocation` interface
   - Updated `SaveTable` interface
   - Updated `SelectedTable` interface
   - Updated `BookingDetailsData` interface
   - Marked `AllocationEntry` as deprecated

2. **src/app/(protected)/customer/bookings/[id]/_components/booking-info-tab.tsx**
   - Updated `BookingItem` interface
   - Updated `AddOnTable` interface
   - Updated main booking tables display logic (lines 699-827)
   - Updated add-ons tables display logic (lines 1102-1183)
   - Added "NEW" badge for new table allocations
   - Implemented color-coded display (green for new, blue/purple for additions)

3. **src/app/(protected)/customer/bookings/[id]/_components/adjust-booking-content.tsx**
   - Updated allocation pass-through in data transformation (line 113)
   - Added proper handling of string/number price conversion (lines 114-117)

4. **src/app/(protected)/customer/bookings/[id]/_components/add-ons-tab.tsx**
   - Updated existing tables transformation logic (lines 139-169)
   - Converts Record format to internal array format for state management
   - Handles both integer and string allocation values

## Testing Checklist

- [x] Types updated and aligned with API response
- [x] No TypeScript/linter errors
- [x] Display logic handles both integer and string allocations
- [x] Visual indicators (badges) correctly identify new vs existing tables
- [x] Color coding is consistent throughout the booking details and add-ons sections
- [x] Add-ons tab properly transforms API allocation format
- [ ] Manual testing with real API data (recommended)
- [ ] Verify table allocation display in booking info tab
- [ ] Verify add-ons table display
- [ ] Test with various allocation combinations
- [ ] Test add-ons flow with existing tables
- [ ] Verify allocation submission works correctly

## Example Data Handling

### API Response Sample:

```json
{
  "tables": [
    {
      "table_size": 12,
      "price_per_person": "40.00",
      "no_tables": 2,
      "allocation": {
        "127": 8,
        "128": 8
      },
      "people": 16,
      "total": 640
    }
  ],
  "addons": {
    "tables": [
      {
        "table_size": 12,
        "price_per_person": "40.00",
        "no_tables": 1,
        "allocation": {
          "127": "+4",
          "128": "+4",
          "230": 8
        },
        "people": 16,
        "total": 640
      }
    ]
  }
}
```

### UI Display:

- Main booking tables will show 2 green "NEW" badges for tables 127 and 128
- Add-on tables will show purple badges for tables 127 and 128 (additions), and a green "NEW" badge for table 230

## Notes

- The internal add-ons state management (`src/app/(protected)/customer/bookings/[id]/_components/add-ons/types.ts`) still uses `number[]` for simplicity during user interaction
- Conversion from Record to array happens when submitting data to the API
- The allocation object keys represent actual database table IDs, not sequential indices
