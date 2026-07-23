import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { EventCategory } from "@/services/vendor/events/type";
// import { eventsService } from "@/services/vendor/events/events.service";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";

interface CategoryDropdownProps {
  categories: EventCategory[];
  onSelect: (value: string) => void;
  isLoading?: boolean;
  initialValue?: number;
  onCategoryCreated?: () => void;
}

// Schema for category creation
// const categoryFormSchema = z.object({
//   name: z.string().min(1, "Name is required"),
// });

// type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoryDropdown({
  categories = [],
  onSelect,
  isLoading = false,
  initialValue,
}: // onCategoryCreated,
CategoryDropdownProps) {
  // Only set the initialValue if it's a valid number
  const [selectedValue, setSelectedValue] = useState<string>(() => {
    // Make sure initialValue is a valid number
    if (initialValue && !isNaN(initialValue) && initialValue > 0) {
      return initialValue.toString();
    }
    return "";
  });

  // const [isDialogOpen, setIsDialogOpen] = useState(false);
  // const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  // Form for category creation
  // const form = useForm<CategoryFormValues>({
  //   resolver: zodResolver(categoryFormSchema),
  //   defaultValues: {
  //     name: "",
  //   },
  // });

  // Update selected value if initialValue changes
  useEffect(() => {
    if (
      initialValue !== undefined &&
      !isNaN(initialValue) &&
      initialValue > 0
    ) {
      setSelectedValue(initialValue.toString());
    }
  }, [initialValue]);

  // Make sure the selected category exists in the dropdown
  useEffect(() => {
    if (selectedValue && categories.length > 0) {
      categories.some((category) => category.id.toString() === selectedValue);
    }
  }, [categories, selectedValue]);

  const handleChange = (value: string) => {
    setSelectedValue(value);
    onSelect(value);
  };

  // // Handle category creation
  // const handleCreateCategory = async (values: CategoryFormValues) => {
  //   try {
  //     setIsCategorySubmitting(true);

  //     // Simplified payload with only name
  //     const payload = {
  //       name: values.name,
  //     };

  //     await eventsService.createEventCategory(payload);

  //     // Reset form
  //     form.reset();

  //     // Close dialog
  //     setIsDialogOpen(false);

  //     // Refresh categories if callback is provided
  //     if (onCategoryCreated) {
  //       onCategoryCreated();
  //     }
  //   } catch (error) {
  //     console.error("Error creating category:", error);
  //   } finally {
  //     setIsCategorySubmitting(false);
  //   }
  // };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Select
            value={selectedValue}
            onValueChange={handleChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full" style={{ height: "2.8rem" }}>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>
                  Loading categories...
                </SelectItem>
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no_categories" disabled>
                  No categories available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="event-secondary" className="ml-2" type="button">
              Create New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl text-black">
                Create New Category
              </DialogTitle>
              <DialogDescription>
                Add a new event category that will be available for selection.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCreateCategory)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter category name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="event-outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isCategorySubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="event-primary"
                    type="submit"
                    disabled={isCategorySubmitting}
                  >
                    {isCategorySubmitting ? "Creating..." : "Create Category"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog> */}
      </div>
    </div>
  );
}
