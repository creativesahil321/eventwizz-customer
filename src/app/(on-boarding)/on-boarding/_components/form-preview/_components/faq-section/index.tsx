"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
type Faq = {
  question?: string;
  answer?: string;
};
type FaqSectionProps = {
  faqs: Faq[];
  /** Onboarding preview: show FAQ list without an extra click */
  defaultExpanded?: boolean;
};

function normalizeFaqQuestion(text: string | undefined): string {
  if (!text) return "";
  const t = text.trim();
  return t.replace(/^\.+\s*/, "");
}

export default function FaqSection({
  faqs,
  defaultExpanded = false,
}: FaqSectionProps) {
  const [showMore, setShowMore] = useState(defaultExpanded);

  return (
    <section
      className="w-full scroll-mt-24 bg-[var(--color-secondary)] px-4 text-center text-[var(--color-secondary-foreground)] pt-24 pb-16 sm:px-6 sm:scroll-mt-28 md:py-20"
      aria-labelledby="faq-section-heading"
    >
      <div className="mx-auto w-full max-w-2xl">
        <h2
          id="faq-section-heading"
          className="text-2xl font-bold sm:text-3xl"
        >
          FAQS
        </h2>
        <p className="px-1 py-2 text-sm sm:text-base">
          Some of the most frequently asked questions we receive
        </p>
        <div className="flex w-full justify-center pb-2 pt-1">
          <Button
            type="button"
            variant="event-primary"
            className="shrink-0 gap-2"
            onClick={() => {
              setShowMore(!showMore);
            }}
          >
            Show All
            {showMore ? (
              <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
            )}
          </Button>
        </div>

        <div className="mt-4 text-left sm:mt-5">
          <Accordion type="single" collapsible className="w-full">
            {showMore &&
              faqs &&
              faqs
                .filter((faq) => faq.question || faq.answer)
                .map((data, index) => (
                  <AccordionItem
                    className="mb-2 overflow-hidden rounded-xl border-none"
                    value={`item-${index}`}
                    key={index}
                  >
                    <AccordionTrigger
                      className="items-start gap-3 rounded-none border-none bg-[var(--color-surface)] px-4 py-5 text-left text-base text-[var(--color-on-surface)] hover:no-underline focus-visible:ring-0 sm:px-5 sm:text-xl [&[data-state=open]]:rounded-b-none"
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {normalizeFaqQuestion(data.question)}
                    </AccordionTrigger>
                    <AccordionContent
                      className="overflow-hidden whitespace-normal break-words bg-[var(--color-background)] px-4 text-base text-[var(--color-on-background)] sm:px-5"
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {data.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
