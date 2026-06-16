import { getRoomFloatingAccent } from "@/lib/room-accent-palette";

/** Lovable-style room tone palette (emerald / violet alternating). */
export const CHECKOUT_LOVABLE_ROOM_TONES = [
  {
    id: "emerald" as const,
    dot: getRoomFloatingAccent(0).dot,
    iconInactive: "bg-emerald-50 text-emerald-600",
    calendarIcon: "bg-emerald-50 text-emerald-700",
    tabInactive:
      "border-[color:var(--checkout-border)] bg-white text-[color:var(--checkout-foreground)] hover:border-[color:var(--checkout-brand-accent)]/30",
    subtotalInactive: "text-[color:var(--checkout-brand-accent)] font-bold",
  },
  {
    id: "violet" as const,
    dot: getRoomFloatingAccent(2).dot,
    iconInactive: "bg-violet-50 text-violet-600",
    calendarIcon: "bg-violet-50 text-violet-700",
    tabInactive:
      "border-[color:var(--checkout-brand-accent)]/20 bg-white text-[color:var(--checkout-foreground)] hover:border-[color:var(--checkout-brand-accent)]/40",
    subtotalInactive: "text-[color:var(--checkout-brand-accent)] font-bold",
  },
] as const;

export type CheckoutRoomTone = (typeof CHECKOUT_LOVABLE_ROOM_TONES)[number];

export function getCheckoutRoomTone(index: number): CheckoutRoomTone {
  return CHECKOUT_LOVABLE_ROOM_TONES[index % CHECKOUT_LOVABLE_ROOM_TONES.length];
}
