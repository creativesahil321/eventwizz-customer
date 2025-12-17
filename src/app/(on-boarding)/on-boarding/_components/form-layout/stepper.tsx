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
import Image from "next/image";
import { ServerContext } from "@/lib/server-context";
import { useContext } from "react";

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

export default function Stepper({ activeStep }: { activeStep: number }) {
  const { setActiveStep, lastCompletedStep } = useFormContext();
  const { theme } = useContext(ServerContext);
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https")
      ? theme.logo
      : "/assets/images/logos/eventwizz-mini-logo.png";

  return (
    <div className="bg-[#12023e] backdrop-blur-md bg-opacity-90 border-b border-white/10 py-5">
      <div className="relative">
        {/* Main Site Logo - Left Side - Absolute positioned to break out of container */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 pl-6 z-10">
          <Image
            src={logoPath}
            alt="EventWizz Logo"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>

        {/* Main container for stepper and right side */}
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Stepper - Center */}
          <div className="relative flex justify-center items-start space-x-6 flex-1 px-6">
            {/* Background base line */}
            <div className="absolute top-[22px] left-6 right-6 h-[3px] bg-gray-600 z-0" />

            {/* Progress filled line */}
            <div
              className="absolute top-[22px] left-6 h-[3px] bg-green-500 z-10 transition-all duration-500"
              style={{
                width: `calc(${
                  ((activeStep - 1) / (steps.length - 1)) * 100
                }% + ${100 / steps.length / 2}%)`,
              }}
            />

            {steps.map((step) => {
              const isCompleted = step.id <= lastCompletedStep; // Use lastCompletedStep here
              const isCurrent = step.id === activeStep;

              const handleClick = async () => {
                if (isCompleted || step.id === activeStep) {
                  await setActiveStep(step.id);
                }
              };

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center relative z-20 min-w-[80px]"
                >
                  <div
                    onClick={handleClick}
                    role={isCompleted ? "button" : undefined}
                    tabIndex={isCompleted ? 0 : -1}
                    aria-disabled={!isCompleted && step.id !== activeStep}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ease-in-out transform",
                      isCompleted
                        ? "bg-green-500 text-white border-green-500 hover:brightness-110 hover:scale-110 cursor-pointer"
                        : isCurrent
                        ? "bg-white text-green-600 border-green-500 shadow hover:scale-110 cursor-pointer"
                        : "bg-[#1c1c4d] text-gray-400 border-gray-600 cursor-not-allowed"
                    )}
                  >
                    {step.icon}
                  </div>
                  <div className="text-center mt-2 w-20">
                    <p
                      className={cn(
                        "text-xs font-medium leading-snug",
                        isCurrent || isCompleted
                          ? "text-white"
                          : "text-gray-400"
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side - Empty for now, can be used for future elements */}
          <div className="flex-shrink-0 w-32 pr-6"></div>
        </div>
      </div>
    </div>
  );
}
