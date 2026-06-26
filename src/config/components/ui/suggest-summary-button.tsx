"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { generateEventSummary } from "@/services/common/ai/summary.service";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SuggestSummaryButtonProps {
  /** The form field name containing the source text (e.g., title) */
  titleFieldName: string;
  /** The form field name where the generated description will be saved */
  descriptionFieldName: string;
  /** Optional field name for event type/category context */
  eventTypeFieldName?: string;
  /** Optional field name for target audience context */
  targetAudienceFieldName?: string;
  /** Optional CSS classes to apply to the button */
  className?: string;
  /** Optional custom button text */
  buttonText?: string;
  /** Optional callback after successful generation */
  onSuccess?: (summary: string) => void;
  /** Optional callback on generation error */
  onError?: (error: Error) => void;
}

/**
 * A reusable AI-powered description generator button.
 * It can both generate new descriptions and improve existing ones.
 *
 * @example
 * // Basic usage in a form
 * <SuggestSummaryButton
 *   titleFieldName="title"
 *   descriptionFieldName="description"
 * />
 *
 * @example
 * // Advanced usage with all options
 * <SuggestSummaryButton
 *   titleFieldName="productName"
 *   descriptionFieldName="productDescription"
 *   eventTypeFieldName="category"
 *   targetAudienceFieldName="targetMarket"
 *   buttonText="AI Write"
 *   onSuccess={(summary) => console.log("Generated:", summary)}
 * />
 */
export function SuggestSummaryButton({
  titleFieldName,
  descriptionFieldName,
  eventTypeFieldName,
  targetAudienceFieldName,
  className,
  buttonText = "AI Write",
  onSuccess,
  onError,
}: SuggestSummaryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useFormContext();
  const title = form.watch(titleFieldName);
  const currentDescription = form.watch(descriptionFieldName);
  const isDisabled = isLoading || !title;

  const handleGenerateSummary = async () => {
    if (!title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateEventSummary({
        title: title.toString(),
        eventType: eventTypeFieldName
          ? form.getValues(eventTypeFieldName)?.toString()
          : undefined,
        targetAudience: targetAudienceFieldName
          ? form.getValues(targetAudienceFieldName)?.toString()
          : undefined,
        duration: currentDescription
          ? currentDescription.toString()
          : undefined,
      });

      if (result.summary) {
        form.setValue(descriptionFieldName, result.summary, {
          shouldDirty: true,
          shouldTouch: true,
        });
        toast.success(
          currentDescription
            ? "Description improved successfully!"
            : "Description generated successfully!"
        );
        onSuccess?.(result.summary);
      }
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Failed to generate description. Please try again.");
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "transition-all duration-200",
        isDisabled
          ? "opacity-50"
          : "hover:bg-primary hover:text-primary-foreground",
        className
      )}
      onClick={handleGenerateSummary}
      disabled={isDisabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {currentDescription ? "Improving..." : "Generating..."}
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
}
