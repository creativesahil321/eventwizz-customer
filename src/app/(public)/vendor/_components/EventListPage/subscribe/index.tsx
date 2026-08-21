"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeading } from "@/components/public/site-heading";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { cn } from "@/lib/utils";

interface SubscribeSectionProps {
  /**
   * Heading emphasis resolved by the parent (same source as the hero) so preview
   * and live stay 1:1. When omitted, `SiteHeading` falls back to theme context.
   */
  emphasis?: HeadingEmphasis;
}

export default function SubscribeSection({ emphasis }: SubscribeSectionProps = {}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const narrowPreview = usePreviewNarrowLayout();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormData({
      name: "",
      email: "",
      phone: "",
    });
  };

  const fieldClass =
    "h-[42px] rounded-xl border-[color:color-mix(in_srgb,var(--color-text)_14%,transparent)] bg-[var(--color-background)]/90 text-[var(--color-text)] placeholder:text-[var(--color-text-dimmed)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]";

  return (
    <section className="relative overflow-hidden bg-[var(--color-surface)] py-16 md:py-20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--color-primary)_8%,transparent),transparent)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 text-center sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
          Stay updated
        </p>
        <SiteHeading
          level={2}
          align="center"
          title="Never miss what's on"
          emphasis={emphasis}
          variant="onSurface"
          className="mb-4 !text-3xl !font-semibold tracking-tight !text-[var(--color-on-surface)] md:!text-4xl"
        />
        <p className="mx-auto mb-8 max-w-xl text-base text-[var(--color-text-dimmed)] md:mb-9 md:text-lg">
          Get drops for new dates and venues — one short form, no spam.
        </p>

        <form
          onSubmit={handleSubmit}
          className={cn(
            "mx-auto flex max-w-4xl flex-col items-stretch justify-center gap-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-5 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.28)]",
            !narrowPreview && "md:flex-row md:flex-wrap md:items-center md:p-6",
          )}
        >
          <Input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            onChange={handleChange}
            required
            className={cn(
              fieldClass,
              "w-full",
              !narrowPreview && "md:min-w-[160px] md:flex-1",
            )}
          />

          <Input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            className={cn(
              fieldClass,
              "w-full",
              !narrowPreview && "md:min-w-[200px] md:flex-1",
            )}
          />

          <Input
            type="tel"
            name="phone"
            placeholder="Mobile Number"
            value={formData.phone}
            onChange={handleChange}
            className={cn(
              fieldClass,
              "w-full",
              !narrowPreview && "md:min-w-[160px] md:flex-1",
            )}
          />

          <Button
            type="submit"
            variant="event-primary"
            className="h-[42px] rounded-xl px-6 font-semibold"
          >
            Subscribe
          </Button>
        </form>

        <p className="mx-auto mt-4 max-w-md text-center text-xs leading-relaxed text-[var(--color-text-dimmed)] sm:mt-5 sm:text-[13px]">
          No spam. Only event updates. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
