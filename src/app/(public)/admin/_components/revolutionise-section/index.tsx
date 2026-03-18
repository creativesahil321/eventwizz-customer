"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Check, PlayCircle } from "lucide-react";
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Image mockup with play button */}
            <div className="relative">
              {/* Decorative circle behind image */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[420px] h-[420px] rounded-full bg-[color:var(--color-primary)]/10 blur-2xl" />
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
                <Image
                  src="/assets/images/admin/dashboard-mockup.jpg"
                  alt="EventWizz platform dashboard"
                  width={680}
                  height={460}
                  className="w-full h-auto object-cover"
                />
                {/* Dark overlay for contrast with play button */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 cursor-pointer">
                    <PlayCircle className="h-16 w-16 text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-white text-sm font-medium opacity-90">Watch Demo</span>
                  </div>
                </div>
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-5 -right-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/30">
                <p className="text-xs text-gray-500 font-medium mb-0.5">Average setup time</p>
                <p className="text-2xl font-extrabold text-gray-900">15 mins</p>
                <p className="text-xs text-[color:var(--color-primary)] font-medium">Ready to go live ✓</p>
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-6">
                Event Management Software to Revolutionise Your Venue
              </h2>
              <div className="space-y-4 text-[color:var(--color-text-dimmed)] leading-relaxed mb-8">
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

              <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-4">
                You stay in charge of:
              </h3>
              <ul className="space-y-3 mb-8">
                {CONTROL_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[color:var(--color-primary)]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-[color:var(--color-primary)]" />
                    </div>
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
