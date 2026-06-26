# Profile Sync System

This document explains how to use the profile synchronization system to ensure that user profile updates are consistently reflected across the application.

## Problem Solved

When a user updates their profile, the changes need to be reflected in multiple places:

1. The API database (via API calls)
2. The NextAuth session (used for authentication)
3. The Zustand auth store (used for UI state management)

Previously, profile updates were only reflected in the API and not in the frontend stores (session and auth storage), causing inconsistencies in the UI.

## Solution Components

### 1. `useProfileSessionUpdate` Hook

This is the core hook that handles updates to both NextAuth session and Zustand auth store:

```tsx
import { useProfileSessionUpdate } from "@/hooks/useProfileSessionUpdate";

// Inside your component
const { updateProfileInSession } = useProfileSessionUpdate();

// After a successful profile update API call
await updateProfileInSession({
  first_name: "New First Name",
  last_name: "New Last Name",
  avatar: "new-avatar-url.jpg",
});
```

### 2. `useProfileSync` Hook

This is a higher-level hook that simplifies the process of syncing profile updates from API responses:

```tsx
import { useProfileSync } from "@/components/shared/profile-update-sync";

// Inside your component
const { syncProfileUpdate } = useProfileSync();

// After a successful profile update API call
const response = await updateProfileMutation.mutateAsync(data);
if (response.status && response.data) {
  await syncProfileUpdate(response);
}
```

### 3. `ProfileUpdateSync` Component

This is a provider component that can be used at a higher level to provide profile sync functionality:

```tsx
import { ProfileUpdateSync } from "@/components/shared/profile-update-sync";

// In your layout or parent component
function ProfilePage() {
  const handleProfileUpdate = (response) => {
    // Additional actions after profile update
    console.log("Profile updated:", response);
  };

  return (
    <ProfileUpdateSync onUpdate={handleProfileUpdate}>
      <YourProfileForm />
    </ProfileUpdateSync>
  );
}
```

## Implementation Example

Here's how to implement profile updates in a form component:

```tsx
import { useForm } from "react-hook-form";
import { useProfileSync } from "@/components/shared/profile-update-sync";
import { useUpdateProfile } from "@/app/(protected)/_shared/profile/_lib";

function ProfileForm() {
  const { syncProfileUpdate } = useProfileSync();
  const updateProfileMutation = useUpdateProfile("vendor");

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      // other fields...
    },
  });

  const onSubmit = async (data) => {
    try {
      // Call the API to update the profile
      const response = await updateProfileMutation.mutateAsync(data);

      // If successful, sync the update to session and auth store
      if (response.status && response.data) {
        await syncProfileUpdate(response);
        // Show success message or other UI feedback
      }
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>{/* Form fields */}</form>
  );
}
```

## How It Works Behind the Scenes

1. When a profile is updated via an API call, the API returns the updated profile data
2. The `syncProfileUpdate` function is called with the API response
3. The function extracts the profile data and calls `updateProfileInSession`
4. `updateProfileInSession` does two things:
   - Updates the NextAuth session using `update()` function from `useSession()`
   - Updates the Zustand auth store using `updateUser()` function

This ensures that the user profile data is consistent across the entire application.
