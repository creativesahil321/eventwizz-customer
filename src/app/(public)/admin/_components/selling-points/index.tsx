import {
  Clock,
  Globe,
  Monitor,
  UtensilsCrossed,
  TrendingUp,
  Ticket,
  Cog,
  Palette,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

const SELLING_POINTS = [
  { title: "Get Started In As Few As 15 Minutes", icon: Clock },
  { title: "Generate Your Own Shareable Microsite", icon: Globe },
  { title: "Integrate With Your Internal Platforms & Systems", icon: Monitor },
  { title: "Fully Automated Menu Planning", icon: UtensilsCrossed },
  { title: "Upsell Extra Features & More Expensive Packages", icon: TrendingUp },
  { title: "Sell Tables Or Tickets", icon: Ticket },
  { title: "Automate Your Processes To Save Time", icon: Cog },
  { title: "Keep Your Branding", icon: Palette },
  { title: "Add Your Menu Choices", icon: ClipboardList },
  { title: "Secure Online Portal For Customers & Venue Admins", icon: ShieldCheck },
];

export default function SellingPoints() {
  return (
    <section className="py-20 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
            Why Use Event Wizz?
          </h2>
          <p className="text-[color:var(--color-text-dimmed)] max-w-xl mx-auto">
            Everything you need to run seamless, profitable events — all in one
            place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {SELLING_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="bg-[color:var(--color-surface)] rounded-xl border border-gray-100 p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="rounded-full bg-[color:var(--color-primary)]/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-[color:var(--color-primary)]" />
                </div>
                <h3 className="text-sm font-medium text-[color:var(--color-text)]">
                  {point.title}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
