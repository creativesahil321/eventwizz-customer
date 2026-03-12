"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import BookACallModal from "@/app/(public)/admin/_components/book-a-call-modal";

const STEPS = [
  {
    number: "01",
    title: "Create Your Site",
    description:
      "First things first, you need your own branded site to sell tickets online. Our site-building platform is perfect for venues like pubs, event spaces, and wedding venues, with flexibility in the types of events you host. You don't need any technical skills; it's easier than ever to host a site that's perfect for your business and attendees alike.",
  },
  {
    number: "02",
    title: "Add Events",
    description:
      "Once your site is complete, it's time to populate it with events. You can add multiple events at once, from your next open-mic night to an upcoming trivia event. Create event pages with all the details attendees need, including time and date, cost, and descriptions. Within your event pages, you can choose ticket types, prices, and packages, as well as capacity limits. Sales will be tracked in the platform, so you can see how many people are expected.",
  },
  {
    number: "03",
    title: "Sell Tickets Online",
    description:
      "Here comes the fun part. Once you've set up your event page, you can start selling tickets to curious attendees. Using a secure online checkout, customers will be able to instantly snap up a ticket or table at your upcoming event. You can keep an eye on sales and attendee numbers from the dashboard.",
  },
  {
    number: "04",
    title: "Manage Bookings",
    description:
      "You can monitor ticket and table sales in real time from the dashboard. Once the sales start coming in, manage bookings as necessary, sending confirmation emails and any additional details. You can monitor the success of various events, helping inform your decision about which ones you'll repeat.",
  },
  {
    number: "05",
    title: "Move It IRL",
    description:
      "Once all the online magic has done its stuff, you can move on to planning your event IRL. The best part about EventWizz is how much time it saves — valuable time you can put into turning your event dream into a reality.",
  },
];

const FAQS = [
  {
    question: "Can I manage more than one event at once?",
    answer:
      "Absolutely! With our extensive event management platform, you can manage and advertise more than one event at once, providing an all-in-one space for customers to explore your upcoming events and purchase tickets.",
  },
  {
    question: "Can I sell tickets online on the platform?",
    answer:
      "EventWizz allows you to sell tickets online to attendees of your events. Our platform offers secure payment and the ability to track tickets sold and the number of attendees on your dashboard.",
  },
  {
    question: "Do I need technical skills to use the platform?",
    answer:
      "Not at all. Our platform is suitable for everyone, from tech-savvy experts to novices. Our step-by-step process makes it easy to create your own event booking site with zero experience. We know the tech, you know the events; it's a win-win.",
  },
  {
    question: "Who is the platform for?",
    answer:
      "Our platform is for any event organiser, venue, or space looking to streamline their processes. If you find yourself and your team spending too much time managing bookings, and want to get time back to focus on core competencies, EventWizz allows you to do so without breaking the bank.",
  },
  {
    question: "Can I track attendance?",
    answer:
      "Our dashboard allows you to keep track of how many tickets have been bought and who bought them. This helps you control capacity and reach out to attendees with the necessary details.",
  },
];

export default function HowItWorksContent() {
  const [bookCallOpen, setBookCallOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <section className="py-20 bg-[color:var(--color-background)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-[color:var(--color-text)] mb-4">
            How It Works
          </h1>
          <p className="text-lg text-[color:var(--color-text-dimmed)] mb-16">
            Running an event site is easier than it&apos;s ever been with our
            management software. Here&apos;s how it works.
          </p>

          <div className="space-y-12">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-6">
                <div className="shrink-0">
                  <div className="w-14 h-14 rounded-full bg-[color:var(--color-primary)] text-white flex items-center justify-center font-bold text-lg">
                    {step.number}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                    {step.title}
                  </h2>
                  <p className="text-[color:var(--color-text-dimmed)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[color:var(--color-surface)]">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold text-[color:var(--color-text)] mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-[color:var(--color-text-dimmed)] mb-8">
            Let&apos;s discuss how we can make your next event unforgettable. Book a
            call with us today and let&apos;s bring your vision to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="event-primary"
              size="lg"
              className="rounded-md px-8"
              onClick={() => setBookCallOpen(true)}
            >
              Book a Demo
            </Button>
            <Link href="/about">
              <Button variant="event-outline" size="lg" className="rounded-md px-8">
                Learn More About Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[color:var(--color-background)]">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-[color:var(--color-text)] text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                  >
                    <span className="font-medium text-[color:var(--color-text)] pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-[color:var(--color-text-dimmed)] shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-[color:var(--color-text-dimmed)] leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <BookACallModal isOpen={bookCallOpen} onClose={() => setBookCallOpen(false)} />
    </>
  );
}
