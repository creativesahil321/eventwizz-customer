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

export default function FaqSection({
  faqs,
  defaultExpanded = false,
}: FaqSectionProps) {
  const [showMore, setShowMore] = useState(defaultExpanded);

  return (
    <section className="w-full  bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] text-center py-20">
      <div className="w-full">
        <h2 className="text-3xl font-bold ">FAQS</h2>
        <p className="py-2 ">
          Some of the most frequently asked questions we receive
        </p>
        <section className="w-full flex items-center justify-center">
          <Button
            variant="event-outline"
            onClick={() => {
              setShowMore(!showMore);
            }}
          >
            Show All
            {showMore ? (
              <ChevronUp className="h-4 w-4 " />
            ) : (
              <ChevronDown className="h-4 w-4 " />
            )}
          </Button>
        </section>
      </div>
      <div className="w-full max-w-2xl mx-auto text-left my-5">
        <Accordion type="single" collapsible className="w-full">
          {showMore &&
            faqs &&
            faqs
              .filter((faq) => faq.question || faq.answer)
              .map((data, index) => (
                <AccordionItem
                  className="mb-2 border-none rounded-xl overflow-hidden"
                  value={`item-${index}`}
                  key={index}
                >
                  <AccordionTrigger
                    className="text-xl text-[var(--color-on-surface)] bg-[var(--color-surface)] px-5 border-none rounded-none focus-visible:ring-0 hover:no-underline break-words whitespace-normal"
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {data.question}
                  </AccordionTrigger>
                  <AccordionContent
                    className="px-5 bg-[var(--color-background)] text-[var(--color-on-background)] text-base break-words whitespace-normal overflow-hidden"
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
    </section>
  );
}
