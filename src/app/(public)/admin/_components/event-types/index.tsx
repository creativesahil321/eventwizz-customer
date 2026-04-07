import Image from "next/image";

const EVENT_TYPES = [
  {
    title: "Christmas & Seasonal Events",
    description:
      "Sell Christmas event tickets and tables with menu choices and guest seating plans.",
    image: "/assets/images/admin/event-christmas.jpg",
  },
  {
    title: "NYE Parties",
    description:
      "Offer standing tickets, table bookings, and add-ons for New Year celebrations.",
    image: "/assets/images/admin/event-nye.jpg",
  },
  {
    title: "Dining Events",
    description:
      "Run dinners, special menus, and tasting events with online booking and guest options.",
    image: "/assets/images/admin/event-dining.jpg",
  },
  {
    title: "University Balls & Parties",
    description:
      "Create ticketed student events with easy online booking and guest lists.",
    image: "/assets/images/admin/event-university.jpg",
  },
  {
    title: "Corporate Events",
    description:
      "Manage registrations, bookings, and payments for corporate or private hire events.",
    image: "/assets/images/admin/event-corporate.jpg",
  },
  {
    title: "Nightlife Events",
    description:
      "Sell tickets for pub nights, live entertainment, and seasonal nightlife bookings.",
    image: "/assets/images/admin/event-nightlife.jpg",
  },
];

export default function EventTypes() {
  return (
    <section className="py-20 bg-[color:var(--color-background)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading mb-3 text-3xl font-bold text-[color:var(--color-text)] md:text-4xl">
            Who Is Event Wizz For?
          </h2>
          <p className="text-[color:var(--color-text-dimmed)] max-w-2xl mx-auto">
            Any business that runs events will benefit from Event Wizz. Create
            ticketed events, accept payment, and allow menu choices, all from
            your venue&apos;s own branded site.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVENT_TYPES.map((event) => (
            <div
              key={event.title}
              className="relative rounded-2xl overflow-hidden group cursor-pointer h-64 shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              {/* Background image */}
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {/* Gradient overlay — always visible, deepens on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 group-hover:from-black/90 transition-all duration-300" />

              {/* Content pinned to bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="font-bold text-lg leading-snug mb-1.5">
                  {event.title}
                </h3>
                {/* Description slides up on hover */}
                <p className="text-sm text-white/80 leading-snug max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-300">
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
