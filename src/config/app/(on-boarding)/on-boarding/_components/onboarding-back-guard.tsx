"use client";

import { useEffect } from "react";

/**
 * bfcache only: browser Back can restore `/on-boarding` without hitting the
 * server layout gate. Reload so `(on-boarding)/layout` runs again.
 */
export default function OnboardingBackGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
