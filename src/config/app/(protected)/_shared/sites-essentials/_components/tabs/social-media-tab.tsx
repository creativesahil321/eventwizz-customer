"use client";

import { useFormContext } from "react-hook-form";
import { SiteEssentialsFormValues } from "../../_lib/hooks";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { SectionTitle } from "../ui/section-title";
import { Separator } from "@/components/ui/separator";
import { useSiteEssentialsUpdateGate } from "../../_lib/site-essentials-update-context";

export function SocialMediaTab() {
  const { readOnly } = useSiteEssentialsUpdateGate();
  const form = useFormContext<SiteEssentialsFormValues>();

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Social Media"
        description="Configure your site's social media links"
      />
      <Separator className="my-4" />
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="socialLinks.facebook"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <Facebook size={18} className="text-blue-600" />
                <FormLabel>Facebook</FormLabel>
              </div>
              <FormControl>
                <Input
                  type="url"
                  disabled={readOnly}
                  placeholder="https://facebook.com/eventwizz"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="socialLinks.twitter"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <Twitter size={18} className="text-blue-400" />
                <FormLabel>Twitter</FormLabel>
              </div>
              <FormControl>
                <Input
                  type="url"
                  disabled={readOnly}
                  placeholder="https://twitter.com/eventwizz"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="socialLinks.instagram"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <Instagram size={18} className="text-pink-500" />
                <FormLabel>Instagram</FormLabel>
              </div>
              <FormControl>
                <Input
                  type="url"
                  disabled={readOnly}
                  placeholder="https://instagram.com/eventwizz"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="socialLinks.linkedin"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <Linkedin size={18} className="text-blue-700" />
                <FormLabel>LinkedIn</FormLabel>
              </div>
              <FormControl>
                <Input
                  type="url"
                  disabled={readOnly}
                  placeholder="https://linkedin.com/company/eventwizz"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="socialLinks.youtube"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <Youtube size={18} className="text-red-600" />
                <FormLabel>YouTube</FormLabel>
              </div>
              <FormControl>
                <Input
                  type="url"
                  disabled={readOnly}
                  placeholder="https://youtube.com/c/eventwizz"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
