"use client";

import {
  MapPin,
  PartyPopper,
  Package,
  CalendarDays,
  Utensils,
  Wine,
  Info,
  HelpCircle,
  CreditCard,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FaSitemap } from "react-icons/fa";
import { useFormContext } from "../form-provider";
import Link from "next/link";
import { ServerContext } from "@/lib/server-context";
import { useContext } from "react";
import { addCacheBusting } from "@/lib/image-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const steps = [
  { id: 1, label: "Venue", icon: <MapPin size={16} /> },
  { id: 2, label: "Site", icon: <FaSitemap size={16} /> },
  { id: 3, label: "Event", icon: <PartyPopper size={16} /> },
  { id: 4, label: "Package", icon: <Package size={16} /> },
  { id: 5, label: "Dates", icon: <CalendarDays size={16} /> },
  { id: 6, label: "Catering", icon: <Utensils size={16} /> },
  { id: 7, label: "Other Packages", icon: <Wine size={16} /> },
  { id: 8, label: "Brochure info", icon: <Info size={16} /> },
  { id: 9, label: "FAQs", icon: <HelpCircle size={16} /> },
  { id: 10, label: "Payment", icon: <CreditCard size={16} /> },
  { id: 11, label: "Publish", icon: <UploadCloud size={16} /> },
];

const stepTooltips: Record<number, string> = {
  1: "Core venue details and contact information.",
  2: "Site branding, hero banner, and about section.",
  3: "Event identity, banner media, story, and schedule.",
  4: "Package copy, image, details, and gallery.",
  5: "Dates, tickets, tables, and payment rules.",
  6: "Catering and menu information.",
  7: "Drinks and add-on packages.",
  8: "Brochure and location for collateral.",
  9: "Frequently asked questions.",
  10: "Payment provider connections.",
  11: "Final review and publish.",
};

export default function Stepper({ activeStep }: { activeStep: number }) {
  const { setActiveStep, lastCompletedStep } = useFormContext();
  const { theme } = useContext(ServerContext);
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https") ||
    theme?.logo?.startsWith("blob")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";

  return (
    <TooltipProvider delayDuration={300}>
    <div className="relative bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06] py-5">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(90deg, var(--color-primary, #3b82f6) 0%, var(--color-secondary, #8b5cf6) 100%)`,
        }}
      />
      <div className="relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 pl-4 md:pl-6 z-10 pr-4 md:pr-6">
          <Link href="/" aria-label="Home">
            <img
              src={addCacheBusting(logoPath as string)}
              alt={theme?.name || "EventWizz"}
              width={110}
              height={30}
              className="h-5 md:h-6 lg:h-11 xl:h-13 w-auto object-contain max-w-[85px] md:max-w-[95px] lg:max-w-[130px] cursor-pointer hover:opacity-80 transition-opacity [filter:drop-shadow(0_0_1px_white)_drop-shadow(0_0_5px_rgba(255,255,255,0.6))_drop-shadow(0_0_12px_rgba(255,255,255,0.3))]"
            />
          </Link>
        </div>

        <div className="flex items-center justify-between max-w-7xl mx-auto pl-28 md:pl-32 lg:pl-36 xl:pl-40 pr-4">
          <div className="relative flex-1 overflow-x-auto overflow-y-visible no-scrollbar">
            <div className="relative flex justify-center items-start space-x-2 md:space-x-3 lg:space-x-4 min-w-max px-4 md:px-6 mt-2">
              <div className="absolute top-[22px] left-4 md:left-6 right-4 md:right-6 h-[2px] bg-white/[0.08] z-0 rounded-full" />

              <div
                className="absolute top-[22px] left-4 md:left-6 h-[2px] z-10 transition-all duration-700 ease-out rounded-full"
                style={{
                  width: `calc(${
                    ((activeStep - 1) / (steps.length - 1)) * 100
                  }% + ${100 / steps.length / 2}%)`,
                  background: `linear-gradient(90deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
                  boxShadow: `0 0 12px color-mix(in srgb, var(--color-primary, #3b82f6) 40%, transparent)`,
                }}
              />

              {steps.map((step) => {
                const isCurrent = step.id === activeStep;
                const isReachable =
                  step.id <= lastCompletedStep || step.id === activeStep;
                const isPast = step.id < activeStep;
                /** Ahead on the line but user can still jump back (e.g. lastCompletedStep ahead of active) */
                const isAheadUnlocked =
                  step.id > activeStep && step.id <= lastCompletedStep;

                const handleClick = async () => {
                  if (isReachable) {
                    await setActiveStep(step.id);
                  }
                };

                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center relative z-20 min-w-[70px] md:min-w-[80px] flex-shrink-0"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                    <div
                      onClick={handleClick}
                      role={isReachable ? "button" : undefined}
                      tabIndex={isReachable ? 0 : -1}
                      aria-current={isCurrent ? "step" : undefined}
                      aria-label={
                        isCurrent
                          ? `${step.label} (current step)`
                          : step.label
                      }
                      aria-disabled={!isReachable}
                      className={cn(
                        "flex items-center justify-center rounded-full border-2 transition-all duration-300 ease-in-out transform",
                        isCurrent
                          ? "z-30 h-11 w-11 cursor-pointer text-white ring-2 ring-[var(--color-primary,#3b82f6)] ring-offset-2 ring-offset-slate-950 scale-110 shadow-[0_0_28px_color-mix(in_srgb,var(--color-primary,#3b82f6)_55%,transparent)] hover:scale-[1.14]"
                          : isPast
                            ? "h-10 w-10 cursor-pointer text-white hover:brightness-110 hover:scale-105 opacity-90 hover:opacity-100"
                            : isAheadUnlocked
                              ? "h-10 w-10 cursor-pointer border-[var(--color-primary,#3b82f6)]/60 bg-slate-900/90 text-[var(--color-primary,#7dd3fc)] hover:scale-105 hover:border-[var(--color-primary,#3b82f6)]"
                              : "h-10 w-10 bg-slate-900/80 text-slate-500 border-slate-700/50 cursor-not-allowed",
                      )}
                      style={
                        isCurrent
                          ? {
                              background: `linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
                              borderColor: `color-mix(in srgb, white 35%, var(--color-primary, #3b82f6))`,
                            }
                          : isPast
                            ? {
                                background: `linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
                                borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 70%, transparent)`,
                                boxShadow: `0 0 10px color-mix(in srgb, var(--color-primary, #3b82f6) 18%, transparent)`,
                              }
                            : undefined
                      }
                    >
                      {step.icon}
                    </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-[220px] border border-white/10 bg-slate-900 text-slate-100 text-xs"
                      >
                        <span
                          className={cn(
                            "font-medium",
                            isCurrent
                              ? "text-[var(--color-primary,#7dd3fc)]"
                              : "text-white",
                          )}
                        >
                          {step.label}
                          {isCurrent ? (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary,#93c5fd)]">
                              · You are here
                            </span>
                          ) : null}
                        </span>
                        <p className="text-slate-400 mt-1 leading-snug">
                          {stepTooltips[step.id] ?? ""}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="text-center mt-2 w-20">
                      <p
                        className={cn(
                          "text-xs font-medium leading-snug transition-colors",
                          isCurrent &&
                            "font-semibold text-[var(--color-primary,#93c5fd)] drop-shadow-[0_0_8px_color-mix(in_srgb,var(--color-primary,#3b82f6)_40%,transparent)]",
                          !isCurrent &&
                            (isPast || isAheadUnlocked) &&
                            "text-white/90",
                          !isCurrent &&
                            !isPast &&
                            !isAheadUnlocked &&
                            "text-slate-500",
                        )}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
