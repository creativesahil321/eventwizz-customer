import {
  PartyPopper,
  Sparkles,
  UtensilsCrossed,
  GraduationCap,
  Building2,
  Music,
} from "lucide-react";

const EVENT_TYPES = [
  {
    title: "Christmas & Seasonal Events",
    description:
      "Sell Christmas event tickets and tables with menu choices and guest seating plans.",
    icon: PartyPopper,
  },
  {
    title: "NYE Parties",
    description:
      "Offer standing tickets, table bookings, and add-ons for New Year celebrations.",
    icon: Sparkles,
  },
  {
    title: "Dining Events",
    description:
      "Run dinners, special menus, and tasting events with online booking and guest options.",
    icon: UtensilsCrossed,
  },
  {
    title: "University Balls & Parties",
    description:
      "Create ticketed student events with easy online booking and guest lists.",
    icon: GraduationCap,
  },
  {
    title: "Corporate Events",
    description:
      "Manage registrations, bookings, and payments for corporate or private hire events.",
    icon: Building2,
  },
  {
    title: "Nightlife Events",
    description:
      "Sell tickets for pub nights, live entertainment, and seasonal nightlife bookings.",
    icon: Music,
  },
];

export default function EventTypes() {
  return (
    <section className="py-20 bg-[color:var(--color-surface)]/70">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
            Who Is Event Wizz For?
          </h2>
          <p className="text-[color:var(--color-text-dimmed)] max-w-2xl mx-auto">
            Any business that runs events will benefit from Event Wizz. Create
            ticketed events, accept payment, and allow menu choices, all from your
            venue&apos;s own branded site.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVENT_TYPES.map((event) => {
            const Icon = event.icon;
            return (
              <div
                key={event.title}
                className="bg-[color:var(--color-surface)] border border-gray-100 rounded-xl p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="w-12 h-12 rounded-lg bg-[color:var(--color-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[color:var(--color-primary)]/20 transition-colors">
                  <Icon className="h-6 w-6 text-[color:var(--color-primary)]" />
                </div>
                <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-2">
                  {event.title}
                </h3>
                <p className="text-sm text-[color:var(--color-text-dimmed)] leading-relaxed">
                  {event.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
