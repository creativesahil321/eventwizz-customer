"use client";

import { useState } from "react";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface AllergenData {
  allergens: string[];
  dietaryRequirements: string[];
  additionalNotes: string;
}

const COMMON_ALLERGENS = [
  { id: "milk", label: "Milk & Dairy" },
  { id: "eggs", label: "Eggs" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "tree-nuts", label: "Tree Nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "wheat", label: "Wheat" },
  { id: "soybeans", label: "Soybeans" },
  { id: "sesame", label: "Sesame" },
  { id: "gluten", label: "Gluten" },
  { id: "celery", label: "Celery" },
  { id: "mustard", label: "Mustard" },
  { id: "sulphites", label: "Sulphites" },
  { id: "lupin", label: "Lupin" },
  { id: "molluscs", label: "Molluscs" },
];

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "gluten-free", label: "Gluten-Free" },
  { id: "dairy-free", label: "Dairy-Free" },
  { id: "low-carb", label: "Low Carb" },
  { id: "keto", label: "Keto" },
  { id: "paleo", label: "Paleo" },
  { id: "pescatarian", label: "Pescatarian" },
];

interface AllergenSectionProps {
  value: AllergenData;
  onChange: (data: AllergenData) => void;
}

export default function AllergenSection({
  value,
  onChange,
}: AllergenSectionProps) {
  const [expanded, setExpanded] = useState(
    value.allergens.length > 0 ||
      value.dietaryRequirements.length > 0 ||
      !!value.additionalNotes,
  );

  const toggleAllergen = (id: string) => {
    const next = value.allergens.includes(id)
      ? value.allergens.filter((a) => a !== id)
      : [...value.allergens, id];
    onChange({ ...value, allergens: next });
  };

  const toggleDietary = (id: string) => {
    const next = value.dietaryRequirements.includes(id)
      ? value.dietaryRequirements.filter((d) => d !== id)
      : [...value.dietaryRequirements, id];
    onChange({ ...value, dietaryRequirements: next });
  };

  const count = value.allergens.length + value.dietaryRequirements.length;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Toggle */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium text-gray-700 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Add Allergens & Dietary
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold rounded-full bg-indigo-600 text-white">
              {count}
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="space-y-4 border-t border-gray-100 p-3 sm:p-4">
          {/* Allergens */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Allergens
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-1.5 md:grid-cols-3">
              {COMMON_ALLERGENS.map((item) => (
                <label
                  key={item.id}
                  className="flex min-w-0 cursor-pointer items-start gap-2.5 py-0.5 text-[13px] leading-snug text-gray-700"
                >
                  <Checkbox
                    className="mt-0.5 shrink-0"
                    checked={value.allergens.includes(item.id)}
                    onCheckedChange={() => toggleAllergen(item.id)}
                  />
                  <span className="min-w-0 break-words">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dietary */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Dietary Requirements
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-1.5 md:grid-cols-3">
              {DIETARY_OPTIONS.map((item) => (
                <label
                  key={item.id}
                  className="flex min-w-0 cursor-pointer items-start gap-2.5 py-0.5 text-[13px] leading-snug text-gray-700"
                >
                  <Checkbox
                    className="mt-0.5 shrink-0"
                    checked={value.dietaryRequirements.includes(item.id)}
                    onCheckedChange={() => toggleDietary(item.id)}
                  />
                  <span className="min-w-0 break-words">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Additional Notes
            </Label>
            <Textarea
              placeholder="Any other dietary requirements or notes..."
              value={value.additionalNotes}
              onChange={(e) =>
                onChange({ ...value, additionalNotes: e.target.value })
              }
              rows={2}
              className="resize-none text-[13px] rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
