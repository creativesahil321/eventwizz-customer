"use client";

import { useFormContext } from "react-hook-form";
import { SiteEssentialsFormValues } from "../../_lib/schema";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSiteEssentialsUpdateGate } from "../../_lib/site-essentials-update-context";

export function SeoTab() {
  const { readOnly } = useSiteEssentialsUpdateGate();
  const form = useFormContext<SiteEssentialsFormValues>();

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionTitle
        title="SEO Settings"
        description="Configure your site's search engine optimization settings"
      />
      <Separator className="my-3 sm:my-4" />

      <div className="space-y-4 sm:space-y-6">
        <FormField
          control={form.control}
          name="seo.title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">SEO Title</FormLabel>
              <FormDescription className="text-xs sm:text-sm mt-0.5 mb-1.5">
                The title that appears in search engine results and browser tabs
              </FormDescription>
              <FormControl>
                <Input
                  className="h-10"
                  disabled={readOnly}
                  placeholder="EventWizz - Event Management Platform"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seo.description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                Meta Description
              </FormLabel>
              <FormDescription className="text-xs sm:text-sm mt-0.5 mb-1.5">
                A brief description of your site
              </FormDescription>
              <FormControl>
                <Textarea
                  placeholder="EventWizz is a comprehensive event management platform for creating, managing and selling tickets for your events."
                  className="min-h-24 resize-none p-3"
                  disabled={readOnly}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seo.keywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                Meta Keywords
              </FormLabel>
              <FormDescription className="text-xs sm:text-sm mt-0.5 mb-1.5">
                Comma-separated keywords related to your site
              </FormDescription>
              <FormControl>
                <Input
                  className="h-10"
                  disabled={readOnly}
                  placeholder="event management, tickets, booking, events, conferences"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="p-3 sm:p-4 border rounded-md bg-gray-50 mt-6">
        <h3 className="text-sm font-medium mb-2">Preview</h3>
        <div className="space-y-1 sm:space-y-2">
          <p className="text-blue-600 text-base sm:text-lg font-medium line-clamp-1">
            {form.watch("seo.title") || "EventWizz - Event Management Platform"}
          </p>
          <p className="text-green-600 text-xs line-clamp-1">
            {form.watch("domain") || "https://eventwizz.com"}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
            {form.watch("seo.description") ||
              "EventWizz is a comprehensive event management platform for creating, managing and selling tickets for your events."}
          </p>
        </div>
      </div>
    </div>
  );
}
