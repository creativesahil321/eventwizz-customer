"use client";

import React from "react";
//  import Image from "next/image";
// import { ServerContext } from "@/lib/server-context";

// Partner logos based on the screenshot
const partners = [
  { id: "three-rivers", name: "Three Rivers Golf & Country Club" },
  { id: "sb", name: "SB" },
  { id: "ham", name: "HAM" },
  { id: "theydon", name: "Theydon Oak" },
  { id: "henry", name: "Henry Middler" },
  { id: "red-rum", name: "Red Rum Road" },
  { id: "bee", name: "Bee" },
];

export default function TrustedBy() {
  // const { theme } = useContext(ServerContext);

  return (
    <section className="py-16 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-4 font-heading">
            Trusted By
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 items-center justify-items-center">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="border border-gray-100 rounded-lg p-4 w-full h-24 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
            >
              {/* This would be replaced with actual partner logos */}
              <div className="h-12 w-full bg-[color:var(--color-primary)]/5 flex items-center justify-center">
                <span className="text-[color:var(--color-text-dimmed)] text-sm">
                  {partner.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
