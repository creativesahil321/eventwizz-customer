"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormLabel } from "@/components/ui/form";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  profileSchema,
  passwordUpdateSchema,
  ProfileFormValues,
  PasswordUpdateFormValues,
  useUpdateProfile,
  useUpdatePassword,
  useProfileData,
  AVATAR_MAX_FILE_SIZE,
} from "@/app/(protected)/_shared/profile/_lib";
import { ProfileSkeleton } from "@/app/(protected)/_shared/profile/_components/profile-skeleton";
import { useProfileSync } from "@/components/shared/profile-update-sync";
import { addCacheBusting } from "@/lib/image-utils";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { syncProfileUpdate } = useProfileSync();
  const user = session?.user;
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFiles, setAvatarFiles] = useState<File[]>([]);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      avatar: undefined,
    },
  });

  // Password form
  const passwordForm = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      username: "",
      currentPassword: "",
      password: "",
      password_confirmation: "",
      is_password_set: false,
    },
  });

  // Get profile data from API
  const { data, isLoading: profileDataLoading } = useProfileData({}, "vendor");

  // Extract profile data from API response
  const profileData = data?.data;

  // Use useEffect to populate the forms when profile data is available
  useEffect(() => {
    if (profileData) {
      // Initialize profile form
      profileForm.reset({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
      });

      // Set username in password form from profile data _key
      if (profileData._key) {
        passwordForm.setValue("username", profileData._key);
        passwordForm.setValue(
          "is_password_set",
          profileData.is_password_set || false
        );
      }

      // Set avatar preview if available
      if (profileData.avatar) {
        setAvatarPreview(profileData.avatar);
      }
    }
  }, [profileData, profileForm, passwordForm]);

  // Mutation hooks for updating profile and password
  const updateProfileMutation = useUpdateProfile("vendor");
  const updatePasswordMutation = useUpdatePassword("vendor");

  // Handle avatar files change from FileUploader
  const handleAvatarFilesChange = async (files: File[]) => {
    setAvatarFiles(files);

    if (files.length > 0) {
      const file = files[0];
      profileForm.clearErrors("avatar");
      profileForm.setValue("avatar", file, { shouldValidate: true });

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Clear avatar when no files
      setAvatarPreview(profileData?.avatar || null);
      profileForm.setValue("avatar", undefined);
    }
  };

  // Handle profile form submission
  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      // Use the mutation hook to update profile
      const response = await updateProfileMutation.mutateAsync(data);

      if (response.status && response.data) {
        // Sync profile update across session and auth store
        await syncProfileUpdate(response);
      }
    } catch (error) {
      // Error handling is done by the interceptor
      console.error("Failed to update profile:", error);
    }
  };

  // Handle password form submission
  const onPasswordSubmit = async (data: PasswordUpdateFormValues) => {
    try {
      // Use the mutation hook to update password
      const response = await updatePasswordMutation.mutateAsync(data);

      if (response.status) {
        // Reset password fields
        passwordForm.reset({
          ...data,
          currentPassword: "",
          password: "",
          password_confirmation: "",
        });
      }
    } catch (error) {
      // Error handling is done by the interceptor
      console.error("Failed to update password:", error);
    }
  };

  const isProfileLoading = updateProfileMutation.isPending;
  const isPasswordLoading = updatePasswordMutation.isPending;

  // Check if password is already set
  const isPasswordSet = profileData?.is_password_set || false;

  // Show loading state while fetching profile data
  if (profileDataLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <section className="w-full relative flex flex-col space-y-8 text-black">
      {/* Profile Section */}
      <section className="w-full relative">
        <div className="w-full relative bg-background p-6 rounded-md shadow-sm">
          <header className="w-full mb-6">
            <h2 className="text-2xl title-header font-bold text-black">
              Profile
            </h2>
          </header>

          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-6"
            >
              <div>
                <FormLabel className="block mb-3 font-medium">
                  Profile Picture
                </FormLabel>
                <div className="flex items-center gap-6">
                  {/* Avatar Preview */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg bg-gray-50">
                      {avatarPreview ? (
                        <img
                          src={addCacheBusting(avatarPreview, profileData?.updated_at)}
                          alt="Profile picture"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                          <svg
                            className="w-16 h-16 text-gray-400"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div className="flex-1">
                    <FileUploader
                      value={avatarFiles}
                      onValueChange={handleAvatarFilesChange}
                      maxFileCount={1}
                      maxSize={AVATAR_MAX_FILE_SIZE}
                      accept={{
                        "image/*": [".jpg", ".jpeg", ".png", ".webp"],
                      }}
                      enableCropping={true}
                      aspectRatio={1}
                      cropConfig={{
                        maxSizeKB: 400,
                        quality: 0.9,
                        maxWidth: 800,
                        maxHeight: 800,
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: Square image, at least 200x200px
                    </p>
                  </div>
                </div>
                {profileForm.formState.errors.avatar && (
                  <p className="text-sm text-red-500 mt-2">
                    {profileForm.formState.errors.avatar.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <FormLabel htmlFor="firstName" className="block mb-2">
                    First Name
                  </FormLabel>
                  <Input
                    id="firstName"
                    {...profileForm.register("firstName")}
                    className="bg-gray-50 h-11 w-full"
                  />
                  {profileForm.formState.errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">
                      {profileForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel htmlFor="lastName" className="block mb-2">
                    Last Name
                  </FormLabel>
                  <Input
                    id="lastName"
                    {...profileForm.register("lastName")}
                    className="bg-gray-50 h-11 w-full"
                  />
                  {profileForm.formState.errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">
                      {profileForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel htmlFor="email" className="block mb-2">
                    Email
                  </FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={profileData?.email || user?.email || ""}
                    className="bg-gray-50 h-11 w-full"
                    disabled
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="event-primary"
                  type="submit"
                  disabled={isProfileLoading}
                >
                  {isProfileLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>

      {/* Password Section */}
      <section className="w-full relative">
        <div className="w-full relative bg-background p-6 rounded-md shadow-sm">
          <header className="w-full mb-6">
            <h2 className="text-2xl title-header font-bold text-black">
              {isPasswordSet ? "Change Password" : "Create Password"}
            </h2>
          </header>

          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="hidden">
                  <Input
                    id="username"
                    {...passwordForm.register("username")}
                    type="hidden"
                  />
                </div>

                {/* Show current password field only if password is already set */}
                {isPasswordSet && (
                  <div>
                    <FormLabel htmlFor="currentPassword" className="block mb-2">
                      Current Password
                    </FormLabel>
                    <PasswordInput
                      id="currentPassword"
                      ariaPasswordField="current password"
                      {...passwordForm.register("currentPassword")}
                      className="bg-gray-50 h-11 w-full"
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-red-500 mt-1">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <FormLabel htmlFor="password" className="block mb-2">
                    {isPasswordSet ? "New Password" : "Password"}
                  </FormLabel>
                  <PasswordInput
                    id="password"
                    ariaPasswordField={
                      isPasswordSet ? "new password" : "password"
                    }
                    {...passwordForm.register("password")}
                    className="bg-gray-50 h-11 w-full"
                  />
                  {passwordForm.formState.errors.password && (
                    <p className="text-sm text-red-500 mt-1">
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel
                    htmlFor="password_confirmation"
                    className="block mb-2"
                  >
                    Confirm Password
                  </FormLabel>
                  <PasswordInput
                    id="password_confirmation"
                    ariaPasswordField="confirm password"
                    {...passwordForm.register("password_confirmation")}
                    className="bg-gray-50 h-11 w-full"
                  />
                  {passwordForm.formState.errors.password_confirmation && (
                    <p className="text-sm text-red-500 mt-1">
                      {
                        passwordForm.formState.errors.password_confirmation
                          .message
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="event-primary"
                  type="submit"
                  disabled={isPasswordLoading}
                >
                  {isPasswordLoading
                    ? isPasswordSet
                      ? "Updating..."
                      : "Creating..."
                    : isPasswordSet
                    ? "Update Password"
                    : "Create Password"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>
    </section>
  );
}
