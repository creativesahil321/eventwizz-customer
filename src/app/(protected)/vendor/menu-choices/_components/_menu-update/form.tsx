"use client";

import { useState, useEffect } from "react";
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
import { MenuChoice } from "../../_lib/types";
import { menuChoiceSchema, MenuChoiceType } from "./schema";
import { updateMenu } from "./action";
import { useMenuChoiceDetails } from "../../_lib/queries";
import { Textarea } from "@/components/ui/textarea";
import { MenuChoiceDetail } from "@/services/vendor/menu_choices/type";
import { MenuFormSkeleton } from "../skeleton-loader";
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

interface UpdateMenuFormProps {
  menu: MenuChoice | null;
}

export default function UpdateMenuForm({ menu }: UpdateMenuFormProps) {
  const [loading, setLoading] = useState(false);

  // Fetch menu details using the API
  const { data: menuDetailsResponse, isLoading: isLoadingDetails } =
    useMenuChoiceDetails(menu?.id || "");

  // Map API response to form fields
  const defaultValues: MenuChoiceType = {
    id: menu?.id || "",
    event_id: 1,
    menu_name: "",
    category_id: 1,
    description: "",
    status: true,
  };

  const form = useForm<MenuChoiceType>({
    resolver: zodResolver(menuChoiceSchema),
    defaultValues,
  });

  useEffect(() => {
    // Update form when menu details are loaded from API
    if (menuDetailsResponse?.data) {
      // Use the API response data
      const apiData = menuDetailsResponse.data as MenuChoiceDetail;

      // Parse status - should be 1 for active, 0 for inactive
      const isActive = apiData.status === 1;

      // Map API data to form fields
      const formData = {
        id: apiData.id,
        event_id: apiData.vendor_event_id || 1,
        menu_name: apiData.title || "",
        category_id: Number(apiData.event_menu_id) || 1,
        description: apiData.description || "",
        status: isActive,
      };

      form.reset(formData);
    } else if (menu) {
      // Use the prop data as fallback
      // Parse status - can be "active" string or 1 number
      const isActive =
        menu.status === "active" ||
        menu.status === 1 ||
        String(menu.status).toLowerCase() === "active";

      const formData = {
        id: menu.id,
        event_id: 1,
        menu_name: menu.menu_name || "",
        category_id: typeof menu.category === "number" ? menu.category : 1,
        description: "",
        status: isActive,
      };

      form.reset(formData);
    }
  }, [menuDetailsResponse, menu, form]);

  const onSubmit = async (values: MenuChoiceType) => {
    setLoading(true);
    try {
      const result = await updateMenu(values);
      if (result) {
        toast.success("Menu updated successfully.");
      } else {
        toast.error("Failed to update menu.");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingDetails) {
    return <MenuFormSkeleton />;
  }

  return (
    <section className="w-full relative">
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
                    <Textarea
                      placeholder="Enter menu description"
                      className="min-h-[100px]"
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
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={String(field.value)}
                    >
                      <SelectTrigger id="category" className="w-full h-9">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.id.toString()}>
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
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={String(field.value)}
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
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                  </FormControl>
                  <Label>{field.value ? "Active" : "Inactive"}</Label>
                </FormItem>
              )}
            />
          </section>
          <section className="w-full relative">
            <Button
              variant="event-primary"
              className={`w-full ${
                loading ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              disabled={loading}
              type="submit"
            >
              {!loading ? "Save changes" : <PageLoader />}
            </Button>
          </section>
        </form>
      </Form>
    </section>
  );
}
