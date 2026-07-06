"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MenuCategory,
  PersistedMenuChoice,
} from "@/services/customer/bookings/type";
import AllergenSection, { type AllergenData } from "./allergen-section";
import {
  getMenuCategorySelectionKey,
  persistedSelectionsToFormSelections,
} from "./menu-category-utils";

const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"];

interface AttendeeFormProps {
  menuCategories: MenuCategory[];
  tableLabel: string;
  seatNumber: number;
  totalSeats: number;
  editingAttendee: PersistedMenuChoice | null;
  isTableFull: boolean;
  isSaving: boolean;
  onSave: (data: AttendeeFormData) => void | Promise<void>;
  onCancelEdit: () => void;
  /** Flat layout inside a shared mobile card — no outer border. */
  embedded?: boolean;
}

export interface AttendeeFormData {
  title: string;
  fullName: string;
  menuSelections: Record<string, string>;
  allergens: string[];
  dietaryRequirements: string[];
  additionalNotes: string;
}

export default function AttendeeForm({
  menuCategories,
  tableLabel,
  seatNumber,
  totalSeats,
  editingAttendee,
  isTableFull,
  isSaving,
  onSave,
  onCancelEdit,
  embedded = false,
}: AttendeeFormProps) {
  const categoriesWithItems = useMemo(
    () => menuCategories.filter((c) => c.items.length > 0),
    [menuCategories],
  );

  const schema = useMemo(() => {
    const requiredCategories = categoriesWithItems.slice(0, 3);

    return z
      .object({
        title: z.string().optional(),
        fullName: z.string().min(2, "Full name must be at least 2 characters"),
        menuSelections: z.record(z.string(), z.string()),
      })
      .superRefine((data, ctx) => {
        requiredCategories.forEach((category, index) => {
          const selectionKey = getMenuCategorySelectionKey(category, index);
          if (!data.menuSelections[selectionKey]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Please select an item from "${category.title}"`,
              path: ["menuSelections", selectionKey],
            });
          }
        });
      });
  }, [categoriesWithItems]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      fullName: "",
      menuSelections: {} as Record<string, string>,
    },
  });

  const [allergenData, setAllergenData] = useState<AllergenData>({
    allergens: [],
    dietaryRequirements: [],
    additionalNotes: "",
  });

  const menuSelections = watch("menuSelections");

  useEffect(() => {
    if (editingAttendee) {
      reset({
        title: editingAttendee.title || "",
        fullName: editingAttendee.full_name || "",
        menuSelections: persistedSelectionsToFormSelections(
          editingAttendee.menu_selections || {},
          menuCategories,
        ),
      });
      setAllergenData({
        allergens: editingAttendee.allergens || [],
        dietaryRequirements: editingAttendee.dietary_requirements || [],
        additionalNotes: editingAttendee.additional_notes || "",
      });
    } else {
      reset({ title: "", fullName: "", menuSelections: {} });
      setAllergenData({
        allergens: [],
        dietaryRequirements: [],
        additionalNotes: "",
      });
    }
  }, [editingAttendee, menuCategories, reset]);

  const onSubmit = async (data: {
    title?: string;
    fullName: string;
    menuSelections: Record<string, string>;
  }) => {
    try {
      await onSave({
        title: data.title || "",
        fullName: data.fullName,
        menuSelections: data.menuSelections,
        ...allergenData,
      });

      if (!editingAttendee) {
        reset({ title: "", fullName: "", menuSelections: {} });
        setAllergenData({
          allergens: [],
          dietaryRequirements: [],
          additionalNotes: "",
        });
      }
    } catch {
      // Errors are handled by the save mutation / parent.
    }
  };

  const isEditing = !!editingAttendee;

  if (isTableFull && !isEditing && !isSaving) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 bg-green-50 p-10 text-center",
          embedded
            ? "rounded-none border-0"
            : "rounded-xl border border-gray-200",
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white text-xl font-bold">
          ✓
        </div>
        <p className="font-medium text-gray-900">All menu choices added</p>
        <p className="text-sm text-muted-foreground">
          Click Edit on an attendee to change their selection.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        "overflow-hidden bg-white",
        embedded
          ? "rounded-none border-0"
          : "rounded-xl border border-gray-200",
      )}
    >
      {/* Header */}
      <div className="flex items-baseline gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
        <span className="text-sm font-semibold text-gray-900">
          {isEditing ? "Edit attendee" : "Add attendee"}
        </span>
        <span className="text-xs text-gray-500">
          {tableLabel}, seat {seatNumber} of {totalSeats}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        {/* Title + Name */}
        <div className="grid grid-cols-[90px_1fr] gap-3 items-start">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-gray-500">Title</Label>
            <Select
              value={watch("title") || ""}
              onValueChange={(v) => setValue("title", v)}
            >
              <SelectTrigger className="h-10 text-sm rounded-lg">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {TITLE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-gray-500">
              Full Name *
            </Label>
            <Input
              {...register("fullName")}
              placeholder="Enter full name"
              className="h-10 text-sm rounded-lg"
            />
            {errors.fullName && (
              <p className="text-[11px] text-red-500">
                {errors.fullName.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Menu categories */}
        <div className="space-y-3.5">
          {categoriesWithItems.map((category, idx) => {
            const isRequired = idx < 3;
            const selectionKey = getMenuCategorySelectionKey(category, idx);
            return (
              <div key={selectionKey} className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  {category.title}{" "}
                  {isRequired ? (
                    <span className="text-red-400">*</span>
                  ) : (
                    <span className="font-normal italic text-gray-400">
                      (optional)
                    </span>
                  )}
                </Label>
                <Select
                  value={menuSelections?.[selectionKey] || ""}
                  onValueChange={(v) =>
                    setValue("menuSelections", {
                      ...menuSelections,
                      [selectionKey]: v,
                    })
                  }
                >
                  <SelectTrigger className="h-10 w-full text-sm rounded-lg">
                    <SelectValue
                      placeholder={`Select from ${category.title}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {category.items.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(errors as Record<string, { message?: string }>)?.menuSelections &&
                  (
                    errors.menuSelections as Record<
                      string,
                      { message?: string }
                    >
                  )?.[selectionKey] && (
                    <p className="text-[11px] text-red-500">
                      {
                        (
                          errors.menuSelections as Record<
                            string,
                            { message?: string }
                          >
                        )[selectionKey]?.message
                      }
                    </p>
                  )}
              </div>
            );
          })}
        </div>

        {/* Allergens */}
        <AllergenSection value={allergenData} onChange={setAllergenData} />
      </div>

      {/* Footer with save button */}
      <div className="flex items-center justify-center gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-4">
        {isEditing && (
          <Button
            type="button"
            variant="event-outline"
            size="sm"
            onClick={onCancelEdit}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="event-primary"
          type="submit"
          disabled={isSaving}
          className="px-6 text-sm font-semibold"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          {isEditing ? "Update attendee" : "Save attendee"}
        </Button>
      </div>
    </form>
  );
}
