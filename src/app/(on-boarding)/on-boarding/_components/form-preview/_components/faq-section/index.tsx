"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMemo } from "react";
import { SiteHeading } from "@/components/public/site-heading";
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

type Faq = {
  question?: string;
  answer?: string;
};
type FaqSectionProps = {
  faqs: Faq[];
  /** Kept for callers; answers stay collapsed until a question is opened. */
  defaultExpanded?: boolean;
  headingEmphasis?: HeadingEmphasis | string | null;
};

function normalizeFaqQuestion(text: string | undefined): string {
  if (!text) return "";
  const t = text.trim();
  return t.replace(/^\.+\s*/, "");
}

export default function FaqSection({
  faqs,
  headingEmphasis,
}: FaqSectionProps) {
  const narrowPreview = usePreviewMobileLayout();

  const filteredFaqs = useMemo(
    () => (faqs || []).filter((faq) => faq.question || faq.answer),
    [faqs],
  );

  return (
    <section
      className={cn(
        "w-full scroll-mt-20 bg-[var(--color-background)] px-4 py-8 text-center text-[var(--color-text)] md:py-10",
        !narrowPreview && "sm:scroll-mt-24",
      )}
      aria-labelledby="faq-section-heading"
    >
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Got Questions?
          </p>
          <div id="faq-section-heading">
            <SiteHeading
              level={2}
              title="Frequently Asked Questions"
              emphasis={headingEmphasis}
              variant="onSurface"
              align="center"
              className="!text-3xl !font-black tracking-tight md:!text-4xl"
            />
          </div>
        </div>

        <div className="text-left">
          <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.map((data, index) => (
              <AccordionItem
                className="mb-1.5 overflow-hidden rounded-lg border-none"
                value={`item-${index}`}
                key={index}
              >
                <AccordionTrigger
                  className={cn(
                    "items-center gap-2 rounded-none border-none bg-[var(--color-surface)] px-3 !py-2.5 text-left text-sm font-medium text-[var(--color-on-surface)] hover:no-underline focus-visible:ring-0 [&[data-state=open]]:rounded-b-none",
                    !narrowPreview && "sm:px-4 sm:!py-3 sm:text-[15px]",
                  )}
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {normalizeFaqQuestion(data.question)}
                </AccordionTrigger>
                <AccordionContent
                  className={cn(
                    "overflow-hidden whitespace-normal break-words bg-[var(--color-background)] px-3 pt-2 pb-3 text-sm leading-relaxed text-[var(--color-on-background)]",
                    !narrowPreview && "sm:px-4",
                  )}
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
