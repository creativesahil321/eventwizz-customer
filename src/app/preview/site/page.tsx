"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useSitePreviewStore } from "@/store/site-preview.store";
import { SitePreview } from "@/app/(protected)/_shared/sites-essentials/_components/site-preview";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewProvider } from "@/contexts/preview-context";
import { PreviewThemeCustomizer } from "@/components/preview/preview-theme-customizer";

export default function SitePreviewPage() {
  const router = useRouter();
  const { previewData, setPreviewData } = useSitePreviewStore();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<SiteEssentialsFormValues | null>(
    null
  );

  useEffect(() => {
    // Flag to track if component is mounted
    let isMounted = true;

    // Check if we have data in the store
    if (previewData) {
      try {
        // Deep clone the preview data to avoid read-only property issues
        const clonedData = JSON.parse(JSON.stringify(previewData));
        // Only update state if component is still mounted
        if (isMounted) {
          setFormData(clonedData);
        }
      } catch (error) {
        console.error("Error cloning preview data:", error);
        // Fallback to direct assignment if component is still mounted
        if (isMounted) {
          setFormData(previewData);
        }
      }
    }

    // Only update loading state if component is still mounted
    if (isMounted) {
      setIsLoading(false);
    }

    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [previewData]);

  /** Keep Zustand in sync so “Back to Editor” + Save persists Try theme tweaks. */
  const handlePreviewValuesChange = useCallback(
    (next: SiteEssentialsFormValues) => {
      setFormData(next);
      setPreviewData(next);
    },
    [setPreviewData],
  );

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen text-black">
        {/* Header Skeleton */}
        <div className="fixed top-0 left-0 right-0 bg-white border-b z-50 shadow-sm px-4 py-3 flex justify-between items-center text-black">
          <div className="flex items-center space-x-3">
            <Button variant="event-primary" onClick={handleGoBack} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
            <div className="h-6 w-[1px] bg-gray-200 mx-2"></div>
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="pt-16">
          <div className="w-full">
            {/* Website Header Skeleton */}
            <div className="w-full flex justify-between items-center mb-6 p-4 border-b">
              <Skeleton className="h-10 w-32" /> {/* Logo */}
              <div className="flex space-x-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            {/* Hero Section Skeleton */}
            <div className="w-full aspect-[21/9] relative mb-8">
              <Skeleton className="h-full w-full absolute" />
              <div className="absolute inset-0 flex flex-col justify-center items-center p-6">
                <Skeleton className="h-10 w-3/4 max-w-md mb-4" />
                <Skeleton className="h-6 w-2/3 max-w-sm" />
              </div>
            </div>

            {/* Content Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col">
                  <Skeleton className="h-40 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-2" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-center">
          <p className="text-xs text-gray-500">Preview Mode • Desktop View</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <h1 className="text-2xl font-bold mb-4">No Preview Data Available</h1>
        <p className="text-gray-500 mb-6 text-center">
          Please go back to the Site Essentials page and click the Preview
          button.
        </p>
        <Button variant="event-primary" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <PreviewProvider isPreviewMode={true}>
      <div className="relative min-h-screen">
        {/* Site Preview - Full screen without any wrapper controls */}
        <SitePreview formValues={formData} />

        <PreviewThemeCustomizer
          values={formData}
          onValuesChange={handlePreviewValuesChange}
          brandName={formData.name?.trim() || "Site preview"}
        />

        {/* Preview chrome: Back button in its own layer so it doesn't overlap header */}
        <div className="fixed top-4 left-4 z-[60] isolate">
          <Button
            variant="event-primary"
            onClick={handleGoBack}
            size="sm"
            className="shadow-md ring-1 ring-black/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
        </div>
      </div>
    </PreviewProvider>
  );
}
