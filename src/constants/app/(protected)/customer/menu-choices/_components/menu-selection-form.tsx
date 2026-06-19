"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Save,
  UserPlus,
  Soup,
  UtensilsCrossed,
  Cake,
  AlertCircle,
  User,
  ShieldAlert,
} from "lucide-react";
import AllergenModal, { AllergenData } from "./allergen-modal";
import { Badge } from "@/components/ui/badge";
import { AttendeeMenuSelection } from "../_lib/types";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MenuCategory } from "@/services/customer/bookings/type";
import { createMenuSelectionSchema } from "../_lib/schema";
import {
  getCategoryOrder,
  mapLegacyToMenuSelections,
  mapMenuSelectionsToLegacy,
} from "../_lib/utils";

interface MenuSelectionFormProps {
  readonly eventName?: string;
  readonly editingAttendee?: AttendeeMenuSelection | null;
  readonly menuItems?: MenuCategory[];
  readonly isTableFull?: boolean;
  readonly onSaveAttendee: (
    attendee: Omit<
      AttendeeMenuSelection,
      "id" | "booking_id" | "date_key" | "table_id"
    >
  ) => void;
  readonly onCancelEdit?: () => void;
}

// Helper function to get icon and color for category (for visual variety)
const getCategoryStyle = (index: number) => {
  const styles = [
    {
      icon: Soup,
      color: "orange",
      bgColor: "bg-orange-100",
      textColor: "text-orange-600",
      borderColor: "border-orange-200",
      gradient: "from-orange-50/50",
    },
    {
      icon: UtensilsCrossed,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-600",
      borderColor: "border-red-200",
      gradient: "from-red-50/50",
    },
    {
      icon: UtensilsCrossed,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-600",
      borderColor: "border-green-200",
      gradient: "from-green-50/50",
    },
    {
      icon: Cake,
      color: "pink",
      bgColor: "bg-pink-100",
      textColor: "text-pink-600",
      borderColor: "border-pink-200",
      gradient: "from-pink-50/50",
    },
  ];
  return styles[index % styles.length];
};

export default function MenuSelectionForm({
  editingAttendee,
  menuItems = [],
  isTableFull = false,
  onSaveAttendee,
  onCancelEdit,
}: MenuSelectionFormProps) {
  const [allergenModalOpen, setAllergenModalOpen] = useState(false);
  const [allergenData, setAllergenData] = useState<AllergenData | null>(null);

  // Create initial menuSelections object with empty strings
  const getInitialMenuSelections = () => {
    const initialMenuSelections: Record<string, string> = {};
    menuItems.forEach((category) => {
      initialMenuSelections[category.title] = "";
    });
    return initialMenuSelections;
  };

  // Dynamic schema based on available menu items
  const dynamicSchema = useMemo(
    () => createMenuSelectionSchema(menuItems),
    [menuItems]
  );

  // Initialize react-hook-form with zodResolver
  const form = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      title: "",
      fullName: "",
      menuSelections: getInitialMenuSelections(),
      allergens: [],
      dietaryRequirements: [],
      additionalNotes: "",
    },
    mode: "onChange",
  });

  // Populate form when editing (using form.reset for proper react-hook-form pattern)
  useEffect(() => {
    if (editingAttendee) {
      const existingMenuSelections = editingAttendee.menuSelections || {};
      const categoryOrder = getCategoryOrder(menuItems);

      const menuSelections = mapLegacyToMenuSelections(
        {
          starter: editingAttendee.starter,
          mainCourse: editingAttendee.mainCourse,
          dessert: editingAttendee.dessert,
          sides: editingAttendee.sides,
        },
        categoryOrder,
        existingMenuSelections
      );

      form.reset({
        title: editingAttendee.title || "",
        fullName: editingAttendee.fullName || "",
        menuSelections,
        allergens: editingAttendee.allergens || [],
        dietaryRequirements: editingAttendee.dietaryRequirements || [],
        additionalNotes: editingAttendee.additionalNotes || "",
      });

      setAllergenData({
        allergens: editingAttendee.allergens || [],
        dietaryRequirements: editingAttendee.dietaryRequirements || [],
        additionalNotes: editingAttendee.additionalNotes || "",
      });
    } else {
      const initialMenuSelections: Record<string, string> = {};
      menuItems.forEach((category) => {
        initialMenuSelections[category.title] = "";
      });

      form.reset({
        title: "",
        fullName: "",
        menuSelections: initialMenuSelections,
        allergens: [],
        dietaryRequirements: [],
        additionalNotes: "",
      });
      setAllergenData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAttendee, menuItems]);

  const onSubmit = async (data: {
    title?: string;
    fullName: string;
    menuSelections: Record<string, string>;
    allergens?: string[];
    dietaryRequirements?: string[];
    additionalNotes?: string;
  }) => {
    // Prevent adding new attendees when table is full
    if (!editingAttendee && isTableFull) {
      toast.error("Table is full", {
        description:
          "You cannot add more attendees. Please edit existing attendees.",
        duration: 5000,
      });
      return;
    }

    // Map menuSelections to legacy fields for backward compatibility
    const categoryOrder = getCategoryOrder(menuItems);
    const legacyFields = mapMenuSelectionsToLegacy(
      data.menuSelections,
      categoryOrder
    );

    const attendeeData: Omit<
      AttendeeMenuSelection,
      "id" | "booking_id" | "date_key" | "table_id"
    > = {
      title: data.title || "",
      fullName: data.fullName,
      menuSelections: data.menuSelections,
      ...legacyFields,
      allergens: allergenData?.allergens || [],
      dietaryRequirements: allergenData?.dietaryRequirements || [],
      additionalNotes: allergenData?.additionalNotes || "",
      status: "completed",
    };

    onSaveAttendee(attendeeData);

    // Reset form after successful submission
    form.reset({
      title: "",
      fullName: "",
      menuSelections: getInitialMenuSelections(),
      allergens: [],
      dietaryRequirements: [],
      additionalNotes: "",
    });
    setAllergenData(null);
  };

  const handleCancel = () => {
    form.reset({
      title: "",
      fullName: "",
      menuSelections: getInitialMenuSelections(),
      allergens: [],
      dietaryRequirements: [],
      additionalNotes: "",
    });
    setAllergenData(null);
    onCancelEdit?.();
  };

  const handleAllergyModal = () => {
    setAllergenModalOpen(true);
  };

  const handleSaveAllergens = (data: AllergenData) => {
    setAllergenData(data);
  };

  // Check if allergenData has any actual content
  const hasAllergenData = useMemo(() => {
    if (!allergenData) return false;
    return (
      allergenData.allergens.length > 0 ||
      allergenData.dietaryRequirements.length > 0 ||
      (allergenData.additionalNotes?.trim() || "").length > 0
    );
  }, [allergenData]);

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-2 shadow-lg">
      <CardHeader
        className="shrink-0 rounded-t-lg border-b-2 py-4"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
        }}
      >
        <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl">
          {editingAttendee ? (
            <>
              <div className="rounded-lg bg-white/20 p-2">
                <Save className="h-5 w-5" />
              </div>
              <span>Edit Menu Selection</span>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-white/20 p-2">
                <UserPlus className="h-5 w-5" />
              </div>
              <span>Add Menu Selection</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-4 sm:p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="min-w-0 space-y-6"
          >
            {/* Attendee Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-base text-foreground">
                  Attendee Information
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel className="text-sm font-medium">
                        Title
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full min-w-0">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mr">Mr</SelectItem>
                          <SelectItem value="mrs">Mrs</SelectItem>
                          <SelectItem value="miss">Miss</SelectItem>
                          <SelectItem value="ms">Ms</SelectItem>
                          <SelectItem value="dr">Dr</SelectItem>
                          <SelectItem value="prof">Prof</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="min-w-0 sm:col-span-2">
                      <FormLabel className="text-sm font-medium">
                        Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name"
                          {...field}
                          className="h-10 w-full min-w-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Menu Selections Section - Fully Dynamic */}
            <div className="space-y-5">
              {menuItems.map((category, index) => {
                if (category.items.length === 0) return null;

                const style = getCategoryStyle(index);
                const Icon = style.icon;
                const isRequired = index < 3;

                return (
                  <FormField
                    key={category.title}
                    control={form.control}
                    name={`menuSelections.${category.title}`}
                    render={({ field }) => {
                      const selectedItem = field.value
                        ? category.items.find(
                            (i) => i.id.toString() === field.value
                          )
                        : null;
                      return (
                        <FormItem
                          className={`min-w-0 overflow-hidden rounded-lg border-2 bg-gradient-to-br p-4 ${style.gradient} to-transparent transition-colors hover:${style.borderColor}`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={`shrink-0 rounded-md p-1.5 ${style.bgColor}`}
                            >
                              <Icon
                                className={`h-5 w-5 ${style.textColor}`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <FormLabel className="block truncate text-sm font-semibold text-foreground sm:whitespace-normal">
                                {category.title}
                                {isRequired && (
                                  <span className="text-destructive"> *</span>
                                )}
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {isRequired
                                  ? "Select an item"
                                  : "Select an item (optional)"}
                              </p>
                            </div>
                          </div>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 min-w-0 w-full bg-white [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate">
                                {selectedItem ? (
                                  <span
                                    className="min-w-0 truncate text-left"
                                    data-slot="select-value"
                                  >
                                    {selectedItem.name}
                                  </span>
                                ) : (
                                  <SelectValue
                                    placeholder={`Select from ${category.title}`}
                                  />
                                )}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent
                              className="max-w-[min(100vw-2rem,var(--radix-select-trigger-width))]"
                              position="popper"
                            >
                              {category.items.map((item) => (
                                <SelectItem
                                  key={item.id}
                                  value={item.id.toString()}
                                  className="flex flex-col items-start gap-1 whitespace-normal break-words py-2.5 text-left"
                                >
                                  <span className="w-full font-medium">
                                    {item.name}
                                  </span>
                                  {item.desc && (
                                    <span className="w-full break-words pr-6 text-xs text-muted-foreground">
                                      {item.desc}
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                );
              })}
            </div>

            <Separator className="my-6" />

            {/* Allergen Section */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleAllergyModal}
                variant="event-outline"
                className="w-full h-11 text-sm border-2 hover:border-[var(--color-background)] hover:bg-[var(--color-primary)]/5 transition-all"
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                {hasAllergenData
                  ? "Edit Allergens & Dietary Requirements"
                  : "Add Allergens & Dietary Requirements"}
              </Button>

              {/* Display Selected Allergens - Only show if there's actual data */}
              {hasAllergenData && (
                <div className="space-y-3 p-4 bg-green-50/50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-semibold text-sm">
                      Dietary Requirements Saved
                    </span>
                  </div>

                  {(allergenData?.allergens?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                          Allergens
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {allergenData?.allergens?.map((allergen) => (
                            <Badge
                              key={allergen}
                              variant="destructive"
                              className="text-xs py-1 px-2.5"
                            >
                              {allergen}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {(allergenData?.dietaryRequirements?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          Dietary Preferences
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {allergenData?.dietaryRequirements?.map((diet) => (
                            <Badge
                              key={diet}
                              variant="secondary"
                              className="text-xs py-1 px-2.5"
                            >
                              {diet}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {allergenData?.additionalNotes &&
                    allergenData?.additionalNotes?.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-green-200">
                        <p className="text-sm font-semibold text-foreground">
                          Additional Notes
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {allergenData?.additionalNotes}
                        </p>
                      </div>
                    )}

                  <Button
                    type="button"
                    variant="link"
                    onClick={handleAllergyModal}
                    className="p-0 h-auto text-sm font-medium text-primary hover:text-primary/80"
                  >
                    Edit Requirements →
                  </Button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="event-primary"
                className="flex-1 h-11 text-sm font-semibold"
                disabled={!editingAttendee && isTableFull}
                title={
                  !editingAttendee && isTableFull
                    ? "Table is full. Please edit existing attendees."
                    : undefined
                }
              >
                {editingAttendee ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Selection
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Attendee
                  </>
                )}
              </Button>
              {editingAttendee && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="h-11 text-sm px-6 font-medium border-2"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Allergen Modal */}
      <AllergenModal
        open={allergenModalOpen}
        onOpenChange={setAllergenModalOpen}
        onSave={handleSaveAllergens}
        initialData={allergenData}
      />
    </Card>
  );
}
