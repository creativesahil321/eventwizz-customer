"use client";

import React, { useContext } from "react";
import { ServerContext } from "@/lib/server-context";

const eventTypes = [
  {
    id: "pubs",
    title: "Pubs",
    imageUrl: "/placeholder-pubs.jpg",
  },
  {
    id: "christmas",
    title: "Christmas",
    imageUrl: "/placeholder-christmas.jpg",
  },
  {
    id: "brunches",
    title: "Brunches",
    imageUrl: "/placeholder-brunches.jpg",
  },
  {
    id: "restaurants",
    title: "Restaurants",
    imageUrl: "/placeholder-restaurants.jpg",
  },
  {
    id: "conference-planning",
    title: "Conference planning",
    imageUrl: "/placeholder-conferences.jpg",
  },
  {
    id: "university-events",
    title: "University Proms & Events",
    imageUrl: "/placeholder-university.jpg",
  },
];

export default function EventTypes() {
  const { theme } = useContext(ServerContext);

  return (
    <section className="py-16 bg-[color:var(--color-surface)]/70">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-4 font-heading">
            What Does Our System Work With?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventTypes.map((eventType) => (
            <div
              key={eventType.id}
              className="relative overflow-hidden rounded-lg h-[180px] bg-[color:var(--color-primary)]/20 group"
            >
              {/* Dark overlay to make text readable */}
              <div className="absolute inset-0 bg-black/50 z-10"></div>

              {/* Text centered on image */}
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <h3 className="text-white text-xl font-medium font-heading">
                  {eventType.title}
                </h3>
              </div>

              {/* Image background - would be replaced with actual images */}
              <div className="absolute inset-0 bg-[color:var(--color-primary)]/10 z-0 transition-transform duration-300 group-hover:scale-110">
                {/* This would be replaced with an actual image */}
                {/* <Image src={eventType.imageUrl} alt={eventType.title} fill className="object-cover" /> */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
