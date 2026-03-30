"use client";

import { useFormContext } from "react-hook-form";
import { SiteEssentialsFormValues } from "../../_lib/hooks";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { SectionTitle } from "../ui/section-title";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import { SITE_ESSENTIALS_GOOGLE_FONTS_UI } from "@/lib/site-typography-google-fonts";

// Common web-safe fonts
const webSafeFonts = [
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Helvetica", value: "Helvetica, sans-serif" },
  { name: "Tahoma", value: "Tahoma, sans-serif" },
  { name: "Trebuchet MS", value: "Trebuchet MS, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Garamond", value: "Garamond, serif" },
  { name: "Times New Roman", value: "Times New Roman, serif" },
  { name: "Courier New", value: "Courier New, monospace" },
  { name: "Lucida Console", value: "Lucida Console, monospace" },
];

const googleFonts = SITE_ESSENTIALS_GOOGLE_FONTS_UI;

export function TypographyTab() {
  const form = useFormContext<SiteEssentialsFormValues>();

  // Track font values in local state for more reliable rendering
  const [headingFont, setHeadingFont] = useState<string>(
    form.watch("typography.fontFamily.heading") || "Arial, sans-serif"
  );
  const [bodyFont, setBodyFont] = useState<string>(
    form.watch("typography.fontFamily.body") || "Arial, sans-serif"
  );

  // Track if using custom font
  const [useCustomHeadingFont, setUseCustomHeadingFont] =
    useState<boolean>(false);
  const [useCustomBodyFont, setUseCustomBodyFont] = useState<boolean>(false);

  // Track custom font input values
  const [customHeadingFont, setCustomHeadingFont] = useState<string>("");
  const [customBodyFont, setCustomBodyFont] = useState<string>("");

  // Update local state when form values change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "typography.fontFamily.heading" || name === undefined) {
        const newHeadingFont = form.getValues("typography.fontFamily.heading");
        setHeadingFont(newHeadingFont || "Arial, sans-serif");

        // Check if it's not in our predefined lists
        const isCustomFont = ![...webSafeFonts, ...googleFonts].some(
          (font) => font.value === newHeadingFont
        );
        setUseCustomHeadingFont(isCustomFont);
        if (isCustomFont) {
          setCustomHeadingFont(newHeadingFont || "");
        }
      }
      if (name === "typography.fontFamily.body" || name === undefined) {
        const newBodyFont = form.getValues("typography.fontFamily.body");
        setBodyFont(newBodyFont || "Arial, sans-serif");

        // Check if it's not in our predefined lists
        const isCustomFont = ![...webSafeFonts, ...googleFonts].some(
          (font) => font.value === newBodyFont
        );
        setUseCustomBodyFont(isCustomFont);
        if (isCustomFont) {
          setCustomBodyFont(newBodyFont || "");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Handle custom font input change
  const handleCustomHeadingFontChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setCustomHeadingFont(value);
    form.setValue("typography.fontFamily.heading", value);
    setHeadingFont(value);
  };

  const handleCustomBodyFontChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setCustomBodyFont(value);
    form.setValue("typography.fontFamily.body", value);
    setBodyFont(value);
  };

  return (
    <div className="space-y-6">
      <SiteEssentialsGoogleFontsLoader
        linkId="site-essentials-google-fonts-typography-tab"
        headingStack={headingFont}
        bodyStack={bodyFont}
      />
      <SectionTitle
        title="Typography"
        description="Configure your site's fonts and typography settings"
      />
      <Separator className="my-4" />

      <div className="grid gap-6 md:grid-cols-2">
        <FormItem>
          <FormLabel>Heading Font</FormLabel>
          <FormDescription>Font used for headings and titles</FormDescription>

          <Tabs
            defaultValue={useCustomHeadingFont ? "custom" : "preset"}
            onValueChange={(value) => {
              setUseCustomHeadingFont(value === "custom");
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preset">Preset Fonts</TabsTrigger>
              <TabsTrigger value="custom">Custom Font</TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="mt-2">
              <FormField
                control={form.control}
                name="typography.fontFamily.heading"
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setHeadingFont(value); // Immediately update local state
                    }}
                    defaultValue={field.value}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Web-safe Fonts</SelectLabel>
                        {webSafeFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Google Fonts</SelectLabel>
                        {googleFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </TabsContent>

            <TabsContent value="custom" className="mt-2">
              <FormItem>
                <FormDescription className="mb-2">
                  Enter a custom font family (e.g. &quot;My Font,
                  sans-serif&quot;)
                </FormDescription>
                <Input
                  placeholder="Enter custom font family"
                  value={customHeadingFont}
                  onChange={handleCustomHeadingFontChange}
                />
                <FormDescription className="text-xs mt-1">
                  Note: Custom fonts must be loaded separately in your CSS or
                  via a CDN
                </FormDescription>
              </FormItem>
            </TabsContent>
          </Tabs>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Body Font</FormLabel>
          <FormDescription>
            Font used for paragraphs and content
          </FormDescription>

          <Tabs
            defaultValue={useCustomBodyFont ? "custom" : "preset"}
            onValueChange={(value) => {
              setUseCustomBodyFont(value === "custom");
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preset">Preset Fonts</TabsTrigger>
              <TabsTrigger value="custom">Custom Font</TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="mt-2">
              <FormField
                control={form.control}
                name="typography.fontFamily.body"
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setBodyFont(value); // Immediately update local state
                    }}
                    defaultValue={field.value}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Web-safe Fonts</SelectLabel>
                        {webSafeFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Google Fonts</SelectLabel>
                        {googleFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </TabsContent>

            <TabsContent value="custom" className="mt-2">
              <FormItem>
                <FormDescription className="mb-2">
                  Enter a custom font family (e.g. &quot;My Font,
                  sans-serif&quot;)
                </FormDescription>
                <Input
                  placeholder="Enter custom font family"
                  value={customBodyFont}
                  onChange={handleCustomBodyFontChange}
                />
                <FormDescription className="text-xs mt-1">
                  Note: Custom fonts must be loaded separately in your CSS or
                  via a CDN
                </FormDescription>
              </FormItem>
            </TabsContent>
          </Tabs>
          <FormMessage />
        </FormItem>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Font Preview</h3>
        <div className="p-4 border rounded-md bg-gray-50 space-y-4">
          {/* Apply heading font directly to each heading element */}
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: headingFont }}
            >
              Heading Font Sample (h1)
            </h1>
            <h2
              className="text-xl font-semibold mt-2"
              style={{ fontFamily: headingFont }}
            >
              Heading Font Sample (h2)
            </h2>
            <h3
              className="text-lg font-semibold mt-2"
              style={{ fontFamily: headingFont }}
            >
              Heading Font Sample (h3)
            </h3>
          </div>

          <div style={{ fontFamily: bodyFont }}>
            <p className="mt-4">
              Body font sample. This is how your main content will appear on
              your website. The quick brown fox jumps over the lazy dog. Lorem
              ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </div>
      </div>

      {/* Debug info - can be removed in production */}
      <div className="text-xs text-gray-500 mt-4">
        <p>Current heading font: {headingFont}</p>
        <p>Current body font: {bodyFont}</p>
        <p>Using custom heading font: {useCustomHeadingFont ? "Yes" : "No"}</p>
        <p>Using custom body font: {useCustomBodyFont ? "Yes" : "No"}</p>
      </div>
    </div>
  );
}
