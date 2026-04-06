"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ContactFormSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // TODO: Implement actual form submission
    setFormData({
      name: "",
      email: "",
      phone: "",
      message: "",
    });
  };

  return (
    <section className="bg-[var(--color-surface)] py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Side - Text Content */}
          <div className="space-y-4 text-[var(--color-text)]">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-[var(--color-text-dimmed)]">
                Booking and Event Assistance
              </h3>
              <h2 className="text-4xl font-bold leading-tight md:text-5xl">
                Need help?
              </h2>
            </div>
            <p className="max-w-md text-lg leading-relaxed text-[var(--color-text-dimmed)]">
              Get in touch with our team for any questions about booking events,
              assistance with your account, or general inquiries.
            </p>
          </div>

          {/* Right Side - Contact Form (neutral card; brand only on submit) */}
          <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] bg-[var(--color-background)] p-6 shadow-sm md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="h-11 rounded-lg border-input bg-background"
                />
                <Input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-11 rounded-lg border-input bg-background"
                />
              </div>
              <Input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                className="h-11 rounded-lg border-input bg-background"
              />
              <Textarea
                name="message"
                placeholder="Tell us how we can help you..."
                value={formData.message}
                onChange={handleChange}
                required
                className="min-h-28 resize-none rounded-lg border-input bg-background"
              />
              <Button type="submit" variant="event-primary">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
