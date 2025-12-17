"use client";

import { Card } from "@/components/ui/card";

const compatibilitySystems = [
  {
    id: "weddings",
    title: "Wedding Planning",
    imgAlt: "Wedding Planning System",
    description: "Seamless tools for wedding venues and planners.",
  },
  {
    id: "corporate",
    title: "Corporate Events",
    imgAlt: "Corporate Event System",
    description: "Conference and meeting management solutions.",
  },
  {
    id: "catering",
    title: "Catering Services",
    imgAlt: "Catering Service System",
    description: "Menu planning and food service coordination.",
  },
  {
    id: "entertainment",
    title: "Entertainment & Performances",
    imgAlt: "Entertainment System",
    description: "Artist booking and stage management.",
  },
  {
    id: "photography",
    title: "Photography & Videography",
    imgAlt: "Photography System",
    description: "Media service coordination and deliverables.",
  },
  {
    id: "venues",
    title: "Venue Management",
    imgAlt: "Venue Management System",
    description: "Space layout and facility coordination.",
  },
];

export default function SystemCompatibility() {
  // const { theme } = useContext(ServerContext);

  return (
    <section className="py-20 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-4">
            What Does Our System Work With?
          </h2>
          <p className="text-xl text-[color:var(--color-text-dimmed)] max-w-3xl mx-auto">
            EventWizz integrates seamlessly with various event service types,
            enhancing your ability to manage any event scenario.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {compatibilitySystems.map((system) => (
            <Card
              key={system.id}
              className="overflow-hidden group cursor-pointer"
            >
              {/* Image container with overlay */}
              <div className="relative h-60 w-full overflow-hidden">
                {/* Placeholder for actual images */}
                <div className="absolute inset-0 bg-[color:var(--color-primary)]/10 flex items-center justify-center">
                  <p className="text-[color:var(--color-text-dimmed)]">
                    {system.title} Image
                  </p>
                </div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-80"></div>

                {/* Content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="font-semibold text-xl mb-2 group-hover:text-[color:var(--color-primary)] transition-colors">
                    {system.title}
                  </h3>
                  <p className="text-gray-100 text-sm opacity-90">
                    {system.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
