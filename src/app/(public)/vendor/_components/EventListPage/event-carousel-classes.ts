import { cn } from "@/lib/utils";

/** Lovable-style dark glass circular prev/next on event sliders */
export function eventCarouselNavButtonClass(extra?: string) {
  return cn(
    "size-9 border-0 bg-black/45 text-white shadow-md backdrop-blur-md",
    "hover:bg-black/60 hover:text-white",
    "disabled:pointer-events-none disabled:opacity-25",
    "[&_svg]:size-4 [&_svg]:text-white [&_svg]:stroke-[2.5]",
    extra,
  );
}
