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
    // TODO: Implement actual subscription submission
    setFormData({
      name: "",
      email: "",
      phone: "",
    });
  };

  return (
    <section className="py-12 text-[var(--color-secondary-foreground)] relative">
      <div className="absolute inset-0 bg-[var(--color-secondary)]/85"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-8">
          <p className="text-xl font-medium mb-3">
            Subscribe for Exclusive Updates!
          </p>
          <h2 className="text-2xl md:text-4xl font-bold max-w-3xl mx-auto">
            Get exclusives, event updates, & news – subscribe now!
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-4 justify-center items-center"
          >
            <Input
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="bg-[var(--color-surface)]/85 border-[var(--color-surface)]/55 h-12 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface)]/65 w-full md:w-auto"
            />

            <Input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              className="bg-[var(--color-surface)]/85 border-[var(--color-surface)]/55 h-12 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface)]/65 w-full md:w-auto"
            />

            <Input
              type="tel"
              name="phone"
              placeholder="Mobile Number"
              value={formData.phone}
              onChange={handleChange}
              className="bg-[var(--color-surface)]/85 border-[var(--color-surface)]/55 h-12 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface)]/65 w-full md:w-auto"
            />

            <Button
              type="submit"
              variant="event-primary"
              className="h-12 px-6 mt-4 md:mt-0"
            >
              Sign up
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
