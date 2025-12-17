# Vendor Profile Page

This directory contains the vendor-specific profile UI components. The core profile functionality (API calls, hooks, types, and schemas) has been moved to the shared implementation at `src/app/(protected)/_shared/profile/_lib/`.

## Migration Notes

The profile functionality previously located in the `_lib` directory of this folder has been moved to a shared implementation to support all user types. This includes:

- Zod schemas for form validation
- TypeScript types for profile data
- React Query hooks for data fetching and mutations

## How to Use the Shared Implementation

The page.tsx file has been updated to import from the shared module:

```tsx
import {
  profileSchema,
  passwordUpdateSchema,
  ProfileFormValues,
  PasswordUpdateFormValues,
  useUpdateProfile,
  useUpdatePassword,
  useProfileData,
} from "@/app/(protected)/_shared/profile/_lib";
```

When using the hooks, "vendor" is specified as the user type to ensure proper caching:

```tsx
const { data, isLoading: profileDataLoading } = useProfileData({}, "vendor");
const updateProfileMutation = useUpdateProfile("vendor");
const updatePasswordMutation = useUpdatePassword("vendor");
```

## Benefits of the Shared Implementation

1. **Code Reusability**: The same profile code can be used by all user types
2. **Type Safety**: Full TypeScript and Zod schema support
3. **Proper Caching**: Domain-specific query keys prevent cache conflicts
4. **Maintainability**: Single source of truth for profile logic

For more information on the shared implementation, see the README at `src/app/(protected)/_shared/profile/README.md`.
