# Menu Choices System Documentation

## Overview

A professional menu selection system that allows customers to manage dining preferences for multiple attendees in their bookings. The system features a clean, two-column layout with real-time form management and comprehensive attendee tracking.

---

## System Architecture

### Page Structure

- **Location**: `src/app/(protected)/customer/menu-choices/page.tsx`
- **Layout**: Two-column responsive grid
  - **Left**: Menu selection form
  - **Right**: Attendee list with live updates

### Components

#### 1. **MenuSelectionForm**

- **Location**: `src/app/(protected)/customer/menu-choices/_components/menu-selection-form.tsx`
- **Purpose**: Add/Edit menu selections for individual attendees
- **Features**:
  - Title selection (Mr, Mrs, Miss, Ms, Dr, Prof)
  - Full name input
  - Starter, Main Course, and Dessert selection
  - Allergen and dietary requirements modal
  - Edit mode support
  - Form validation

#### 2. **AttendeeList**

- **Location**: `src/app/(protected)/customer/menu-choices/_components/attendee-list.tsx`
- **Purpose**: Display all attendees with their menu selections
- **Features**:
  - Scrollable list with progress tracking
  - Completed vs Pending status indicators
  - Edit/Delete actions per attendee
  - Visual badges for allergens and dietary requirements
  - Empty state placeholder
  - Pending attendee slots display

#### 3. **AllergenModal**

- **Location**: `src/app/(protected)/customer/menu-choices/_components/allergen-modal.tsx`
- **Purpose**: Capture detailed allergen and dietary information
- **Features**:
  - Multi-select allergen checkboxes
  - Dietary requirement selection
  - Additional notes textarea
  - Save/Cancel actions

---

## Data Structure

### AttendeeMenuSelection Interface

```typescript
export interface AttendeeMenuSelection {
  id: string;
  title: string;
  fullName: string;
  starter: string;
  mainCourse: string;
  dessert: string;
  allergens?: string[];
  dietaryRequirements?: string[];
  additionalNotes?: string;
  status: "completed" | "pending";
}
```

### AllergenData Interface

```typescript
export interface AllergenData {
  allergens: string[];
  dietaryRequirements: string[];
  additionalNotes?: string;
}
```

---

## User Flow

### 1. **Navigate from Bookings**

- Customer clicks "Add Menu" button on a booking card
- Redirected to `/customer/menu-choices?bookingId=<booking_id>`

### 2. **Add Attendee Menu Selections**

- Fill out form for each attendee:
  - Personal details (title, name)
  - Menu selections (starter, main, dessert)
  - Allergen/dietary requirements (optional)
- Click "Add Attendee" button
- Attendee appears in right panel with "Completed" status

### 3. **Edit Existing Selection**

- Click "Edit" button on any attendee card
- Form populates with attendee data
- Make changes and click "Update Selection"
- Click "Cancel" to abort changes

### 4. **Delete Attendee**

- Click "Delete" button on any attendee card
- Confirm deletion in prompt
- Attendee removed from list

### 5. **Submit All Selections**

- Click "Submit All Selections" button in header
- System validates minimum attendee requirement
- Warns if not all guests have selections
- Submits all data to API

---

## Features

### Progress Tracking

- **Header Badge**: Shows `X/Y` attendees completed
- **Stat Cards**: Separate counts for completed and pending
- **Visual States**:
  - Completed: Green background with checkmark
  - Pending: Amber background with clock icon

### Responsive Design

- **Desktop**: Two-column layout (50/50 split)
- **Mobile**: Stacked layout (form on top, list below)
- **Sticky Form**: Form sticks to top on desktop for easy access

### Visual Hierarchy

- **Color Coding**:
  - Primary color: Headers and action buttons
  - Green: Completed status
  - Amber: Pending status
  - Red: Allergen badges
  - Gray: Dietary requirement badges

### User Experience

- **Real-time Updates**: List updates immediately when attendee added/edited
- **Empty States**: Helpful placeholder when no attendees added
- **Pending Slots**: Visual representation of remaining attendees
- **Toast Notifications**: Success/error feedback for all actions
- **Scroll to Form**: Auto-scroll when editing attendee
- **Confirmation Prompts**: Prevent accidental deletions

---

## API Integration (TODO)

### Fetch Booking Data

```typescript
// GET /api/v1/customer/bookings/:bookingId
// Response:
{
  booking_id: number;
  total_guests: number;
  event_name: string;
  event_date: string;
  existing_menu_selections?: AttendeeMenuSelection[];
}
```

### Submit Menu Selections

```typescript
// POST /api/v1/customer/menu-choices
// Payload:
{
  booking_id: number;
  attendees: AttendeeMenuSelection[];
}
// Response:
{
  success: boolean;
  message: string;
}
```

### Update Menu Selection

```typescript
// PUT /api/v1/customer/menu-choices/:attendeeId
// Payload:
{
  title: string;
  fullName: string;
  starter: string;
  mainCourse: string;
  dessert: string;
  allergens: string[];
  dietaryRequirements: string[];
  additionalNotes?: string;
}
```

### Delete Menu Selection

```typescript
// DELETE /api/v1/customer/menu-choices/:attendeeId
// Response:
{
  success: boolean;
  message: string;
}
```

---

## Implementation Notes

### State Management

- **Local State**: Uses React `useState` for attendee list and form data
- **Form State**: Separate state for current form inputs
- **Edit Mode**: Tracks currently editing attendee
- **Future**: Consider Zustand store for complex scenarios

### Validation

- **Required Fields**: Title, Full Name, Starter, Main, Dessert
- **Minimum Attendees**: At least 1 attendee required to submit
- **Guest Count Warning**: Alerts if not all guests have selections

### Error Handling

- Form validation before adding attendee
- Confirmation prompts for destructive actions
- Toast notifications for all actions
- API error handling (to be implemented)

### Performance

- **Scroll Area**: Virtualized scrolling for large attendee lists
- **Memoization**: Consider `useMemo` for filtered/sorted lists
- **Lazy Loading**: Load booking data on mount

---

## Menu Options (Sample Data)

### Starters

- Butternut Squash Soup (V)
- Caesar Salad
- Prawn Cocktail
- Tomato Bruschetta (V)
- French Onion Soup

### Main Courses

- Roast Beef
- Grilled Salmon
- Chicken Supreme
- Vegetable Wellington (V)
- Lamb Shank
- Pasta Primavera (V)

### Desserts

- Crème Brûlée (GF)
- Chocolate Tart
- Tiramisu
- Fruit Pavlova (GF)
- New York Cheesecake
- Fresh Sorbet (V, GF)

### Common Allergens

- Dairy
- Eggs
- Fish
- Shellfish
- Tree Nuts
- Peanuts
- Wheat
- Soy
- Sesame
- Sulfites
- Mustard
- Celery
- Lupin

### Dietary Requirements

- Vegetarian
- Vegan
- Gluten-Free
- Dairy-Free
- Nut-Free
- Halal
- Kosher
- Low Sodium
- Diabetic Friendly

---

## Future Enhancements

### Phase 1 - API Integration

- [ ] Connect to backend API for booking data
- [ ] Fetch existing menu selections
- [ ] Implement save/update/delete endpoints
- [ ] Add loading states and error handling

### Phase 2 - Advanced Features

- [ ] Bulk import attendees from CSV
- [ ] Email menu selection links to attendees
- [ ] Allow attendees to self-select menus
- [ ] Print menu selection summary
- [ ] Export to catering team format

### Phase 3 - Vendor Integration

- [ ] Dynamic menu options from vendor
- [ ] Real-time inventory checking
- [ ] Special requests/customization options
- [ ] Pricing display per menu item
- [ ] Multi-course meal planning

### Phase 4 - Analytics

- [ ] Popular menu item tracking
- [ ] Allergen frequency reports
- [ ] Dietary requirement statistics
- [ ] Menu selection completion rates

---

## Testing Checklist

### Functional Testing

- [ ] Add attendee with all fields
- [ ] Add attendee with allergens
- [ ] Edit existing attendee
- [ ] Delete attendee with confirmation
- [ ] Cancel edit mode
- [ ] Submit with incomplete guest count
- [ ] Submit with all guests completed
- [ ] Form validation for required fields

### UI/UX Testing

- [ ] Responsive layout on mobile
- [ ] Responsive layout on tablet
- [ ] Responsive layout on desktop
- [ ] Scroll behavior in attendee list
- [ ] Empty state display
- [ ] Pending slots display
- [ ] Toast notifications
- [ ] Modal behavior

### Edge Cases

- [ ] No bookingId in URL
- [ ] Invalid bookingId
- [ ] Zero total guests
- [ ] Maximum guests (100+)
- [ ] Long attendee names
- [ ] Long additional notes
- [ ] Multiple allergens/requirements
- [ ] Rapid add/edit/delete operations

---

## Troubleshooting

### Issue: Form doesn't reset after adding attendee

**Solution**: Check that form state is being cleared in `handleSaveAttendee` when not in edit mode

### Issue: Edited attendee doesn't update in list

**Solution**: Verify that the attendee ID is being properly matched in the state update function

### Issue: Scroll doesn't work in attendee list

**Solution**: Ensure ScrollArea component has a fixed height (e.g., `h-[calc(100vh-280px)]`)

### Issue: Toast notifications not appearing

**Solution**: Confirm Sonner provider is properly configured in app layout

---

## Accessibility

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Readers**: Proper ARIA labels on form inputs and buttons
- **Focus Management**: Focus returns to appropriate element after modal close
- **Color Contrast**: Meets WCAG AA standards for text and backgrounds
- **Error Messages**: Clear, descriptive validation errors

---

## Performance Metrics

- **Initial Load**: < 500ms
- **Form Submission**: < 200ms (local state update)
- **API Calls**: < 1000ms (to be implemented)
- **Scroll Performance**: 60fps in attendee list
- **Bundle Size**: < 100KB (gzipped)

---

## Related Documentation

- [CHECKOUT_SYSTEM.md](./CHECKOUT_SYSTEM.md) - For booking creation flow
- [TABLE_SYSTEM_DOCUMENTATION.md](./TABLE_SYSTEM_DOCUMENTATION.md) - For seating arrangements
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - For overall system architecture

---

**Last Updated**: October 27, 2025  
**Version**: 1.0.0  
**Status**: ✅ Ready for API Integration
