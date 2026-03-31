# Location-Specific Fields Separation

## Overview
The Site Essentials Branding tab now has **clear visual separation** between global settings (apply to all locations) and location-specific settings (unique to each location).

## Implementation Date
February 17, 2026

## Structure

### 1️⃣ Global Site Branding Section (Gray Container)
**Visual Indicator:** Gray border, white background, "🌍 Global" badge

**Fields (Apply to ALL Locations):**
- Site Name
- Copyright Text
- Logo (header/brand logo)
- Favicon

**Description:** These settings are consistent across all venue locations. Changes here affect every location's website.

---

### 2️⃣ Location-Specific Content Section (Blue Container)
**Visual Indicator:** Blue border, blue background, "📍 Currently editing content for:" with LocationIndicator

**Fields (Unique to EACH Location):**

#### Landing Page Content
- Landing Page Heading (banner_heading)
- Landing Page Subheading (banner_sub_heading)
- Landing Page Banner:
  - Image Banner (cover_image)
  - Video Banner (cover_video)

#### About Section
- About Section Title (about_title)
- About Section Description (about_description)
- About Section CTA Text (about_link_title)
- About Section CTA URL (about_cta_link)

#### Event Sections
- Event Section 1 Title (event_title_1)
- Event Section 2 Title (event_title_2)

#### Gallery Section
- Event Gallery Title (event_gallery_title)

**Description:** These settings are specific to the currently selected location. Each location has its own landing page banner, headings, about section, event section titles, and gallery title.

---

## User Experience

### What Vendors See:

1. **Top of Page:** LocationIndicator showing current location (from page header)

2. **Gray Box (Global):** 
   - Clear badge: "🌍 Global · Same across all locations"
   - Contains site-wide branding (name, logo, favicon, copyright)

3. **Blue Box (Location-Specific):**
   - Prominent header: "Location-Specific Content"
   - Info banner with LocationIndicator showing which location they're editing
   - Explanation: "Landing page banner, headings, about section, event section titles, and gallery title are specific to each location"
   - Contains: Landing Page Content, Landing Page Banner, About Section, Event Sections, Gallery Section

### When Switching Locations:

1. Vendor switches location via location switcher
2. Page refetches data
3. **Global section** (gray) — Site Name, Logo, Favicon, Copyright — shows the same content
4. **Location-specific section** (blue) — Landing page, About, Event Sections, Gallery — shows different content for the new location
5. LocationIndicator updates to show the new location name

## Benefits

✅ **Clear Visual Separation:** Gray vs Blue containers make it obvious which fields are global vs location-specific

✅ **Reduced Confusion:** Vendors immediately understand why some content changes when switching locations

✅ **Intuitive Workflow:** Location indicator prominently shown in the blue section

✅ **No Breaking Changes:** No backend changes needed - purely visual/UX improvement

✅ **Scalable:** Easy to add more location-specific fields to the blue section in the future

## Files Modified

- `src/app/(protected)/_shared/sites-essentials/_components/tabs/branding-tab.tsx`
  - Restructured layout into 2 distinct sections (Global + Location-Specific; Event Sections and Gallery are inside Location-Specific)
  - Added visual containers (borders, backgrounds, badges)
  - Added LocationIndicator to location-specific section
  - Added explanatory text and info banners

## Technical Notes

- Uses existing `LocationIndicator` component (variant="compact")
- Uses existing `SectionTitle` component
- Tailwind classes for responsive borders and backgrounds
- Dark mode support included (dark: variants)
- No schema or API changes required
