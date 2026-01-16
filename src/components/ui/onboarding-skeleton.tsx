"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ServerContext } from "@/lib/server-context";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useContext } from "react";

interface OnboardingSkeletonProps {
  className?: string;
  layout?: "split" | "full" | "centered";
}

export function OnboardingFormSkeleton({
  className,
  layout = "split",
}: Readonly<OnboardingSkeletonProps>) {
  const { theme } = useContext(ServerContext);
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https") ||
    theme?.logo?.startsWith("blob")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";

  const ProgressSkeleton = () => (
    <div className="bg-[#12023e] backdrop-blur-md bg-opacity-90 border-b border-white/10 py-5">
      <div className="relative">
        {/* Logo - Responsive sizing for all screens */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 pl-4 md:pl-6 z-10 pr-4 md:pr-6">
          <Image
            src={logoPath}
            alt={theme?.name || "EventWizz"}
            width={110}
            height={30}
            className="h-5 md:h-6 lg:h-11 xl:h-13 w-auto object-contain max-w-[85px] md:max-w-[95px] lg:max-w-[130px] animate-pulse"
            priority
          />
        </div>

        {/* Main container for stepper */}
        <div className="flex items-center justify-between max-w-7xl mx-auto pl-28 md:pl-32 lg:pl-36 xl:pl-40 pr-4">
          {/* Stepper - Scrollable on medium screens, centered on large */}
          <div className="relative flex-1 overflow-x-auto overflow-y-visible no-scrollbar">
            <div className="relative flex justify-center items-start space-x-2 md:space-x-3 lg:space-x-4 min-w-max px-4 md:px-6">
              {/* Background line */}
              <div className="absolute top-1/2 left-4 md:left-6 right-4 md:right-6 h-[3px] bg-gray-600 -translate-y-1/2 z-0" />

              {/* Animated progress line */}
              <div
                className="absolute top-1/2 left-4 md:left-6 h-[3px] bg-green-500 -translate-y-1/2 z-10 transition-all duration-1000 animate-pulse"
                style={{ width: "25%" }}
              />

              {/* Step circles */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step, index) => {
                const getStepClass = () => {
                  if (index === 0) {
                    return "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/50 scale-110";
                  }
                  if (index < 2) {
                    return "bg-white/20 text-white border-white/30";
                  }
                  return "bg-[#1c1c4d] text-gray-400 border-gray-600";
                };

                return (
                  <div
                    key={step}
                    className="flex flex-col items-center relative z-20 min-w-[70px] md:min-w-[80px] flex-shrink-0"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500",
                        getStepClass()
                      )}
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      {index === 0 && (
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                      )}
                      <span className="relative text-xs font-semibold z-10">
                        {step}
                      </span>
                    </div>
                    <div className="text-center mt-2 w-20">
                      <Skeleton className="h-3 w-16 mx-auto bg-white/20 rounded" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Simplified form skeleton that matches actual onboarding cards
  const FormFieldsSkeleton = () => (
    <div className="w-full max-w-md animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-7 w-2/3 rounded-lg bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900 dark:to-blue-900 animate-shimmer" />
        </div>

        {/* Form fields */}
        {[1, 2, 3].map((field, index) => (
          <div
            key={field}
            className="space-y-2 mb-6 animate-fadeIn"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: "backwards",
            }}
          >
            <Skeleton className="h-4 w-1/4 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}

        {/* Action button */}
        <div className="flex justify-center mt-8">
          <Skeleton className="h-11 w-40 rounded-full bg-gradient-to-r from-green-400 to-blue-500 animate-pulse shadow-lg" />
        </div>
      </div>
    </div>
  );

  // Clean preview skeleton
  const PreviewSkeleton = () => (
    <div
      className="space-y-6 w-full h-full animate-fadeIn"
      style={{ animationDelay: "150ms" }}
    >
      {/* Hero section */}
      <div className="relative h-80 w-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 animate-shimmer shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 space-y-3">
          <Skeleton className="h-10 w-3/4 rounded-lg bg-white/30 backdrop-blur-sm" />
          <Skeleton className="h-5 w-1/2 rounded-lg bg-white/20 backdrop-blur-sm" />
        </div>
      </div>

      {/* Content section */}
      <div
        className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 animate-fadeIn"
        style={{ animationDelay: "300ms" }}
      >
        <Skeleton className="h-8 w-1/3 rounded-lg mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
      </div>
    </div>
  );

  if (layout === "split") {
    return (
      <div className={cn("w-full", className)}>
        <ProgressSkeleton />
        <section className="flex w-full h-screen overflow-hidden">
          <aside className="w-2/5 min-w-[320px] max-w-[400px] mx-2 pr-3">
            <div className="h-[calc(100vh-40px)] flex items-start pt-4">
              <FormFieldsSkeleton />
            </div>
          </aside>
          <main className="flex-1 overflow-hidden pr-6">
            <div className="h-[calc(100vh-40px)] overflow-y-auto pt-4">
              <PreviewSkeleton />
            </div>
          </main>
        </section>
      </div>
    );
  }

  if (layout === "centered") {
    return (
      <div className={cn("w-full", className)}>
        <ProgressSkeleton />
        <section className="w-full min-h-[calc(100vh-120px)] flex justify-center items-center px-6 py-8">
          <FormFieldsSkeleton />
        </section>
      </div>
    );
  }

  // Full layout
  return (
    <div className={cn("w-full min-h-screen flex flex-col", className)}>
      <ProgressSkeleton />
      <section className="w-full flex-1 flex items-center justify-center px-6 py-8">
        <FormFieldsSkeleton />
      </section>
    </div>
  );
}
