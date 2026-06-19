import { Metadata } from "next";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import { Check } from "lucide-react";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: "About Us - EventWizz Event Management Platform",
  description:
    "EventWizz is passionate about helping UK businesses manage bookings, sell tickets online, and run events seamlessly from one easy-to-use dashboard.",
  keywords: [
    "about eventwizz",
    "event management platform UK",
    "event booking software",
    "venue event management",
  ],
  openGraph: {
    title: "About Us - EventWizz",
    description:
      "EventWizz helps UK venues manage events, sell tickets online, and keep customers happy from one simple dashboard.",
    url: `${appConfig.url}/about`,
  },
  alternates: {
    canonical: `${appConfig.url}/about`,
  },
};

const WHY_CHOOSE = [
  "Set up in as little as 15 minutes.",
  "Create a fully branded website with no need for technical skills.",
  "Promote events and improve sales.",
  "Offer your customers a seamless experience.",
  "Access to everything in one place.",
  "Designed for venues just like yours.",
  "Scalable from small businesses to larger corporations.",
];

export default function AboutPage() {
  return (
    <>
      <AdminHeader />
      <main className="pt-24">
        <section className="py-20 bg-[color:var(--color-background)]">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-[color:var(--color-text)] mb-8">
              About Us
            </h1>
            <p className="text-lg text-[color:var(--color-text-dimmed)] leading-relaxed mb-12">
              EventWizz is passionate about helping businesses just like yours to
              succeed. With our event management platform, you can manage
              bookings, sell tickets online, and access an overview of all
              upcoming events on one easy-to-use dashboard. Customers can use
              your dedicated microsite to buy tickets, offering a seamless
              process and secure payment that boosts consumer trust.
            </p>

            <h2 className="text-3xl font-bold text-[color:var(--color-text)] mb-6">
              Our Mission
            </h2>
            <div className="space-y-4 text-[color:var(--color-text-dimmed)] leading-relaxed mb-12">
              <p>
                Our goal is to save you valuable time by automating the manual
                processes that make up much of your business&apos;s work, such as
                selling tickets, selecting guest menu choices, and organising
                different price packages.
              </p>
              <p>
                Our event management software provides everything you need to
                manage an event seamlessly from one space.
              </p>
              <p>
                No more flicking between tabs. No more manual input. No more
                chasing attendees for cash payment. Just easy event management
                all on one platform.
              </p>
            </div>

            <h2 className="text-3xl font-bold text-[color:var(--color-text)] mb-6">
              Why Choose EventWizz?
            </h2>
            <p className="text-[color:var(--color-text-dimmed)] mb-6">
              Here&apos;s what sets us apart from other event management platforms.
            </p>
            <ul className="space-y-3 mb-12">
              {WHY_CHOOSE.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[color:var(--color-primary)] mt-0.5 shrink-0" />
                  <span className="text-[color:var(--color-text-dimmed)]">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-[color:var(--color-text-dimmed)] leading-relaxed">
              We know events. We know which unnecessary admin tasks take up your
              valuable time and what your customers want from a booking site. Our
              approach ensures everyone&apos;s happy; you&apos;ll save valuable time and
              make processes more efficient, while your customers will enjoy a
              more seamless experience.
            </p>
          </div>
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
