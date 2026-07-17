"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { SiteEssentialsFormValues } from "../../_lib/hooks";
import {
  HOME_BODY_MAX_TEXT_CHARS,
  HOME_CARD_DESC_MAX_CHARS,
  HOME_CARD_TITLE_MAX_CHARS,
  HOME_CTA_LINK_MAX_CHARS,
  HOME_CTA_MAX_CHARS,
  HOME_EYEBROW_MAX_CHARS,
  HOME_FAQ_ANSWER_MAX_CHARS,
  HOME_FAQ_MAX_ITEMS,
  HOME_FAQ_QUESTION_MAX_CHARS,
  HOME_FEATURE_TITLE_MAX_CHARS,
  HOME_SUBTITLE_MAX_CHARS,
  HOME_TITLE_MAX_CHARS,
} from "../../_lib/schema";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "../ui/section-card";
import { addCacheBusting } from "@/lib/image-utils";
import { ensureFilePreview, revokeFilePreview } from "@/lib/file-preview";
import { useSiteEssentialsUpdateGate } from "../../_lib/site-essentials-update-context";
import { ADMIN_HOME_DEFAULTS } from "@/lib/admin-cms-content";
import {
  ADMIN_HOME_ICON_OPTIONS,
  getAdminHomeIcon,
} from "@/lib/admin-home-icons";

/** Character-counted single-line text field. */
function TextField({
  name,
  label,
  placeholder,
  maxLength,
  readOnly,
}: {
  name:
    | "home_hero_eyebrow"
    | "home_hero_title"
    | "home_hero_subtitle"
    | "home_hero_primary_cta"
    | "home_hero_secondary_cta"
    | "home_intro_title"
    | "home_partners_title"
    | "home_partners_subtitle"
    | "home_audience_title"
    | "home_audience_subtitle"
    | "home_features_title"
    | "home_features_subtitle"
    | "home_showcase_title"
    | "home_showcase_checklist_title"
    | "home_showcase_cta"
    | "home_news_title"
    | "home_news_subtitle"
    | "home_faq_title"
    | "home_faq_subtitle";
  label: string;
  placeholder?: string;
  maxLength: number;
  readOnly?: boolean;
}) {
  const { control } = useFormContext<SiteEssentialsFormValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const currentLength = field.value?.length || 0;
        return (
          <FormItem className="space-y-2">
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                placeholder={placeholder}
                disabled={readOnly}
                {...field}
                value={field.value || ""}
                maxLength={maxLength}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <div className="text-xs text-muted-foreground">
              {currentLength}/{maxLength} characters
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Optional URL field. For CTA buttons, empty = keep the default Book-a-Call
 * action. Accepts a full URL or an internal path.
 */
function LinkField({
  name,
  label,
  placeholder = "https://example.com or /contact",
  description = "Leave empty to open the “Book a Call” popup.",
  readOnly,
}: {
  name:
    | "home_hero_primary_cta_link"
    | "home_hero_secondary_cta_link"
    | "home_showcase_cta_link"
    | "home_showcase_video_url";
  label: string;
  placeholder?: string;
  description?: string;
  readOnly?: boolean;
}) {
  const { control } = useFormContext<SiteEssentialsFormValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="text"
              inputMode="url"
              placeholder={placeholder}
              disabled={readOnly}
              {...field}
              value={field.value || ""}
              maxLength={HOME_CTA_LINK_MAX_CHARS}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Rich (HTML) body field. */
function BodyField({
  name,
  label,
  placeholder,
  readOnly,
}: {
  name: "home_intro_body" | "home_showcase_body";
  label: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const { control } = useFormContext<SiteEssentialsFormValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <TiptapEditor
              value={field.value || ""}
              onChange={field.onChange}
              placeholder={placeholder}
              maxLength={HOME_BODY_MAX_TEXT_CHARS}
              className="min-h-[140px]"
              readOnly={readOnly}
              showAIButton={false}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Hero background image uploader (mirrors the cover image pattern). */
function HeroImageField({ readOnly }: { readOnly?: boolean }) {
  const { watch, setValue } = useFormContext<SiteEssentialsFormValues>();
  const rawValue = watch("home_hero_background_image");
  const existingUrl = typeof rawValue === "string" ? rawValue : "";
  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (next: File[]) => {
    const file = next[0];
    if (!file) return;
    setFiles([ensureFilePreview(file)]);
    setValue("home_hero_background_image", file, { shouldDirty: true });
  };

  const handleRemove = () => {
    revokeFilePreview(files[0]);
    setFiles([]);
    setValue("home_hero_background_image", null, { shouldDirty: true });
  };

  const localPreview = (files[0] as (File & { preview?: string }) | undefined)
    ?.preview;

  return (
    <FormItem>
      <FormLabel>Hero background image</FormLabel>
      <FormDescription>
        Large background behind the hero heading (recommended 1920 x 1080px, max
        2MB). Falls back to the default image when empty.
      </FormDescription>
      <FormControl>
        {localPreview ? (
          <div className="space-y-2">
            <img
              src={localPreview}
              alt="Hero background preview"
              className="max-h-48 w-full rounded-lg object-cover"
            />
            <button
              type="button"
              disabled={readOnly}
              onClick={handleRemove}
              className="text-red-500 text-sm underline disabled:pointer-events-none disabled:opacity-50"
            >
              Remove image
            </button>
          </div>
        ) : existingUrl ? (
          <div className="space-y-2">
            <img
              src={addCacheBusting(existingUrl)}
              alt="Hero background preview"
              className="max-h-48 w-full rounded-lg object-cover"
            />
            <button
              type="button"
              disabled={readOnly}
              onClick={handleRemove}
              className="text-red-500 text-sm underline disabled:pointer-events-none disabled:opacity-50"
            >
              Remove image
            </button>
          </div>
        ) : (
          <FileUploader
            value={files}
            onValueChange={handleChange}
            maxFileCount={1}
            maxSize={2 * 1024 * 1024}
            onRemove={handleRemove}
            disabled={readOnly}
            accept={{
              "image/png": [],
              "image/jpeg": [],
              "image/jpg": [],
              "image/webp": [],
            }}
            enableCropping
            aspectRatio={16 / 9}
            cropConfig={{
              maxSizeKB: 700,
              quality: 0.9,
              maxWidth: 1920,
              maxHeight: 1080,
            }}
          />
        )}
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

/** Showcase poster image uploader (behind the play button). */
function ShowcaseImageField({ readOnly }: { readOnly?: boolean }) {
  const { watch, setValue } = useFormContext<SiteEssentialsFormValues>();
  const rawValue = watch("home_showcase_image");
  const existingUrl = typeof rawValue === "string" ? rawValue : "";
  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (next: File[]) => {
    const file = next[0];
    if (!file) return;
    setFiles([ensureFilePreview(file)]);
    setValue("home_showcase_image", file, { shouldDirty: true });
  };

  const handleRemove = () => {
    revokeFilePreview(files[0]);
    setFiles([]);
    setValue("home_showcase_image", null, { shouldDirty: true });
  };

  const localPreview = (files[0] as (File & { preview?: string }) | undefined)
    ?.preview;
  const previewUrl = localPreview || (existingUrl ? addCacheBusting(existingUrl) : "");

  return (
    <FormItem>
      <FormLabel>Showcase image</FormLabel>
      <FormDescription>
        Shown as the visual with the play button (recommended 3:2, max 2MB).
        Falls back to the default image when empty.
      </FormDescription>
      <FormControl>
        {previewUrl ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Showcase preview"
              className="max-h-48 w-full rounded-lg object-cover"
            />
            <button
              type="button"
              disabled={readOnly}
              onClick={handleRemove}
              className="text-red-500 text-sm underline disabled:pointer-events-none disabled:opacity-50"
            >
              Remove image
            </button>
          </div>
        ) : (
          <FileUploader
            value={files}
            onValueChange={handleChange}
            maxFileCount={1}
            maxSize={2 * 1024 * 1024}
            onRemove={handleRemove}
            disabled={readOnly}
            accept={{
              "image/png": [],
              "image/jpeg": [],
              "image/jpg": [],
              "image/webp": [],
            }}
            enableCropping
            aspectRatio={3 / 2}
            cropConfig={{
              maxSizeKB: 600,
              quality: 0.9,
              maxWidth: 1280,
              maxHeight: 853,
            }}
          />
        )}
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

type PartnerLogoName =
  | "home_partner_logo_1"
  | "home_partner_logo_2"
  | "home_partner_logo_3"
  | "home_partner_logo_4"
  | "home_partner_logo_5"
  | "home_partner_logo_6";

const PARTNER_LOGO_NAMES: PartnerLogoName[] = [
  "home_partner_logo_1",
  "home_partner_logo_2",
  "home_partner_logo_3",
  "home_partner_logo_4",
  "home_partner_logo_5",
  "home_partner_logo_6",
];

/** Single partner-logo image slot (mirrors the hero image uploader). */
function PartnerLogoField({
  name,
  index,
  readOnly,
}: {
  name: PartnerLogoName;
  index: number;
  readOnly?: boolean;
}) {
  const { watch, setValue } = useFormContext<SiteEssentialsFormValues>();
  const rawValue = watch(name);
  const existingUrl = typeof rawValue === "string" ? rawValue : "";
  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (next: File[]) => {
    const file = next[0];
    if (!file) return;
    setFiles([ensureFilePreview(file)]);
    setValue(name, file, { shouldDirty: true });
  };

  const handleRemove = () => {
    revokeFilePreview(files[0]);
    setFiles([]);
    setValue(name, null, { shouldDirty: true });
  };

  const localPreview = (files[0] as (File & { preview?: string }) | undefined)
    ?.preview;
  const previewUrl = localPreview || (existingUrl ? addCacheBusting(existingUrl) : "");

  return (
    <FormItem className="space-y-2">
      <FormLabel className="text-xs font-medium text-muted-foreground">
        Logo {index + 1}
      </FormLabel>
      <FormControl>
        {previewUrl ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Partner logo ${index + 1} preview`}
              className="h-14 w-full object-contain"
            />
            <button
              type="button"
              disabled={readOnly}
              onClick={handleRemove}
              className="text-red-500 text-xs underline disabled:pointer-events-none disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ) : (
          <FileUploader
            value={files}
            onValueChange={handleChange}
            maxFileCount={1}
            maxSize={1 * 1024 * 1024}
            onRemove={handleRemove}
            disabled={readOnly}
            accept={{
              "image/png": [],
              "image/jpeg": [],
              "image/jpg": [],
              "image/webp": [],
              "image/svg+xml": [],
            }}
          />
        )}
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

/** Grid of the fixed partner-logo slots for the Trusted By section. */
function PartnerLogosField({ readOnly }: { readOnly?: boolean }) {
  return (
    <div className="space-y-3">
      <div>
        <FormLabel className="text-sm font-medium">Partner logos</FormLabel>
        <FormDescription>
          Upload up to {PARTNER_LOGO_NAMES.length} logos (PNG, JPG, WEBP or SVG,
          max 1MB each). Leave all empty to show the default sample logos.
        </FormDescription>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {PARTNER_LOGO_NAMES.map((name, index) => (
          <PartnerLogoField
            key={name}
            name={name}
            index={index}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

type AudienceImageName =
  | "home_audience_1_image"
  | "home_audience_2_image"
  | "home_audience_3_image"
  | "home_audience_4_image"
  | "home_audience_5_image"
  | "home_audience_6_image";

type AudienceTextName =
  | "home_audience_1_title"
  | "home_audience_1_description"
  | "home_audience_2_title"
  | "home_audience_2_description"
  | "home_audience_3_title"
  | "home_audience_3_description"
  | "home_audience_4_title"
  | "home_audience_4_description"
  | "home_audience_5_title"
  | "home_audience_5_description"
  | "home_audience_6_title"
  | "home_audience_6_description";

const AUDIENCE_CARD_FIELDS: Array<{
  title: AudienceTextName;
  description: AudienceTextName;
  image: AudienceImageName;
}> = [
  {
    title: "home_audience_1_title",
    description: "home_audience_1_description",
    image: "home_audience_1_image",
  },
  {
    title: "home_audience_2_title",
    description: "home_audience_2_description",
    image: "home_audience_2_image",
  },
  {
    title: "home_audience_3_title",
    description: "home_audience_3_description",
    image: "home_audience_3_image",
  },
  {
    title: "home_audience_4_title",
    description: "home_audience_4_description",
    image: "home_audience_4_image",
  },
  {
    title: "home_audience_5_title",
    description: "home_audience_5_description",
    image: "home_audience_5_image",
  },
  {
    title: "home_audience_6_title",
    description: "home_audience_6_description",
    image: "home_audience_6_image",
  },
];

/** Card image slot (event photo, 16:9). */
function AudienceCardImage({
  name,
  readOnly,
}: {
  name: AudienceImageName;
  readOnly?: boolean;
}) {
  const { watch, setValue } = useFormContext<SiteEssentialsFormValues>();
  const rawValue = watch(name);
  const existingUrl = typeof rawValue === "string" ? rawValue : "";
  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (next: File[]) => {
    const file = next[0];
    if (!file) return;
    setFiles([ensureFilePreview(file)]);
    setValue(name, file, { shouldDirty: true });
  };

  const handleRemove = () => {
    revokeFilePreview(files[0]);
    setFiles([]);
    setValue(name, null, { shouldDirty: true });
  };

  const localPreview = (files[0] as (File & { preview?: string }) | undefined)
    ?.preview;
  const previewUrl = localPreview || (existingUrl ? addCacheBusting(existingUrl) : "");

  return (
    <FormItem className="space-y-2">
      <FormLabel className="text-xs font-medium text-muted-foreground">
        Image
      </FormLabel>
      <FormControl>
        {previewUrl ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Card image preview"
              className="h-32 w-full rounded-lg object-cover"
            />
            <button
              type="button"
              disabled={readOnly}
              onClick={handleRemove}
              className="text-red-500 text-xs underline disabled:pointer-events-none disabled:opacity-50"
            >
              Remove image
            </button>
          </div>
        ) : (
          <FileUploader
            value={files}
            onValueChange={handleChange}
            maxFileCount={1}
            maxSize={2 * 1024 * 1024}
            onRemove={handleRemove}
            disabled={readOnly}
            accept={{
              "image/png": [],
              "image/jpeg": [],
              "image/jpg": [],
              "image/webp": [],
            }}
            enableCropping
            aspectRatio={16 / 9}
            cropConfig={{
              maxSizeKB: 500,
              quality: 0.9,
              maxWidth: 1280,
              maxHeight: 720,
            }}
          />
        )}
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

/** Character-counted title/description field for a card or feature. */
function CardTextField({
  name,
  label,
  placeholder,
  maxLength,
  multiline,
  readOnly,
}: {
  name: AudienceTextName | FeatureTitleName;
  label: string;
  placeholder?: string;
  maxLength: number;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  const { control } = useFormContext<SiteEssentialsFormValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const currentLength = field.value?.length || 0;
        return (
          <FormItem className="space-y-1.5">
            <FormLabel className="text-xs font-medium text-muted-foreground">
              {label}
            </FormLabel>
            <FormControl>
              {multiline ? (
                <Textarea
                  placeholder={placeholder}
                  disabled={readOnly}
                  {...field}
                  value={field.value || ""}
                  maxLength={maxLength}
                  className="min-h-[70px]"
                />
              ) : (
                <Input
                  placeholder={placeholder}
                  disabled={readOnly}
                  {...field}
                  value={field.value || ""}
                  maxLength={maxLength}
                />
              )}
            </FormControl>
            <div className="text-xs text-muted-foreground">
              {currentLength}/{maxLength} characters
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/** Grid of the 6 fixed audience cards (image + title + description). */
function AudienceCardsField({ readOnly }: { readOnly?: boolean }) {
  const defaults = ADMIN_HOME_DEFAULTS.audience.cards;
  return (
    <div className="space-y-3">
      <div>
        <FormLabel className="text-sm font-medium">Cards</FormLabel>
        <FormDescription>
          Each card shows an image, title, and description. Empty fields fall
          back to the default card.
        </FormDescription>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {AUDIENCE_CARD_FIELDS.map((fieldSet, index) => (
          <div
            key={fieldSet.image}
            className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Card {index + 1}
            </span>
            <AudienceCardImage name={fieldSet.image} readOnly={readOnly} />
            <CardTextField
              name={fieldSet.title}
              label="Title"
              placeholder={defaults[index]?.title}
              maxLength={HOME_CARD_TITLE_MAX_CHARS}
              readOnly={readOnly}
            />
            <CardTextField
              name={fieldSet.description}
              label="Description"
              placeholder={defaults[index]?.description}
              maxLength={HOME_CARD_DESC_MAX_CHARS}
              multiline
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

type FeatureTitleName =
  | "home_feature_1_title"
  | "home_feature_2_title"
  | "home_feature_3_title"
  | "home_feature_4_title"
  | "home_feature_5_title"
  | "home_feature_6_title"
  | "home_feature_7_title"
  | "home_feature_8_title"
  | "home_feature_9_title"
  | "home_feature_10_title";

type FeatureIconName =
  | "home_feature_1_icon"
  | "home_feature_2_icon"
  | "home_feature_3_icon"
  | "home_feature_4_icon"
  | "home_feature_5_icon"
  | "home_feature_6_icon"
  | "home_feature_7_icon"
  | "home_feature_8_icon"
  | "home_feature_9_icon"
  | "home_feature_10_icon";

const FEATURE_FIELDS: Array<{
  title: FeatureTitleName;
  icon: FeatureIconName;
}> = [
  { title: "home_feature_1_title", icon: "home_feature_1_icon" },
  { title: "home_feature_2_title", icon: "home_feature_2_icon" },
  { title: "home_feature_3_title", icon: "home_feature_3_icon" },
  { title: "home_feature_4_title", icon: "home_feature_4_icon" },
  { title: "home_feature_5_title", icon: "home_feature_5_icon" },
  { title: "home_feature_6_title", icon: "home_feature_6_icon" },
  { title: "home_feature_7_title", icon: "home_feature_7_icon" },
  { title: "home_feature_8_title", icon: "home_feature_8_icon" },
  { title: "home_feature_9_title", icon: "home_feature_9_icon" },
  { title: "home_feature_10_title", icon: "home_feature_10_icon" },
];

/** Icon picker (curated lucide set) with a live preview swatch. */
function IconSelectField({
  name,
  fallbackIcon,
  readOnly,
}: {
  name: FeatureIconName;
  fallbackIcon: string;
  readOnly?: boolean;
}) {
  const { control } = useFormContext<SiteEssentialsFormValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const current = field.value || "";
        const PreviewIcon = getAdminHomeIcon(current || fallbackIcon);
        return (
          <FormItem className="space-y-1.5">
            <FormLabel className="text-xs font-medium text-muted-foreground">
              Icon
            </FormLabel>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-primary)]/10">
                <PreviewIcon className="h-4 w-4 text-[color:var(--color-primary)]" />
              </div>
              <FormControl>
                <Select
                  value={current || undefined}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Default icon" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ADMIN_HOME_ICON_OPTIONS.map((iconName) => {
                      const OptionIcon = getAdminHomeIcon(iconName);
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <span className="flex items-center gap-2">
                            <OptionIcon className="h-4 w-4" />
                            {iconName}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/** Grid of the 10 fixed feature items (icon + title). */
function FeatureItemsField({ readOnly }: { readOnly?: boolean }) {
  const defaults = ADMIN_HOME_DEFAULTS.features.items;
  return (
    <div className="space-y-3">
      <div>
        <FormLabel className="text-sm font-medium">Feature items</FormLabel>
        <FormDescription>
          Each item shows an icon and a short title. Empty fields fall back to
          the default item.
        </FormDescription>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {FEATURE_FIELDS.map((fieldSet, index) => (
          <div
            key={fieldSet.title}
            className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Feature {index + 1}
            </span>
            <CardTextField
              name={fieldSet.title}
              label="Title"
              placeholder={defaults[index]?.title}
              maxLength={HOME_FEATURE_TITLE_MAX_CHARS}
              readOnly={readOnly}
            />
            <IconSelectField
              name={fieldSet.icon}
              fallbackIcon={defaults[index]?.icon ?? "Sparkles"}
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Repeatable FAQ editor (question + answer), capped at HOME_FAQ_MAX_ITEMS.
 * Empty list falls back to the platform's default FAQs on the public page.
 */
function FaqItemsField({ readOnly }: { readOnly?: boolean }) {
  const { control } = useFormContext<SiteEssentialsFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "home_faq_items",
  });

  const atLimit = fields.length >= HOME_FAQ_MAX_ITEMS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel className="text-sm font-medium">
          Questions & answers
        </FormLabel>
        <span className="text-xs text-muted-foreground">
          {fields.length}/{HOME_FAQ_MAX_ITEMS}
        </span>
      </div>
      <FormDescription>
        Add up to {HOME_FAQ_MAX_ITEMS} questions. Leave empty to show the default
        list.
      </FormDescription>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-muted-foreground dark:border-gray-700 dark:bg-gray-900/40">
          No custom questions yet — the default FAQs are shown on your site.
        </p>
      ) : null}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="relative space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Question {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={readOnly}
                onClick={() => remove(index)}
                className="h-8 px-2 text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove question {index + 1}</span>
              </Button>
            </div>

            <FormField
              control={control}
              name={`home_faq_items.${index}.question`}
              render={({ field: questionField }) => (
                <FormItem className="space-y-1.5">
                  <FormControl>
                    <Input
                      placeholder="e.g. How quickly can I set up my website?"
                      disabled={readOnly}
                      {...questionField}
                      value={questionField.value || ""}
                      maxLength={HOME_FAQ_QUESTION_MAX_CHARS}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`home_faq_items.${index}.answer`}
              render={({ field: answerField }) => (
                <FormItem className="space-y-1.5">
                  <FormControl>
                    <Textarea
                      placeholder="Write a clear, helpful answer…"
                      disabled={readOnly}
                      {...answerField}
                      value={answerField.value || ""}
                      maxLength={HOME_FAQ_ANSWER_MAX_CHARS}
                      className="min-h-[90px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={readOnly || atLimit}
        onClick={() => append({ question: "", answer: "" })}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add question
      </Button>
      {atLimit ? (
        <p className="text-xs text-muted-foreground">
          You've reached the maximum of {HOME_FAQ_MAX_ITEMS} questions.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Admin marketing home editor. Shown only for the admin/main site in place of
 * the vendor location-page fields. Repeatable lists (partner logos, audience
 * cards, feature items, news articles) are not editable here yet — FAQs are.
 */
export function AdminHomePageSection() {
  const { readOnly } = useSiteEssentialsUpdateGate();
  const d = ADMIN_HOME_DEFAULTS;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-800 dark:bg-blue-950/40">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Your public home page
          </p>
          <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
            Edit each section of your marketing home. Empty fields fall back to
            the default text.
          </p>
        </div>
      </div>

      <SectionCard
        title="Hero"
        description="The first thing visitors see at the top of the page."
      >
        <HeroImageField readOnly={readOnly} />
        <TextField
          name="home_hero_eyebrow"
          label="Eyebrow / trust line"
          placeholder={d.hero.eyebrow}
          maxLength={HOME_EYEBROW_MAX_CHARS}
          readOnly={readOnly}
        />
        <TextField
          name="home_hero_title"
          label="Heading"
          placeholder={d.hero.title}
          maxLength={HOME_TITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <TextField
          name="home_hero_subtitle"
          label="Subheading"
          placeholder={d.hero.subtitle}
          maxLength={HOME_SUBTITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <TextField
              name="home_hero_primary_cta"
              label="Primary button text"
              placeholder={d.hero.primaryCta}
              maxLength={HOME_CTA_MAX_CHARS}
              readOnly={readOnly}
            />
            <LinkField
              name="home_hero_primary_cta_link"
              label="Primary button link"
              readOnly={readOnly}
            />
          </div>
          <div className="space-y-4">
            <TextField
              name="home_hero_secondary_cta"
              label="Secondary button text"
              placeholder={d.hero.secondaryCta}
              maxLength={HOME_CTA_MAX_CHARS}
              readOnly={readOnly}
            />
            <LinkField
              name="home_hero_secondary_cta_link"
              label="Secondary button link"
              readOnly={readOnly}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Introduction"
        description='The "what is this platform" block.'
      >
        <TextField
          name="home_intro_title"
          label="Heading"
          placeholder={d.intro.title}
          maxLength={HOME_TITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <BodyField
          name="home_intro_body"
          label="Body"
          placeholder="Describe your platform in one or two short paragraphs…"
          readOnly={readOnly}
        />
      </SectionCard>

      <SectionCard
        title="Trusted By"
        description="Heading, subheading, and the partner logos strip."
      >
        <TextField
          name="home_partners_title"
          label="Heading"
          placeholder={d.partners.title}
          maxLength={HOME_TITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <TextField
          name="home_partners_subtitle"
          label="Subheading"
          placeholder={d.partners.subtitle}
          maxLength={HOME_SUBTITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <PartnerLogosField readOnly={readOnly} />
      </SectionCard>

      <SectionCard
        title="Audience"
        description="Heading, subheading, and the “who is it for?” cards."
      >
        <TextField
          name="home_audience_title"
          label="Heading"
          placeholder={d.audience.title}
          maxLength={HOME_TITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <TextField
          name="home_audience_subtitle"
          label="Subheading"
          placeholder={d.audience.subtitle}
          maxLength={HOME_SUBTITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <AudienceCardsField readOnly={readOnly} />
      </SectionCard>

      <SectionCard
        title="Features"
        description="Heading, subheading, and the feature list items."
      >
        <TextField
          name="home_features_title"
          label="Heading"
          placeholder={d.features.title}
          maxLength={HOME_TITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <TextField
          name="home_features_subtitle"
          label="Subheading"
          placeholder={d.features.subtitle}
          maxLength={HOME_SUBTITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <FeatureItemsField readOnly={readOnly} />
      </SectionCard>

      <SectionCard
        title="Showcase"
        description="The larger feature block with the checklist and call to action."
      >
        <TextField
          name="home_showcase_title"
          label="Heading"
          placeholder={d.showcase.title}
          maxLength={HOME_TITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <BodyField
          name="home_showcase_body"
          label="Body"
          placeholder="Explain the value in one or two short paragraphs…"
          readOnly={readOnly}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            name="home_showcase_checklist_title"
            label="Checklist heading"
            placeholder={d.showcase.checklistTitle}
            maxLength={HOME_EYEBROW_MAX_CHARS}
            readOnly={readOnly}
          />
          <div className="space-y-4">
            <TextField
              name="home_showcase_cta"
              label="Button text"
              placeholder={d.showcase.cta}
              maxLength={HOME_CTA_MAX_CHARS}
              readOnly={readOnly}
            />
            <LinkField
              name="home_showcase_cta_link"
              label="Button link"
              readOnly={readOnly}
            />
          </div>
        </div>
        <ShowcaseImageField readOnly={readOnly} />
        <LinkField
          name="home_showcase_video_url"
          label="Demo video link"
          placeholder="YouTube, Vimeo, or MP4 URL"
          description="Adds a “Watch Demo” play button over the image. Leave empty to hide it."
          readOnly={readOnly}
        />
      </SectionCard>

      <SectionCard
        title="News"
        description="Heading above the articles grid. Articles are managed separately."
      >
        <TextField
          name="home_news_title"
          label="Heading"
          placeholder={d.news.title}
          maxLength={HOME_TITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <TextField
          name="home_news_subtitle"
          label="Subheading"
          placeholder={d.news.subtitle}
          maxLength={HOME_SUBTITLE_MAX_CHARS}
          readOnly={readOnly}
        />
      </SectionCard>

      <SectionCard
        title="FAQ"
        description="Heading, subheading, and the list of questions shown near the footer."
      >
        <TextField
          name="home_faq_title"
          label="Heading"
          placeholder={d.faq.title}
          maxLength={HOME_TITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <TextField
          name="home_faq_subtitle"
          label="Subheading"
          placeholder={d.faq.subtitle}
          maxLength={HOME_SUBTITLE_MAX_CHARS}
          readOnly={readOnly}
        />
        <FaqItemsField readOnly={readOnly} />
      </SectionCard>
    </div>
  );
}
