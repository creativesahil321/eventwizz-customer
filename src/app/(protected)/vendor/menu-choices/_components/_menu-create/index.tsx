"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { menuChoiceSchema, MenuChoiceType } from "./schema";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateMenuAction } from "./action";
import { Plus } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";

const categories = [
  { id: 1, label: "Appetizer", value: "appetizer" },
  { id: 2, label: "Main Course", value: "main_course" },
  { id: 3, label: "Dessert", value: "dessert" },
];

const events = [
  { id: 1, name: "Wedding" },
  { id: 2, name: "Birthday Party" },
  { id: 3, name: "Corporate Event" },
  { id: 4, name: "Anniversary" },
];

export default function CreateMenuDialog() {
  const [open, setOpen] = useState(false);
  const { createMenu, isLoading } = useCreateMenuAction();

  const form = useForm<MenuChoiceType>({
    resolver: zodResolver(menuChoiceSchema),
    defaultValues: {
      category_id: 1,
      event_id: 1,
      menu_name: "",
      description: "",
      status: true,
      id: "",
    },
  });

  const onSubmit = async (values: MenuChoiceType) => {
    try {
      const result = await createMenu(values);

      if (result) {
        toast.success("Menu created successfully.");
        setOpen(false);
        form.reset();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error creating menu:", error);
        toast.error(error.message);
      } else {
        console.error("Unexpected error:", error);
        toast.error("An unexpected error occurred.");
      }
    }
  };

  return (
    <section className="w-full relative">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="event-primary"
            size="sm"
            className="whitespace-nowrap"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add New
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[525px] border border-gray-300 dark:border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Create Menu Choices</DialogTitle>
            <DialogDescription>
              Fill out the form to create a new menu.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
              <section className="relative space-y-6 flex flex-col py-4">
                <FormField
                  control={form.control}
                  name="menu_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menu Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter menu name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter menu description (optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <Label
                        htmlFor="category"
                        className="block text-sm font-medium opacity-70"
                      >
                        Category
                      </Label>
                      <FormControl>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          value={field.value?.toString() || ""}
                        >
                          <SelectTrigger id="category" className="w-full h-9">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem
                                key={cat.value}
                                value={cat.id.toString()}
                              >
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="event_id"
                  render={({ field }) => (
                    <FormItem>
                      <Label
                        htmlFor="event"
                        className="block text-sm font-medium opacity-70"
                      >
                        Event
                      </Label>
                      <FormControl>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          value={field.value?.toString() || ""}
                        >
                          <SelectTrigger id="event" className="w-full h-9">
                            <SelectValue placeholder="Select an event" />
                          </SelectTrigger>
                          <SelectContent>
                            {events.map((event) => (
                              <SelectItem
                                key={event.id}
                                value={event.id.toString()}
                              >
                                {event.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                          }}
                        />
                      </FormControl>
                      <Label>{field.value ? "Active" : "Inactive"}</Label>
                    </FormItem>
                  )}
                />
              </section>
              <DialogFooter>
                <Button
                  variant="event-primary"
                  className="w-full"
                  disabled={isLoading}
                  type="submit"
                >
                  {!isLoading ? "Create Menu" : <PageLoader />}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
