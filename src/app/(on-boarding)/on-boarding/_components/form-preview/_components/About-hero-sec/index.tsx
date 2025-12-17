import { Button } from "@/components/ui/button";
import React, { useState } from "react";

type AboutHeroSectionProps = {
  title?: string;
  description?: string;
  link?: string;
  link_title?: string;
};

function AboutHeroSection({
  title,
  description,
  link,
  link_title,
}: AboutHeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Trigger layout calculations after component mounts
  React.useEffect(() => {
    setIsLoaded(true);
  }, []);
  // Apply a CSS class based on loading state
  const containerClass = isLoaded
    ? "w-full py-10 text-black transition-opacity duration-300 opacity-100"
    : "w-full py-10 text-black opacity-0";

  return (
    <section className={containerClass}>
      <div className="flex flex-col md:flex-row items-center justify-center px-2 md:px-5 gap-y-6 md:gap-y-0 md:gap-x-6">
        <div className="w-full md:w-1/2 px-4 md:px-10 mb-4 md:mb-0">
          <h2
            className="text-2xl md:text-3xl font-bold text-center break-words"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            {title || "e.g. Experience more Stock Brook Events"}
          </h2>
        </div>
        <div className="w-full md:w-1/2 px-4 md:px-10">
          <div
            className="text-sm prose prose-sm max-w-full break-words whitespace-normal overflow-hidden mb-4"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            dangerouslySetInnerHTML={{
              __html:
                description ||
                "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ullamcorper feugiat fringilla.</p>",
            }}
          />
          <Button
            data-link={link || ""}
            className="mt-4 mb-3 inline-block border border-foreground text-sm rounded-full px-4 py-2"
          >
            {link_title ? link_title : "View all our events"}
          </Button>
        </div>
      </div>
    </section>
  );
}

// Export as memoized component to prevent unnecessary re-renders
export default React.memo(AboutHeroSection);
