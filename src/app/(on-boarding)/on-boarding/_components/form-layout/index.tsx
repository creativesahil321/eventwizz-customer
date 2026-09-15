"use client";

import React, { useMemo, lazy, Suspense, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormContext } from "../form-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import PreviewContainer from "../form-preview";
import { useMediaQuery } from "@/hooks/use-media-query";
import Stepper from "./stepper";
import { Button } from "@/components/ui/button";
import { ChevronsLeftRight } from "lucide-react";
import { useWatch } from "react-hook-form";

function StepTransition({
  stepKey,
  children,
}: {
  stepKey: number;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Lazy load step components
const StepOne = lazy(() => import("../steps/step-1"));
const StepTwo = lazy(() => import("../steps/step-2"));
const StepThree = lazy(() => import("../steps/step-3"));
const StepFour = lazy(() => import("../steps/step-4"));
const StepFive = lazy(() => import("../steps/step-5"));
const StepSix = lazy(() => import("../steps/step-6"));
const StepSeven = lazy(() => import("../steps/step-7"));
const StepEight = lazy(() => import("../steps/step-8"));
const StepNine = lazy(() => import("../steps/step-9"));
const StepTen = lazy(() => import("../steps/step-10"));
const StepEleven = lazy(() => import("../steps/step-11"));

const StepLoader = () => (
  <div className="w-full max-w-md animate-fadeIn">
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      <div className="mb-6">
        <Skeleton className="h-7 w-2/3 rounded-lg bg-white/10" />
      </div>
      {[1, 2, 3].map((field, index) => (
        <div
          key={field}
          className="space-y-2 mb-6"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <Skeleton className="h-4 w-1/4 rounded-md bg-white/10" />
          <Skeleton className="h-10 w-full rounded-lg bg-white/5" />
        </div>
      ))}
      <div className="flex justify-center mt-8">
        <Skeleton className="h-11 w-40 rounded-full bg-white/10" />
      </div>
    </div>
  </div>
);

const stepComponents = {
  1: StepOne,
  2: StepTwo,
  3: StepThree,
  4: StepFour,
  5: StepFive,
  6: StepSix,
  7: StepSeven,
  8: StepEight,
  9: StepNine,
  10: StepTen,
  11: StepEleven,
};

const FORM_SIDEBAR_ID = "onboarding-form-sidebar";

/** Build a `[name="…"]` selector that is safe for field names with special chars. */
function fieldNameSelector(field: string): string {
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(field)
      : field.replace(/["\\]/g, "\\$&");
  return `[name="${escaped}"]`;
}

const splitLayoutSteps = new Set([2, 3, 4, 5, 6, 7, 8, 9]);
const centeredSteps = new Set([1, 6, 11, 10]);
const fullScreenCenteredSteps = new Set([4]); // Remove step 1 from full screen centered
/** Tall centered steps need natural scroll + top padding (like step 1), not fixed-height justify-center. */
const naturalScrollCenteredSteps = new Set([1, 10, 11]);

const SplitLayout = React.memo(
  ({
    step: Step,
    defaultCollapsed = false,
  }: {
    step: React.ComponentType;
    defaultCollapsed?: boolean;
  }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(defaultCollapsed);
    const { activeStep, formFieldFocusRequest } = useFormContext();

    const toggleSidebar = () => {
      setIsSidebarCollapsed((prev) => !prev);
    };

    // A preview "Edit …" click asks us to reveal the matching form field. Open the
    // panel (if collapsed) then scroll/focus the field — retrying briefly so a step
    // switch that lazy-mounts a new step still lands on the right control.
    useEffect(() => {
      if (!formFieldFocusRequest) return;
      setIsSidebarCollapsed(false);

      const { field } = formFieldFocusRequest;
      let cancelled = false;
      let attempts = 0;
      let timer: number | undefined;

      const tryFocus = () => {
        if (cancelled) return;
        const sidebar = document.getElementById(FORM_SIDEBAR_ID);
        const el = sidebar?.querySelector<HTMLElement>(fieldNameSelector(field));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const focusable =
            (el instanceof HTMLInputElement && el.type !== "file") ||
            el instanceof HTMLTextAreaElement ||
            el instanceof HTMLSelectElement;
          if (focusable) el.focus({ preventScroll: true });
          return;
        }
        if (attempts++ < 12) {
          timer = window.setTimeout(tryFocus, 60);
        }
      };

      // Let React expand the panel + mount the step before the first lookup.
      timer = window.setTimeout(tryFocus, 80);
      return () => {
        cancelled = true;
        if (timer) window.clearTimeout(timer);
      };
    }, [formFieldFocusRequest]);

    return (
      <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {!isSidebarCollapsed && <Stepper activeStep={activeStep} />}

        <section className="flex w-full h-screen overflow-hidden relative isolate">
          <aside
            id={FORM_SIDEBAR_ID}
            className={`onboarding-dark relative z-20 shrink-0 transition-all duration-500 ease-in-out overflow-hidden ${
              isSidebarCollapsed
                ? "w-0 min-w-0 max-w-0 ml-0 opacity-0 pointer-events-none"
                : "shrink-0 w-[42%] min-w-[280px] max-w-[36rem] ml-2 opacity-100 pr-2"
            }`}
          >
            <ScrollArea className="h-[calc(100vh-40px)] w-full min-w-0 [&_[data-slot=scroll-area-viewport]]:block [&_[data-slot=scroll-area-viewport]]:h-full">
              <Suspense fallback={<StepLoader />}>
                <StepTransition stepKey={activeStep}>
                  <Step />
                </StepTransition>
              </Suspense>
            </ScrollArea>
          </aside>

          {/* Expand/collapse: sits on the seam between form and preview (not screen left edge) */}
          <div className="pointer-events-none relative z-[60] w-0 shrink-0 self-stretch">
            <Button
              type="button"
              variant="event-primary"
              size="icon"
              onClick={toggleSidebar}
              title={
                isSidebarCollapsed ? "Expand form panel" : "Collapse form panel"
              }
              aria-expanded={!isSidebarCollapsed}
              aria-controls="onboarding-form-sidebar"
              aria-label={
                isSidebarCollapsed ? "Expand form panel" : "Collapse form panel"
              }
              className="pointer-events-auto absolute top-1/2 left-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full p-0 shadow-[0_2px_12px_rgba(0,0,0,0.35)] ring-1 ring-white/20 transition-[transform,box-shadow] duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <ChevronsLeftRight className="h-5 w-5 shrink-0 opacity-95" />
            </Button>
          </div>

          <main className="relative z-10 min-w-0 flex-1 overflow-hidden transition-all duration-500 ease-in-out">
            <div className="h-full">
              <PreviewContainer />
            </div>
          </main>
        </section>
      </div>
    );
  },
);
SplitLayout.displayName = "SplitLayout";

const FullLayout = React.memo(
  ({
    step: Step,
    centered,
    activeStep,
  }: {
    step: React.ComponentType;
    centered: boolean;
    activeStep: number;
  }) => {
    const isFullScreenCentered = fullScreenCenteredSteps.has(activeStep || 0);
    const { form } = useFormContext();
    const hasMultipleLocations = useWatch({
      control: form.control,
      name: "stepOne.has_multiple_locations",
    });
    const isLocationChoiceStep =
      activeStep === 1 && hasMultipleLocations === undefined;
    const usesNaturalScroll =
      naturalScrollCenteredSteps.has(activeStep || 0) &&
      !isLocationChoiceStep;
    const isCenteredLocationChoice = centered && isLocationChoiceStep;
    const scrollAreaClasses = isFullScreenCentered
      ? "h-[calc(100vh-40px)] flex flex-col justify-center items-center"
      : isCenteredLocationChoice
        ? "h-[calc(100vh-5rem)] flex justify-center"
        : centered && usesNaturalScroll
          ? "flex justify-center"
          : centered
            ? "h-[calc(100vh-40px)] flex justify-center"
            : "h-full";

    const containerClasses =
      isCenteredLocationChoice
        ? "flex min-h-[calc(100vh-5rem)] w-full flex-col items-center justify-center pb-8"
        : isFullScreenCentered || centered
          ? usesNaturalScroll
            ? "flex flex-col items-center w-full pb-8"
            : "flex flex-col justify-center items-center min-h-screen"
          : "w-full";

    return (
      <section
        className={`w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${
          usesNaturalScroll ? "overflow-visible" : ""
        }`}
      >
        {centered && <Stepper activeStep={activeStep} />}

        <ScrollArea
          className={`w-full ${scrollAreaClasses}`}
          type={usesNaturalScroll ? "always" : "auto"}
        >
          <div
            data-step={activeStep}
            className={`onboarding-dark ${containerClasses}`}
          >
            <Suspense fallback={<StepLoader />}>
              <StepTransition stepKey={activeStep}>
                <Step />
              </StepTransition>
            </Suspense>
          </div>
        </ScrollArea>
      </section>
    );
  },
);
FullLayout.displayName = "FullLayout";

const FormLayoutProvider = ({
  defaultSidebarCollapsed = false,
}: {
  defaultSidebarCollapsed?: boolean;
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isMediumScreen = useMediaQuery("(max-width: 1280px)");

  const { activeStep } = useFormContext();
  const StepComponent =
    stepComponents[activeStep as keyof typeof stepComponents];

  const renderedStep = useMemo(() => {
    if (!StepComponent) return <div>Unknown step</div>;

    if (isMediumScreen && splitLayoutSteps.has(activeStep)) {
      return (
        <SplitLayout
          key={`split-${activeStep}`}
          step={StepComponent as React.ComponentType}
          defaultCollapsed={defaultSidebarCollapsed}
        />
      );
    }

    return splitLayoutSteps.has(activeStep) ? (
      <SplitLayout
        key={`split-${activeStep}`}
        step={StepComponent as React.ComponentType}
        defaultCollapsed={defaultSidebarCollapsed}
      />
    ) : (
      <FullLayout
        key={`full-${activeStep}`}
        activeStep={activeStep}
        step={StepComponent as React.ComponentType}
        centered={centeredSteps.has(activeStep)}
      />
    );
  }, [activeStep, StepComponent, isMediumScreen, defaultSidebarCollapsed]);

  if (isMobile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white text-center p-8">
        <div>
          <h1 className="text-2xl font-bold mb-4">Mobile Not Supported</h1>
          <p>Please use a desktop or tablet device to access this form.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-shell w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {renderedStep}
    </div>
  );
};
FormLayoutProvider.displayName = "FormLayoutProvider";

export default React.memo(FormLayoutProvider);
