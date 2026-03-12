"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import BookACallModal from "../book-a-call-modal";

const CONTROL_ITEMS = [
  "How guests book tickets or tables",
  "What they pay and how they pay",
  "Which menus and add-ons they choose",
  "How your venue website looks and feels",
];

export default function RevolutioniseSection() {
  const [bookCallOpen, setBookCallOpen] = useState(false);

  return (
    <>
      <section className="py-20 bg-[color:var(--color-background)]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-6">
                Event Management Software to Revolutionise Your Venue
              </h2>
              <div className="space-y-4 text-[color:var(--color-text-dimmed)] leading-relaxed">
                <p>
                  We&apos;re built for wedding venues, pubs, event spaces, and
                  restaurants; businesses just like yours. We&apos;ll save you
                  valuable time and improve the customer experience with the
                  ability to sell tickets online and manage your events from one
                  easy-to-use dashboard.
                </p>
                <p>
                  You can manage everything from how guests choose their menu
                  options to how your events can be booked.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[color:var(--color-text)] mb-4">
                You stay in charge of:
              </h3>
              <ul className="space-y-3 mb-8">
                {CONTROL_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-[color:var(--color-primary)] mt-0.5 shrink-0" />
                    <span className="text-[color:var(--color-text-dimmed)]">{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="event-primary"
                size="lg"
                className="rounded-md px-8"
                onClick={() => setBookCallOpen(true)}
              >
                Book a demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <BookACallModal isOpen={bookCallOpen} onClose={() => setBookCallOpen(false)} />
    </>
  );
}
