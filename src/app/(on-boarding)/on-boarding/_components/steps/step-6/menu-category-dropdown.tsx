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
  dedupeMenuCategoriesForSelect,
  extractCreatedMenuCategory,
  toPositiveId,
} from "@/lib/event-menu-categories";
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
  value?: number | string;
  initialValue?: number;
  onCategoryCreated?: (newCategory?: { id: number; name: string }) => void;
  disabled?: boolean;
  eventId?: number;
  /** When multi-room is enabled, scope categories to this room */
  roomId?: number;
  /** Shown when the selected id is not yet in this room's category list. */
  fallbackLabel?: string;
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
  value,
  initialValue,
  onCategoryCreated,
  disabled = false,
  eventId,
  roomId,
  fallbackLabel,
}: MenuCategoryDropdownProps) {
  const [createdCategories, setCreatedCategories] = useState<
    EventMenuCategory[]
  >([]);

  useEffect(() => {
    setCreatedCategories([]);
  }, [eventId, roomId]);

  // Deduplicate and merge categories from props with any locally created categories
  const allCategories = React.useMemo(() => {
    const selectedId = toPositiveId(value ?? initialValue);
    const merged: EventMenuCategory[] = [
      ...(categories || []),
      ...createdCategories,
    ];
    const label = String(fallbackLabel ?? "").trim();
    if (selectedId != null && label) {
      merged.push({ id: selectedId, name: label });
    }
    return dedupeMenuCategoriesForSelect(merged, selectedId ?? undefined);
  }, [categories, createdCategories, fallbackLabel, initialValue, value]);

  const effectiveId = toPositiveId(value ?? initialValue);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(
    effectiveId != null ? String(effectiveId) : undefined,
  );

  const resolvedSelectValue = React.useMemo(() => {
    const selectedId = toPositiveId(value ?? initialValue);
    if (
      selectedId != null &&
      allCategories.some((cat) => Number(cat.id) === selectedId)
    ) {
      return String(selectedId);
    }
    const label = String(fallbackLabel ?? "").trim().toLowerCase();
    const nameMatch = allCategories.find(
      (cat) => cat.name.toLowerCase() === label,
    );
    if (nameMatch) return String(nameMatch.id);
    if (selectedId != null) return String(selectedId);
    return selectedValue;
  }, [allCategories, fallbackLabel, initialValue, selectedValue, value]);
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

  // Update selected value when prop value or initialValue changes to a valid positive id
  useEffect(() => {
    const nextId = toPositiveId(value ?? initialValue);
    if (nextId != null) {
      setSelectedValue(String(nextId));
    }
  }, [value, initialValue]);

  const handleSelectChange = (val: string) => {
    setSelectedValue(val);
    onSelect(val);
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
        ...(roomId != null && roomId > 0 ? { room_id: roomId } : {}),
      };

      const response = await eventsService.createEventMenuCategory(payload);
      const created = extractCreatedMenuCategory(response);
      if (created) {
        form.reset();
        setIsDialogOpen(false);

        const newIdStr = String(created.id);

        // 1. Immediately store in local createdCategories so it exists in options
        setCreatedCategories((prev) => {
          if (prev.some((c) => Number(c.id) === Number(created.id))) return prev;
          return [...prev, created];
        });

        // 2. Set the select value state
        setSelectedValue(newIdStr);

        // 3. Inform parent component that category was created
        if (onCategoryCreated) {
          onCategoryCreated({ id: created.id, name: created.name });
        }

        // 4. Trigger onSelect so form Controller field.onChange is called and dropdown stays selected
        onSelect(newIdStr);
      } else {
        // Error toast is handled by axios interceptor
        console.error(
          "Failed to create menu category: Invalid response format",
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
            value={resolvedSelectValue}
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
                  {allCategories.map((category) => {
                    const id = toPositiveId(category.id);
                    if (id == null) return null;
                    return (
                      <SelectItem key={id} value={String(id)}>
                        {category.name}
                      </SelectItem>
                    );
                  })}
                  {resolvedSelectValue &&
                    toPositiveId(resolvedSelectValue) != null &&
                    !allCategories.some(
                      (category) =>
                        String(toPositiveId(category.id) ?? "") ===
                        resolvedSelectValue,
                    ) && (
                      <SelectItem value={resolvedSelectValue}>
                        {createdCategories.find(
                          (c) => String(c.id) === resolvedSelectValue,
                        )?.name ||
                          String(fallbackLabel ?? "").trim() ||
                          "Select a category"}
                      </SelectItem>
                    )}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="event-primary" disabled={disabled}>
              Add New
            </Button>
          </DialogTrigger>
          <DialogContent className="text-black">
            <DialogHeader>
              <DialogTitle className="text-2xl text-black">
                Create New Menu Category
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
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
                        <FormLabel className="text-black">
                          Category name
                        </FormLabel>
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
