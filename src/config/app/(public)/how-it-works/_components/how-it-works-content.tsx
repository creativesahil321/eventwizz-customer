import { CMS_PROSE_CLASS } from "@/components/public/cms-page-ui";

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

export default function HowItWorksContent({
  contentHtml,
}: {
  contentHtml?: string | null;
}) {
  const customHtml = contentHtml?.trim() ? contentHtml : null;

  return (
    <>
      <section className="py-20 bg-[color:var(--color-background)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-[color:var(--color-text)] mb-4">
            How It Works
          </h1>
          {customHtml ? (
            <div
              className={CMS_PROSE_CLASS}
              dangerouslySetInnerHTML={{ __html: customHtml }}
            />
          ) : (
            <>
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
            </>
          )}
        </div>
      </section>
    </>
  );
}
