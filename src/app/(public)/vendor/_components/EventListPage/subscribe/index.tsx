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
    console.log("Subscription submitted:", formData);
    setFormData({
      name: "",
      email: "",
      phone: "",
    });
  };

  const fieldClass =
    "h-12 border-[color:color-mix(in_srgb,var(--color-text)_14%,transparent)] bg-[var(--color-background)]/90 text-[var(--color-text)] placeholder:text-[var(--color-text-dimmed)]";

  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      <div
        className="absolute inset-0 bg-[var(--color-surface)]"
        aria-hidden
      />
      <div className="relative z-10 container mx-auto px-6 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
          Stay Updated
        </p>
        <h2 className="mb-4 font-heading text-3xl italic text-[var(--color-on-surface)] md:text-4xl">
          Subscribe for Exclusive Updates!
        </h2>
        <p className="mx-auto mb-8 max-w-xl font-heading text-lg italic text-[var(--color-text-dimmed)] md:text-xl">
          Get exclusive event updates & news — subscribe now!
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-4xl flex-col items-stretch justify-center gap-3 md:flex-row md:flex-wrap md:items-center"
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

          <Button
            type="submit"
            className="h-12 shrink-0 bg-[var(--color-primary)] px-8 font-medium text-[var(--color-primary-foreground)] hover:opacity-95 md:mt-0"
          >
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  );
}
