"use client";

import { useContext, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { resolveAdminHomeContent } from "@/lib/admin-cms-content";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { theme } = useContext(ServerContext);
  const { faq } = resolveAdminHomeContent(theme as ThemeSchema);

  return (
    <section className="py-20 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
            {faq.title}
          </h2>
          <p className="text-[color:var(--color-text-dimmed)]">
            {faq.subtitle}
          </p>
        </div>

        <div className="space-y-3">
          {faq.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-gray-200 rounded-xl overflow-hidden bg-white"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors text-gray-900"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span className="font-medium pr-4">{item.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-gray-600 leading-relaxed">
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
