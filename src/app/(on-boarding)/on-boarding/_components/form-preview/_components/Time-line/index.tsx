import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const itemsPerView = 5;
  const slideStep = 1; // Number of items to slide at once
  const maxIndex = Math.max(0, displaySchedules.length - itemsPerView);

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      // Smooth sliding with animation
      const next = Math.min(prev + slideStep, maxIndex);
      return next;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      // Smooth sliding with animation
      const next = Math.max(prev - slideStep, 0);
      return next;
    });
  };

  // Use all items instead of slicing for smoother transitions
  const allItems = displaySchedules;

  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default scroll behavior
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default scroll behavior
    if (touchStart) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isSignificantSwipe = Math.abs(distance) > 30; // Reduced threshold for better responsiveness

    if (isSignificantSwipe) {
      if (distance > 0 && currentIndex < maxIndex) {
        // Swipe left, go next
        nextSlide();
      } else if (distance < 0 && currentIndex > 0) {
        // Swipe right, go previous
        prevSlide();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle mouse events for drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default behavior
    setTouchStart(e.clientX);
    setIsDragging(true);

    // Add global event listeners for better dragging
    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && touchStart) {
      setTouchEnd(e.clientX);
    }
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (isDragging && touchStart) {
      setTouchEnd(e.clientX);
    }
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  const handleGlobalMouseUp = () => {
    handleTouchEnd();
    // Clean up global event listeners
    document.removeEventListener("mousemove", handleGlobalMouseMove);
    document.removeEventListener("mouseup", handleGlobalMouseUp);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      // Don't end dragging on mouse leave - it will be handled by global handlers
    }
  };

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, touchStart, handleGlobalMouseMove, handleGlobalMouseUp]);

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
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="absolute left-0 sm:-left-8 md:-left-16 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed z-20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={24} strokeWidth={3} className="sm:w-8 sm:h-8" />
          </button>

          {/* Timeline */}
          <div className="relative flex items-center w-full overflow-hidden sm:px-0">
            {/* Timeline line with tick marks - hide on very small screens */}
            <div className="absolute top-8 sm:top-10 left-14 right-14 z-10 hidden sm:block">
              {/* Main horizontal line */}
              <div className="w-full h-px bg-white"></div>

              {/* Dense tick marks - railroad track pattern */}
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-px h-2 bg-white"
                  style={{
                    left: `${(i * 100) / 59}%`,
                    top: "-4px",
                  }}
                ></div>
              ))}
            </div>

            {/* Timeline Items - with smooth transitions */}
            <div className="relative w-full overflow-hidden px-2">
              <div
                ref={sliderRef}
                className={`flex items-start relative z-20 gap-2 sm:gap-4 md:gap-6 ${
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                } select-none touch-none`}
                style={{
                  transform:
                    touchStart && touchEnd
                      ? `translateX(calc(-${
                          currentIndex * (100 / itemsPerView)
                        }% + ${touchEnd - touchStart}px))`
                      : `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                  transition: isDragging ? "none" : "transform 0.5s ease-out",
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                {allItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center justify-center text-center flex-shrink-0"
                    style={{
                      width: `${100 / itemsPerView}%`,
                      minWidth: "140px",
                      maxWidth: "200px",
                    }}
                  >
                    {/* Time Circle - smaller on mobile */}
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

                    {/* Title - with proper text wrapping and truncation */}
                    <p className="text-white text-xs sm:text-sm leading-tight font-medium break-words line-clamp-3 px-1 w-full">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={nextSlide}
            disabled={currentIndex >= maxIndex}
            className="absolute right-0 sm:-right-8 md:-right-16 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed z-20 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={24} strokeWidth={3} className="sm:w-8 sm:h-8" />
          </button>
        </div>
      </div>
    </section>
  );
}
