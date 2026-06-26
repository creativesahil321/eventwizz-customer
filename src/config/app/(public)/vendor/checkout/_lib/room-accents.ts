/** Shared room accent palette for checkout room UI. */
export const CHECKOUT_ROOM_ACCENTS = [
  {
    dot: "bg-violet-500",
    iconGradient: "from-violet-500 to-indigo-600",
    tabBottom: "border-b-[3px] border-violet-500",
    calendarGradient: "from-violet-400 to-indigo-500",
    dateHeaderExpanded: "bg-violet-50/80",
  },
  {
    dot: "bg-teal-500",
    iconGradient: "from-teal-400 to-cyan-500",
    tabBottom: "border-b-[3px] border-teal-500",
    calendarGradient: "from-teal-400 to-cyan-500",
    dateHeaderExpanded: "bg-teal-50/80",
  },
  {
    dot: "bg-amber-500",
    iconGradient: "from-amber-400 to-orange-500",
    tabBottom: "border-b-[3px] border-amber-500",
    calendarGradient: "from-amber-400 to-orange-500",
    dateHeaderExpanded: "bg-amber-50/80",
  },
  {
    dot: "bg-rose-500",
    iconGradient: "from-rose-400 to-pink-500",
    tabBottom: "border-b-[3px] border-rose-500",
    calendarGradient: "from-rose-400 to-pink-500",
    dateHeaderExpanded: "bg-rose-50/80",
  },
  {
    dot: "bg-blue-500",
    iconGradient: "from-blue-400 to-sky-500",
    tabBottom: "border-b-[3px] border-blue-500",
    calendarGradient: "from-blue-400 to-sky-500",
    dateHeaderExpanded: "bg-blue-50/80",
  },
] as const;

export function getCheckoutRoomAccent(index: number) {
  return CHECKOUT_ROOM_ACCENTS[index % CHECKOUT_ROOM_ACCENTS.length];
}
