"use client";

import React from "react";
import {
  Clock,
  Globe,
  Monitor,
  Utensils,
  HandHelping,
  CircleDollarSign,
  Cog,
  Ticket,
  ShieldCheck,
} from "lucide-react";

// Selling points data based on the screenshot
const sellingPoints = [
  {
    id: "fast-setup",
    title: "Get Going In 15 Minutes",
    icon: Clock,
  },
  {
    id: "micro-site",
    title: "Generate Your Own Micro Site Easily Shareable",
    icon: Globe,
  },
  {
    id: "integrate",
    title: "Integrate To Your Platform & Systems",
    icon: Monitor,
  },
  {
    id: "menu-planning",
    title: "Fully Automated Menu Planning",
    icon: Utensils,
  },
  {
    id: "upsells",
    title: "Upsells",
    icon: HandHelping,
  },
  {
    id: "split-payments",
    title: "Split Payments",
    icon: CircleDollarSign,
  },
  {
    id: "automated",
    title: "Fully Automated",
    icon: Cog,
  },
  {
    id: "tickets",
    title: "Select Tickets Or Tables",
    icon: Ticket,
  },
  {
    id: "menu-choices",
    title: "Add Your Menu Choices",
    icon: Utensils,
  },
  {
    id: "secure-portal",
    title: "Secure Online Portal For Customers And Venue Admins",
    icon: ShieldCheck,
  },
];

export default function SellingPoints() {
  return (
    <section className="py-16 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-4 font-heading">
            Our Selling Points
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {sellingPoints.map((point) => {
            const IconComponent = point.icon;
            return (
              <div
                key={point.id}
                className="bg-[color:var(--color-surface)] rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="rounded-full bg-[color:var(--color-primary)]/10 w-12 h-12 flex items-center justify-center mb-4">
                  <IconComponent className="h-6 w-6 text-[color:var(--color-primary)]" />
                </div>
                <h3 className="text-sm font-medium font-body text-[color:var(--color-text)]">
                  {point.title}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
