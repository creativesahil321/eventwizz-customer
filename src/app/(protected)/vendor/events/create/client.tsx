"use client";

import { FormProvider } from "../_components/events-form-provider";
import TabEventForm from "../_components/tab-event-form";

export default function CreateEventClientWrapper() {
  return (
    <FormProvider serverData={null}>
      <TabEventForm />
    </FormProvider>
  );
}
