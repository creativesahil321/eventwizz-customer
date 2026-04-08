import { Button } from "@/components/ui/button";
import { ArrowRight, Link } from "lucide-react";
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
    ? "w-full py-10 bg-[color:var(--color-background)] text-[color:var(--color-text)] transition-opacity duration-300 opacity-100"
    : "w-full py-10 bg-[color:var(--color-background)] text-[color:var(--color-text)] opacity-0";

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
        <div className="w-full flex flex-col gap-6">
          <p
            className="text-base md:text-lg text-[var(--color-text-dimmed)]"
            dangerouslySetInnerHTML={{
              __html:
                description ||
                "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ullamcorper feugiat fringilla.</p>",
            }}
          />
          <Link
            href={link || ""}
            className="inline-flex items-center font-medium border-b border-[var(--color-text)]/35 pb-1 hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)] transition-colors w-fit"
          >
            {link_title ? link_title : "e.g. Learn more"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// Export as memoized component to prevent unnecessary re-renders
export default React.memo(AboutHeroSection);
