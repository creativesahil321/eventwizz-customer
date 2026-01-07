import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import Image from "next/image";

type EventScheduler = {
  id?: string;
  title: string;
  time: string;
};

type EventSchedulerProps = {
  eventSchedularTitle?: string;
  eventSchedular: EventScheduler[] | null | undefined;
  eventSchedularBackgroundImage?: string | null;
};

export default function Timeline({
  eventSchedular,
  eventSchedularTitle,
  eventSchedularBackgroundImage,
}: EventSchedulerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ensure eventSchedular is always an array
  const safeEventSchedular = Array.isArray(eventSchedular)
    ? eventSchedular
    : [];

  const filterSchedules = safeEventSchedular
    .map((item) => ({
      ...item,
      title: item.title.trim(),
      time: item.time.trim(),
    }))
    .filter((item) => item.title || item.time);

  const hasValidSchedules = filterSchedules.length > 0;

  const displaySchedules = hasValidSchedules
    ? filterSchedules
    : [
        { time: "7:30pm", title: "Pre-Dinner Reception Commences" },
        { time: "8:30pm", title: "Table Drinks Served" },
        { time: "8:30pm", title: "Dinner Served" },
        { time: "10:30pm", title: "All-Inclusive House Bar Opens" },
        { time: "12:30am", title: "All-Inclusive House Bar Closes" },
      ];

  const formatTime = (time: string) => {
    if (!time || time === "TBD") return "TBD";
    if (
      time.toLowerCase().includes("am") ||
      time.toLowerCase().includes("pm")
    ) {
      return time.toUpperCase();
    }

    try {
      const [hours, minutes] = time.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
    } catch {
      return time;
    }
  };

  // Smooth scroll navigation
  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 300; // Pixels to scroll
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft +
      (direction === "right" ? scrollAmount : -scrollAmount);

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  };

  return (
    <section className="w-full py-10 sm:py-16 px-2 sm:px-4 relative overflow-hidden bg-black">
      {eventSchedularBackgroundImage && (
        <div className="w-full h-full absolute top-0 left-0">
          <Image
            src={eventSchedularBackgroundImage}
            alt="Event Scheduler Background Image"
            fill
            className="object-cover opacity-30 z-0"
          />
        </div>
      )}

      <div className="relative max-w-7xl mx-auto overflow-hidden">
        <div className="text-center mb-8 sm:mb-16 z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            {eventSchedularTitle || "The Night"}
          </h2>
        </div>
        <div className="flex items-center justify-center relative">
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 sm:-left-8 md:-left-16 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-20 flex items-center justify-center transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} strokeWidth={3} className="sm:w-8 sm:h-8" />
          </button>

          {/* Timeline Container - Native Scroll */}
          <div className="relative w-full">
            {/* Timeline line with tick marks - visible on all screens */}
            <div className="absolute top-[30px] sm:top-10 left-14 right-14 z-10 pointer-events-none">
              {/* Main horizontal line */}
              <div className="w-full h-[2px] bg-white opacity-70"></div>

              {/* Elegant tick marks - cleaner pattern */}
              <div className="absolute inset-0">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[2px] h-3 bg-white opacity-50"
                    style={{
                      left: `${(i * 100) / 11}%`,
                      top: "-5px",
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Scrollable Timeline Items */}
            <div
              ref={scrollContainerRef}
              className="flex items-start gap-4 sm:gap-6 md:gap-8 overflow-x-auto scroll-smooth px-4 sm:px-8 md:px-14 py-2 no-scrollbar relative z-20 overflow-y-visible"
            >
              {displaySchedules.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center text-center flex-shrink-0"
                  style={{
                    minWidth: "140px",
                    maxWidth: "180px",
                  }}
                >
                  {/* Time Circle */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white text-black flex items-center justify-center shadow-lg mb-4 sm:mb-6 relative z-30 flex-shrink-0">
                    <div className="text-center px-1">
                      <div className="text-xs sm:text-sm md:text-base font-bold leading-tight break-words">
                        {formatTime(item.time).split(" ")[0]}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold leading-tight">
                        {formatTime(item.time).split(" ")[1] || ""}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <p className="text-white text-xs sm:text-sm leading-tight font-medium break-words line-clamp-3 px-1 w-full">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 sm:-right-8 md:-right-16 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-20 flex items-center justify-center transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={24} strokeWidth={3} className="sm:w-8 sm:h-8" />
          </button>
        </div>
      </div>
    </section>
  );
}
