// Static import — injects <script src="https://js.stripe.com/v3/" async> into <head>
// as soon as this module is loaded (before first render), satisfying Stripe's
// "load Stripe.js early" optimisation recommendation.
// @see https://docs.stripe.com/sdks/stripejs-esmodule
import { loadStripe, type Stripe } from "@stripe/stripe-js";

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

/**
 * Return (or create) a cached Stripe instance for the given publishable key.
 * Call this as soon as the key is known — the static import above already injected
 * the Stripe.js script, so this only needs to resolve the constructor.
 */
export function getStripePromise(
  publishableKey: string,
): Promise<Stripe | null> {
  const cached = stripePromiseCache.get(publishableKey);
  if (cached) return cached;

  const promise = loadStripe(publishableKey);
  stripePromiseCache.set(publishableKey, promise);
  return promise;
}

/** Warm up Stripe.js DNS/TCP connection on checkout page mount (belt-and-suspenders). */
export function preconnectStripeJs(): void {
  if (typeof document === "undefined") return;

  const origin = "https://js.stripe.com";
  if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
    return;
  }

  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = origin;
  document.head.appendChild(preconnect);

  const dnsPrefetch = document.createElement("link");
  dnsPrefetch.rel = "dns-prefetch";
  dnsPrefetch.href = origin;
  document.head.appendChild(dnsPrefetch);
}

/**
 * @deprecated The static top-level import in this module already injects Stripe.js.
 * Kept as a no-op so existing call sites don't break.
 */
export function preloadStripeModule(): void {
  // no-op — script injection now happens at module-load time via the static import above
}
