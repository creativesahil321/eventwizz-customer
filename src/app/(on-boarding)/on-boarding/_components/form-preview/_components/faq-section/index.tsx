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
};

export default function FaqSection({ faqs }: FaqSectionProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <section className="w-full bg-icon-box dark:bg-background text-center py-20">
      <div className="w-full">
        <h2 className="text-3xl font-bold text-foreground dark:text-foreground">
          FAQS
        </h2>
        <p className="py-2 text-foreground dark:text-foreground">
          Some of the most frequently asked questions we receive
        </p>
        <section className="w-full flex items-center justify-center">
          <Button
            variant="event-outline"
            onClick={() => {
              setShowMore(!showMore);
            }}
            className="flex items-center gap-2 border rounded-[10px] border-2 border-[var(--color-primary)]"
          >
            Show All
            {showMore ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
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
                  <AccordionTrigger className="text-xl bg-foreground text-background px-5 border-none rounded-none focus-visible:ring-0 hover:no-underline break-words whitespace-normal" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                    {data.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 bg-foreground text-background text-base break-words whitespace-normal overflow-hidden" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                    {data.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
        </Accordion>
      </div>
    </section>
  );
}
