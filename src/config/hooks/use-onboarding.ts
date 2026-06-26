import { usePathname } from "next/navigation";

export function useOnboarding() {
  const pathname = usePathname();
  const isOnboarding = pathname?.includes("/on-boarding");

  return {
    isOnboarding,
    textColorClass: isOnboarding ? "text-black" : "",
    onboardingTextClass: isOnboarding ? "onboarding-text" : "",
  };
}
