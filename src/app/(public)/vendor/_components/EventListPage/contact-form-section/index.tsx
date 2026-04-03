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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium ">
                Booking and Event Assistance
              </h3>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Need help?
              </h2>
            </div>
            <p className="text-lg leading-relaxed max-w-md">
              Get in touch with our team for any questions about booking events,
              assistance with your account, or general inquiries.
            </p>
          </div>

          {/* Right Side - Contact Form */}
          <div className="bg-[var(--color-primary)] backdrop-blur-sm rounded-lg p-6 md:p-8 border border-[var(--color-primary)]/35">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="bg-[var(--color-surface)]/80 border-[var(--color-surface)]/50 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface)]/65 rounded-lg focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200"
                />
                <Input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-[var(--color-surface)]/80 border-[var(--color-surface)]/50 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface)]/65 rounded-lg focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200"
                />
              </div>
              <Input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                className="bg-[var(--color-surface)]/80 border-[var(--color-surface)]/50 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface)]/65 rounded-lg focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-200"
              />
              <Textarea
                name="message"
                placeholder="Tell us how we can help you..."
                value={formData.message}
                onChange={handleChange}
                required
                className="bg-[var(--color-surface)]/80 border-[var(--color-surface)]/50 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface)]/65 rounded-lg focus:border-[var(--color-primary)]/60 focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-none h-28 transition-all duration-200"
              />
              <Button type="submit" variant="event-secondary">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
