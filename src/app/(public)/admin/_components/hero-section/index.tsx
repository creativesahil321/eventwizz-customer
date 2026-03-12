"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import BookACallModal from "../book-a-call-modal";

export default function HeroSection() {
  const [bookCallOpen, setBookCallOpen] = useState(false);

  return (
    <>
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 bg-[color:var(--color-background)] overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
          <div className="absolute top-40 left-3/4 w-3 h-3 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
          <div className="absolute bottom-20 left-1/3 w-2 h-2 rounded-full bg-[color:var(--color-secondary)] animate-pulse" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col space-y-6 text-[color:var(--color-text)]">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Event Management Software for Venues
              </h1>
              <p className="text-lg md:text-xl text-[color:var(--color-text-dimmed)] leading-relaxed max-w-lg">
                Manage your venue, your way, with an event management platform
                that allows you to sell tickets online at the touch of a button.
              </p>
              <div className="pt-4">
                <Button
                  variant="event-primary"
                  size="lg"
                  className="rounded-md px-8 shadow-lg text-base"
                  onClick={() => setBookCallOpen(true)}
                >
                  Book a demo
                </Button>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                <div className="bg-gray-900 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-gray-400">eventwizz.co.uk</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-secondary)] p-8 min-h-[280px] flex flex-col items-center justify-center text-white text-center">
                  <p className="text-sm font-medium mb-2 opacity-80">Christmas Party</p>
                  <p className="text-2xl font-bold mb-4">PRICES FROM £79</p>
                  <p className="text-lg font-semibold">JOIN US FOR OUR CHRISTMAS</p>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-[color:var(--color-primary)]/20 rounded-full blur-2xl z-0" />
              <div className="absolute -top-8 -left-8 w-36 h-36 bg-[color:var(--color-secondary)]/20 rounded-full blur-2xl z-0" />
            </div>
          </div>
        </div>
      </section>

      <BookACallModal isOpen={bookCallOpen} onClose={() => setBookCallOpen(false)} />
    </>
  );
}
