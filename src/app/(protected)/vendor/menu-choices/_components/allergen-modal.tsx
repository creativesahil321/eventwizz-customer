"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AllergenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AllergenData) => void;
  initialData?: AllergenData | null;
}

export interface AllergenData {
  allergens: string[];
  dietaryRequirements: string[];
  additionalNotes: string;
}

const commonAllergens = [
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

const dietaryOptions = [
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

export default function AllergenModal({
  open,
  onOpenChange,
  onSave,
  initialData,
}: AllergenModalProps) {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    initialData?.allergens || []
  );
  const [selectedDietary, setSelectedDietary] = useState<string[]>(
    initialData?.dietaryRequirements || []
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    initialData?.additionalNotes || ""
  );

  // Update state when initialData changes (reset if null/undefined)
  useEffect(() => {
    if (initialData) {
      setSelectedAllergens(initialData.allergens || []);
      setSelectedDietary(initialData.dietaryRequirements || []);
      setAdditionalNotes(initialData.additionalNotes || "");
    } else {
      // Reset form when initialData is cleared
      setSelectedAllergens([]);
      setSelectedDietary([]);
      setAdditionalNotes("");
    }
  }, [initialData]);

  const handleAllergenToggle = (id: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDietaryToggle = (id: string) => {
    setSelectedDietary((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave({
      allergens: selectedAllergens,
      dietaryRequirements: selectedDietary,
      additionalNotes,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedAllergens([]);
    setSelectedDietary([]);
    setAdditionalNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 space-y-1">
          <DialogTitle className="text-xl font-bold text-black sm:text-2xl">
            Allergen and Dietary Requirements
          </DialogTitle>
          <DialogDescription className="text-black text-sm">
            Please select all allergens and dietary requirements that apply to
            you. This information helps us ensure your meal is safe and
            suitable.
          </DialogDescription>
        </DialogHeader>

        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2 sm:pr-4"
          style={{ maxHeight: "55dvh" }}
        >
          <div className="space-y-6 pb-4">
            {/* Allergens Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-base font-semibold text-black sm:text-lg">
                  Allergens
                </h3>
                <p className="text-sm text-muted-foreground text-black">
                  Select any allergens you need to avoid
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {commonAllergens.map((allergen) => (
                  <div
                    key={allergen.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={allergen.id}
                      checked={selectedAllergens.includes(allergen.id)}
                      onCheckedChange={() => handleAllergenToggle(allergen.id)}
                    />
                    <Label
                      htmlFor={allergen.id}
                      className="text-sm font-normal cursor-pointer text-black"
                    >
                      {allergen.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Dietary Requirements Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-base font-semibold text-black sm:text-lg">
                  Dietary Requirements
                </h3>
                <p className="text-sm text-muted-foreground text-black">
                  Select your dietary preferences
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {dietaryOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={selectedDietary.includes(option.id)}
                      onCheckedChange={() => handleDietaryToggle(option.id)}
                    />
                    <Label
                      htmlFor={option.id}
                      className="text-sm font-normal cursor-pointer text-black"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label
                htmlFor="notes"
                className="text-base font-semibold text-black"
              >
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Please provide any additional information about your dietary needs or allergies..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                className="resize-none text-black"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-wrap gap-2 border-t pt-4 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="w-full sm:w-auto text-black"
          >
            Clear All
          </Button>
          <Button
            type="button"
            variant="event-primary"
            onClick={handleSave}
            className="w-full sm:w-auto"
          >
            Save Requirements
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
