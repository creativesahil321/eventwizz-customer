"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ServerContext } from "@/lib/server-context";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { addCacheBusting } from "@/lib/image-utils";

interface OnboardingSkeletonProps {
  className?: string;
  layout?: "split" | "full" | "centered" | "ai";
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
    <div className="relative bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06] py-5">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(90deg, var(--color-primary, #3b82f6) 0%, var(--color-secondary, #8b5cf6) 100%)`,
        }}
      />
      <div className="relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 pl-4 md:pl-6 z-10 pr-4 md:pr-6">
          <img
            src={addCacheBusting(logoPath)}
            alt={theme?.name || "EventWizz"}
            className="h-5 md:h-6 lg:h-11 xl:h-13 w-auto object-contain max-w-[85px] md:max-w-[95px] lg:max-w-[130px] animate-pulse"
          />
        </div>

        <div className="flex items-center justify-between max-w-7xl mx-auto pl-28 md:pl-32 lg:pl-36 xl:pl-40 pr-4">
          <div className="relative flex-1 overflow-x-auto overflow-y-visible no-scrollbar">
            <div className="relative flex justify-center items-start space-x-2 md:space-x-3 lg:space-x-4 min-w-max px-4 md:px-6">
              <div className="absolute top-[22px] left-4 md:left-6 right-4 md:right-6 h-[2px] bg-white/[0.08] z-0 rounded-full" />

              <div
                className="absolute top-[22px] left-4 md:left-6 h-[2px] z-10 transition-all duration-1000 animate-pulse rounded-full"
                style={{
                  width: "25%",
                  background: `linear-gradient(90deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
                  boxShadow: `0 0 12px color-mix(in srgb, var(--color-primary, #3b82f6) 40%, transparent)`,
                }}
              />

              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step, index) => {
                const isActive = index === 0;
                const isNext = index === 1;

                return (
                  <div
                    key={step}
                    className="flex flex-col items-center relative z-20 min-w-[70px] md:min-w-[80px] flex-shrink-0"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500",
                        isActive && "scale-110 text-white",
                        isNext && "bg-white/10 text-slate-300 border-white/20",
                        !isActive && !isNext && "bg-slate-900/80 text-slate-500 border-slate-700/50"
                      )}
                      style={
                        isActive
                          ? {
                              background: `linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
                              borderColor: `var(--color-primary, #3b82f6)`,
                              boxShadow: `0 0 15px color-mix(in srgb, var(--color-primary, #3b82f6) 25%, transparent)`,
                            }
                          : undefined
                      }
                    >
                      {isActive && (
                        <div
                          className="absolute inset-0 rounded-full opacity-75 animate-ping"
                          style={{
                            background: `linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
                          }}
                        />
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

  const FormFieldsSkeleton = () => (
    <div className="w-full max-w-md animate-fadeIn">
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
        <div className="mb-6">
          <Skeleton className="h-7 w-2/3 rounded-lg bg-white/10" />
        </div>

        {[1, 2, 3].map((field, index) => (
          <div
            key={field}
            className="space-y-2 mb-6 animate-fadeIn"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: "backwards",
            }}
          >
            <Skeleton className="h-4 w-1/4 rounded-md bg-white/10" />
            <Skeleton className="h-10 w-full rounded-lg bg-white/5" />
          </div>
        ))}

        <div className="flex justify-center mt-8">
          <Skeleton className="h-11 w-40 rounded-full bg-white/10 animate-pulse" />
        </div>
      </div>
    </div>
  );

  const PreviewSkeleton = () => (
    <div
      className="space-y-6 w-full h-full animate-fadeIn"
      style={{ animationDelay: "150ms" }}
    >
      <div className="relative h-80 w-full rounded-xl overflow-hidden bg-slate-800/50 border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 space-y-3">
          <Skeleton className="h-10 w-3/4 rounded-lg bg-white/10" />
          <Skeleton className="h-5 w-1/2 rounded-lg bg-white/10" />
        </div>
      </div>

      <div
        className="bg-slate-900/40 rounded-xl p-8 border border-white/10 animate-fadeIn"
        style={{ animationDelay: "300ms" }}
      >
        <Skeleton className="h-8 w-1/3 rounded-lg mb-4 bg-white/10" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-md bg-white/5" />
          <Skeleton className="h-4 w-full rounded-md bg-white/5" />
          <Skeleton className="h-4 w-3/4 rounded-md bg-white/5" />
        </div>
      </div>
    </div>
  );

  if (layout === "split") {
    return (
      <div className={cn("w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950", className)}>
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
      <div className={cn("w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950", className)}>
        <ProgressSkeleton />
        <section className="w-full min-h-[calc(100vh-120px)] flex justify-center items-center px-6 py-8">
          <FormFieldsSkeleton />
        </section>
      </div>
    );
  }

  if (layout === "ai") {
    return (
      <div className={cn("w-full min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950", className)}>
        <section className="w-full flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl flex flex-col items-center">
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
              <Skeleton className="h-8 w-32 rounded-full bg-white/10" />
              <Skeleton className="h-9 w-72 max-w-full rounded-lg bg-white/10" />
              <Skeleton className="h-4 w-96 max-w-full rounded bg-white/5" />
            </div>
            <div className="w-full rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded bg-white/10" />
                  <Skeleton className="h-10 w-full rounded-lg bg-white/5" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded bg-white/10" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <Skeleton key={i} className="h-10 rounded-lg bg-white/5" />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16 rounded bg-white/10" />
                    <Skeleton className="h-10 w-full rounded-lg bg-white/5" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 rounded bg-white/10" />
                    <Skeleton className="h-10 w-full rounded-lg bg-white/5" />
                  </div>
                </div>
                <div className="flex justify-center pt-4">
                  <Skeleton className="h-11 w-40 rounded-xl bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={cn("w-full min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950", className)}>
      <ProgressSkeleton />
      <section className="w-full flex-1 flex items-center justify-center px-6 py-8">
        <FormFieldsSkeleton />
      </section>
    </div>
  );
}
