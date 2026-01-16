import { usePathname } from "next/navigation";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { appConfig } from "@/config/app";

export function AuthContent() {
  const pathname = usePathname();
  const { settings } = useDomain();
  const siteName = settings?.name || appConfig.name;

  const segments = pathname?.split("/") || [];
  const isRegister = segments.includes("register");
  const isCustomer = segments.includes("customer");
  const isVendor = segments.includes("vendor");
  const isLogin = segments.includes("login");

  const statCard =
    "bg-white/30 backdrop-blur-sm rounded-lg p-4 shadow-sm min-w-0 flex flex-col justify-center items-center text-center min-h-[110px] sm:min-h-[100px]";

  const statNumber =
    "font-bold text-[var(--color-text)] text-sm sm:text-sm md:text-xs lg:text-base mb-1 break-words";

  const statLabel =
    "text-[var(--color-text)] text-xs sm:text-xs md:text-[11px] lg:text-sm leading-tight px-1 break-words whitespace-normal";

  /* ---------------- CUSTOMER REGISTER ---------------- */
  if (isRegister && isCustomer) {
    return (
      <div className="space-y-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-text)] leading-tight">
          Discover Amazing Events Near You!
        </h2>

        <div className="space-y-6">
          <p className="text-base sm:text-lg text-[var(--color-text)] leading-relaxed">
            Join our community of event enthusiasts. Get early access to
            tickets, exclusive discounts, and personalized event recommendations
            tailored just for you.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className={statCard}>
              <div className={statNumber}>1M+</div>
              <div className={statLabel}>Happy Attendees</div>
            </div>
            <div className={statCard}>
              <div className={statNumber}>5K+</div>
              <div className={statLabel}>Events Monthly</div>
            </div>
            <div className={statCard}>
              <div className={statNumber}>4.9★</div>
              <div className={statLabel}>User Rating</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[var(--color-text)]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium">
              Join millions of happy event-goers
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- VENDOR REGISTER ---------------- */
  if (isRegister && isVendor) {
    return (
      <div className="space-y-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
          Start Growing Your Event Business Today!
        </h2>

        <div className="space-y-6">
          <p className="text-base sm:text-lg leading-relaxed">
            Join thousands of successful event organizers who have transformed
            their business with EventWizz. Our platform provides everything you
            need to manage and grow your events.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className={statCard}>
              <div className={statNumber}>15M+</div>
              <div className={statLabel}>Tickets Sold</div>
            </div>
            <div className={statCard}>
              <div className={statNumber}>$500M</div>
              <div className={statLabel}>Revenue Generated</div>
            </div>
            <div className={statCard}>
              <div className={statNumber}>10K+</div>
              <div className={statLabel}>Active Vendors</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium">
              Trusted by over 50,000 organizers worldwide
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- LOGIN ---------------- */
  if (isLogin) {
    return (
      <div className="space-y-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-text)] leading-tight">
          Welcome Back to {siteName}
        </h2>

        <div className="space-y-6">
          <p className="text-base sm:text-lg text-[var(--color-text)] leading-relaxed">
            Your one-stop platform for seamless event management. Access your
            dashboard, track sales, and manage your events with ease.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className={statCard}>
              <div className={statNumber}>500+</div>
              <div className={statLabel}>Events Daily</div>
            </div>
            <div className={statCard}>
              <div className={statNumber}>98%</div>
              <div className={statLabel}>Success Rate</div>
            </div>
            <div className={statCard}>
              <div className={statNumber}>24/7</div>
              <div className={statLabel}>Support</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[var(--color-text)]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium">
              Trusted by over 50,000 organizers worldwide
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- DEFAULT ---------------- */
  return (
    <div className="space-y-8">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-text)] leading-tight">
        Welcome to {siteName}
      </h2>

      <div className="space-y-6">
        <p className="text-base sm:text-lg text-[var(--color-text)] leading-relaxed">
          The complete platform for event management and ticketing. Join us to
          create, manage, and grow your events with ease.
        </p>
      </div>
    </div>
  );
}
