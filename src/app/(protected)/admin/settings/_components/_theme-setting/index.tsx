import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FontName, themeSettingsSchema } from "./schema";
import { z } from "zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import colors from "tailwindcss/colors";

// Font imports remain the same
import {
  Inter,
  Roboto,
  Nunito,
  Lato,
  Montserrat,
  Poppins,
  Open_Sans,
  Oswald,
  Raleway,
  Merriweather,
  Ubuntu,
  Noto_Sans,
  Cabin,
  PT_Sans,
} from "next/font/google";
import { NextFont } from "next/dist/compiled/@next/font";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { updateTheme } from "./action";

const inter = Inter({ subsets: ["latin"], weight: "400" });
const roboto = Roboto({ subsets: ["latin"], weight: "400" });
const nunito = Nunito({ subsets: ["latin"], weight: "400" });
const lato = Lato({ subsets: ["latin"], weight: "400" });
const montserrat = Montserrat({ subsets: ["latin"], weight: "400" });
const poppins = Poppins({ subsets: ["latin"], weight: "400" });
const openSans = Open_Sans({ subsets: ["latin"], weight: "400" });
const oswald = Oswald({ subsets: ["latin"], weight: "400" });
const raleway = Raleway({ subsets: ["latin"], weight: "400" });
const merriweather = Merriweather({ subsets: ["latin"], weight: "400" });
const ubuntu = Ubuntu({ subsets: ["latin"], weight: "400" });
const notoSans = Noto_Sans({ subsets: ["latin"], weight: "400" });
const cabin = Cabin({ subsets: ["latin"], weight: "400" });
const ptSans = PT_Sans({ subsets: ["latin"], weight: "400" });

const googleFontsMap: Record<FontName, NextFont> = {
  Inter: inter,
  Roboto: roboto,
  Nunito: nunito,
  Lato: lato,
  Montserrat: montserrat,
  Poppins: poppins,
  "Open Sans": openSans,
  Oswald: oswald,
  Raleway: raleway,
  Merriweather: merriweather,
  Ubuntu: ubuntu,
  "Noto Sans": notoSans,
  Cabin: cabin,
  "PT Sans": ptSans,
};

const googleFontOptions: { label: string; value: FontName }[] = [
  { label: "Inter", value: "Inter" },
  { label: "Roboto", value: "Roboto" },
  { label: "Nunito", value: "Nunito" },
  { label: "Lato", value: "Lato" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Poppins", value: "Poppins" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Oswald", value: "Oswald" },
  { label: "Raleway", value: "Raleway" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Ubuntu", value: "Ubuntu" },
  { label: "Noto Sans", value: "Noto Sans" },
  { label: "Cabin", value: "Cabin" },
  { label: "PT Sans", value: "PT Sans" },
];

const radiusOptions = [
  { label: "0.25rem", value: "0.25rem" },
  { label: "0.5rem", value: "0.5rem" },
  { label: "0.75rem", value: "0.75rem" },
  { label: "1rem", value: "1rem" },
];

const fontSizeOptions = [
  { label: "0.75rem", value: "0.75rem" },
  { label: "0.875rem", value: "0.875rem" },
  { label: "1rem", value: "1rem" },
  { label: "1.125rem", value: "1.125rem" },
  { label: "1.25rem", value: "1.25rem" },
  { label: "1.5rem", value: "1.5rem" },
  { label: "1.875rem", value: "1.875rem" },
  { label: "2rem", value: "2rem" },
];

const tailwindColorOptions = [
  { label: "red", value: colors.red[500] },
  { label: "orange", value: colors.orange[500] },
  { label: "amber", value: colors.amber[500] },
  { label: "yellow", value: colors.yellow[500] },
  { label: "lime", value: colors.lime[500] },
  { label: "green", value: colors.green[500] },
  { label: "emerald", value: colors.emerald[500] },
  { label: "teal", value: colors.teal[500] },
  { label: "cyan", value: colors.cyan[500] },
  { label: "sky", value: colors.sky[500] },
  { label: "blue", value: colors.blue[500] },
  { label: "indigo", value: colors.indigo[500] },
  { label: "violet", value: colors.violet[500] },
  { label: "purple", value: colors.purple[500] },
  { label: "fuchsia", value: colors.fuchsia[500] },
  { label: "pink", value: colors.pink[500] },
  { label: "rose", value: colors.rose[500] },
  { label: "slate", value: colors.slate[500] },
  { label: "gray", value: colors.gray[500] },
  { label: "zinc", value: colors.zinc[500] },
  { label: "neutral", value: colors.neutral[500] },
  { label: "stone", value: colors.stone[500] },
];

type ThemeSettingsValues = z.infer<typeof themeSettingsSchema>;

// Helper function to get color label from value
const getColorLabel = (value: string) => {
  const colorOption = tailwindColorOptions.find(
    (option) => option.value === value
  );
  return colorOption ? colorOption.label : "Select color";
};

export function ThemeSetting() {
  const [loading, setLoading] = useState(false);
  const form = useForm<ThemeSettingsValues>({
    resolver: zodResolver(themeSettingsSchema),
    defaultValues: themeSettingsSchema.parse({}),
    mode: "onChange",
  });

  const onSubmit: SubmitHandler<ThemeSettingsValues> = useCallback(
    async (data) => {
      setLoading(true);
      try {
        const result = await updateTheme(data);
        if (result?.status) toast.success(result.message);
        else toast.error(result.message || "Something went wrong.");
      } catch {
        toast.error("Failed to update user.");
      } finally {
        setTimeout(() => setLoading(false), 1500);
      }
    },
    []
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Typography Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fontFamily"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Font Family</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select Font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {googleFontOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fontSize"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Font Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select Font Size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fontSizeOptions.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="radius"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Radius</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select Radius" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {radiusOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primary"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Primary Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue>
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: field.value }}
                              />
                              {getColorLabel(field.value)}
                            </div>
                          ) : (
                            "Select Primary Color"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tailwindColorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondary"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Secondary Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue>
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: field.value }}
                              />
                              {getColorLabel(field.value)}
                            </div>
                          ) : (
                            "Select Secondary Color"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tailwindColorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="backgroundColor"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Background Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue>
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: field.value }}
                              />
                              {getColorLabel(field.value)}
                            </div>
                          ) : (
                            "Select Background Color"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tailwindColorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button variant="event-primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
