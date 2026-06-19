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
  validateAvatarFile,
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
      phone: "",
      address: "",
      city: "",
      postcode: "",
      avatar: undefined,
    },
  });

  // Password form (admin always has password set → is_password_set: true)
  const passwordForm = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      username: "",
      currentPassword: "",
      password: "",
      password_confirmation: "",
      is_password_set: true,
    },
  });

  // Get profile data from API
  const { data, isLoading: profileDataLoading } = useProfileData({}, "admin");

  // Extract profile data from API response
  const profileData = data?.data;

  // Use useEffect to populate the forms when profile data is available
  useEffect(() => {
    if (profileData) {
      // Initialize profile form
      profileForm.reset({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        phone: profileData.phone || "",
        address: profileData.address || "",
        city: profileData.city || "",
        postcode: profileData.post_code || "",
      });

      // Set username and is_password_set in password form from profile data
      if (profileData._key) {
        passwordForm.setValue("username", profileData._key);
      }
      if (profileData.is_password_set !== undefined) {
        passwordForm.setValue("is_password_set", profileData.is_password_set);
      } else {
        passwordForm.setValue("is_password_set", true);
      }

      // Set avatar preview if available
      if (profileData.avatar) {
        setAvatarPreview(profileData.avatar);
      }
    }
  }, [profileData, profileForm, passwordForm]);

  // Mutation hooks for updating profile and password
  const updateProfileMutation = useUpdateProfile("admin");
  const updatePasswordMutation = useUpdatePassword("admin");

  // Handle avatar files change from FileUploader
  const handleAvatarFilesChange = async (files: File[]) => {
    setAvatarFiles(files);

    if (files.length > 0) {
      const file = files[0];
      profileForm.clearErrors("avatar");

      // Validate avatar file including dimensions
      const validation = await validateAvatarFile(file);
      if (!validation.valid) {
        profileForm.setError("avatar", {
          type: "manual",
          message: validation.error || "Invalid avatar file",
        });
        setAvatarFiles([]);
        return;
      }

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
        const username = passwordForm.getValues("username");
        passwordForm.reset({
          username,
          currentPassword: "",
          password: "",
          password_confirmation: "",
          is_password_set: true,
        });
      }
    } catch (error) {
      // Error handling is done by the interceptor
      console.error("Failed to update password:", error);
    }
  };

  const isProfileLoading = updateProfileMutation.isPending;
  const isPasswordLoading = updatePasswordMutation.isPending;

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
            <h2 className="text-2xl title-header font-bold">Profile</h2>
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
                  <FormLabel htmlFor="phone" className="block mb-2">
                    Phone
                  </FormLabel>
                  <Input
                    id="phone"
                    type="tel"
                    {...profileForm.register("phone", {
                      onChange: (e) => {
                        // Only allow numbers, spaces, dashes, plus signs, and parentheses
                        const value = e.target.value.replace(
                          /[^\d\s\-+()]/g,
                          ""
                        );
                        e.target.value = value;
                        profileForm.setValue("phone", value);
                      },
                    })}
                    className={`bg-gray-50 h-11 w-full ${
                      profileForm.formState.errors.phone ? "border-red-500" : ""
                    }`}
                    onBlur={() => profileForm.trigger("phone")}
                  />
                  {profileForm.formState.errors.phone && (
                    <p className="text-sm text-red-500 mt-1 font-medium">
                      {profileForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel htmlFor="address" className="block mb-2">
                    Address
                  </FormLabel>
                  <Input
                    id="address"
                    {...profileForm.register("address")}
                    className="bg-gray-50 h-11 w-full"
                  />
                </div>

                <div>
                  <FormLabel htmlFor="city" className="block mb-2">
                    City
                  </FormLabel>
                  <Input
                    id="city"
                    {...profileForm.register("city")}
                    className="bg-gray-50 h-11 w-full"
                  />
                </div>

                <div>
                  <FormLabel htmlFor="postcode" className="block mb-2">
                    Postcode
                  </FormLabel>
                  <Input
                    id="postcode"
                    {...profileForm.register("postcode")}
                    className="bg-gray-50 h-11 w-full"
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

      {/* Account Section - Read-only display of username and email */}
      <section className="w-full relative">
        <div className="w-full relative bg-background p-6 rounded-md shadow-sm">
          <header className="w-full mb-6">
            <h2 className="text-2xl title-header font-bold">Account</h2>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="username" className="block mb-2 font-medium">
                User Name
              </label>
              <Input
                id="username"
                value={profileData?._key || user?.name || ""}
                className="bg-gray-50 h-11 w-full"
                disabled
              />
            </div>

            <div>
              <label htmlFor="email" className="block mb-2 font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={profileData?.email || user?.email || ""}
                className="bg-gray-50 h-11 w-full"
                disabled
              />
            </div>
          </div>
        </div>
      </section>

      {/* Password Section */}
      <section className="w-full relative">
        <div className="w-full relative bg-background p-6 rounded-md shadow-sm">
          <header className="w-full mb-6">
            <h2 className="text-2xl title-header font-bold">Change Password</h2>
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

                <div>
                  <FormLabel htmlFor="password" className="block mb-2">
                    New Password
                  </FormLabel>
                  <PasswordInput
                    id="password"
                    ariaPasswordField="new password"
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
                    Confirm New Password
                  </FormLabel>
                  <PasswordInput
                    id="password_confirmation"
                    ariaPasswordField="confirm new password"
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
                  {isPasswordLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>
    </section>
  );
}
