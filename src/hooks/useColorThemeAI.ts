import { useState } from "react";
import { toast } from "sonner";

type ColorThemeRequest = {
  businessType?: string;
  mood?: string;
  style?: string;
  existingBrand?: string;
  customTheme?: string;
  eventType?: string;
  logoColorTone?: "dark" | "light" | "colorful" | "unsure";
  logoColorHex?: string;
};

type ColorTheme = {
  primary: string;
  secondary: string;
  header: string;
  footer: string;
  background: string;
  surface: string;
  text: string;
  textDimmed: string;
  socialLogin: {
    google: string;
    microsoft: string;
  };
};

type ColorThemeResponse = {
  colorTheme: ColorTheme;
  message: string;
};

export function useColorThemeAI() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateColorTheme = async (
    params: ColorThemeRequest = {}
  ): Promise<ColorTheme | null> => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/color-theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate color theme");
      }

      const data: ColorThemeResponse = await response.json();

      // Check if auto-adjustment occurred
      if (data.message.includes("auto-adjusted")) {
        toast.success("🎨 AI Colors Auto-Optimized!", {
          description: "Generated theme with perfect contrast automatically",
        });
      } else {
        toast.success("🎨 AI Color Theme Generated!", {
          description: "Professional color scheme created successfully",
        });
      }

      return data.colorTheme;
    } catch (error) {
      console.error("Error generating color theme:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Please try again later";

      toast.error("Failed to generate color theme", {
        description: errorMessage,
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateColorTheme,
    isGenerating,
  };
}
