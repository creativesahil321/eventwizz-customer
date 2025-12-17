"use client";

import React, { useMemo, lazy, Suspense, useState } from "react";
import { useFormContext } from "../form-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import PreviewContainer from "../form-preview";
import { useMediaQuery } from "@/hooks/use-media-query";
import Stepper from "./stepper";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
      <div className="mb-6">
        <Skeleton className="h-7 w-2/3 rounded-lg" />
      </div>
      {[1, 2, 3].map((field, index) => (
        <div
          key={field}
          className="space-y-2 mb-6"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <Skeleton className="h-4 w-1/4 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex justify-center mt-8">
        <Skeleton className="h-11 w-40 rounded-full" />
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

const splitLayoutSteps = new Set([2, 3, 4, 6, 7, 8, 9]);
const centeredSteps = new Set([1, 5, 6, 11, 10]);
const fullScreenCenteredSteps = new Set([4]); // Remove step 1 from full screen centered

const SplitLayout = React.memo(
  ({ step: Step }: { step: React.ComponentType }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { activeStep } = useFormContext();

    const toggleSidebar = () => {
      setIsSidebarCollapsed((prev) => !prev);
    };

    return (
      <div className="w-full">
        {/* Conditional Stepper - Only show when sidebar is not collapsed */}
        {!isSidebarCollapsed && <Stepper activeStep={activeStep} />}

        <section className="flex w-full h-screen overflow-hidden relative">
          {/* Sidebar Toggle Button - Click only, no hover */}
          <div className="absolute top-1/2 left-0 z-50 transform -translate-y-1/2">
            <Button
              variant="event-outline"
              size="icon"
              onClick={toggleSidebar}
              className="bg-white hover:bg-gray-50 shadow-xl border-gray-300 rounded-full w-10 h-10 p-0 transition-colors duration-200"
              title={isSidebarCollapsed ? "Show Form" : "Hide Form"}
              aria-label={isSidebarCollapsed ? "Show Form" : "Hide Form"}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Sidebar - Smooth professional transition */}
          <aside
            className={`transition-all duration-500 ease-in-out overflow-hidden ${
              isSidebarCollapsed
                ? "w-0 min-w-0 max-w-0 mx-0 opacity-0 pointer-events-none"
                : "w-2/5 min-w-[320px] max-w-[400px] mx-2 opacity-100 pr-3"
            }`}
          >
            <ScrollArea className="h-[calc(100vh-40px)]">
              <Suspense fallback={<StepLoader />}>
                <Step />
              </Suspense>
            </ScrollArea>
          </aside>

          {/* Main Preview Area - Smooth transition */}
          <main
            className={`flex-1 overflow-hidden transition-all duration-500 ease-in-out`}
          >
            <div className="h-full">
              <PreviewContainer />
            </div>
          </main>
        </section>
      </div>
    );
  }
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
    const scrollAreaClasses = isFullScreenCentered
      ? "h-[calc(100vh-40px)] flex flex-col justify-center items-center"
      : centered && (activeStep === 5 || activeStep === 1)
      ? "flex justify-center" // Remove fixed height for step 5 and 1
      : centered
      ? "h-[calc(100vh-40px)] flex justify-center"
      : "h-full";

    const containerClasses =
      isFullScreenCentered || centered
        ? activeStep === 5 || activeStep === 1
          ? "flex flex-col items-center w-full pb-8" // Remove min-h-screen for step 5 and 1
          : "flex flex-col justify-center items-center min-h-screen"
        : "w-full";

    return (
      <section
        className={`w-full ${
          activeStep === 5 || activeStep === 1 ? "overflow-visible" : ""
        }`}
      >
        {/* Show stepper for centered steps */}
        {centered && <Stepper activeStep={activeStep} />}

        <ScrollArea
          className={`w-full ${scrollAreaClasses}`}
          type={activeStep === 5 || activeStep === 1 ? "always" : "auto"}
        >
          <div data-step={activeStep} className={containerClasses}>
            <Suspense fallback={<StepLoader />}>
              <Step />
            </Suspense>
          </div>
        </ScrollArea>
      </section>
    );
  }
);
FullLayout.displayName = "FullLayout";

const FormLayoutProvider = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isMediumScreen = useMediaQuery("(max-width: 1280px)");

  const { activeStep } = useFormContext();
  const StepComponent =
    stepComponents[activeStep as keyof typeof stepComponents];

  const renderedStep = useMemo(() => {
    if (!StepComponent) return <div>Unknown step</div>;

    if (isMediumScreen && splitLayoutSteps.has(activeStep)) {
      return <SplitLayout step={StepComponent as React.ComponentType} />;
    }

    return splitLayoutSteps.has(activeStep) ? (
      <SplitLayout step={StepComponent as React.ComponentType} />
    ) : (
      <FullLayout
        activeStep={activeStep}
        step={StepComponent as React.ComponentType}
        centered={centeredSteps.has(activeStep)}
      />
    );
  }, [activeStep, StepComponent, isMediumScreen]);

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

  return <div className="w-full">{renderedStep}</div>;
};
FormLayoutProvider.displayName = "FormLayoutProvider";

export default React.memo(FormLayoutProvider);
