"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  passwordUpdateSchema,
  PasswordUpdateFormValues,
  useUpdateProfile,
  useUpdatePassword,
  useProfileData,
  validateAvatarFile,
  AVATAR_MAX_FILE_SIZE,
} from "@/app/(protected)/_shared/profile/_lib";
import {
  useSiteEssentialsQuery,
} from "@/app/(protected)/_shared/sites-essentials/_lib/queries";
import { ProfileSkeleton } from "@/app/(protected)/_shared/profile/_components/profile-skeleton";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { useProfileSync } from "@/components/shared/profile-update-sync";
import { addCacheBusting } from "@/lib/image-utils";
import GoogleLocationSearch from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/google-location-search";
import { env } from "@/env";
import { themeKeys } from "@/hooks/use-theme-query";
import { toast } from "sonner";
import {
  ADMIN_COMPANY_INFO_DEFAULTS,
  adminProfileFormSchema,
  type AdminProfileFormValues,
} from "./_lib/company-info-schema";
import { fetchCompanyOfficeDetails } from "./_lib/google-company-office";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { syncProfileUpdate } = useProfileSync();
  const queryClient = useQueryClient();
  const user = session?.user;
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFiles, setAvatarFiles] = useState<File[]>([]);
  const officePlaceIdRef = useRef<string | null>(null);
  const initialOfficeRef = useRef("");

  const form = useForm<AdminProfileFormValues>({
    resolver: zodResolver(adminProfileFormSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      avatar: undefined,
      ...ADMIN_COMPANY_INFO_DEFAULTS,
    },
  });

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

  const { data, isLoading: profileDataLoading } = useProfileData({}, "admin");
  const { data: siteEssentials, isLoading: siteEssentialsLoading } =
    useSiteEssentialsQuery();
  const profileData = data?.data;

  useEffect(() => {
    if (!profileData && !siteEssentials) return;

    const phone =
      siteEssentials?.company_phone?.trim() ||
      profileData?.phone?.trim() ||
      ADMIN_COMPANY_INFO_DEFAULTS.company_phone;

    const companyValues = {
      company_number:
        siteEssentials?.company_number?.trim() ||
        ADMIN_COMPANY_INFO_DEFAULTS.company_number,
      company_registered_office:
        siteEssentials?.company_registered_office?.trim() ||
        ADMIN_COMPANY_INFO_DEFAULTS.company_registered_office,
      company_phone: phone,
    };

    if (profileData) {
      form.reset({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        avatar: undefined,
        ...companyValues,
      });

      if (profileData._key) {
        passwordForm.setValue("username", profileData._key);
      }
      if (profileData.is_password_set !== undefined) {
        passwordForm.setValue("is_password_set", profileData.is_password_set);
      } else {
        passwordForm.setValue("is_password_set", true);
      }

      if (profileData.avatar) {
        setAvatarPreview(profileData.avatar);
      }
    } else if (siteEssentials) {
      form.reset({
        firstName: "",
        lastName: "",
        avatar: undefined,
        ...companyValues,
      });
    }

    initialOfficeRef.current = companyValues.company_registered_office;
    officePlaceIdRef.current = companyValues.company_registered_office
      ? "existing"
      : null;
  }, [profileData, siteEssentials, form, passwordForm]);

  const updateProfileMutation = useUpdateProfile("admin");
  const updatePasswordMutation = useUpdatePassword("admin");

  const handleAvatarFilesChange = async (files: File[]) => {
    setAvatarFiles(files);

    if (files.length > 0) {
      const file = files[0];
      form.clearErrors("avatar");

      const validation = await validateAvatarFile(file);
      if (!validation.valid) {
        form.setError("avatar", {
          type: "manual",
          message: validation.error || "Invalid avatar file",
        });
        setAvatarFiles([]);
        return;
      }

      form.setValue("avatar", file, { shouldValidate: true });

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(profileData?.avatar || null);
      form.setValue("avatar", undefined);
    }
  };

  const handleOfficeClear = useCallback(() => {
    form.setValue("company_registered_office", "");
    officePlaceIdRef.current = null;
  }, [form]);

  const onProfileSubmit = async (data: AdminProfileFormValues) => {
    const office = data.company_registered_office.trim();
    const initialOffice = initialOfficeRef.current.trim();
    const officeChanged = office !== initialOffice;

    if (office && officeChanged && !officePlaceIdRef.current) {
      toast.error("Please select a location from the suggestions", {
        description:
          "Google didn't find that location. Type to search and choose a suggested UK address.",
        duration: 5000,
      });
      return;
    }

    try {
      const profileResponse = await updateProfileMutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.company_phone,
        avatar: data.avatar,
        company_number: data.company_number,
        company_registered_office: data.company_registered_office,
      });

      await queryClient.invalidateQueries({ queryKey: themeKeys.all });
      initialOfficeRef.current = office;
      officePlaceIdRef.current = office ? "existing" : null;

      if (profileResponse.status && profileResponse.data) {
        await syncProfileUpdate(profileResponse);
      }

      toast.success("Profile saved", {
        description: "Your profile has been updated.",
      });
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  const onPasswordSubmit = async (data: PasswordUpdateFormValues) => {
    try {
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
      console.error("Failed to update password:", error);
    }
  };

  const isSaving = updateProfileMutation.isPending;
  const isPasswordLoading = updatePasswordMutation.isPending;
  const isPageLoading = profileDataLoading || siteEssentialsLoading;

  if (isPageLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <section className="relative flex w-full flex-col space-y-8 text-black">
      <section className="relative w-full">
        <div className={pageCardClassName("relative w-full min-w-0")}>
          <header className="mb-6 w-full">
            <h1 className="text-2xl font-bold title-header">Profile</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Your account and company details shown on the public EventWizz
              site.
            </p>
          </header>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onProfileSubmit)}
              className="space-y-8"
              noValidate
            >
              <div>
                <FormLabel className="mb-3 block font-medium">
                  Profile picture
                </FormLabel>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-gray-100 bg-gray-50 shadow-lg">
                      {avatarPreview ? (
                        <img
                          src={addCacheBusting(avatarPreview)}
                          alt="Profile picture"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                          <svg
                            className="h-16 w-16 text-gray-400"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

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
                    <p className="mt-2 text-xs text-gray-500">
                      Recommended: square image, at least 200×200px
                    </p>
                  </div>
                </div>
                {form.formState.errors.avatar && (
                  <p className="mt-2 text-sm text-red-500">
                    {form.formState.errors.avatar.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input className="h-11 bg-gray-50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input className="h-11 bg-gray-50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_number"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Company number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="11555643"
                          className="h-11 bg-gray-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_phone"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+44 (0)20 3925 0350"
                          className="h-11 bg-gray-50"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(
                              /[^\d\s\-+()]/g,
                              "",
                            );
                            e.target.value = value;
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_registered_office"
                  render={({ field }) => (
                    <FormItem className="space-y-2 md:col-span-2">
                      <FormLabel>Registered office</FormLabel>
                      <FormControl>
                        <div className="[&_input]:h-11 [&_input]:border-gray-200 [&_input]:bg-gray-50 [&_input]:text-black">
                          <GoogleLocationSearch
                            apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                            value={field.value || ""}
                            onChange={(value) => {
                              field.onChange(value);
                              officePlaceIdRef.current = null;
                            }}
                            onSelect={(placeId) => {
                              officePlaceIdRef.current = placeId;
                              fetchCompanyOfficeDetails(form, placeId);
                            }}
                            onClear={handleOfficeClear}
                            placeholder="Search for a UK registered office address..."
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="event-primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>

      <section className="relative w-full">
        <div className={pageCardClassName("relative w-full min-w-0")}>
          <header className="mb-6 w-full">
            <h2 className="text-2xl font-bold title-header">Account</h2>
          </header>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div>
              <label htmlFor="username" className="mb-2 block font-medium">
                User name
              </label>
              <Input
                id="username"
                value={profileData?._key || user?.name || ""}
                className="h-11 w-full bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={profileData?.email || user?.email || ""}
                className="h-11 w-full bg-gray-50"
                disabled
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative w-full">
        <div className={pageCardClassName("relative w-full min-w-0")}>
          <header className="mb-6 w-full">
            <h2 className="text-2xl font-bold title-header">Change password</h2>
          </header>

          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <div className="hidden">
                  <Input
                    id="username-hidden"
                    {...passwordForm.register("username")}
                    type="hidden"
                  />
                </div>

                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          ariaPasswordField="current password"
                          className="h-11 bg-gray-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          ariaPasswordField="new password"
                          className="h-11 bg-gray-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="password_confirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          ariaPasswordField="confirm new password"
                          className="h-11 bg-gray-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="event-primary"
                  type="submit"
                  disabled={isPasswordLoading}
                >
                  {isPasswordLoading ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>
    </section>
  );
}
