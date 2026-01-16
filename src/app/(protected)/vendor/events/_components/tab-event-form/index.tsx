"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormProvider as RHFFormProvider } from "react-hook-form";
import { useEventFormContext } from "../events-form-provider";

// Import Tab Components
import EventNameTab from "./tabs/event-name-tab";
import PackageTab from "./tabs/package-tab";
import DatesTab from "./tabs/dates-tab";
import CateringTab from "./tabs/catering-tab";
import DrinksTab from "./tabs/drinks-tab";
import MoreInfoTab from "./tabs/more-info-tab";
import FaqsTab from "./tabs/faqs-tab";
import PublishTab from "./tabs/publish-tab";
import { EventPreview } from "../event-preview";
import { useEventData } from "../../_lib/hooks/useEventData";
import { useParams } from "next/navigation";

// Import Step Icons
import {
  PartyPopper,
  Package,
  CalendarDays,
  Utensils,
  Wine,
  Info,
  HelpCircle,
  UploadCloud,
} from "lucide-react";

// Define steps for the tabs
const steps = [
  {
    id: 1,
    label: "Event name",
    icon: <PartyPopper size={16} />,
    value: "event-name",
  },
  { id: 2, label: "Package", icon: <Package size={16} />, value: "package" },
  { id: 3, label: "Dates", icon: <CalendarDays size={16} />, value: "dates" },
  { id: 4, label: "Menu", icon: <Utensils size={16} />, value: "menu" },
  { id: 5, label: "Other Packages", icon: <Wine size={16} />, value: "drinks" },
  {
    id: 6,
    label: "Brochure Info",
    icon: <Info size={16} />,
    value: "more-info",
  },
  { id: 7, label: "FAQs", icon: <HelpCircle size={16} />, value: "faqs" },
  {
    id: 8,
    label: "Publish",
    icon: <UploadCloud size={16} />,
    value: "publish",
  },
];

export default function TabEventForm() {
  // Get the global form context
  const { form: formContext, currentStep } = useEventFormContext();

  const [activeTab, setActiveTab] = useState("event-name");

  // Set active tab based on current step from server data
  useEffect(() => {
    if (currentStep && currentStep > 0) {
      const stepToTabMap: { [key: number]: string } = {
        1: "event-name",
        2: "package",
        3: "dates",
        4: "menu",
        5: "drinks",
        6: "more-info",
        7: "faqs",
        8: "publish",
      };

      const targetTab = stepToTabMap[currentStep];

      if (targetTab) {
        setActiveTab(targetTab);
      }
    }
  }, [currentStep]);

  // Handle tab navigation

  const navigateToPreviousTab = () => {
    const currentIndex = steps.findIndex((step) => step.value === activeTab);
    if (currentIndex > 0) {
      setActiveTab(steps[currentIndex - 1].value);
    }
  };

  const params = useParams<{ eventID: string }>();
  const eventId = Array.isArray(params?.eventID)
    ? params?.eventID[0]
    : params?.eventID;
  const { eventData } = useEventData(eventId);

  return (
    <>
      <div className="flex flex-col space-y-6 w-full max-w-full px-2 sm:px-4 md:px-6 relative mx-auto pb-24 overflow-x-hidden">
        {/* Wrap all tabs in the FormProvider from react-hook-form */}
        <RHFFormProvider {...formContext}>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500 -mx-1 px-1 md:overflow-x-visible">
                <TabsList className="inline-flex md:flex w-max md:w-full bg-background p-1 h-auto rounded-lg gap-1.5 md:gap-2">
                  {steps.map((step) => {
                    // Disable tabs that are beyond the current step
                    const isDisabled = currentStep
                      ? step.id > currentStep
                      : false;

                    return (
                      <TabsTrigger
                        key={step.id}
                        value={step.value}
                        disabled={isDisabled}
                        className={`px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 h-auto text-xs sm:text-sm font-medium whitespace-nowrap rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 flex-shrink-0 md:flex-1 md:min-w-0 ${
                          isDisabled ? "opacity-50 cursor-not-allowed" : ""
                        } ${
                          currentStep && step.id === currentStep
                            ? "ring-2 ring-blue-500"
                            : ""
                        }`}
                      >
                        {step.icon}
                        <span className="whitespace-nowrap truncate">
                          {step.label}
                        </span>
                        {currentStep && step.id === currentStep && (
                          <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 sm:px-1.5 py-0.5 rounded-full hidden sm:inline whitespace-nowrap flex-shrink-0">
                            Current
                          </span>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>

            <Card className="shadow-sm">
              <div className="space-y-6">
                <TabsContent value="event-name" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6">
                    <EventNameTab />
                  </div>
                </TabsContent>

                <TabsContent value="package" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6">
                    <PackageTab />
                  </div>
                </TabsContent>

                <TabsContent value="dates" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6">
                    <DatesTab />
                  </div>
                </TabsContent>

                <TabsContent value="menu" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6">
                    <CateringTab />
                  </div>
                </TabsContent>

                <TabsContent value="drinks" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6">
                    <DrinksTab />
                  </div>
                </TabsContent>

                <TabsContent value="more-info" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6">
                    <MoreInfoTab />
                  </div>
                </TabsContent>

                <TabsContent value="faqs" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6">
                    <FaqsTab />
                  </div>
                </TabsContent>

                <TabsContent value="publish" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6">
                    <PublishTab />
                  </div>
                </TabsContent>

                {/* Live Preview (read-only) */}
                <TabsContent value="preview" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-0 sm:p-0">
                    <EventPreview
                      data={(eventData as { data?: object })?.data || {}}
                    />
                  </div>
                </TabsContent>
              </div>

              {/* Tab Navigation */}
              <div className="flex justify-between mt-6 p-2 sm:p-4 md:p-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={navigateToPreviousTab}
                  disabled={activeTab === "event-name"}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                  size="sm"
                >
                  <ArrowLeft size={14} />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>

                {/* Show current step info */}
                {currentStep && (
                  <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                    <span className="hidden sm:inline">Step </span>
                    {currentStep}/8
                  </div>
                )}
              </div>
            </Card>
          </Tabs>
        </RHFFormProvider>
      </div>
    </>
  );
}
