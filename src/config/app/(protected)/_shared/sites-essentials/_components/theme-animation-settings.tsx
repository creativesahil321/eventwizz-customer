"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  detectTheme,
  ThemeType,
  THEME_OPTIONS,
  getThemeOption,
} from "@/components/theme-animations/theme-detector";
import { SiteEssentialsFormValues } from "../_lib/hooks";
import { SectionTitle } from "./ui/section-title";

interface ThemeAnimationSettingsProps {
  eventData?: {
    event_name?: string;
    event_banner_heading?: string;
    event_banner_sub_heading?: string;
    about_event_description?: string;
  };
}

export function ThemeAnimationSettings({
  eventData,
}: ThemeAnimationSettingsProps) {
  const form = useFormContext<SiteEssentialsFormValues>();

  // Detect theme from event data
  const detectedTheme = eventData ? detectTheme(eventData) : "none";

  const [previewTheme, setPreviewTheme] = useState<ThemeType>(detectedTheme);

  const detectedOption = getThemeOption(detectedTheme);
  const previewOption = getThemeOption(previewTheme);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Theme Animations"
        description="Configure animated decorations and effects for your events"
      />
      <Separator className="my-4" />

      {/* Detected Theme Display */}
      {eventData && detectedTheme !== "none" && detectedOption && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-800">
              Auto-Detected Theme:
            </span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {detectedOption.emoji} {detectedOption.label}
            </Badge>
          </div>
          <p className="text-xs text-blue-600">
            Theme detected from event content. You can override this setting
            below.
          </p>
        </div>
      )}

      {/* Theme Selection */}
      <FormField
        control={form.control}
        name="theme_animations.theme"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Theme</FormLabel>
            <FormDescription>
              Select the theme for animated decorations and effects
            </FormDescription>
            <Select
              value={field.value || previewTheme}
              onValueChange={(value) => {
                field.onChange(value);
                setPreviewTheme(value as ThemeType);
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {THEME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Animation Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        <FormField
          control={form.control}
          name="theme_animations.enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Animations</FormLabel>
                <FormDescription>
                  Show animated decorations and effects on event pages
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="theme_animations.intensity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Animation Intensity</FormLabel>
              <FormDescription>
                Control the amount of animations and effects
              </FormDescription>
              <Select
                value={field.value || "medium"}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low - Subtle effects</SelectItem>
                  <SelectItem value="medium">Medium - Balanced</SelectItem>
                  <SelectItem value="high">High - Full experience</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Theme Preview */}
      {previewTheme !== "none" && previewOption && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h4 className="text-sm font-medium mb-2">Theme Preview</h4>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{previewOption.emoji}</span>
            <div>
              <p className="text-sm font-medium">
                {previewOption.label} Theme
              </p>
              <p className="text-xs text-gray-600">
                {previewOption.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Animation Examples */}
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">
          Animation Examples
        </h4>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>
            <strong>Christmas:</strong> Snowfall, twinkling lights, Santa Claus
            animation
          </p>
          <p>
            <strong>New Year:</strong> Fireworks, champagne bubbles, countdown
            sparkles
          </p>
          <p>
            <strong>Halloween:</strong> Fog effects, spooky floating elements,
            flickering lights
          </p>
          <p>
            <strong>Valentine&apos;s:</strong> Floating hearts, petal fall,
            romantic sparkles
          </p>
          <p>
            <strong>Diwali:</strong> Diya flames, firework bursts, golden
            shimmer
          </p>
          <p>
            <strong>DJ &amp; Club:</strong> Neon lasers, beat pulses, strobe
            effects
          </p>
          <p>
            <strong>Pride:</strong> Rainbow gradient particles, pride confetti
          </p>
        </div>
      </div>
    </div>
  );
}
