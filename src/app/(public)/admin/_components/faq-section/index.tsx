"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "Who is EventWizz for?",
    answer:
      "EventWizz is for any business that would benefit from an event management platform. Pubs, restaurants, wedding venues, and event spaces alike can enjoy an easy-to-use system with everything you need for smooth booking and management.",
  },
  {
    question: "Will I get my own branded website?",
    answer:
      "Yes, you'll get a branded website to allow for instantly recognisable brand consistency that your customers will recognise. There are SEO settings to help you climb to the top of Google.",
  },
  {
    question: "Can I sell tickets online for Christmas and NYE events?",
    answer:
      "Absolutely. EventWizz allows you to sell tickets and tables for Christmas, New Year's Eve, and other seasonal events. You can even upload special packages, such as VIP options and standing tickets.",
  },
  {
    question: "How quickly can I set up my website?",
    answer:
      "With the help of guided onboarding, you can set up your event management site within around 15 minutes.",
  },
  {
    question: "Can I manage more than one event at once?",
    answer:
      "Absolutely! With our extensive event management platform, you can manage and advertise more than one event at once, providing an all-in-one space for customers to explore your upcoming events and purchase tickets.",
  },
  {
    question: "Do I need technical skills to use the platform?",
    answer:
      "Not at all. Our platform is suitable for everyone, from tech-savvy experts to novices. Our step-by-step process makes it easy to create your own event booking site with zero experience. We know the tech, you know the events; it's a win-win.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-[color:var(--color-text-dimmed)]">
            Everything you need to know about Event Wizz.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
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
                  <span className="font-medium pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                    {faq.answer}
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
