# Shared Profile System

This directory contains the shared profile functionality that can be used across all user types (admin, vendor, partner, customer).

## Overview

The profile system uses common API endpoints that work for all user types. The backend determines the appropriate profile data to return based on the user's JWT token.

## API Endpoints

The profile system uses the following API endpoints (defined in `API_ENDPOINTS.COMMON.PROFILE`):

- **GET Profile**: `/profile`
- **Update Profile**: `/profile/update`
- **Update Password**: `/profile/update/password`

## Implementation Details

### Directory Structure

```
src/app/(protected)/_shared/profile/
├── _lib/
│   ├── index.ts - Exports everything from the library
│   ├── queries.ts - API calls and React Query hooks
│   ├── schema.ts - Zod schemas for validation
│   └── types.ts - TypeScript type definitions
└── README.md - This documentation
```

### User Type Awareness

To maintain separation between different user types' data in the query cache, the hooks accept an optional `userType` parameter:

```typescript
// Example for vendor profile
const { data } = useProfileData({}, "vendor");
const updateProfileMutation = useUpdateProfile("vendor");
const updatePasswordMutation = useUpdatePassword("vendor");

// Example for admin profile
const { data } = useProfileData({}, "admin");
const updateProfileMutation = useUpdateProfile("admin");
const updatePasswordMutation = useUpdatePassword("admin");
```

This ensures that data for different user types doesn't conflict in the cache.

### Data Mapping

The profile system maps between API response fields and form fields:

- `first_name` → `firstName`
- `last_name` → `lastName`
- `post_code` → `postcode`

### Implementation Example

To use the shared profile system in a new user type page:

```tsx
"use client";

import {
  profileSchema,
  passwordUpdateSchema,
  ProfileFormValues,
  PasswordUpdateFormValues,
  useUpdateProfile,
  useUpdatePassword,
  useProfileData,
} from "@/app/(protected)/_shared/profile/_lib";

export default function AdminProfilePage() {
  // Specify 'admin' as the user type for correct cache handling
  const { data, isLoading } = useProfileData({}, "admin");
  const updateProfileMutation = useUpdateProfile("admin");
  const updatePasswordMutation = useUpdatePassword("admin");

  // Rest of your component implementation...
}
```

## Migration Notes

This shared profile system was created to replace the vendor-specific implementation that was previously located at `src/app/(protected)/vendor/profile/_lib/`. The vendor profile page has been updated to use this shared implementation.

Other user types (admin, partner, customer) should follow the same pattern, importing from the shared profile directory and specifying their user type.
