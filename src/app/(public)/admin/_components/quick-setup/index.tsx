// Setup steps data based on the screenshot
// Setup steps data based on the screenshot
const setupSteps = [
  {
    id: "venue-info",
    title: "Add Your Venue Info",
    description:
      "Manage meeting requests, find the perfect venue, and activate your event suite to drive immediate impact.",
    features: [
      "Requests & Approvals",
      "Event Budgeting",
      "Standardize Reporting",
      "Venue Matching",
    ],
    ctaText: "Standardize workflows",
    imageUrl: "/placeholder-venue.jpg",
  },
  {
    id: "create-event",
    title: "Create Your Event",
    description:
      "Add venue details and pricing, build awareness, and promote at forums customers might attend, all from one central place.",
    features: [
      "Event Handling",
      "Registration/Payments",
      "Course Management",
      "Exhibitor Management",
    ],
    ctaText: "Build your event",
    imageUrl: "/placeholder-event.jpg",
  },
  {
    id: "menu-choices",
    title: "Add Your Menu Choices",
    description:
      "Store confirmations, menus, and create a superior experience to modern management before, during, and after your event.",
    features: [
      "Requests & Approvals",
      "Event Budgeting",
      "Electronic Registering",
      "Menu Sourcing",
    ],
    ctaText: "Connect your audience",
    imageUrl: "/placeholder-menu.jpg",
  },
  {
    id: "payment-details",
    title: "Add Your Payment Details",
    description:
      "Manage meeting requests, find the perfect venue, and activate your event suite to drive immediate impact.",
    features: [
      "Requests & Approvals",
      "Event Budgeting",
      "Standardize Reporting",
      "Menu Matching",
    ],
    ctaText: "Follow-up faster",
    imageUrl: "/placeholder-payment.jpg",
  },
];

export default function QuickSetup() {
  return (
    <section className="py-16 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-4 font-heading">
            How To Get Setup In 15 Minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {setupSteps.map((step) => (
            <div
              key={step.id}
              className="flex flex-col bg-[color:var(--color-background)] p-4 rounded-lg"
            >
              {/* Image Container */}
              <div className="relative h-48 w-full mb-4 overflow-hidden rounded-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--color-secondary)] to-[color:var(--color-primary)]">
                  {/* Image would go here */}
                </div>
              </div>

              {/* Content */}
              <h3 className="font-bold text-lg mb-2 font-heading text-[color:var(--color-text)]">
                {step.title}
              </h3>
              <p className="text-sm text-[color:var(--color-text-dimmed)] mb-4 font-body">
                {step.description}
              </p>

              {/* Features List */}
              <ul className="mb-4 space-y-2">
                {step.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center text-xs text-[color:var(--color-text)]"
                  >
                    <span className="w-2 h-2 bg-[color:var(--color-primary)] rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA Link */}
              <div className="mt-auto">
                <a
                  href="#"
                  className="text-[color:var(--color-primary)] text-sm font-medium hover:underline"
                >
                  {step.ctaText}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
