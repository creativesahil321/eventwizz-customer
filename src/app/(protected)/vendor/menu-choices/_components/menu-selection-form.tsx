"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  // Dynamic form data: store selections by category title
  const [formData, setFormData] = useState<{
    title: string;
    fullName: string;
    menuSelections: Record<string, string>; // category title -> item ID
  }>({
    title: "",
    fullName: "",
    menuSelections: {},
  });

  const [allergenModalOpen, setAllergenModalOpen] = useState(false);
  const [allergenData, setAllergenData] = useState<AllergenData | null>(null);
  const [formResetKey, setFormResetKey] = useState(0); // Key to force Select remount

  // Populate form when editing (similar to onboarding's form.reset pattern)
  useEffect(() => {
    if (editingAttendee) {
      // Use menuSelections if available, otherwise fallback to legacy fields
      const existingMenuSelections = editingAttendee.menuSelections || {};
      const categoryOrder = getCategoryOrder(menuItems);

      // Map legacy fields to menuSelections for backward compatibility
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

      // Reset form data (like form.reset() in onboarding)
      setFormData({
        title: editingAttendee.title,
        fullName: editingAttendee.fullName,
        menuSelections,
      });
      setAllergenData({
        allergens: editingAttendee.allergens || [],
        dietaryRequirements: editingAttendee.dietaryRequirements || [],
        additionalNotes: editingAttendee.additionalNotes || "",
      });
    } else {
      // Initialize menuSelections with empty strings for all categories to ensure controlled inputs
      const initialMenuSelections: Record<string, string> = {};
      menuItems.forEach((category) => {
        initialMenuSelections[category.title] = "";
      });

      // Reset form when not editing (like onboarding)
      setFormData({
        title: "",
        fullName: "",
        menuSelections: initialMenuSelections,
      });
      setAllergenData(null);
      setFormResetKey((prev) => prev + 1); // Force Select reset when form clears
    }
  }, [editingAttendee, menuItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent adding new attendees when table is full (allow editing existing)
    if (!editingAttendee && isTableFull) {
      toast.error("Table is full", {
        description:
          "You cannot add more attendees. Please edit existing attendees.",
        duration: 5000,
      });
      return;
    }

    // Create dynamic schema based on available menu items
    const dynamicSchema = createMenuSelectionSchema(menuItems);

    // Validate using Zod schema (like onboarding pattern)
    const validationResult = dynamicSchema.safeParse({
      title: formData.title,
      fullName: formData.fullName,
      menuSelections: formData.menuSelections,
      allergens: allergenData?.allergens || [],
      dietaryRequirements: allergenData?.dietaryRequirements || [],
      additionalNotes: allergenData?.additionalNotes || "",
    });

    // If validation fails, show user-friendly errors (like onboarding)
    if (!validationResult.success) {
      const errors = validationResult.error.errors;
      const missingFields: string[] = [];

      // Map validation errors to user-friendly field names
      const fieldLabels: Record<string, string> = {
        fullName: "Full Name",
        menuSelections: "Menu Selections",
      };

      errors.forEach((error) => {
        if (error.path.length > 0) {
          const fieldName = error.path[0] as string;
          const label = fieldLabels[fieldName] || fieldName;

          // For menu selections, use the category title
          if (fieldName === "menuSelections" && error.path.length > 1) {
            const categoryTitle = error.path[1] as string;
            missingFields.push(categoryTitle);
          } else if (!missingFields.includes(label)) {
            missingFields.push(label);
          }
        } else {
          // Handle root-level errors
          if (error.message && !missingFields.includes(error.message)) {
            missingFields.push(error.message);
          }
        }
      });

      // Show toast with specific missing fields (like onboarding)
      toast.error(
        `Please fill in the following required fields: ${missingFields.join(
          ", "
        )}`,
        {
          description: "Please complete all required fields before submitting.",
          duration: 5000,
        }
      );

      // Scroll to first missing field (like onboarding)
      const firstError = errors[0];
      if (firstError) {
        if (firstError.path[0] === "fullName") {
          document
            .querySelector("#fullName")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (
          firstError.path[0] === "menuSelections" &&
          firstError.path[1]
        ) {
          // Find the category index and scroll to it
          const categoryTitle = firstError.path[1] as string;
          const categoryIndex = menuItems.findIndex(
            (cat) => cat.title === categoryTitle
          );
          if (categoryIndex >= 0) {
            const categoryElement = document.querySelector(
              `#category-${categoryIndex}`
            );
            categoryElement?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }
      }

      return;
    }

    // Map menuSelections to legacy fields for backward compatibility
    const categoryOrder = getCategoryOrder(menuItems);
    const legacyFields = mapMenuSelectionsToLegacy(
      formData.menuSelections,
      categoryOrder
    );

    // Create attendee data
    const attendeeData: Omit<
      AttendeeMenuSelection,
      "id" | "booking_id" | "date_key" | "table_id"
    > = {
      title: formData.title,
      fullName: formData.fullName,
      menuSelections: formData.menuSelections,
      // Legacy fields for backward compatibility
      ...legacyFields,
      allergens: allergenData?.allergens || [],
      dietaryRequirements: allergenData?.dietaryRequirements || [],
      additionalNotes: allergenData?.additionalNotes || "",
      status: "completed",
    };

    onSaveAttendee(attendeeData);

    // Always clear form after successful submission (for both new and edit)
    // Initialize menuSelections with empty strings for all categories
    const initialMenuSelections: Record<string, string> = {};
    menuItems.forEach((category) => {
      initialMenuSelections[category.title] = "";
    });

    setFormData({
      title: "",
      fullName: "",
      menuSelections: initialMenuSelections,
    });
    setAllergenData(null);
    setFormResetKey((prev) => prev + 1); // Force Select reset
  };

  const handleCancel = () => {
    // Initialize menuSelections with empty strings for all categories
    const initialMenuSelections: Record<string, string> = {};
    menuItems.forEach((category) => {
      initialMenuSelections[category.title] = "";
    });

    setFormData({
      title: "",
      fullName: "",
      menuSelections: initialMenuSelections,
    });
    setAllergenData(null);
    setFormResetKey((prev) => prev + 1); // Force Select reset
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
    <Card className="shadow-lg h-full min-h-0 flex flex-col border-2">
      <CardHeader
        className="rounded-t-lg border-b-2 py-4"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
        }}
      >
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2.5">
          {editingAttendee ? (
            <>
              <div className="p-2 bg-white/20 rounded-lg">
                <Save className="h-5 w-5" />
              </div>
              <span>Edit Menu Selection</span>
            </>
          ) : (
            <>
              <div className="p-2 bg-white/20 rounded-lg">
                <UserPlus className="h-5 w-5" />
              </div>
              <span>Add Menu Selection</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-6 flex flex-col overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Attendee Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Attendee Information
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title
                </Label>
                <Select
                  key={`title-${formResetKey}`}
                  value={formData.title}
                  onValueChange={(value) =>
                    setFormData({ ...formData, title: value })
                  }
                >
                  <SelectTrigger id="title" className="w-full h-10">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mr">Mr</SelectItem>
                    <SelectItem value="mrs">Mrs</SelectItem>
                    <SelectItem value="miss">Miss</SelectItem>
                    <SelectItem value="ms">Ms</SelectItem>
                    <SelectItem value="dr">Dr</SelectItem>
                    <SelectItem value="prof">Prof</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full h-10"
                  required
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Menu Selections Section - Fully Dynamic */}
          <div className="space-y-5">
            {menuItems.map((category, index) => {
              if (category.items.length === 0) return null;

              const style = getCategoryStyle(index);
              const Icon = style.icon;
              const isRequired = index < 3; // First 3 categories are typically required
              // Always use empty string instead of undefined to keep Select controlled
              const categoryValue =
                formData.menuSelections[category.title] || "";

              return (
                <div
                  key={category.title}
                  className={`space-y-2.5 p-4 rounded-lg border-2 bg-gradient-to-br ${style.gradient} to-transparent hover:${style.borderColor} transition-colors`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-md ${style.bgColor}`}>
                      <Icon className={`h-5 w-5 ${style.textColor}`} />
                    </div>
                    <div className="flex-1">
                      <Label
                        htmlFor={`category-${index}`}
                        className="text-sm font-semibold text-foreground"
                      >
                        {category.title}
                        {isRequired && (
                          <span className="text-destructive"> *</span>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isRequired
                          ? "Select an item"
                          : "Select an item (optional)"}
                      </p>
                    </div>
                  </div>
                  <Select
                    key={`${category.title}-${formResetKey}`}
                    value={categoryValue}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        menuSelections: {
                          ...formData.menuSelections,
                          [category.title]: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger
                      id={`category-${index}`}
                      className="w-full h-11 bg-white"
                    >
                      <SelectValue
                        placeholder={`Select from ${category.title}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {category.items.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name}
                          {item.desc && (
                            <span className="text-xs text-muted-foreground ml-2">
                              - {item.desc}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

                {allergenData?.allergens?.length &&
                  allergenData?.allergens?.length > 0 && (
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

                {allergenData?.dietaryRequirements?.length &&
                  allergenData?.dietaryRequirements?.length > 0 && (
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
