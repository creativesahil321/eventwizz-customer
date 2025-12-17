# Add-Ons API Payload Documentation

## Overview

This document explains the payload structure for the **Add-Ons** endpoint (`POST /customer/bookings/{id}/add-ons`), specifically how to identify:

- **Existing tables** with added people
- **New tables** selected by the user
- **Person distribution/allocation** across tables
- **⚠️ Mixed scenarios**: Users can select BOTH existing AND new tables in the same request

---

## Payload Structure

### Base Fields

```json
{
  "booking_id": 28,
  "date": "2025-09-20",
  "people_in_group": 11
}
```

### Tables Array

The `tables[]` array contains **two types** of table entries:

1. **Existing Tables** (`type: "existing"`) - Tables already in the booking that need more people
2. **New Tables** (`type: "new"`) - Brand new tables added to the booking

---

## 1. Existing Tables (`type: "existing"`)

### When is a table sent as "existing"?

- User clicks **"Manage"** on an existing table in the booking
- User adds more people to that table OR changes the allocation distribution
- Only sent if `peopleAdded > 0` OR `allocation` was modified

### Payload Structure

```json
{
  "tables[0][id]": "125", // Table configuration ID (from available_table_sizes)
  "tables[0][table_size]": "12", // Max capacity of the table
  "tables[0][price_per_person]": "40.00", // Original price (already paid, but required for validation)
  "tables[0][type]": "existing", // ⚠️ KEY: Identifies this as an existing table
  "tables[0][no_tables]": "4", // Number of tables of this size
  "tables[0][allocation]": "[10,10,10,10]" // ⚠️ KEY: Person distribution across tables (JSON string)
}
```

### Understanding `allocation` Field

- **Format**: JSON string array of numbers
- **Meaning**: Distribution of people across each table
- **Example**: `"[10,10,10,10]"` means:
  - Table 1: 10 people
  - Table 2: 10 people
  - Table 3: 10 people
  - Table 4: 10 people
  - **Total**: 40 people across 4 tables

### How to Calculate People Added to Existing Tables

```php
// Parse allocation array
$allocation = json_decode($table['allocation'], true); // [10,10,10,10]

// Get original allocation from booking (before add-ons)
$originalAllocation = $booking->getOriginalAllocation($table['id']); // e.g., [8,8,8,8]

// Calculate people added per table
$peopleAddedPerTable = [];
foreach ($allocation as $index => $newCount) {
    $originalCount = $originalAllocation[$index] ?? 0;
    $peopleAddedPerTable[$index] = $newCount - $originalCount;
}

// Total people added to this table configuration
$totalPeopleAdded = array_sum($peopleAddedPerTable); // e.g., 8 (2 per table × 4 tables)
```

### Example: Existing Table with People Added

**Original State:**

- 4 tables of size 12
- Original allocation: `[8,8,8,8]` (32 people total)

**User Action:**

- Clicks "Manage" on this table
- Changes allocation to `[10,10,10,10]` (40 people total)
- Adds 8 more people

**Payload:**

```json
{
  "tables[0][id]": "125",
  "tables[0][table_size]": "12",
  "tables[0][price_per_person]": "40.00",
  "tables[0][type]": "existing",
  "tables[0][no_tables]": "4",
  "tables[0][allocation]": "[10,10,10,10]"
}
```

**Backend Logic:**

```php
// Compare with original allocation
$originalAllocation = [8, 8, 8, 8];
$newAllocation = [10, 10, 10, 10];
$peopleAdded = 8; // (10-8) × 4 tables
```

---

## 2. New Tables (`type: "new"`)

### When is a table sent as "new"?

- User selects a table from the **"Recommended Tables"** section
- User sets quantity > 0 for a new table size
- These are **completely new** tables not previously in the booking

### Payload Structure

```json
{
  "tables[1][id]": "126", // Table configuration ID (from available_table_sizes)
  "tables[1][table_size]": "20", // Max capacity of the table
  "tables[1][price_per_person]": "30.00", // Price per person (calculated: tableSize.price / max_persons)
  "tables[1][type]": "new", // ⚠️ KEY: Identifies this as a new table
  "tables[1][no_tables]": "1", // Number of new tables being added
  "tables[1][allocation]": "[20]" // ⚠️ KEY: Person distribution (JSON string)
}
```

### Understanding `allocation` for New Tables

- **Format**: JSON string array of numbers
- **Meaning**: How many people are assigned to each new table
- **Example**: `"[20]"` means:
  - 1 new table with 20 people
- **Example**: `"[10,10]"` means:
  - 2 new tables, each with 10 people

### How to Calculate Total People in New Tables

```php
// Parse allocation array
$allocation = json_decode($table['allocation'], true); // [20] or [10,10]

// Total people in new tables
$totalPeople = array_sum($allocation); // 20 or 20 (10+10)

// Number of tables
$numberOfTables = count($allocation); // 1 or 2
```

### Example: New Table Added

**User Action:**

- Selects "Table for 20 (15-20 persons)" from Recommended Tables
- Sets quantity to 1
- System auto-allocates 20 people (based on `people_in_group`)

**Payload:**

```json
{
  "tables[1][id]": "126",
  "tables[1][table_size]": "20",
  "tables[1][price_per_person]": "30.00",
  "tables[1][type]": "new",
  "tables[1][no_tables]": "1",
  "tables[1][allocation]": "[20]"
}
```

**Backend Logic:**

```php
// This is a new table - create it
$allocation = [20];
$totalPeople = 20;
$numberOfTables = 1;
$pricePerPerson = 30.00;
// Charge: 20 × 30.00 = 600.00
```

---

## 3. Mixed Scenario: Existing + New Tables

### ⚠️ IMPORTANT: Both Types Can Be Sent Together

**Users can select BOTH existing tables AND new tables in the same request!**

### How It Works

1. **Existing tables are processed FIRST** (index 0, 1, 2...)
2. **New tables are processed AFTER** (continuing the index sequence)
3. **The `type` field is the ONLY way to distinguish them**

### Example: User Selects Both

**Scenario:**

- User has existing booking with 4 tables (size 12)
- User adds 2 more people to existing tables
- User ALSO adds 1 new table (size 20) with 11 people

**Payload Structure:**

```json
{
  "booking_id": "28",
  "date": "2025-09-20",
  "people_in_group": "11",

  // EXISTING TABLE (index 0)
  "tables[0][id]": "125",
  "tables[0][table_size]": "12",
  "tables[0][price_per_person]": "40.00",
  "tables[0][type]": "existing", // ⚠️ KEY: This is existing
  "tables[0][no_tables]": "4",
  "tables[0][allocation]": "[10,10,10,10]",

  // NEW TABLE (index 1)
  "tables[1][id]": "126",
  "tables[1][table_size]": "20",
  "tables[1][price_per_person]": "30.00",
  "tables[1][type]": "new", // ⚠️ KEY: This is new
  "tables[1][no_tables]": "1",
  "tables[1][allocation]": "[11]"
}
```

### Backend Processing Logic (Mixed Scenario)

```php
$existingTables = [];
$newTables = [];

foreach ($request->tables as $index => $table) {
    $allocation = json_decode($table['allocation'], true);

    if ($table['type'] === 'existing') {
        // Process existing table
        $existingTables[] = [
            'id' => $table['id'],
            'allocation' => $allocation,
            'original_allocation' => $booking->getOriginalAllocation($table['id']),
        ];

        // Update existing table allocation
        $booking->updateTableAllocation($table['id'], $allocation);

    } else if ($table['type'] === 'new') {
        // Process new table
        $newTables[] = [
            'id' => $table['id'],
            'allocation' => $allocation,
            'price_per_person' => $table['price_per_person'],
        ];

        // Create new table entries
        $booking->addNewTables(
            $table['id'],
            $table['no_tables'],
            $allocation,
            $table['price_per_person']
        );

        // Calculate charge for new table
        $totalPeople = array_sum($allocation);
        $charge = $totalPeople * $table['price_per_person'];
    }
}

// Summary
$totalExistingPeopleAdded = 0;
foreach ($existingTables as $table) {
    $originalSum = array_sum($table['original_allocation']);
    $newSum = array_sum($table['allocation']);
    $totalExistingPeopleAdded += ($newSum - $originalSum);
}

$totalNewPeople = 0;
$totalNewCharge = 0;
foreach ($newTables as $table) {
    $totalNewPeople += array_sum($table['allocation']);
    $totalNewCharge += array_sum($table['allocation']) * $table['price_per_person'];
}
```

### Key Points for Mixed Scenarios

1. **Always check `type` field first** - Don't assume all tables are the same type
2. **Index order doesn't matter** - `tables[0]` could be existing, `tables[1]` could be new
3. **Process each type separately** - Use different logic for existing vs new
4. **Calculate totals separately** - Existing tables may have different pricing rules

---

## 4. Complete Payload Example

### Scenario

- **Booking ID**: 28
- **Date**: 2025-09-20
- **People in Group**: 11
- **Action 1**: User adds 2 people to existing table (4 tables, size 12)
- **Action 2**: User adds 1 new table (size 20) with 11 people

### Payload

```json
{
  "booking_id": "28",
  "date": "2025-09-20",
  "people_in_group": "11",

  "tables[0][id]": "125",
  "tables[0][table_size]": "12",
  "tables[0][price_per_person]": "40.00",
  "tables[0][type]": "existing",
  "tables[0][no_tables]": "4",
  "tables[0][allocation]": "[10,10,10,10]",

  "tables[1][id]": "126",
  "tables[1][table_size]": "20",
  "tables[1][price_per_person]": "30.00",
  "tables[1][type]": "new",
  "tables[1][no_tables]": "1",
  "tables[1][allocation]": "[11]"
}
```

### Backend Processing Logic

```php
foreach ($request->tables as $table) {
    $allocation = json_decode($table['allocation'], true);
    $totalPeople = array_sum($allocation);

    if ($table['type'] === 'existing') {
        // Get original allocation from booking
        $originalAllocation = $booking->getOriginalAllocation($table['id']);
        $peopleAdded = $totalPeople - array_sum($originalAllocation);

        // Update existing table allocation
        $booking->updateTableAllocation($table['id'], $allocation);

        // Calculate additional charge (if any)
        // Note: price_per_person is original price, may need to check if additional charge applies
    } else if ($table['type'] === 'new') {
        // Create new table entries
        $booking->addNewTables(
            $table['id'],
            $table['no_tables'],
            $allocation,
            $table['price_per_person']
        );

        // Calculate charge
        $charge = $totalPeople * $table['price_per_person'];
    }
}
```

---

## 5. Key Points for Backend Developers

### ✅ Important Rules

1. **⚠️ MIXED SCENARIOS: Both types can be in the same request**

   - Users can select **BOTH existing AND new tables** in one submission
   - Always check `type` field for EACH table entry
   - Process existing tables and new tables separately
   - Don't assume all tables are the same type

2. **`type` field is CRITICAL**

   - `"existing"` = Update existing table allocation
   - `"new"` = Create new table entries
   - **MUST check this field for every table entry**

3. **`allocation` is always a JSON string**

   - Must parse with `json_decode($allocation, true)`
   - Array length = number of tables
   - Each value = people assigned to that table

4. **`price_per_person` for existing tables**

   - Contains the **original price** (already paid)
   - Backend validation requires minimum 1
   - May need to check if additional charge applies based on business logic

5. **`price_per_person` for new tables**

   - Contains the **new price** to charge
   - Calculated as: `tableSize.price / tableSize.max_persons`

6. **`id` field**

   - References `available_table_sizes.id` (table configuration)
   - NOT the booking table ID
   - Use this to look up table configuration details

7. **`no_tables` vs `allocation.length`**
   - `no_tables` = Total number of tables
   - `allocation.length` = Should match `no_tables`
   - Use `allocation.length` as source of truth

### ⚠️ Edge Cases

1. **Empty allocation array**

   - Should not happen, but handle gracefully
   - Default to `[]` if missing

2. **Allocation sum doesn't match `people_in_group`**

   - User may have distributed people differently
   - Trust the `allocation` array as source of truth

3. **Existing table with no changes**
   - If user clicks "Manage" but makes no changes
   - Table may not be sent in payload (frontend filters these out)

---

## 5. Validation Checklist

Before processing, validate:

- [ ] `tables[].type` is either `"existing"` or `"new"`
- [ ] `tables[].id` exists in `available_table_sizes`
- [ ] `tables[].allocation` is valid JSON array
- [ ] `tables[].allocation.length` matches `tables[].no_tables`
- [ ] `tables[].price_per_person >= 1` (backend requirement)
- [ ] For `type: "existing"`, verify table exists in booking
- [ ] For `type: "new"`, verify table is available (not already in booking)

---

## 6. Database Operations

### For Existing Tables

```php
// Update allocation
UPDATE booking_tables
SET allocation = '[10,10,10,10]'
WHERE booking_id = ? AND table_size_id = ?;

// Calculate additional charge (if applicable)
$originalTotal = 32; // Original allocation sum
$newTotal = 40;      // New allocation sum
$peopleAdded = 8;
$additionalCharge = $peopleAdded * $pricePerPerson;
```

### For New Tables

```php
// Insert new booking tables
INSERT INTO booking_tables (
    booking_id,
    table_size_id,
    no_tables,
    allocation,
    price_per_person
) VALUES (?, ?, ?, ?, ?);

// Calculate charge
$charge = array_sum($allocation) * $pricePerPerson;
```

---

## 7. Questions?

If you have questions about the payload structure, please refer to:

- Frontend file: `src/app/(protected)/customer/bookings/[id]/_components/add-ons-tab.tsx`
- Payload generation: Lines 517-600

---

**Last Updated**: 2025-01-18
**Frontend Version**: Next.js 15.2.0
