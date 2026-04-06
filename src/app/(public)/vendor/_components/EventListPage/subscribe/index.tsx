"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SubscribeSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

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
    "h-12 border-[color:color-mix(in_srgb,var(--color-text)_14%,transparent)] bg-[var(--color-background)]/90 text-[var(--color-text)] placeholder:text-[var(--color-text-dimmed)]";

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0 bg-[var(--color-surface)]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent)]"
        aria-hidden
      />
      <div className="relative z-10 container mx-auto px-6 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
          Stay updated
        </p>
        <h2 className="mb-4 text-3xl font-semibold tracking-tight text-[var(--color-on-surface)] md:text-4xl">
          Never miss what&apos;s on
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-base text-[var(--color-text-dimmed)] md:text-lg">
          Get drops for new dates and venues — one short form, no spam.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-4xl flex-col items-stretch justify-center gap-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] bg-[color:color-mix(in_srgb,var(--color-text)_3%,var(--color-surface))] p-5 shadow-sm md:flex-row md:flex-wrap md:items-center md:p-6"
        >
          <Input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            onChange={handleChange}
            required
            className={`${fieldClass} w-full md:min-w-[160px] md:flex-1`}
          />

          <Input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            className={`${fieldClass} w-full md:min-w-[200px] md:flex-1`}
          />

          <Input
            type="tel"
            name="phone"
            placeholder="Mobile Number"
            value={formData.phone}
            onChange={handleChange}
            className={`${fieldClass} w-full md:min-w-[160px] md:flex-1`}
          />

          <Button type="submit" variant="event-primary">
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  );
}
