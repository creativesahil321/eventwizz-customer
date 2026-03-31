# Image Cache Busting Implementation

## 🆕 Latest Fixes (Feb 3, 2026)

### Fix #3: Auth Pages (Login/Sign-up) Logo

**Bug:** Logo on login and sign-up pages still using `next/image` causing stale cache

**Root Cause:** Auth layout (`(auth)/layout.tsx`) still used `<Image>` for header logo

**Component Fixed:**
- `(auth)/layout.tsx` - Header logo (line 79)

**Solution:** Replaced `<Image>` with `<img>` + `addCacheBusting()` in auth layout

**Result:** ✅ Auth page logos now update immediately with cache busting

---

## 🆕 Latest Fixes (Feb 2, 2026)

### Fix #1: Event Details Page - Broken Images & Constructor Error

**Bugs:**

1. Event gallery, package, and menu images not displaying (broken image placeholders)
2. `TypeError: Failed to construct 'Image': Please use the 'new' operator`

**Root Causes:**

1. Event preview components still used `next/image` for user-uploaded images
2. Unused `Image` import in `event-detail-client.tsx` causing constructor conflict
3. Missing `<Image>` replacement in `Dates-section/index.tsx` background

**Components Fixed:**

- `Event-gallery/index.tsx` - Gallery images (2 instances)
- `package-sec/index.tsx` - Package images
- `menu-section/index.tsx` - Menu background images
- `Dates-section/index.tsx` - Date banner background + removed unused import
- `Time-line/index.tsx` - **Timeline background image** (line 183) + removed unused import
- `event-detail-client.tsx` - **Removed unused Image import** (fixed constructor error)

**Solution:**

1. Replaced all `<Image>` with `<img>` + `addCacheBusting()` for event content
2. Removed all unused `next/image` imports to prevent conflicts

**Result:** ✅ All images display correctly + constructor error resolved

---

### Fix #2: Dropdown Locations (Feb 2, 2026)

**Bug:** "Book Now" dropdown showed "No locations available" even though locations were visible on page

**Root Cause:** Data source mismatch

- Header component used `useLocationStore()` (Zustand store - empty)
- Page component used `useDomain()` (context provider - populated)

**Solution:**

- Updated `location-selection-header.tsx` to use `useDomain()` instead of `useLocationStore()`
- Now both header and page read from same data source

**Result:** ✅ Dropdown now correctly shows all locations (Sheffield, Bristol, etc.)

---

## Summary

Replaced `next/image` with standard `<img>` tags for all user-uploaded images to prevent stale image caching in production on Vercel. Added URL-based cache busting using query parameters.

## Changes Made

### 1. Created Utility Function

**File:** `src/lib/image-utils.ts`

- Added `addCacheBusting()` function that appends `?v={timestamp}` to image URLs
- Supports both `updated_at` timestamps and fallback to `Date.now()`
- Handles data URLs and blob URLs correctly
- Added `addCacheBustingSSR()` for server-side rendering contexts

### 2. User Profile Components

**Files Updated:**

- `src/app/(protected)/vendor/profile/page.tsx`
- `src/app/(protected)/admin/profile/page.tsx`
- `src/app/(protected)/customer/profile/page.tsx`
- `src/app/(protected)/_components/_header/_components/user-dropdown/index.tsx`

**Changes:**

- Replaced `<Image>` with `<img>` for user avatars
- Added cache busting with `profileData.updated_at` timestamp
- Removed width/height props (not needed for standard img tags)

### 3. Site Branding Components

**Files Updated:**

- `src/app/(protected)/_shared/sites-essentials/_components/tabs/branding-tab.tsx`
- `src/app/(protected)/_components/_sidebar/logo.tsx`
- `src/app/(public)/vendor/_components/EventListPage/header/index.tsx`
- `src/app/(public)/admin/_components/header/index.tsx` ⭐ **NEW**
- `src/app/(public)/admin/_components/footer/index.tsx` ⭐ **NEW**
- `src/components/shared/common-header.tsx`
- `src/components/ui/onboarding-skeleton.tsx`

**Changes:**

- Replaced `<Image>` with `<img>` for:
  - Vendor logos
  - **Admin landing page logo (header & footer)** ⭐ **NEW**
  - Favicons
  - Landing page cover images
- Added cache busting for all uploaded site assets

### 4. Event Images

**Files Updated:**

- `src/app/(protected)/vendor/events/_components/event-tabs/event-card.tsx`
- `src/app/(public)/vendor/_components/EventListPage/recent-event/index.tsx`
- `src/app/(public)/vendor/_components/EventListPage/upcoming-event/index.tsx`
- `src/app/(public)/vendor/_components/EventListPage/popular-event/index.tsx`

**Changes:**

- Replaced `<Image>` with `<img>` for event banner images
- Added cache busting with `event.updated_at` timestamp
- Updated gallery carousel images with cache busting

### 5. Venue Location Components

**Files Updated:**

- `src/app/(protected)/vendor/venue-locations/_components/_location-view.tsx`

**Changes:**

- Replaced `<Image>` with `<img>` for venue location logos
- Added cache busting with `location.updated_at` timestamp

### 6. File Upload Preview Components

**Files Updated:**

- `src/components/ui/file-uploader.tsx`
- `src/components/ui/image-upload.tsx`

**Changes:**

- Replaced `<Image>` with `<img>` for file preview thumbnails
- These show temporary uploads before submission (blob URLs)

## Static Assets (Keep next/image)

The following components correctly continue using `next/image` for static marketing assets:

- `src/app/not-found.tsx` - 404 illustration
- `src/app/(public)/admin/_components/*` - Admin landing page marketing images
- `src/app/(auth)/layout.tsx` - Auth page design assets

## Cache Busting Strategy

1. **Primary:** Use `updated_at` timestamp from backend when available
2. **Fallback:** Use `Date.now()` for client-side previews or when no timestamp exists
3. **Format:** Appends `?v={timestamp}` to image URLs
4. **Data URLs/Blobs:** Skipped (local previews don't need cache busting)

## Benefits

- ✅ Eliminates stale image caching issues on Vercel
- ✅ Images update immediately when users upload new versions
- ✅ No backend changes required
- ✅ No cache purge logic needed
- ✅ Static assets still benefit from Next.js image optimization

## Testing Recommendations

1. Upload a new profile avatar → verify immediate display
2. Update venue logo → verify changes reflected on all pages
3. Change event banner image → verify gallery shows new image
4. Update site branding → verify header/footer logos update
5. Test on Vercel production deployment

## Notes

- Standard `<img>` tags don't have automatic optimization like `next/image`
- User-uploaded images should be optimized on the backend before storage
- Consider implementing backend image optimization/compression if not already in place
- The `addCacheBusting()` function is tree-shakeable and adds minimal bundle size
