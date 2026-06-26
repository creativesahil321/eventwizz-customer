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
    "suggestions",
  );
  const [selectedTheme, setSelectedTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [existingBrand, setExistingBrand] = useState("");
  const [logoColorTone, setLogoColorTone] = useState<
    "dark" | "light" | "colorful" | "unsure"
  >("unsure");
  const [logoColorHex, setLogoColorHex] = useState("");

  // Approved event categories with professional theme guidance
  const themeSuggestions = [
    {
      id: "christmas-events",
      label: "Christmas Events",
      icon: TreePine,
      description: "Festive holiday palettes",
    },
    {
      id: "new-year-parties",
      label: "New Year Parties",
      icon: Sparkles,
      description: "Midnight glam and celebratory tones",
    },
    {
      id: "halloween-events",
      label: "Halloween Events",
      icon: Star,
      description: "Dramatic spooky contrasts",
    },
    {
      id: "valentines-day-specials",
      label: "Valentine's Day Specials",
      icon: Heart,
      description: "Romantic, premium warm tones",
    },
    {
      id: "easter-events",
      label: "Easter Events",
      icon: Cake,
      description: "Soft spring-inspired palettes",
    },
    {
      id: "bottomless-brunch",
      label: "Bottomless Brunch",
      icon: Cake,
      description: "Bright daytime social colors",
    },
    {
      id: "lipstick-powder-and-paint",
      label: "Lipstick Powder & Paint",
      icon: Palette,
      description: "Beauty and lifestyle-inspired colors",
    },
    {
      id: "live-music-and-gigs",
      label: "Live Music & Gigs",
      icon: Wand2,
      description: "Energetic stage-ready palette",
    },
    {
      id: "dj-nights-and-club-events",
      label: "DJ Nights & Club Events",
      icon: Zap,
      description: "Nightlife, neon-ready contrast",
    },
    {
      id: "comedy-shows",
      label: "Comedy Shows",
      icon: Star,
      description: "Friendly and vibrant show colors",
    },
    {
      id: "drag-shows-and-brunches",
      label: "Drag Shows & Brunches",
      icon: Sparkles,
      description: "Bold expressive palettes",
    },
    {
      id: "themed-parties",
      label: "Themed Parties",
      icon: Wand2,
      description: "Flexible party-based combinations",
    },
    {
      id: "food-and-drink-festivals",
      label: "Food & Drink Festivals",
      icon: Palette,
      description: "Fresh, appetizing festival tones",
    },
    {
      id: "street-food-markets",
      label: "Street Food Markets",
      icon: Palette,
      description: "Urban and warm market colors",
    },
    {
      id: "pride-events",
      label: "Pride Events",
      icon: Sparkles,
      description: "Inclusive and vibrant multicolor style",
    },
    {
      id: "afrobeats-bashment-nights",
      label: "Afrobeats / Bashment Nights",
      icon: Zap,
      description: "Rhythmic, bold evening colors",
    },
    {
      id: "day-raves-outdoor-parties",
      label: "Day Raves / Outdoor Parties",
      icon: TreePine,
      description: "Bright outdoor event palettes",
    },
    {
      id: "open-mic-spoken-word",
      label: "Open Mic & Spoken Word",
      icon: Wand2,
      description: "Artistic and intimate stage colors",
    },
    {
      id: "networking-business-events",
      label: "Networking & Business Events",
      icon: Palette,
      description: "Clean professional corporate tones",
    },
    {
      id: "workshops-masterclasses",
      label: "Workshops & Masterclasses",
      icon: Wand2,
      description: "Focused educational palettes",
    },
    {
      id: "diwali",
      label: "Diwali",
      icon: Sparkles,
      description: "Festive jewel-inspired tones",
    },
    {
      id: "eid",
      label: "Eid",
      icon: Star,
      description: "Elegant celebratory color harmony",
    },
  ];

  // Popular custom theme examples
  const customExamples = [
    "Christmas Events colors",
    "New Year Parties colors",
    "Halloween Events colors",
    "Valentine's Day Specials colors",
    "Easter Events colors",
    "Bottomless Brunch colors",
    "Lipstick Powder & Paint colors",
    "Live Music & Gigs colors",
    "DJ Nights & Club Events colors",
    "Comedy Shows colors",
    "Drag Shows & Brunches colors",
    "Themed Parties colors",
    "Food & Drink Festivals colors",
    "Street Food Markets colors",
    "Pride Events colors",
    "Afrobeats / Bashment Nights colors",
    "Day Raves / Outdoor Parties colors",
    "Open Mic & Spoken Word colors",
    "Networking & Business Events colors",
    "Workshops & Masterclasses colors",
    "Diwali colors",
    "Eid colors",
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
      logoColorTone,
      logoColorHex: logoColorHex.trim() || undefined,
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
      setLogoColorTone("unsure");
      setLogoColorHex("");
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
                  placeholder="e.g., Christmas Events colors, DJ Nights & Club Events colors, Eid colors..."
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use one of your approved event categories to generate
                  professional, on-brand colors.
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
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="space-y-1">
              <Label>What is your site logo color?</Label>
              <p className="text-xs text-muted-foreground">
                This helps AI choose a readable header style first.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "dark", label: "Dark Logo" },
                { id: "light", label: "Light Logo" },
                { id: "colorful", label: "Colorful Logo" },
                { id: "unsure", label: "Not Sure" },
              ].map((tone) => (
                <Button
                  key={tone.id}
                  type="button"
                  variant={logoColorTone === tone.id ? "event-primary" : "outline"}
                  className="justify-start"
                  onClick={() =>
                    setLogoColorTone(
                      tone.id as "dark" | "light" | "colorful" | "unsure",
                    )
                  }
                >
                  {tone.label}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="logo-color-hex">Logo color hex (optional)</Label>
              <Input
                id="logo-color-hex"
                placeholder="e.g. #000000"
                value={logoColorHex}
                onChange={(e) => setLogoColorHex(e.target.value)}
              />
            </div>
          </div>

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
