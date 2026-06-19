"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const themeAccent = {
  text: { color: "var(--color-primary, #3b82f6)" } as React.CSSProperties,
  iconBox: {
    backgroundColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 30%, transparent)",
  } as React.CSSProperties,
  progress: {
    background: "linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))",
  } as React.CSSProperties,
  activeStep: {
    backgroundColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 40%, transparent)",
  } as React.CSSProperties,
  activeDot: { backgroundColor: "var(--color-primary, #3b82f6)" } as React.CSSProperties,
};

const GENERATION_STEPS = [
  { label: "Analyzing event details", duration: 2000 },
  { label: "Crafting banner headlines", duration: 2500 },
  { label: "Writing event descriptions", duration: 3000 },
  { label: "Creating packages & pricing", duration: 2500 },
  { label: "Generating menus & other packages", duration: 2000 },
  { label: "Writing FAQs", duration: 1500 },
  { label: "Finalizing your event", duration: 2000 },
];

interface AIEventGeneratingProps {
  eventName: string;
}

export default function AIEventGenerating({ eventName }: AIEventGeneratingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepDuration = GENERATION_STEPS[currentStep]?.duration || 2000;
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const target = ((currentStep + 1) / GENERATION_STEPS.length) * 100;
        return prev < target ? Math.min(prev + 0.5, target) : prev;
      });
    }, 50);

    const stepTimer = setTimeout(() => {
      if (currentStep < GENERATION_STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    }, stepDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stepTimer);
    };
  }, [currentStep]);

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen w-full px-4 py-8 sm:px-6 overflow-y-auto">
      <div className="text-center max-w-lg mx-auto w-full">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border flex items-center justify-center mx-auto mb-6 sm:mb-8"
          style={themeAccent.iconBox}
        >
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" style={themeAccent.text} />
        </motion.div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Creating your event…
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mb-6 sm:mb-8 break-words">
          Generating professional content for{" "}
          <span className="font-medium" style={themeAccent.text}>{eventName}</span>
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-sm mx-auto mb-4 sm:mb-6">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={themeAccent.progress}
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <p className="text-slate-600 text-xs mt-2 text-right">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-2 max-w-sm mx-auto text-left">
          {GENERATION_STEPS.map((genStep, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: index <= currentStep ? 1 : 0.3, x: 0 }}
              transition={{ delay: index * 0.15, duration: 0.3 }}
              className="flex items-center gap-3 min-h-[44px]"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  index < currentStep
                    ? "bg-green-500/20 border border-green-500/40"
                    : index === currentStep
                      ? "border"
                      : "bg-white/5 border border-white/10"
                }`}
                style={index === currentStep ? themeAccent.activeStep : undefined}
              >
                {index < currentStep ? (
                  <span className="text-green-400 text-[10px]">✓</span>
                ) : index === currentStep ? (
                  <motion.div
                    animate={{ scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full"
                    style={themeAccent.activeDot}
                  />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </div>
              <span
                className={`text-xs transition-colors duration-300 ${
                  index < currentStep
                    ? "text-green-400/80"
                    : index === currentStep
                      ? ""
                      : "text-slate-600"
                }`}
                style={index === currentStep ? themeAccent.text : undefined}
              >
                {genStep.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
