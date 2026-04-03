"use client";

import { useFormContext } from "react-hook-form";
import { SiteContrastPreview } from "../site-contrast-preview";
import { SiteEssentialsFormValues } from "../../_lib/hooks";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ColorPicker } from "@/components/ui/color-picker";
import { GradientPicker, useGradient } from "@/components/ui/gradient-picker";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Palette, Layout, Users } from "lucide-react";
import { AIColorThemeModal } from "../ai-color-theme-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FacebookIcon } from "lucide-react";

export function ColorsTab() {
  const form = useFormContext<SiteEssentialsFormValues>();
  const [showAIModal, setShowAIModal] = useState(false);

  // Use ref to track form updates and prevent infinite loops
  const isUpdatingForm = useRef(false);

  // Use our new useGradient hook for background
  const {
    value: backgroundValue,
    useGradient: useBackgroundGradient,
    setUseGradient: setUseBackgroundGradient,
    gradientDirection,
    setGradientDirection,
    gradientStartColor,
    setGradientStartColor,
    gradientEndColor,
    setGradientEndColor,
    solidColor: solidBackgroundColor,
    setSolidColor: setSolidBackgroundColor,
  } = useGradient(form.getValues("colors.background") || "#FFFFFF");

  // Sync the form values with our gradient values
  useEffect(() => {
    // Skip if we're already updating the form
    if (isUpdatingForm.current) return;

    // Mark that we're updating the form
    isUpdatingForm.current = true;

    // Use a debounce/timeout to batch updates
    const updateTimer = setTimeout(() => {
      // Get current values to compare
      const currentBackground = form.getValues("colors.background");

      // Only update if values have changed
      if (currentBackground !== backgroundValue) {
        form.setValue("colors.background", backgroundValue, {
          shouldDirty: true,
        });
      }

      // Reset the updating flag
      isUpdatingForm.current = false;
    }, 0);

    // Clean up timer if component unmounts
    return () => {
      clearTimeout(updateTimer);
      isUpdatingForm.current = false;
    };
  }, [backgroundValue, form]);

  // Watch for form changes from AI modal and update gradient picker state
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Only react to background color changes from external sources (like AI modal)
      if (name === "colors.background" && !isUpdatingForm.current) {
        const newBackgroundValue = value.colors?.background;
        if (newBackgroundValue && newBackgroundValue !== backgroundValue) {
          // Parse the new value and update gradient picker state
          if (newBackgroundValue.includes("linear-gradient")) {
            setUseBackgroundGradient(true);

            // Try to extract gradient parameters
            try {
              const dirMatch = newBackgroundValue.match(
                /linear-gradient\(([^,]+),/,
              );
              const colorsMatch = newBackgroundValue.match(
                /linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/,
              );

              if (dirMatch && dirMatch[1]) {
                setGradientDirection(dirMatch[1].trim());
              }

              if (colorsMatch && colorsMatch[1] && colorsMatch[2]) {
                setGradientStartColor(colorsMatch[1].trim());
                setGradientEndColor(colorsMatch[2].trim());
              }
            } catch (e) {
              console.error("Failed to parse gradient from AI", e);
            }
          } else {
            // It's a solid color
            setUseBackgroundGradient(false);
            setSolidBackgroundColor(newBackgroundValue);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [
    form,
    backgroundValue,
    setUseBackgroundGradient,
    setGradientDirection,
    setGradientStartColor,
    setGradientEndColor,
    setSolidBackgroundColor,
  ]);

  // Helper function to ensure color values are never undefined
  const ensureColor = (color: string | undefined): string => {
    return color || "#FFFFFF";
  };

  return (
    <div className="space-y-6">
      {/* Header with AI Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Color Palette</h2>
          <p className="text-sm text-gray-500 mt-1">
            Fine-tune every token after a preset, or build your palette from
            scratch. AI can regenerate colors without changing your fonts.
          </p>
        </div>
        <Button
          type="button"
          variant="default"
          size="default"
          onClick={() => setShowAIModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
        >
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </div>

      <Separator className="my-6" />

      {/* Primary Colors Card */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Primary Colors
              </CardTitle>
              <CardDescription>
                Main brand colors used across your site
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="colors.primary"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Primary
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    Used for buttons, links, and main accents
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colors.secondary"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Secondary
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    Used for secondary elements and highlights
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout Colors Card */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Layout className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Layout Colors
              </CardTitle>
              <CardDescription>
                Colors for structural elements and backgrounds
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <SiteContrastPreview compact />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="colors.header"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Header
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">Header bar background</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colors.footer"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Footer
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">Footer bar background</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem className="space-y-3">
              <FormControl>
                <GradientPicker
                  label="Background"
                  useGradient={useBackgroundGradient}
                  onUseGradientChange={setUseBackgroundGradient}
                  solidColor={solidBackgroundColor}
                  onSolidColorChange={setSolidBackgroundColor}
                  gradientStartColor={gradientStartColor}
                  onGradientStartColorChange={setGradientStartColor}
                  gradientEndColor={gradientEndColor}
                  onGradientEndColorChange={setGradientEndColor}
                  gradientDirection={gradientDirection}
                  onGradientDirectionChange={setGradientDirection}
                />
              </FormControl>
              <p className="text-xs text-gray-500">
                Page background color or gradient
              </p>
            </FormItem>

            <FormField
              control={form.control}
              name="colors.surface"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Surface
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">Cards and panels</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colors.text"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Text
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">Primary text color</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colors.textDimmed"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Text Dimmed
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    Secondary text, descriptions
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Login Colors Card */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-600 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Social Login Colors
              </CardTitle>
              <CardDescription>
                Background colors for Google and Facebook sign-in buttons.
                Labels stay white — avoid white or very light values or the
                buttons look empty.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="colors.socialLogin.google"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    Google login button color
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colors.socialLogin.microsoft"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FacebookIcon className="w-4 h-4" />
                    Facebook
                  </FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={ensureColor(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    Facebook login button color
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Usage Guide */}
      <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0 mt-0.5">
              <svg
                className="h-4 w-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-blue-900 mb-2">
                Color Usage Tips
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>
                  • <strong>Primary:</strong> Main actions, CTAs, and important
                  elements
                </li>
                <li>
                  • <strong>Secondary:</strong> Supporting elements and hover
                  states
                </li>
                <li>
                  • <strong>Background:</strong> Page background (solid or
                  gradient)
                </li>
                <li>
                  • <strong>Surface:</strong> Cards, modals, and elevated
                  surfaces
                </li>
                <li>
                  • <strong>Text:</strong> Main content and headings
                </li>
                <li>
                  • <strong>Text Dimmed:</strong> Descriptions and secondary
                  text
                </li>
                <li>
                  • <strong>Social login:</strong> Button backgrounds only —
                  keep them saturated so white labels stay readable.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Color Theme Modal */}
      <AIColorThemeModal open={showAIModal} onOpenChange={setShowAIModal} />
    </div>
  );
}
