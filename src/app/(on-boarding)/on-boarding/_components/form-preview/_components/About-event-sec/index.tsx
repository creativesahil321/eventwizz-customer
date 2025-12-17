import { useState, useEffect } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";

interface AboutEventSecProps {
  about_event_heading?: string;
  about_event_sub_heading?: string;
  about_event_description?: string;
}

export default function AboutEventSec({
  about_event_heading,
  about_event_description,
  about_event_sub_heading,
}: AboutEventSecProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { textColorClass } = useOnboarding();

  // Use effect to handle client-side initialization
  useEffect(() => {
    // Mark as loaded and trigger smooth appearance
    setIsLoaded(true);
  }, []);

  // Apply transition classes
  const sectionClass = isLoaded
    ? "w-full py-8 px-2 transition-opacity duration-300 opacity-100"
    : "w-full py-8 px-2 opacity-0";

  return (
    <section className={sectionClass}>
      <div className="flex flex-col my-6 justify-center items-center text-center max-w-full">
        <h3 className={`text-lg pb-3 px-2 break-words ${textColorClass}`}>
          {about_event_sub_heading || "Fantastic Nights Of Fun For The Girls."}
        </h3>
        <h2 className={`text-3xl font-bold px-2 break-words ${textColorClass}`}>
          {about_event_heading || "Lipstick, Powder & Paint"}
        </h2>
        <div
          className={`text-sm prose prose-sm py-3 px-2 max-w-3xl break-words whitespace-normal overflow-hidden ${textColorClass}`}
          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          dangerouslySetInnerHTML={{
            __html:
              about_event_description ||
              "<p>If you are looking for a great ladies fun night out, with all the entertainment, Cosmopolitan reception drink, prosecco, three-course dinner and dancing till 1am, then you need look no further! Stock Brook Country Club has the perfect answer for a great night out with the girls.</p><p>Check out the latest dates to be released, but get in quick as these dates will soon go!!</p>",
          }}
        />
      </div>
    </section>
  );
}
