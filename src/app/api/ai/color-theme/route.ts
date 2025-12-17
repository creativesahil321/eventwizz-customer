import { NextResponse } from "next/server";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";

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

// Helper function to normalize hex colors (convert #333 to #333333)
function normalizeHexColor(color: string): string {
  if (color.length === 4) {
    // Convert #333 to #333333
    return color + color.slice(1);
  }
  return color;
}

// Helper function to calculate color brightness (0-255)
function getColorBrightness(hexColor: string): number {
  const normalizedColor = normalizeHexColor(hexColor);
  const r = parseInt(normalizedColor.substr(1, 2), 16);
  const g = parseInt(normalizedColor.substr(3, 2), 16);
  const b = parseInt(normalizedColor.substr(5, 2), 16);
  // Use luminance formula
  return r * 0.299 + g * 0.587 + b * 0.114;
}

// Helper function to check if color is dark (brightness < 128)
function isDarkColor(hexColor: string): boolean {
  return getColorBrightness(hexColor) < 128;
}

// Helper function to auto-adjust colors for proper contrast
function autoAdjustContrast(colorTheme: ColorTheme): ColorTheme {
  const textIsDark = isDarkColor(colorTheme.text);

  // Create adjusted theme with proper contrast
  const adjustedTheme = { ...colorTheme };

  // If text is light (#ffffff), make header/footer dark
  if (!textIsDark) {
    // Text is light, so header/footer should be dark
    if (!isDarkColor(colorTheme.header)) {
      adjustedTheme.header = "#1a202c"; // Dark header for light text
    }
    if (!isDarkColor(colorTheme.footer)) {
      adjustedTheme.footer = "#2d3748"; // Dark footer for light text
    }
  } else {
    // Text is dark, so header/footer should be light
    if (isDarkColor(colorTheme.header)) {
      adjustedTheme.header = "#ffffff"; // Light header for dark text
    }
    if (isDarkColor(colorTheme.footer)) {
      adjustedTheme.footer = "#f8f9fa"; // Light footer for dark text
    }
  }

  return adjustedTheme;
}

// Helper function to validate contrast and return detailed info
function validateContrast(colorTheme: ColorTheme): {
  hasErrors: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const textIsDark = isDarkColor(colorTheme.text);
  const headerIsDark = isDarkColor(colorTheme.header);
  const footerIsDark = isDarkColor(colorTheme.footer);

  // Check text vs header contrast
  if (textIsDark === headerIsDark) {
    errors.push(
      `Poor contrast: Text (${colorTheme.text}) and header (${colorTheme.header}) have similar brightness levels. ` +
        `Text is ${textIsDark ? "dark" : "light"} but header is also ${
          headerIsDark ? "dark" : "light"
        }.`
    );
  }

  // Check text vs footer contrast
  if (textIsDark === footerIsDark) {
    errors.push(
      `Poor contrast: Text (${colorTheme.text}) and footer (${colorTheme.footer}) have similar brightness levels. ` +
        `Text is ${textIsDark ? "dark" : "light"} but footer is also ${
          footerIsDark ? "dark" : "light"
        }.`
    );
  }

  return {
    hasErrors: errors.length > 0,
    errors,
  };
}

export async function POST(req: Request) {
  try {
    const { businessType, mood, style, existingBrand, customTheme, eventType } =
      await req.json();

    if (!env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service is not properly configured" },
        { status: 500 }
      );
    }

    // Build contextual prompt based on user inputs
    let contextPrompt = "";

    // Handle custom theme input (free text)
    if (customTheme && customTheme.trim()) {
      contextPrompt = `Generate a professional color theme for: "${customTheme.trim()}". `;

      // Add specific theme context based on common keywords
      const themeLower = customTheme.toLowerCase();

      if (themeLower.includes("wedding") || themeLower.includes("bridal")) {
        contextPrompt +=
          "Create elegant, romantic colors perfect for weddings with soft pastels, golds, and whites. ";
      } else if (
        themeLower.includes("birthday") ||
        themeLower.includes("party")
      ) {
        contextPrompt +=
          "Create vibrant, celebratory colors perfect for birthday parties with bright, fun colors. ";
      } else if (
        themeLower.includes("christmas") ||
        themeLower.includes("holiday")
      ) {
        contextPrompt +=
          "Create festive Christmas/holiday colors with traditional reds, greens, golds, and whites. ";
      } else if (
        themeLower.includes("spiderman") ||
        themeLower.includes("spider-man")
      ) {
        contextPrompt +=
          "Create Spider-Man themed colors with classic red, blue, and web-inspired accents. ";
      } else if (
        themeLower.includes("superhero") ||
        themeLower.includes("comic")
      ) {
        contextPrompt +=
          "Create superhero/comic book themed colors with bold, vibrant colors. ";
      } else if (
        themeLower.includes("movie") ||
        themeLower.includes("cinema")
      ) {
        contextPrompt +=
          "Create movie/cinema themed colors with dramatic, cinematic colors. ";
      } else if (
        themeLower.includes("boys") ||
        themeLower.includes("masculine")
      ) {
        contextPrompt +=
          "Create masculine, bold colors perfect for boys' events with strong, vibrant colors. ";
      } else if (
        themeLower.includes("girls") ||
        themeLower.includes("feminine")
      ) {
        contextPrompt +=
          "Create feminine, elegant colors perfect for girls' events with soft, beautiful colors. ";
      } else if (
        themeLower.includes("corporate") ||
        themeLower.includes("business")
      ) {
        contextPrompt +=
          "Create professional, corporate colors with sophisticated, business-appropriate colors. ";
      } else if (
        themeLower.includes("sports") ||
        themeLower.includes("athletic")
      ) {
        contextPrompt +=
          "Create energetic, sports-themed colors with dynamic, athletic colors. ";
      } else if (
        themeLower.includes("music") ||
        themeLower.includes("concert")
      ) {
        contextPrompt +=
          "Create musical, concert-themed colors with dynamic, rhythm-inspired colors. ";
      } else if (
        themeLower.includes("art") ||
        themeLower.includes("creative")
      ) {
        contextPrompt +=
          "Create artistic, creative colors with expressive, imaginative colors. ";
      } else if (
        themeLower.includes("nature") ||
        themeLower.includes("outdoor")
      ) {
        contextPrompt +=
          "Create natural, outdoor-themed colors with earth tones and nature-inspired colors. ";
      } else if (
        themeLower.includes("vintage") ||
        themeLower.includes("retro")
      ) {
        contextPrompt +=
          "Create vintage, retro colors with classic, nostalgic color palettes. ";
      } else if (
        themeLower.includes("modern") ||
        themeLower.includes("contemporary")
      ) {
        contextPrompt +=
          "Create modern, contemporary colors with sleek, current design trends. ";
      } else if (
        themeLower.includes("luxury") ||
        themeLower.includes("premium")
      ) {
        contextPrompt +=
          "Create luxury, premium colors with sophisticated, high-end color palettes. ";
      } else if (
        themeLower.includes("minimalist") ||
        themeLower.includes("minimal")
      ) {
        contextPrompt +=
          "Create minimalist colors with clean, simple, and elegant color schemes. ";
      } else if (themeLower.includes("dark") || themeLower.includes("gothic")) {
        contextPrompt +=
          "Create dark, gothic colors with mysterious, dramatic color palettes. ";
      } else if (
        themeLower.includes("bright") ||
        themeLower.includes("vibrant")
      ) {
        contextPrompt +=
          "Create bright, vibrant colors with energetic, lively color schemes. ";
      } else if (themeLower.includes("pastel") || themeLower.includes("soft")) {
        contextPrompt +=
          "Create pastel, soft colors with gentle, soothing color palettes. ";
      } else if (
        themeLower.includes("neon") ||
        themeLower.includes("electric")
      ) {
        contextPrompt +=
          "Create neon, electric colors with bold, glowing color schemes. ";
      } else if (themeLower.includes("ocean") || themeLower.includes("sea")) {
        contextPrompt +=
          "Create ocean-themed colors with blues, teals, and sea-inspired colors. ";
      } else if (
        themeLower.includes("forest") ||
        themeLower.includes("woodland")
      ) {
        contextPrompt +=
          "Create forest-themed colors with greens, browns, and woodland colors. ";
      } else if (
        themeLower.includes("sunset") ||
        themeLower.includes("sunrise")
      ) {
        contextPrompt +=
          "Create sunset/sunrise colors with warm oranges, pinks, and purples. ";
      } else if (
        themeLower.includes("galaxy") ||
        themeLower.includes("space")
      ) {
        contextPrompt +=
          "Create galaxy/space colors with deep purples, blues, and cosmic colors. ";
      } else if (
        themeLower.includes("tropical") ||
        themeLower.includes("island")
      ) {
        contextPrompt +=
          "Create tropical colors with bright, island-inspired colors. ";
      } else if (themeLower.includes("autumn") || themeLower.includes("fall")) {
        contextPrompt +=
          "Create autumn colors with warm oranges, reds, and browns. ";
      } else if (
        themeLower.includes("spring") ||
        themeLower.includes("fresh")
      ) {
        contextPrompt +=
          "Create spring colors with fresh greens, pinks, and light colors. ";
      } else if (themeLower.includes("winter") || themeLower.includes("snow")) {
        contextPrompt +=
          "Create winter colors with cool blues, whites, and silver tones. ";
      } else if (
        themeLower.includes("summer") ||
        themeLower.includes("beach")
      ) {
        contextPrompt +=
          "Create summer colors with bright yellows, blues, and beach colors. ";
      } else {
        contextPrompt += "Create colors that match the theme described. ";
      }
    } else {
      // Fallback to original business type approach
      contextPrompt = "Generate a professional color theme for a ";

      if (eventType) {
        contextPrompt += `${eventType} event `;
      } else if (businessType) {
        contextPrompt += `${businessType} business `;
      } else {
        contextPrompt += "event management business ";
      }

      if (mood) {
        contextPrompt += `with a ${mood} mood `;
      }

      if (style) {
        contextPrompt += `and ${style} style `;
      }
    }

    if (existingBrand) {
      contextPrompt += `that complements existing brand colors: ${existingBrand} `;
    }

    contextPrompt += `

IMPORTANT: Ensure the text color and header/footer colors have opposing brightness levels.
For example, if you choose dark text like #333333, then header and footer MUST be light colors like #ffffff or #f8f9fa.
If you choose light text like #ffffff, then header and footer MUST be dark colors like #000000 or #2d3748.
NEVER use the same color or similar brightness for text and header/footer.`;

    const systemPrompt = `You are a professional UI/UX color scheme designer specializing in web applications and event platforms.

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY a valid JSON object
2. NO explanations, descriptions, or additional text
3. ALL colors must be in HEX format (#RRGGBB or #RGB)
4. Prefer 6-character hex format (#RRGGBB) for better precision
5. MANDATORY: Ensure high contrast between text and header/footer colors
6. Create cohesive, professional color palettes
7. Consider modern design trends and color psychology
8. ABSOLUTE RULE: Text and header/footer MUST have opposing brightness levels

Required JSON structure:
{
  "primary": "#hexcolor",
  "secondary": "#hexcolor", 
  "header": "#hexcolor",
  "footer": "#hexcolor",
  "background": "#hexcolor",
  "surface": "#hexcolor",
  "text": "#hexcolor",
  "textDimmed": "#hexcolor",
  "socialLogin": {
    "google": "#hexcolor",
    "microsoft": "#hexcolor"
  }
}

IMPORTANT: For background, you can use either:
1. A solid hex color (#RRGGBB) for simple themes
2. A CSS linear-gradient for more dynamic themes (e.g., "linear-gradient(to right, #ff6b6b, #4ecdc4)")
Choose based on the theme - gradients work great for dynamic themes like sunsets, ocean, galaxy, etc.

Guidelines:
- Primary: Main brand color, should be vibrant and memorable
- Secondary: Complementary accent color
- Header/Footer: Container backgrounds that should contrast with text colors
- Background: Base background color (solid hex color or CSS gradient)
- Surface: Card/container backgrounds, should contrast with background
- Text: High contrast with surface/background for readability
- TextDimmed: Secondary text color, still readable but less prominent
- Social Login: Colors that work well with respective brand guidelines

CRITICAL CONTRAST RULES (MUST FOLLOW):
1. If text is DARK (black, dark gray), then header/footer MUST be LIGHT (white, light gray, light colors)
2. If text is LIGHT (white, light gray), then header/footer MUST be DARK (black, dark gray, dark colors)
3. Text and textDimmed should always be readable on surface color
4. Header and footer colors should provide strong contrast for text visibility
5. NEVER use similar darkness levels for text and header/footer backgrounds

FORBIDDEN COMBINATIONS (DO NOT USE):
- Text: #333333 + Header/Footer: #333333 (BOTH DARK - INVISIBLE!)
- Text: #000000 + Header/Footer: #222222 (BOTH DARK - INVISIBLE!)
- Text: #ffffff + Header/Footer: #f5f5f5 (BOTH LIGHT - INVISIBLE!)
- Text: #666666 + Header/Footer: #555555 (BOTH DARK - POOR CONTRAST!)

CORRECT COMBINATIONS (USE THESE):
- Text: #333333 (dark) → Header/Footer: #ffffff, #f8f9fa (light)
- Text: #ffffff (light) → Header/Footer: #000000, #1a1a1a (dark)
- Text: #000000 (dark) → Header/Footer: #ffffff, #f5f5f5 (light)
- Text: #f8f9fa (light) → Header/Footer: #2d3748, #1a202c (dark)

Remember: Return solid hex colors for most fields, but background can be either solid hex color or CSS gradient for more dynamic themes.`;

    // Use the fallback system to try models in sequence
    const result: FallbackResult = await tryModelsWithFallback(
      env.GROQ_API_KEY,
      {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: contextPrompt,
          },
        ],
        temperature: 0.8, // Higher creativity for color generation
        max_tokens: 500,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to generate color theme. API error.",
          details: result.error,
          modelsTried: result.modelsTried,
        },
        { status: result.status || 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "No response data from AI" },
        { status: 500 }
      );
    }

    const aiResponse = result.data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      return NextResponse.json(
        { error: "Failed to generate color theme. No response from AI." },
        { status: 500 }
      );
    }

    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const colorTheme = JSON.parse(jsonMatch[0]) as ColorTheme;

      // Validate the color theme structure
      const requiredFields = [
        "primary",
        "secondary",
        "header",
        "footer",
        "background",
        "surface",
        "text",
        "textDimmed",
      ];

      for (const field of requiredFields) {
        if (!colorTheme[field as keyof ColorTheme]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      if (
        !colorTheme.socialLogin ||
        !colorTheme.socialLogin.google ||
        !colorTheme.socialLogin.microsoft
      ) {
        throw new Error("Missing socialLogin colors");
      }

      // Validate hex colors (except background which can be gradient)
      // Accept both 3-char (#333) and 6-char (#333333) hex formats
      const hexColorRegex = /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/;
      const gradientRegex = /^linear-gradient\(/;

      for (const [key, value] of Object.entries(colorTheme)) {
        if (key === "socialLogin") continue; // Handle separately

        if (key === "background") {
          // Background can be hex or gradient
          if (
            typeof value === "string" &&
            !hexColorRegex.test(value) &&
            !gradientRegex.test(value)
          ) {
            throw new Error(`Invalid background color format: ${value}`);
          }
        } else if (typeof value === "string" && !hexColorRegex.test(value)) {
          throw new Error(`Invalid hex color format for ${key}: ${value}`);
        }
      }

      // Validate social login colors
      if (!hexColorRegex.test(colorTheme.socialLogin.google)) {
        throw new Error(
          `Invalid google color: ${colorTheme.socialLogin.google}`
        );
      }
      if (!hexColorRegex.test(colorTheme.socialLogin.microsoft)) {
        throw new Error(
          `Invalid microsoft color: ${colorTheme.socialLogin.microsoft}`
        );
      }

      // Check and auto-adjust contrast for accessibility
      const contrastValidation = validateContrast(colorTheme);
      let finalColorTheme = colorTheme;

      if (contrastValidation.hasErrors) {
        finalColorTheme = autoAdjustContrast(colorTheme);

        // Verify the adjustment worked
        const adjustedValidation = validateContrast(finalColorTheme);
        if (adjustedValidation.hasErrors) {
          throw new Error(
            `Failed to auto-adjust contrast: ${adjustedValidation.errors.join(
              " "
            )}`
          );
        }
      }

      // Normalize all hex colors to 6-character format using the adjusted theme
      const normalizedColorTheme = {
        primary: normalizeHexColor(finalColorTheme.primary),
        secondary: normalizeHexColor(finalColorTheme.secondary),
        header: normalizeHexColor(finalColorTheme.header),
        footer: normalizeHexColor(finalColorTheme.footer),
        background: finalColorTheme.background.startsWith("#")
          ? normalizeHexColor(finalColorTheme.background)
          : finalColorTheme.background,
        surface: normalizeHexColor(finalColorTheme.surface),
        text: normalizeHexColor(finalColorTheme.text),
        textDimmed: normalizeHexColor(finalColorTheme.textDimmed),
        socialLogin: {
          google: normalizeHexColor(finalColorTheme.socialLogin.google),
          microsoft: normalizeHexColor(finalColorTheme.socialLogin.microsoft),
        },
      };

      return NextResponse.json({
        colorTheme: normalizedColorTheme,
        message: contrastValidation.hasErrors
          ? "Color theme generated and auto-adjusted for optimal contrast!"
          : "Color theme generated successfully!",
        model: result.model,
        modelUsed: result.modelUsed,
      });
    } catch (parseError) {
      return NextResponse.json(
        {
          error:
            "Failed to parse AI response. The AI returned invalid color data.",
          details:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parsing error",
        },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to generate color theme. Please try again later." },
      { status: 500 }
    );
  }
}
