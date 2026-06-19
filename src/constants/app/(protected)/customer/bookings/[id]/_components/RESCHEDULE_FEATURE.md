# Event Date Reschedule Feature

## Overview
Professional multi-step UI for rescheduling event dates with price comparison, seating validation, and terms acceptance.

## Components

### 1. RescheduleDateModal
**Location**: `reschedule-date-modal.tsx`

Main modal component with 4-step wizard:

#### Step 1: Select Date
- Shows all available alternative dates
- Visual indicators for:
  - ✅ Available dates with matching seating
  - 🔴 Fully booked dates (disabled)
  - 🟠 Dates without matching seating (disabled)
  - Price difference badges (+/- from current price)
- Real-time availability check
- Current booking details displayed at top

#### Step 2: Review Changes
- Side-by-side comparison (Current vs New)
- Price difference calculation:
  - 🟠 Higher price: Shows additional payment required
  - 🔵 Lower price: Shows price reduction (no refund message)
  - ⚪ Same price: Confirmation message
- Seating availability confirmation

#### Step 3: Terms & Conditions
- Complete list of rescheduling policies:
  - Price difference handling
  - No refund policy
  - Seating requirements
  - Add-ons transfer rules
  - Irreversibility warning
- Mandatory checkbox acceptance

#### Step 4: Final Confirmation
- Summary card with all changes
- New total price
- Warning about irreversibility
- Processing state during API call

### 2. BookingInfoWithReschedule
**Location**: `booking-info-with-reschedule.tsx`

Demo integration showing:
- Event dates list with detailed information
- "Reschedule" button for each date
- Complete booking details (people, tables, tickets, drinks)
- Price display
- Modal trigger implementation

### 3. RescheduleDemoPage
**Location**: `reschedule-demo-page.tsx`

Full demo page with:
- Feature highlights
- Implementation notes
- Technical documentation

## Features

### UI/UX
- ✅ Professional multi-step wizard
- ✅ Progress bar with step indicators
- ✅ Smooth animations (Framer Motion)
- ✅ Responsive design
- ✅ Loading states
- ✅ Clear visual hierarchy
- ✅ Accessibility support (DialogTitle)

### Business Logic
- ✅ Price comparison and calculation
- ✅ Seating availability validation
- ✅ Terms & conditions acceptance
- ✅ Confirmation workflow
- ✅ No-refund policy enforcement

### User Safety
- ✅ Multi-step confirmation
- ✅ Clear warnings
- ✅ Irreversibility alerts
- ✅ Review before commit
- ✅ Terms acceptance required

## Testing

Access the demo at:
```
/customer/bookings/reschedule-demo
```

## Integration Guide

### Step 1: Import the Component
```typescript
import { RescheduleDateModal } from "./_components/reschedule-date-modal";
```

### Step 2: Add State Management
```typescript
const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
const [selectedDate, setSelectedDate] = useState(null);
```

### Step 3: Add Trigger Button
```typescript
<Button
  variant="outline"
  onClick={() => handleRescheduleClick(date)}
>
  <RotateCcw className="h-4 w-4 mr-2" />
  Reschedule
</Button>
```

### Step 4: Render Modal
```typescript
<RescheduleDateModal
  isOpen={rescheduleModalOpen}
  onClose={() => setRescheduleModalOpen(false)}
  currentDate={dateData}
  onConfirm={handleRescheduleConfirm}
/>
```

### Step 5: Handle Confirmation
```typescript
const handleRescheduleConfirm = async (newDateId: string) => {
  // Call your API
  const response = await api.rescheduleBooking({
    bookingId,
    oldDateId: currentDate.id,
    newDateId,
  });
  
  if (response.success) {
    toast.success("Date rescheduled successfully!");
    // Refresh booking data
  }
};
```

## API Integration (TODO)

Replace dummy data with real API calls:

### Required Endpoints

1. **GET /api/bookings/{id}/available-dates**
   ```typescript
   {
     dates: [
       {
         id: string;
         date: string;
         time: string;
         availableSeats: number;
         maxCapacity: number;
         price: number;
         isAvailable: boolean;
         seatingMatch: boolean; // Check if current seating is available
       }
     ]
   }
   ```

2. **POST /api/bookings/{id}/reschedule**
   ```typescript
   {
     oldDateId: string;
     newDateId: string;
     acceptedTerms: boolean;
   }
   
   // Response
   {
     success: boolean;
     priceDifference: number;
     paymentRequired: boolean;
     paymentUrl?: string; // If additional payment needed
   }
   ```

## Customization

### Modify Terms & Conditions
Edit `TERMS_AND_CONDITIONS` array in `reschedule-date-modal.tsx`

### Change Available Dates
Update `DUMMY_AVAILABLE_DATES` or connect to your API

### Customize Styling
All styles use Tailwind CSS and can be customized via className props

### Add Payment Integration
Hook into the `handleFinalConfirm` function to:
1. Check if payment is required
2. Redirect to payment gateway
3. Process payment
4. Confirm reschedule

## Design Decisions

### Why 4 Steps?
1. **Select**: User explores options
2. **Review**: User understands impact
3. **Terms**: Legal protection
4. **Confirm**: Final safety check

### Why No Refunds?
- Industry standard for event bookings
- Prevents system abuse
- Clear policy stated upfront

### Why Seating Validation?
- Ensures customer satisfaction
- Prevents booking conflicts
- Maintains event quality

## Future Enhancements

- [ ] Email notifications
- [ ] SMS alerts
- [ ] Calendar integration
- [ ] Bulk date changes
- [ ] Date swap between bookings
- [ ] Waitlist for fully booked dates
- [ ] Automatic payment processing
- [ ] Admin approval workflow

## Support

For questions or issues, contact the development team.

