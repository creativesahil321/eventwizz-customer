import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Control,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  FieldArrayWithId,
} from "react-hook-form";
import { X, AlertCircle } from "lucide-react";
import { StepThreeType } from "../../form-provider/schema"; // Adjust path as needed
import { useFormContext } from "../../form-provider";
import { OnboardingSectionTitle } from "@/components/ui/typography";
import { useState } from "react";

type SchedulerField = FieldArrayWithId<StepThreeType, "event_schedular", "id">;

interface EventSchedulerProps {
  control: Control<StepThreeType>;
  fields: SchedulerField[];
  append: UseFieldArrayAppend<StepThreeType, "event_schedular">;
  remove: UseFieldArrayRemove;
}

// Validation helper functions
// Removed future time validation - only keeping sequence validation
const validateTimeSequence = (
  schedules: Array<{ title: string; time: string }>
): boolean => {
  if (schedules.length <= 1) return true;

  const validSchedules = schedules.filter(
    (schedule) => schedule.time && schedule.title
  );
  if (validSchedules.length <= 1) return true;

  for (let i = 0; i < validSchedules.length - 1; i++) {
    const currentTime = validSchedules[i].time;
    const nextTime = validSchedules[i + 1].time;

    if (!currentTime || !nextTime) continue;

    const [currentHours, currentMinutes] = currentTime.split(":").map(Number);
    const [nextHours, nextMinutes] = nextTime.split(":").map(Number);

    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    const nextTotalMinutes = nextHours * 60 + nextMinutes;

    if (nextTotalMinutes <= currentTotalMinutes) {
      return false;
    }
  }

  return true;
};

const EventScheduler: React.FC<EventSchedulerProps> = ({
  control,
  fields,
  append,
  remove,
}) => {
  const { form: globalForm, setActiveField } = useFormContext();
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  // Helper function to handle focus
  const handleFieldFocus = () => {
    setActiveField("event_schedular");
  };

  // Helper function to validate and update global form state
  const updateGlobalFormScheduler = (
    index: number,
    field: string,
    value: string
  ) => {
    // Get current event_schedular array
    const currentScheduler =
      globalForm.getValues("stepThree.event_schedular") || [];

    // Create a copy and ensure it has enough items
    const updatedScheduler = [...currentScheduler];
    while (updatedScheduler.length <= index) {
      updatedScheduler.push({ title: "", time: "" });
    }

    // Update the specific field
    updatedScheduler[index] = {
      ...updatedScheduler[index],
      [field]: value,
    };

    // Validate the updated scheduler
    const errors: { [key: string]: string } = {};

    // Validate sequence
    if (!validateTimeSequence(updatedScheduler)) {
      errors.sequence = "Times must be in ascending order";
    }

    setValidationErrors(errors);

    // Set the updated array back to global form
    globalForm.setValue("stepThree.event_schedular", updatedScheduler);

    // Force a form state update to trigger preview refresh
    setTimeout(() => {
      const fullState = globalForm.getValues();
      globalForm.setValue("stepThree", { ...fullState.stepThree });
    }, 0);
  };

  return (
    <div className="space-y-4">
      <OnboardingSectionTitle>Event Scheduler</OnboardingSectionTitle>

      {fields.map((fieldItem, index) => (
        <div
          key={fieldItem.id}
          className="flex items-start justify-between gap-4 p-4 border border-gray-200 rounded-md bg-white"
        >
          <FormField
            control={control}
            name={`event_schedular.${index}.title`}
            render={({ field }) => {
              const currentLength = field.value?.length || 0;
              const maxLength = 40;
              return (
                <FormItem className="flex-1">
                  <FormControl>
                    <div>
                      <Input
                        type="text"
                        placeholder="Event Title"
                        value={field.value || ""}
                        maxLength={maxLength}
                        onFocus={handleFieldFocus}
                        onChange={(e) => {
                          field.onChange(e);
                          updateGlobalFormScheduler(
                            index,
                            "title",
                            e.target.value
                          );
                        }}
                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        <span
                          className={
                            currentLength > maxLength ? "text-destructive" : ""
                          }
                        >
                          {currentLength}/{maxLength} characters
                        </span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={control}
            name={`event_schedular.${index}.time`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="time"
                    value={field.value || ""}
                    onFocus={handleFieldFocus}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      updateGlobalFormScheduler(index, "time", e.target.value);
                    }}
                    className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              remove(index);
              // Also update global form to remove this item
              const currentScheduler =
                globalForm.getValues("stepThree.event_schedular") || [];
              const updatedScheduler = [...currentScheduler];
              updatedScheduler.splice(index, 1);
              globalForm.setValue(
                "stepThree.event_schedular",
                updatedScheduler
              );

              // Re-validate after removal
              const errors: { [key: string]: string } = {};
              if (!validateTimeSequence(updatedScheduler)) {
                errors.sequence = "Times must be in ascending order";
              }
              setValidationErrors(errors);
            }}
            disabled={fields.length === 1}
            className="h-11 w-11 p-0 text-red-500 hover:bg-red-50"
          >
            <X size={16} />
          </Button>
        </div>
      ))}
      {/* Validation error for sequence */}
      {validationErrors.sequence && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">
            {validationErrors.sequence}
          </span>
        </div>
      )}
      <Button
        variant="event-secondary"
        type="button"
        className="relative"
        onClick={() => {
          append({
            title: "",
            time: "",
          });
          // Also update global form to add a new empty item
          const currentScheduler =
            globalForm.getValues("stepThree.event_schedular") || [];
          const updatedScheduler = [
            ...currentScheduler,
            { title: "", time: "" },
          ];
          globalForm.setValue("stepThree.event_schedular", updatedScheduler);
          handleFieldFocus(); // Set focus on event scheduler when adding a new item
        }}
      >
        Add Schedule
      </Button>
    </div>
  );
};

export default EventScheduler;
