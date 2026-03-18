"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { EventMenuCategory } from "@/services/vendor/events/type";
import { eventsService } from "@/services/vendor/events/events.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface MenuCategoryDropdownProps {
  categories: EventMenuCategory[];
  onSelect: (value: string) => void;
  isLoading: boolean;
  initialValue?: number;
  onCategoryCreated?: (newCategory?: { id: number; name: string }) => void;
  disabled?: boolean;
  eventId?: number; // Add eventId prop
}

// Schema for menu category creation
const menuCategoryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(20, "Category name must not exceed 40 characters"),
});

type MenuCategoryFormValues = z.infer<typeof menuCategoryFormSchema>;

export default function MenuCategoryDropdown({
  categories,
  onSelect,
  isLoading,
  initialValue,
  onCategoryCreated,
  disabled = false,
  eventId,
}: MenuCategoryDropdownProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(
    initialValue ? String(initialValue) : undefined
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();

  // Form for category creation
  const form = useForm<MenuCategoryFormValues>({
    resolver: zodResolver(menuCategoryFormSchema),
    defaultValues: {
      name: "",
    },
  });

  // Update selected value when initialValue changes
  useEffect(() => {
    if (initialValue) {
      setSelectedValue(String(initialValue));
    }
  }, [initialValue]);

  const handleSelectChange = (value: string) => {
    setSelectedValue(value);
    onSelect(value);
  };

  const handleCreateCategory = async (values: MenuCategoryFormValues) => {
    setIsSubmitting(true);
    try {
      // Use eventId prop if provided, otherwise fall back to session
      const currentEventId = eventId || session?.user?.event_id;

      // Validate event ID - must be a valid number greater than 0
      if (
        !currentEventId ||
        currentEventId === 0 ||
        isNaN(Number(currentEventId))
      ) {
        toast.error("Event ID not found", {
          description:
            "Please ensure you have an active event before creating a category.",
        });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        vendor_event_id: Number(currentEventId),
        name: values.name.trim(),
      };

      const response = await eventsService.createEventMenuCategory(payload);

      // Extract category data from response (handle both formats)
      let categoryData: { id: number; name: string } | null = null;

      // Format 1: Standard API response with status and data
      if (
        response &&
        typeof response === "object" &&
        "status" in response &&
        response.status &&
        response.data
      ) {
        categoryData = response.data;
      }
      // Format 2: Direct object with id and name
      else if (
        response &&
        typeof response === "object" &&
        "id" in response &&
        "name" in response
      ) {
        categoryData = {
          id: response.id as number,
          name: response.name as string,
        };
      }

      // Check if we successfully extracted category data
      if (categoryData) {
        // Reset form and close dialog
        form.reset();
        setIsDialogOpen(false);

        // Notify parent component to refresh categories
        if (onCategoryCreated) {
          onCategoryCreated(categoryData);

          // Wait a moment for the categories to refresh
          setTimeout(() => {
            // Select the newly created category
            const newCategoryId = String(categoryData.id);
            setSelectedValue(newCategoryId);
            onSelect(newCategoryId);
          }, 100);
        }
      } else {
        // Error toast is handled by axios interceptor
        console.error(
          "Failed to create menu category: Invalid response format"
        );
      }
    } catch (error) {
      console.error("Error creating menu category:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Select
            value={selectedValue}
            onValueChange={handleSelectChange}
            disabled={isLoading || disabled}
          >
            <SelectTrigger className="w-full h-10 bg-white/5 border-white/10">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="start"
              className="w-full min-w-[200px]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Loading categories...</span>
                </div>
              ) : (
                <>
                  <SelectItem value="placeholder" disabled>
                    Select an option
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="event-secondary" disabled={disabled}>
              Add New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl text-black">
                Create New Menu Category
              </DialogTitle>
              <DialogDescription>
                Add a new menu category that will be available for selection.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit(handleCreateCategory)(e);
                }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => {
                    const maxLength = 20;
                    const currentLength = field.value?.length || 0;
                    return (
                      <FormItem>
                        <FormLabel>Category Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter menu category name"
                            {...field}
                            maxLength={maxLength}
                          />
                        </FormControl>
                        <div className="flex justify-end mt-1">
                          <span
                            className={`text-xs text-black ${
                              currentLength > maxLength
                                ? "text-destructive"
                                : ""
                            }`}
                          >
                            {currentLength}/{maxLength} characters
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="event-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDialogOpen(false);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="event-primary"
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Category"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
