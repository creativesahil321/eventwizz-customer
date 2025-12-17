"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LoaderCircle,
  Palette,
  Sparkles,
  Wand2,
  Heart,
  Cake,
  Star,
  TreePine,
  Zap,
} from "lucide-react";
import { useColorThemeAI } from "@/hooks/useColorThemeAI";
import { SiteEssentialsFormValues } from "../_lib/schema";

interface AIColorThemeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIColorThemeModal({
  open,
  onOpenChange,
}: AIColorThemeModalProps) {
  const form = useFormContext<SiteEssentialsFormValues>();
  const { generateColorTheme, isGenerating } = useColorThemeAI();

  const [inputMode, setInputMode] = useState<"suggestions" | "custom">(
    "suggestions"
  );
  const [selectedTheme, setSelectedTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [existingBrand, setExistingBrand] = useState("");

  // Popular theme suggestions with icons
  const themeSuggestions = [
    {
      id: "wedding",
      label: "Wedding Theme",
      icon: Heart,
      description: "Elegant romantic colors",
    },
    {
      id: "birthday",
      label: "Birthday Party",
      icon: Cake,
      description: "Vibrant celebratory colors",
    },
    {
      id: "christmas",
      label: "Christmas Theme",
      icon: TreePine,
      description: "Festive holiday colors",
    },
    {
      id: "spiderman",
      label: "Spider-Man Theme",
      icon: Zap,
      description: "Classic red & blue superhero",
    },
    {
      id: "boys-movie",
      label: "Boys Movie Theme",
      icon: Star,
      description: "Bold masculine colors",
    },
    {
      id: "corporate",
      label: "Corporate Event",
      icon: Palette,
      description: "Professional business colors",
    },
    {
      id: "music-concert",
      label: "Music Concert",
      icon: Sparkles,
      description: "Dynamic rhythm colors",
    },
    {
      id: "sports",
      label: "Sports Event",
      icon: Wand2,
      description: "Energetic athletic colors",
    },
    {
      id: "art-creative",
      label: "Art & Creative",
      icon: Palette,
      description: "Expressive artistic colors",
    },
    {
      id: "nature-outdoor",
      label: "Nature Outdoor",
      icon: TreePine,
      description: "Earth tones & natural colors",
    },
    {
      id: "vintage-retro",
      label: "Vintage Retro",
      icon: Star,
      description: "Classic nostalgic colors",
    },
    {
      id: "luxury-premium",
      label: "Luxury Premium",
      icon: Heart,
      description: "Sophisticated high-end colors",
    },
    {
      id: "minimalist",
      label: "Minimalist",
      icon: Zap,
      description: "Clean simple colors",
    },
    {
      id: "dark-gothic",
      label: "Dark Gothic",
      icon: Star,
      description: "Mysterious dramatic colors",
    },
    {
      id: "bright-vibrant",
      label: "Bright Vibrant",
      icon: Sparkles,
      description: "Energetic lively colors",
    },
    {
      id: "pastel-soft",
      label: "Pastel Soft",
      icon: Heart,
      description: "Gentle soothing colors",
    },
    {
      id: "neon-electric",
      label: "Neon Electric",
      icon: Zap,
      description: "Bold glowing colors",
    },
    {
      id: "ocean-sea",
      label: "Ocean Sea",
      icon: TreePine,
      description: "Blues & teals",
    },
    {
      id: "forest-woodland",
      label: "Forest Woodland",
      icon: TreePine,
      description: "Greens & browns",
    },
    {
      id: "sunset-sunrise",
      label: "Sunset Sunrise",
      icon: Star,
      description: "Warm oranges & pinks",
    },
    {
      id: "galaxy-space",
      label: "Galaxy Space",
      icon: Sparkles,
      description: "Deep purples & cosmic colors",
    },
    {
      id: "tropical-island",
      label: "Tropical Island",
      icon: TreePine,
      description: "Bright island colors",
    },
    {
      id: "autumn-fall",
      label: "Autumn Fall",
      icon: TreePine,
      description: "Warm oranges & reds",
    },
    {
      id: "spring-fresh",
      label: "Spring Fresh",
      icon: Heart,
      description: "Fresh greens & pinks",
    },
    {
      id: "winter-snow",
      label: "Winter Snow",
      icon: Star,
      description: "Cool blues & whites",
    },
    {
      id: "summer-beach",
      label: "Summer Beach",
      icon: TreePine,
      description: "Bright yellows & blues",
    },
  ];

  // Popular custom theme examples
  const customExamples = [
    "Wedding event colors",
    "Spider-Man theme colors",
    "Christmas theme colors",
    "Boys movie theme colors",
    "Birthday party colors",
    "Corporate event colors",
    "Music concert colors",
    "Art gallery colors",
    "Sports team colors",
    "Luxury brand colors",
    "Minimalist design colors",
    "Dark mode colors",
    "Neon party colors",
    "Ocean theme colors",
    "Forest theme colors",
    "Sunset colors",
    "Galaxy theme colors",
    "Tropical colors",
    "Autumn colors",
    "Spring colors",
    "Winter colors",
    "Summer colors",
  ];

  const handleGenerate = async () => {
    let themeToGenerate = "";

    if (inputMode === "suggestions" && selectedTheme) {
      const theme = themeSuggestions.find((t) => t.id === selectedTheme);
      themeToGenerate = theme ? theme.label : selectedTheme;
    } else if (inputMode === "custom" && customTheme.trim()) {
      themeToGenerate = customTheme.trim();
    } else {
      return; // No theme selected
    }

    const colorTheme = await generateColorTheme({
      customTheme: themeToGenerate,
      existingBrand: existingBrand.trim() || undefined,
    });

    if (colorTheme) {
      // Apply the generated colors to the form
      form.setValue("colors.primary", colorTheme.primary, {
        shouldDirty: true,
      });
      form.setValue("colors.secondary", colorTheme.secondary, {
        shouldDirty: true,
      });
      form.setValue("colors.header", colorTheme.header, { shouldDirty: true });
      form.setValue("colors.footer", colorTheme.footer, { shouldDirty: true });
      form.setValue("colors.background", colorTheme.background, {
        shouldDirty: true,
      });
      form.setValue("colors.surface", colorTheme.surface, {
        shouldDirty: true,
      });
      form.setValue("colors.text", colorTheme.text, { shouldDirty: true });
      form.setValue("colors.textDimmed", colorTheme.textDimmed, {
        shouldDirty: true,
      });
      form.setValue(
        "colors.socialLogin.google",
        colorTheme.socialLogin.google,
        { shouldDirty: true }
      );
      form.setValue(
        "colors.socialLogin.microsoft",
        colorTheme.socialLogin.microsoft,
        { shouldDirty: true }
      );

      // Close the modal
      onOpenChange(false);

      // Reset form
      setSelectedTheme("");
      setCustomTheme("");
      setExistingBrand("");
    }
  };

  const handleExampleClick = (example: string) => {
    setCustomTheme(example);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto text-black">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate AI Color Theme
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Input Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <Button
              type="button"
              variant={inputMode === "suggestions" ? "event-primary" : "ghost"}
              size="sm"
              onClick={() => setInputMode("suggestions")}
              className="flex-1"
            >
              <Star className="h-4 w-4 mr-2" />
              Popular Themes
            </Button>
            <Button
              type="button"
              variant={inputMode === "custom" ? "event-primary" : "ghost"}
              size="sm"
              onClick={() => setInputMode("custom")}
              className="flex-1"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Custom Input
            </Button>
          </div>

          {/* Theme Suggestions Mode */}
          {inputMode === "suggestions" && (
            <div className="space-y-4">
              <Label>Choose a Popular Theme</Label>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {themeSuggestions.map((theme) => {
                  const IconComponent = theme.icon;
                  return (
                    <Button
                      key={theme.id}
                      type="button"
                      variant={
                        selectedTheme === theme.id ? "event-primary" : "outline"
                      }
                      className="h-auto p-3 flex flex-col items-start gap-1"
                      onClick={() => setSelectedTheme(theme.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <IconComponent className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {theme.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground text-left">
                        {theme.description}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Input Mode */}
          {inputMode === "custom" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-theme">Describe Your Theme</Label>
                <Input
                  id="custom-theme"
                  placeholder="e.g., Wedding event colors, Christmas colors , Hero theme..."
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Be creative! Describe any theme you want - seasons, events,
                  movies, colors, etc.
                </p>
              </div>

              {/* Popular Examples */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Popular Examples (click to use)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {customExamples.slice(0, 12).map((example) => (
                    <Button
                      key={example}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleExampleClick(example)}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Existing Brand Colors */}
          <div className="space-y-2">
            <Label htmlFor="existing-brand">
              Existing Brand Colors (Optional)
            </Label>
            <Textarea
              id="existing-brand"
              placeholder="e.g., Our brand uses blue (#1e40af) and gold (#f59e0b)..."
              value={existingBrand}
              onChange={(e) => setExistingBrand(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Mention any existing brand colors to ensure the AI generates a
              complementary theme
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                (inputMode === "suggestions" && !selectedTheme) ||
                (inputMode === "custom" && !customTheme.trim())
              }
              className="flex-1"
              variant="event-primary"
            >
              {isGenerating ? (
                <>
                  <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Palette className="h-4 w-4 mr-2" />
                  Generate Theme
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
