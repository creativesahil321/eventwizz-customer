"use client";

import { useContext, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { resolveAdminHomeContent } from "@/lib/admin-cms-content";
import { SiteHeading } from "@/components/public/site-heading";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { theme } = useContext(ServerContext);
  const { faq } = resolveAdminHomeContent(theme as ThemeSchema);

  return (
    <section className="bg-[color:var(--color-surface)] py-10 md:py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="mb-6 text-center">
          <SiteHeading
            level={2}
            title={faq.title}
            variant="onSurface"
            align="center"
            className="mb-1.5 !text-xl !font-bold md:!text-2xl"
          />
          <p className="text-sm text-[color:var(--color-text-dimmed)]">
            {faq.subtitle}
          </p>
        </div>

        <div className="space-y-1.5">
          {faq.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50 sm:px-4 sm:py-3"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span className="pr-3 font-medium">{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 text-sm leading-relaxed text-gray-600 sm:px-4">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
