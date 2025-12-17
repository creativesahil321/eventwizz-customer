# Booking Menu System Documentation

## Overview

The booking menu system allows customers to select dining preferences (starters, main courses, and desserts) for attendees across multiple event dates and tables within a single booking.

## Key Features

### 1. Multi-Date Support
- Bookings can have multiple event dates
- Each date has its own set of tables and guest counts
- Date switcher dropdown allows easy navigation between dates

### 2. Multi-Table Support
- Each date can have multiple tables
- Each table has a specified number of guests
- Table switcher dropdown appears when a date has multiple tables
- Menu selections are tracked separately for each table

### 3. Menu Selection Form
- Form allows adding attendee information:
  - Title (Mr, Mrs, Miss, Ms, Dr, Prof)
  - Full Name
  - Starter selection
  - Main Course selection
  - Dessert selection
  - Allergens and dietary requirements
  - Additional notes

### 4. Attendee Tracking
- Visual progress tracking showing completed vs pending attendees
- Separate tracking for each date and table combination
- Edit and delete functionality for menu selections
- Empty state when no selections exist

### 5. Submission System
- Global submission button tracks progress across all dates and tables
- Validation ensures all required fields are filled
- Confirmation prompt if not all guests have menu selections

## File Structure

```
menu-choices/
├── _lib/
│   ├── types.ts              # TypeScript interfaces and types
│   └── dummy-data.ts          # Dummy data for development (to be replaced with API)
├── _components/
│   ├── date-switcher.tsx      # Date selection dropdown component
│   ├── table-switcher.tsx     # Table selection dropdown component
│   ├── menu-selection-form.tsx # Menu form for attendees
│   ├── attendee-list.tsx      # List of attendees with their selections
│   └── allergen-modal.tsx     # Modal for allergen/dietary requirements
├── page.tsx                   # Main menu choices page with state management
└── MENU_SYSTEM_DOCUMENTATION.md
```

## Data Flow

### 1. URL Parameters
- `bookingId`: The booking ID from the bookings list
- `dateId`: Optional pre-selected date (from multi-date selection modal)

### 2. State Management
Menu selections are organized in a nested structure:

```typescript
{
  [bookingId]: {
    [dateKey]: {
      [tableId]: AttendeeMenuSelection[]
    }
  }
}
```

This allows tracking menu selections for each unique combination of:
- Booking
- Date
- Table

### 3. Component Communication

```
page.tsx (Main Controller)
├── DateSwitcher (Date Selection)
├── TableSwitcher (Table Selection)
├── MenuSelectionForm (Add/Edit Attendees)
└── AttendeeList (Display Attendees)
```

## User Flow

1. **Booking List**: User clicks "Add Menu" on a booking card
2. **Date Selection** (if multiple dates): Modal appears to select a date
3. **Menu Choices Page**: User lands on menu choices page
4. **Date Switcher** (if multiple dates): Dropdown shows all dates, user can switch
5. **Table Switcher** (if multiple tables): Dropdown shows all tables for selected date
6. **Current Context Alert**: Shows current date + table being edited
7. **Menu Form**: User fills out attendee information and menu selections
8. **Attendee List**: Shows all attendees for current date/table combination
9. **Edit/Delete**: User can modify or remove attendees
10. **Switch Context**: User can switch date/table to add more attendees
11. **Submit All**: Final submission includes all dates and tables

## Current Implementation

### Dummy Data
The system currently uses dummy data from `_lib/dummy-data.ts`. The example booking includes:
- 2 dates (September 20 and 21, 2025)
- Date 1: 2 tables (6 guests each)
- Date 2: 1 table (6 guests)
- Total: 18 guests across all dates and tables

### API Integration Points (TODO)

To replace with real API:

1. **Fetch Booking Data**
   ```typescript
   // In page.tsx line 26
   const bookingData = getDummyBookingData(bookingId);
   // Replace with:
   // const { data: bookingData } = useGetBookingMenuData(bookingId);
   ```

2. **Submit Menu Selections**
   ```typescript
   // In page.tsx line 208
   console.log("Submitting menu selections:", {...});
   // Replace with:
   // await submitMenuSelections(bookingId, menuSelections[bookingId]);
   ```

## Type Definitions

### MenuBooking
Main booking data structure with dates and tables.

### MenuBookingDate
Date information with associated tables.

### TableInfo
Table details including seats and guest count.

### AttendeeMenuSelection
Complete attendee menu selection including:
- Personal info (title, name)
- Menu choices (starter, main, dessert)
- Dietary info (allergens, requirements, notes)
- Context (booking_id, date_key, table_id)

### MenuSelectionState
Nested state structure for organizing selections by booking/date/table.

## Features for Backend Integration

When implementing the backend API, ensure it supports:

1. **Get Booking Menu Data**
   - Endpoint: `GET /api/bookings/{id}/menu-data`
   - Returns: Booking with dates and tables structure

2. **Submit Menu Selections**
   - Endpoint: `POST /api/bookings/{id}/menu-selections`
   - Payload: All menu selections organized by date and table
   - Validation: Ensure all guests have selections

3. **Get Existing Selections**
   - Endpoint: `GET /api/bookings/{id}/menu-selections`
   - Returns: Existing selections to pre-populate the form

4. **Update Single Selection**
   - Endpoint: `PUT /api/menu-selections/{id}`
   - Allows editing individual attendee selections

5. **Delete Selection**
   - Endpoint: `DELETE /api/menu-selections/{id}`
   - Allows removing an attendee selection

## UI/UX Considerations

### Visual Hierarchy
- Date switcher: Blue gradient background
- Table switcher: Amber/Orange gradient background
- Current context: Info alert showing active date/table
- Progress tracking: Header button shows global progress

### Responsive Design
- Form and list side-by-side on large screens
- Stacked vertically on mobile devices
- Switchers adapt to screen size

### User Feedback
- Toast notifications for all actions
- Confirmation dialogs for destructive actions
- Loading states during transitions
- Empty states when no data exists

## Future Enhancements

1. **Persistence**
   - Save selections to localStorage for offline capability
   - Auto-save on form completion

2. **Bulk Operations**
   - Copy selections from one table to another
   - Import attendee list from CSV

3. **Validation**
   - Check for duplicate attendee names
   - Warn if allergen conflicts with menu choice

4. **Analytics**
   - Track menu popularity
   - Generate kitchen preparation reports

5. **Notifications**
   - Email confirmations to attendees
   - Reminder for incomplete selections

