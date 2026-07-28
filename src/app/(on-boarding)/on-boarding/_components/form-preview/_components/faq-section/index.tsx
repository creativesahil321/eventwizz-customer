"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SiteHeading } from "@/components/public/site-heading";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";
type Faq = {
  question?: string;
  answer?: string;
};
type FaqSectionProps = {
  faqs: Faq[];
  /** Show FAQ list without an extra click (default: open on public + preview). */
  defaultExpanded?: boolean;
};

function normalizeFaqQuestion(text: string | undefined): string {
  if (!text) return "";
  const t = text.trim();
  return t.replace(/^\.+\s*/, "");
}

export default function FaqSection({
  faqs,
  defaultExpanded = true,
}: FaqSectionProps) {
  const [showMore, setShowMore] = useState(defaultExpanded);
  const narrowPreview = usePreviewNarrowLayout();

  const filteredFaqs = useMemo(
    () => (faqs || []).filter((faq) => faq.question || faq.answer),
    [faqs],
  );

  /** Prefer “bring / own drinks” style; else first question mentioning drink; else first item. */
  const defaultAccordionValue = useMemo(() => {
    if (filteredFaqs.length === 0) return undefined;
    const questions = filteredFaqs.map((f) =>
      normalizeFaqQuestion(f.question).toLowerCase(),
    );
    const bringOwnIdx = questions.findIndex(
      (q) =>
        /(bring|own).{0,40}drink|drink.{0,40}(bring|own)/i.test(q) ||
        /\bbyob\b/i.test(q),
    );
    if (bringOwnIdx >= 0) return `item-${bringOwnIdx}`;
    const drinkIdx = questions.findIndex((q) => /drink/.test(q));
    const idx = drinkIdx >= 0 ? drinkIdx : 0;
    return `item-${idx}`;
  }, [filteredFaqs]);

  return (
    <section
      className={cn(
        "w-full scroll-mt-20 bg-[var(--color-background)] px-4 text-center text-[var(--color-text)]",
        narrowPreview ? "py-16" : "py-20 sm:scroll-mt-24 md:py-28",
      )}
      aria-labelledby="faq-section-heading"
    >
      <div className="mx-auto w-full max-w-2xl">
        <div className="space-y-3 pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Got Questions?
          </p>
          <div id="faq-section-heading">
            <SiteHeading
              level={2}
              title="Frequently Asked Questions"
              variant="onSurface"
              align="center"
              className="!text-3xl !font-black tracking-tight md:!text-4xl"
            />
          </div>
        </div>
        <div className="flex w-full justify-center pb-2 pt-4">
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

        <div className={cn("mt-4 text-left", !narrowPreview && "sm:mt-5")}>
          <Accordion
            key={showMore ? "faq-expanded" : "faq-collapsed"}
            type="single"
            collapsible
            className="w-full"
            defaultValue={showMore ? defaultAccordionValue : undefined}
          >
            {showMore &&
              filteredFaqs.map((data, index) => (
                <AccordionItem
                  className="mb-2 overflow-hidden rounded-xl border-none"
                  value={`item-${index}`}
                  key={index}
                >
                  <AccordionTrigger
                    className={cn(
                      "items-start gap-3 rounded-none border-none bg-[var(--color-surface)] px-4 py-5 text-left text-base text-[var(--color-on-surface)] hover:no-underline focus-visible:ring-0 [&[data-state=open]]:rounded-b-none",
                      !narrowPreview && "sm:px-5 sm:text-xl",
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
                      "overflow-hidden whitespace-normal break-words bg-[var(--color-background)] px-4 text-base text-[var(--color-on-background)]",
                      !narrowPreview && "sm:px-5",
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
