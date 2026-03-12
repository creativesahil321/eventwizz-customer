"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormProvider } from "react-hook-form";
import { Loader2, Save, AlertCircle, Eye, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useSiteEssentials } from "../_lib/hooks";
import { SiteEssentialsFormValues } from "../_lib/schema";
import { BrandingTab } from "./tabs/branding-tab";
import { ColorsTab } from "./tabs/colors-tab";
import { TypographyTab } from "./tabs/typography-tab";
import { SeoTab } from "./tabs/seo-tab";
import { useAuthStore } from "@/store/auth.store";
import { UserRole } from "@/services/common/notification/type";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSitePreviewStore } from "@/store/site-preview.store";
import { SocialMediaTab } from "./tabs/social-media-tab";

export function SiteEssentialsForm() {
  const { form, onSubmit, isLoading, siteEssentials, fetchSiteEssentials } =
    useSiteEssentials();
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { setPreviewData, previewData, clearPreviewData } =
    useSitePreviewStore();

  // Get the current user role
  const { account_type } = useAuthStore();
  const userRole = account_type as UserRole;

  // Track validation errors by tab
  const [tabsWithErrors, setTabsWithErrors] = useState<Record<string, boolean>>(
    {}
  );
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("branding");

  // Load preview data into form if available
  // BUT never override File objects - form submission should use form's File objects, not preview store data
  useEffect(() => {
    if (previewData) {
      try {
        const currentFormValues = form.getValues();

        // Check if form already has File objects uploaded
        const hasFileUploads =
          currentFormValues.logo instanceof File ||
          currentFormValues.favicon instanceof File ||
          currentFormValues.cover_image instanceof File ||
          currentFormValues.cover_video instanceof File;

        // Only reset with preview data if no files are currently uploaded
        // This prevents overriding File objects with preview store data (object URLs)
        if (!hasFileUploads) {
          form.reset(previewData);
        }
      } catch (error) {
        console.error("Error resetting form with preview data:", error);
      }
    }
  }, [form, previewData]);

  // Reset form when siteEssentials data changes (e.g., after location switch)
  // This ensures the form always reflects the current location's data
  useEffect(() => {
    if (siteEssentials && !previewData) {
      try {
        // Create a deep copy to avoid read-only issues
        const serverData = JSON.parse(JSON.stringify(siteEssentials));
        
        // Reset form with fresh server data
        form.reset(serverData, {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        });
      } catch (error) {
        console.error("Error resetting form with site essentials data:", error);
      }
    }
  }, [siteEssentials, previewData, form]);

  // Combined useEffect for form validation and error tracking
  useEffect(() => {
    const errors = form.formState.errors;
    const errorsByTab: Record<string, boolean> = {};

    // Check for errors in Branding tab fields
    if (errors.name || errors.logo || errors.favicon || errors.copyright) {
      errorsByTab.branding = true;
    }

    // Check for errors in Colors tab fields
    if (errors.colors) {
      errorsByTab.colors = true;
    }

    // Check for errors in Typography tab fields
    if (errors.typography) {
      errorsByTab.typography = true;
    }

    // Check for errors in Social Media tab fields
    if (
      errors.socialLinks?.facebook ||
      errors.socialLinks?.twitter ||
      errors.socialLinks?.instagram ||
      errors.socialLinks?.linkedin ||
      errors.socialLinks?.youtube
    ) {
      errorsByTab.socialMedia = true;
    }

    // Check for errors in SEO tab fields
    if (errors.seo) {
      errorsByTab.seo = true;
    }

    setTabsWithErrors(errorsByTab);
  }, [form.formState.errors]);

  // Function to handle preview button click
  const handlePreviewClick = (e: React.MouseEvent) => {
    // Prevent any form submission
    e.preventDefault();

    // Set loading state
    setPreviewLoading(true);

    try {
      // Get complete form values
      const completeFormValues = form.getValues();

      // Don't use JSON.parse(JSON.stringify()) as it destroys File objects
      // The preview store will handle File objects appropriately
      setPreviewData(completeFormValues);

      // Add a small delay to show loading state
      setTimeout(() => {
        // Navigate to the preview page
        router.push("/preview/site");

        // Reset loading state after a timeout in case navigation takes too long
        // This ensures the button doesn't stay in loading state indefinitely
        setTimeout(() => {
          setPreviewLoading(false);
        }, 3000);
      }, 500);
    } catch (error) {
      console.error("Preview navigation error:", error);
      router.push("/preview/site");
      setPreviewLoading(false);
      toast({
        title: "Error",
        description: "Failed to open preview",
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (values: SiteEssentialsFormValues) => {
    setSubmitting(true);
    setShowErrorSummary(false);

    try {
      // Don't use JSON.parse(JSON.stringify()) as it destroys File objects
      // File objects need to be preserved for binary upload
      const payload = {
        ...values,
        _method: "PATCH",
      };

      const result = await onSubmit(payload);
      if (result) {
        // Update the preview store with saved form values
        // This ensures theme colors are available for event preview pages
        // even if the user didn't click Preview button
        const completeFormValues = form.getValues();
        setPreviewData(completeFormValues);

        router.refresh();
        toast({
          title: "Success",
          description: "Site essentials updated successfully",
          variant: "default",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update site essentials",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form validation failure
  const handleInvalid = () => {
    setShowErrorSummary(true);
    toast({
      title: "Validation Error",
      description: "Please complete all required fields in highlighted tabs",
      variant: "destructive",
    });

    // Switch to the first tab with errors
    const errorTabs = Object.keys(tabsWithErrors);
    if (errorTabs.length > 0) {
      setActiveTab(errorTabs[0]);
    }
  };

  // Count total errors for error summary
  const errorCount = Object.keys(tabsWithErrors).length;

  // Handle form reset
  const handleReset = async () => {
    try {
      // First, refetch the latest data from the server
      await fetchSiteEssentials();

      if (siteEssentials) {
        // Create a deep clone to avoid issues with read-only properties
        const serverData = JSON.parse(JSON.stringify(siteEssentials));

        // Reset form to the server data and clear all form state
        form.reset(serverData, {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        });

        // Clear preview data
        clearPreviewData();

        // Clear any error states
        setShowErrorSummary(false);

        toast({
          title: "Form Reset",
          description: "All changes have been reset to the last saved values",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error resetting form:", error);
      toast({
        title: "Error",
        description: "Failed to reset the form",
        variant: "destructive",
      });
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
        className="w-full max-w-full"
      >
        {showErrorSummary && errorCount > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete all required fields in the{" "}
              {errorCount === 1
                ? "highlighted tab"
                : `${errorCount} highlighted tabs`}{" "}
              before saving.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="w-full overflow-x-auto pb-2 no-scrollbar">
              <TabsList className="flex w-max min-w-full bg-background p-1 h-auto rounded-lg gap-1">
                <TabsTrigger
                  value="branding"
                  className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                >
                  Branding
                  {tabsWithErrors.branding && (
                    <span className="absolute -right-1 -top-1 flex h-2 w-2">
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="colors"
                  className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                >
                  Colors
                  {tabsWithErrors.colors && (
                    <span className="absolute -right-1 -top-1 flex h-2 w-2">
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="typography"
                  className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                >
                  Typography
                  {tabsWithErrors.typography && (
                    <span className="absolute -right-1 -top-1 flex h-2 w-2">
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="social-media"
                  className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                >
                  Social Media
                  {tabsWithErrors.socialMedia && (
                    <span className="absolute -right-1 -top-1 flex h-2 w-2">
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="seo"
                  className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                >
                  SEO
                  {tabsWithErrors.seo && (
                    <span className="absolute -right-1 -top-1 flex h-2 w-2">
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <Card className="shadow-sm">
            <div className="space-y-6 pb-6">
              <TabsContent value="branding" className="mt-0 w-full">
                {tabsWithErrors.branding && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <BrandingTab
                    serverCoverImage={
                      typeof siteEssentials?.cover_image === "string"
                        ? siteEssentials.cover_image
                        : undefined
                    }
                    serverCoverVideo={
                      typeof siteEssentials?.cover_video === "string"
                        ? siteEssentials.cover_video
                        : undefined
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="colors" className="mt-0 w-full">
                {tabsWithErrors.colors && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <ColorsTab />
                </div>
              </TabsContent>

              <TabsContent value="typography" className="mt-0 w-full">
                {tabsWithErrors.typography && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <TypographyTab />
                </div>
              </TabsContent>

              <TabsContent value="social-media" className="mt-0 w-full">
                {tabsWithErrors.socialMedia && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <SocialMediaTab />
                </div>
              </TabsContent>

              <TabsContent value="seo" className="mt-0 w-full">
                {tabsWithErrors.seo && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <SeoTab />
                </div>
              </TabsContent>
            </div>
          </Card>
        </Tabs>

        {/* Action buttons under the form (not sticky) */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 sm:justify-end mt-8 pt-6 pb-2 border-t border-border">
          <Button
            variant="event-primary"
            onClick={handlePreviewClick}
            type="button"
            disabled={previewLoading}
            className="flex items-center gap-2"
          >
            {previewLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {previewLoading ? "Loading..." : "Preview"}
          </Button>
          <Button
            variant="event-primary"
            type="button"
            onClick={handleReset}
            disabled={previewLoading || submitting}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button
            variant="event-primary"
            type="submit"
            disabled={submitting || isLoading || previewLoading}
            className="flex items-center gap-2 w-full sm:w-auto py-2 min-w-[100px] text-sm rounded-lg"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
