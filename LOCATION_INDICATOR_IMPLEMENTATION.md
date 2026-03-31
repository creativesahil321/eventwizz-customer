# Location Indicator Implementation

## Overview
A professional location indicator component has been added across all vendor pages to clearly show which location the current data belongs to or which location actions will be performed on.

## Component Created

### `LocationIndicator` Component
**Path:** `src/components/location-indicator/index.tsx`

#### Variants:
1. **`default`** - Full indicator with icon, badge, and location details
2. **`compact`** - Smaller version showing icon and location name with city
3. **`minimal`** - Badge-style indicator with just icon and location name

#### Features:
- Automatically fetches and displays current active location
- Only shows for vendor accounts
- Hides when only one location exists
- Responsive design
- Professional styling with brand colors

## Pages Updated

### 1. **Events Page**
- **Path:** `src/app/(protected)/vendor/events/_components/event-tabs/index.tsx`
- **Variant:** `compact`
- **Location:** Below "All Events" heading
- Shows which location the events belong to

### 2. **Dashboard**
- **Path:** `src/app/(protected)/vendor/dashboard/page.tsx`
- **Variant:** `default`
- **Location:** Top of dashboard, before summary cards
- Clearly indicates the location for all dashboard data

### 3. **Menu Choices**
- **Path:** `src/app/(protected)/vendor/menu-choices/page.tsx`
- **Variant:** `compact`
- **Location:** Below "Customer Menu Choices" heading
- Shows which location's menu choices are being displayed

### 4. **Transactions**
- **Path:** `src/app/(protected)/vendor/transactions/page.tsx`
- **Variant:** `compact`
- **Location:** Below "Transaction History" heading
- Indicates which location's transactions are shown

### 5. **Email Logs**
- **Path:** `src/app/(protected)/vendor/email-logs/page.tsx`
- **Variant:** `compact`
- **Location:** Below "Email Logs" heading
- Shows which location's email logs are displayed

### 6. **Sites Essentials**
- **Path:** `src/app/(protected)/_shared/sites-essentials/page.tsx`
- **Variant:** `compact`
- **Location:** Below "Site Essentials" heading
- Indicates which location's site settings are being edited

## Technical Implementation

### Data Source
- Uses `useCurrentLocationId()` hook to get active location from session
- Fetches location list via `useLocationsQuery()` 
- Matches current ID with location details

### Styling
- Brand color: `var(--color-secondary, #009ead)`
- Border and background variants for visual hierarchy
- Responsive with proper mobile handling
- Professional MapPin icon from lucide-react

### Conditional Rendering
- Only shows for vendor accounts
- Hidden when no location is selected
- Hidden when only one location exists (no need to indicate)

## Benefits

1. **Clear Context** - Vendors always know which location they're working with
2. **Professional UI** - Consistent, polished design across all pages
3. **Error Prevention** - Reduces mistakes from working on wrong location
4. **Better UX** - Improves user confidence and navigation
5. **Scalability** - Easy to add to new pages with single component

## Usage Example

```tsx
import { LocationIndicator } from "@/components/location-indicator";

// Full indicator
<LocationIndicator variant="default" />

// Compact (recommended for page headers)
<LocationIndicator variant="compact" />

// Minimal badge
<LocationIndicator variant="minimal" />

// Hide icon
<LocationIndicator variant="compact" showIcon={false} />

// Custom styling
<LocationIndicator variant="compact" className="mb-4" />
```

## No Breaking Changes
- All existing functionality preserved
- Purely additive feature
- No impact on non-vendor accounts
- Zero linter errors introduced
