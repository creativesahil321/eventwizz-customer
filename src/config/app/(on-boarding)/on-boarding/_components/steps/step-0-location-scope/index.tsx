"use client";

import { OnboardingCard } from "@/components/ui/card";
import { CardContent, CardHeader } from "@/components/ui/card";
import {
  OnboardingFieldGroupTitle,
  OnboardingTitle,
} from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { Building2, MapPin } from "lucide-react";
import { useFormContext } from "../../form-provider";

export default function StepZeroLocationScope() {
  const { form } = useFormContext();

  const choose = (scope: "single" | "multi") => {
    form.setValue("locationScope", scope, { shouldDirty: true });
    if (scope === "single") {
      form.setValue(
        "brandProfile",
        { name: "", slug: "", description: "", logo: undefined },
        { shouldDirty: true },
      );
      form.setValue("brandLocations", [], { shouldDirty: true });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-10 px-4">
      <OnboardingCard className="w-full max-w-2xl">
        <CardHeader className="pb-2 pt-4">
          <OnboardingTitle>Let&apos;s set up your business</OnboardingTitle>
          <p className="text-sm text-slate-400 mt-2 font-normal">
            Do you have multiple locations under one brand?
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <OnboardingFieldGroupTitle className="text-base">
            Location type
          </OnboardingFieldGroupTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => choose("single")}
              className={cn(
                "rounded-2xl border p-6 text-left transition-all",
                "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#3b82f6)]",
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-[var(--color-primary,#3b82f6)] mb-4">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Single location
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                One venue. We&apos;ll use your venue name for your site address
                (e.g. venuename.eventwizz.com).
              </p>
            </button>

            <button
              type="button"
              onClick={() => choose("multi")}
              className={cn(
                "rounded-2xl border p-6 text-left transition-all",
                "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#3b82f6)]",
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-[var(--color-secondary,#8b5cf6)] mb-4">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Multiple locations
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                One brand, several venues from Google Places. Your site will
                follow a brand domain with location pages.
              </p>
            </button>
          </div>
        </CardContent>
      </OnboardingCard>
    </div>
  );
}
