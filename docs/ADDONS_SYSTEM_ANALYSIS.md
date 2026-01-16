# Add-Ons System Analysis & Updates

## Overview

This document provides a comprehensive analysis of the EventWizz add-ons system, including types, API endpoints, data flow, and recent updates to support the new allocation format.

---

## 🔍 System Architecture

### 1. **API Endpoints**

#### Customer Endpoints
- **GET** `/customer/bookings/add-ons/{id}/{date}` - Fetch add-ons for a booking date
- **POST** `/customer/bookings/add-ons/store` - Save add-ons selections
- **DELETE** `/customer/bookings/delete-add-ons/{id}/{date}/{keyword}/{type}` - Delete specific add-ons

#### Vendor Endpoints
- **GET** `/vendor/bookings/add-ons/{id}/{date}` - Fetch add-ons for a booking date
- **POST** `/vendor/bookings/add-ons/store` - Save add-ons selections
- **DELETE** `/vendor/bookings/delete-add-ons/{id}/{date}/{keyword}/{type}` - Delete specific add-ons

---

## 📊 Data Types & Structures

### Add-Ons Response Structure

```typescript
interface AddOnsResponse {
  status: boolean;
  message: string;
  data: {
    selected_tables: SelectedTable[];
    tables: AddOnsTable[];
    tickets: AddOnsTicket[];
    drinks: AddOnsDrink[];
  };
  errors: string[];
}
```

### Tables

```typescript
interface AddOnsTable {
  id: number;                    // Table configuration ID
  min_persons: number;           // Minimum capacity
  max_persons: number;           // Maximum capacity
  price: number;                 // Price per person
  total_tables: number;          // Total available
  sold_tables: number;           // Already sold
  available_tables: number;      // Currently available
}

interface AllocationEntry {
  parent_id: number;             // Unique identifier for this table instance
  seats: number;                 // Number of seats allocated
}

interface SelectedTable {
  id: number;                    // Table configuration ID
  table_size: number;            // Capacity
  price: string;                 // Price (string format: "40.00")
  no_tables: number;             // Number of tables
  allocation: AllocationEntry[]; // NEW FORMAT: Array of {parent_id, seats}
}
```

### Tickets

```typescript
interface AddOnsTicket {
  id: number;
  title: string;
  description: string;
  price: number;
  total_capacity: number;
  sold_tickets: number;
  available_tickets: number;     // NEW: Pre-calculated available tickets
}
```

### Drinks

```typescript
interface AddOnsDrink {
  id: number;
  title: string;
  description: string;
  price: string;                 // String format: "50.00"
  available_quantity: number;    // Total quantity
  sold_quantity: number;         // NEW: Sold quantity
  available_drinks: number;      // NEW: Pre-calculated available drinks
  status: number;                // 1 = active, 0 = inactive
}
```

---

## 🔄 API Response Example (Updated Format)

### GET `/customer/bookings/add-ons/43/2025-09-20`

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "selected_tables": [
      {
        "id": 125,
        "table_size": 12,
        "price": "40.00",
        "no_tables": 2,
        "allocation": [
          {
            "parent_id": 127,
            "seats": 8
          },
          {
            "parent_id": 128,
            "seats": 8
          }
        ]
      }
    ],
    "tables": [
      {
        "id": 125,
        "min_persons": 8,
        "max_persons": 12,
        "price": 40,
        "total_tables": 52,
        "sold_tables": 2,
        "available_tables": 50
      }
    ],
    "tickets": [
      {
        "id": 185,
        "title": "General Admission",
        "description": "Access to the full event...",
        "price": 200,
        "total_capacity": 30,
        "sold_tickets": 1,
        "available_tickets": 29
      }
    ],
    "drinks": [
      {
        "id": 15,
        "title": "Lemon Drink",
        "description": "This is v.good lemon drink",
        "price": "50.00",
        "available_quantity": 78,
        "sold_quantity": 1,
        "available_drinks": 77,
        "status": 1
      }
    ]
  },
  "errors": []
}
```

---

## 📤 Payload Format (Updated)

### POST `/customer/bookings/add-ons/store`

#### FormData Structure

```
booking_id: 43
date: 2025-09-20
people_in_group: 8

// Existing Tables (type: "existing")
tables[0][id]: 125
tables[0][table_size]: 12
tables[0][price_per_person]: 40.00
tables[0][type]: existing
tables[0][no_tables]: 2
tables[0][allocation][0][parent_id]: 127
tables[0][allocation][0][seats]: 4
tables[0][allocation][1][parent_id]: 128
tables[0][allocation][1][seats]: 4

// New Tables (type: "new")
tables[1][id]: 124
tables[1][table_size]: 20
tables[1][price_per_person]: 30.00
tables[1][type]: new
tables[1][no_tables]: 1
tables[1][allocation][0][parent_id]: 1
tables[1][allocation][0][seats]: 20

// Drinks
drink_package[0][id]: 15
drink_package[0][title]: Lemon Drink
drink_package[0][price]: 50.00
drink_package[0][quantity]: 2

// Tickets
tickets[0][id]: 185
tickets[0][title]: General Admission
tickets[0][description]: Access to the full event...
tickets[0][price_per_ticket]: 200
tickets[0][quantity]: 1
```

---

## 🔑 Key Changes in New Format

### 1. **Allocation Structure**

**Old Format:**
```json
{
  "allocation": [8, 8]  // Simple array of seat counts
}
```

**New Format:**
```json
{
  "allocation": [
    { "parent_id": 127, "seats": 8 },
    { "parent_id": 128, "seats": 8 }
  ]
}
```

### 2. **Availability Fields**

**Added Pre-calculated Fields:**
- `available_tables` = `total_tables - sold_tables`
- `available_tickets` = `total_capacity - sold_tickets`
- `available_drinks` = `available_quantity - sold_quantity`

### 3. **Price Format**

- **Tables**: `price` is number in API, sent as string in payload
- **Drinks**: Always string format `"50.00"`
- **Selected Tables**: `price` is string format `"40.00"`

---

## 🛠️ Implementation Details

### React Query Hooks

#### **useAddOnsDetails** (Customer)
```typescript
const { data, isLoading, error } = useAddOnsDetails(bookingId, date);

// Query Key: ["add-ons-details", bookingId, date]
// Stale Time: 5 minutes
// Cache Time: 10 minutes
```

#### **useSaveAddOns** (Customer)
```typescript
const saveAddOnsMutation = useSaveAddOns();

saveAddOnsMutation.mutate(formData, {
  onSuccess: () => {
    // Invalidates: ["add-ons-details"], booking details
  }
});
```

#### **useDeleteAddOns** (Customer)
```typescript
const deleteAddOnsMutation = useDeleteAddOns();

deleteAddOnsMutation.mutate({
  bookingId: 43,
  date: "2025-09-20",
  keyword: "125",  // table size or item ID
  type: "tables"   // "tables" | "drinks" | "tickets"
});
```

### Component State Management

```typescript
// Internal component state
interface TableData {
  id: string;              // React state ID: "table-12-0"
  tableConfigId: number;   // Backend ID: 125
  capacity: number;        // 12
  table_count: number;     // 2
  allocation: number[];    // [8, 8] - seat counts
  parent_ids: number[];    // [127, 128] - backend IDs
  people_added: number;    // 16
  price_per_person: number; // 40.00
}
```

---

## 🔄 Data Transformation Flow

### 1. **API Response → Component State**

```typescript
// Transform selected_tables from API
const transformedExistingTables: TableData[] = selectedTables.map(
  (selectedTable, index) => {
    const allocationData = selectedTable.allocation; // Array<{parent_id, seats}>
    
    // Extract seats and parent_ids
    const seats = allocationData.map(entry => entry.seats);
    const parentIds = allocationData.map(entry => entry.parent_id);

    return {
      id: `table-${selectedTable.table_size}-${index}`,
      tableConfigId: selectedTable.id,
      capacity: selectedTable.table_size,
      table_count: selectedTable.no_tables,
      allocation: seats,           // [8, 8]
      parent_ids: parentIds,       // [127, 128]
      people_added: seats.reduce((sum, count) => sum + count, 0),
      price_per_person: parseFloat(selectedTable.price),
    };
  }
);
```

### 2. **Component State → FormData Payload**

```typescript
// For existing tables
allocation.forEach((seats, allocationIndex) => {
  const parentId = parentIds[allocationIndex] || allocationIndex + 1;
  formData.append(
    `tables[${tableIndex}][allocation][${allocationIndex}][parent_id]`,
    parentId.toString()
  );
  formData.append(
    `tables[${tableIndex}][allocation][${allocationIndex}][seats]`,
    seats.toString()
  );
});

// For new tables (use sequential parent_ids)
allocation.forEach((seats, allocationIndex) => {
  formData.append(
    `tables[${tableIndex}][allocation][${allocationIndex}][parent_id]`,
    (allocationIndex + 1).toString()
  );
  formData.append(
    `tables[${tableIndex}][allocation][${allocationIndex}][seats]`,
    seats.toString()
  );
});
```

---

## 📋 Files Updated

### Customer Files
1. ✅ `src/services/customer/bookings/type.ts` - Updated type definitions
2. ✅ `src/app/(protected)/customer/bookings/[id]/_components/add-ons/types.ts` - Added `parent_ids` field
3. ✅ `src/app/(protected)/customer/bookings/[id]/_components/add-ons-tab.tsx` - Updated transformation and payload logic

### Vendor Files
4. ✅ `src/services/vendor/bookings/add-ons.service.ts` - Updated type definitions
5. ✅ `src/app/(protected)/vendor/booking-history/[id]/_components/add-ons/types.ts` - Added `parent_ids` field
6. ✅ `src/app/(protected)/vendor/booking-history/[id]/_components/add-ons-tab.tsx` - Updated transformation and payload logic

---

## 🧪 Testing Checklist

### Existing Tables
- [ ] Load booking with existing tables - verify allocation displays correctly
- [ ] Add people to existing table using +/- buttons
- [ ] Use "Manage" to modify allocation on existing table
- [ ] Save changes and verify payload format
- [ ] Verify parent_ids are preserved from API response

### New Tables
- [ ] Select new table from available options
- [ ] Set quantity and verify allocation
- [ ] Use "Manage" for multiple tables
- [ ] Save and verify sequential parent_ids (1, 2, 3...)

### Drinks & Tickets
- [ ] Verify available quantities display correctly
- [ ] Add drinks and tickets
- [ ] Save and verify payload includes IDs

### Edge Cases
- [ ] Mixed scenario: existing + new tables in same request
- [ ] Empty allocation arrays
- [ ] Zero quantities
- [ ] Maximum capacity limits

---

## 🚨 Breaking Changes

### What Changed
1. **Allocation format**: Changed from `number[]` to `Array<{parent_id: number, seats: number}>`
2. **Availability fields**: Now pre-calculated by backend
3. **Price format**: `selected_tables.price` is now string format

### Migration Notes
- ✅ **Backward compatible**: Old code will fail gracefully with empty allocations
- ✅ **Type safety**: TypeScript will catch type mismatches
- ✅ **No database changes**: Only API contract changed

---

## 📚 Related Documentation

- `docs/BACKEND_ADDONS_PAYLOAD.md` - Detailed payload structure documentation
- `docs/ADJUST_BOOKING_SYSTEM.md` - Booking adjustment system overview

---

**Last Updated**: January 9, 2026  
**Updated By**: AI Assistant  
**Version**: 2.0 (New Allocation Format)
