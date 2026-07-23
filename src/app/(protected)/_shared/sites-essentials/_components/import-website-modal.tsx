"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Globe,
  LoaderCircle,
  Sparkles,
  Info,
  Check,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useWebsiteImport, type WebsiteImportClientError } from "@/hooks/useWebsiteImport";
import { useColorThemeAI } from "@/hooks/useColorThemeAI";
import type { WebsiteImportResult } from "@/app/api/ai/import-website/types";
import { SiteEssentialsFormValues } from "../_lib/schema";
import {
  applyImportedWebsite,
  type ImportSelection,
} from "../_lib/apply-imported-website";
import { useSession } from "next-auth/react";
import { useVendorLocationsList } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { resolveDefaultVenueLocation } from "@/lib/auth/session-location";

interface ImportWebsiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ToggleKey = Exclude<keyof ImportSelection, "coverUrl">;

function proxiedImageUrl(url: string): string {
  return `/api/ai/import-website/image?url=${encodeURIComponent(url)}`;
}

export function ImportWebsiteModal({
  open,
  onOpenChange,
}: ImportWebsiteModalProps) {
  const form = useFormContext<SiteEssentialsFormValues>();
  const { data: session } = useSession();
  const { locations: venueLocations } = useVendorLocationsList();
  const activeVenueSlug = resolveDefaultVenueLocation(
    venueLocations,
    venueLocations.find(
      (loc) =>
        String(loc.id) === String(session?.user?.vendor_location_id ?? ""),
    ),
  )?.slug?.trim();
  const { importWebsite, isImporting } = useWebsiteImport();
  const { generateColorTheme } = useColorThemeAI();

  const [url, setUrl] = useState("");
  const [result, setResult] = useState<WebsiteImportResult | null>(null);
  const [analyzeError, setAnalyzeError] =
    useState<WebsiteImportClientError | null>(null);
  const [applying, setApplying] = useState(false);
  const [selectedCover, setSelectedCover] = useState<string>("");
  const [selection, setSelection] = useState<Record<ToggleKey, boolean>>({
    content: true,
    seo: true,
    social: true,
    typography: true,
    logo: true,
    cover: true,
    favicon: true,
  });
  // Colors reuse the dedicated contrast-safe AI theme generator.
  const [importColors, setImportColors] = useState(true);

  const resetAll = () => {
    setUrl("");
    setResult(null);
    setAnalyzeError(null);
    setSelectedCover("");
    setSelection({
      content: true,
      seo: true,
      social: true,
      typography: true,
      logo: true,
      cover: true,
      favicon: true,
    });
    setImportColors(true);
  };

  const handleClose = (next: boolean) => {
    if (!next) resetAll();
    onOpenChange(next);
  };

  const handleAnalyze = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    setAnalyzeError(null);
    setResult(null);

    const { data, error } = await importWebsite(normalized, { rewrite: true });
    if (error) {
      setAnalyzeError(error);
      return;
    }
    if (!data) return;

    setResult(data);
    setSelectedCover(data.images.cover ?? data.images.gallery[0] ?? "");
    setSelection((prev) => ({
      ...prev,
      logo: Boolean(data.images.logo),
      cover: Boolean(data.images.cover || data.images.gallery.length),
      favicon: Boolean(data.images.favicon),
      typography: Boolean(data.typography.heading || data.typography.body),
      social: Object.values(data.socialLinks).some(Boolean) && prev.social,
    }));
  };

  const applyColorsFromWebsite = async () => {
    // Prefer the import API's palette-derived theme (keeps dark purple brands).
    // Falling back to /api/ai/color-theme washes sites into a light blue UI.
    const imported = result?.colorTheme;
    if (imported) {
      form.setValue("colors.primary", imported.primary, { shouldDirty: true });
      form.setValue("colors.secondary", imported.secondary, { shouldDirty: true });
      form.setValue("colors.header", imported.header, { shouldDirty: true });
      form.setValue("colors.footer", imported.footer, { shouldDirty: true });
      form.setValue("colors.background", imported.background, { shouldDirty: true });
      form.setValue("colors.surface", imported.surface, { shouldDirty: true });
      form.setValue("colors.text", imported.text, { shouldDirty: true });
      form.setValue("colors.textDimmed", imported.textDimmed, { shouldDirty: true });
      form.setValue("colors.socialLogin.google", imported.socialLogin.google, {
        shouldDirty: true,
      });
      form.setValue(
        "colors.socialLogin.microsoft",
        imported.socialLogin.microsoft,
        { shouldDirty: true },
      );
      return;
    }

    const colorTheme = await generateColorTheme({
      websiteUrl: result?.sourceUrl,
      existingBrand: result?.colors?.slice(0, 8).join(", "),
    });
    if (!colorTheme) return;
    form.setValue("colors.primary", colorTheme.primary, { shouldDirty: true });
    form.setValue("colors.secondary", colorTheme.secondary, { shouldDirty: true });
    form.setValue("colors.header", colorTheme.header, { shouldDirty: true });
    form.setValue("colors.footer", colorTheme.footer, { shouldDirty: true });
    form.setValue("colors.background", colorTheme.background, { shouldDirty: true });
    form.setValue("colors.surface", colorTheme.surface, { shouldDirty: true });
    form.setValue("colors.text", colorTheme.text, { shouldDirty: true });
    form.setValue("colors.textDimmed", colorTheme.textDimmed, { shouldDirty: true });
    form.setValue("colors.socialLogin.google", colorTheme.socialLogin.google, {
      shouldDirty: true,
    });
    form.setValue(
      "colors.socialLogin.microsoft",
      colorTheme.socialLogin.microsoft,
      { shouldDirty: true },
    );
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    try {
      // Colors first so the logo is optimized against the imported header color.
      if (importColors) {
        await applyColorsFromWebsite();
      }

      const summary = await applyImportedWebsite(
        form,
        result,
        {
          ...selection,
          coverUrl: selection.cover ? selectedCover || undefined : undefined,
        },
        {
          locationSlug:
            form.getValues("slug")?.trim() || activeVenueSlug || undefined,
        },
      );

      if (summary.imageErrors.length > 0) {
        toast.warning("Some images couldn't be imported", {
          description: `Skipped: ${summary.imageErrors.join(", ")}. You can upload them manually.`,
        });
      }

      toast.success("Website content applied", {
        description: `Updated ${summary.appliedFields} field${
          summary.appliedFields === 1 ? "" : "s"
        }. Review, then click Save to publish.`,
      });
      handleClose(false);
    } catch (error) {
      console.error("Apply imported website failed:", error);
      toast.error("Failed to apply imported content");
    } finally {
      setApplying(false);
    }
  };

  const content = result?.content;
  const hasSocial =
    result && Object.values(result.socialLinks).some(Boolean);
  const hasFonts = Boolean(
    result?.typography.heading || result?.typography.body,
  );

  const toggleRow = (
    key: ToggleKey,
    label: string,
    hint: string,
    disabled = false,
  ) => (
    <label
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        disabled ? "opacity-50" : "cursor-pointer hover:bg-slate-50"
      }`}
    >
      <Checkbox
        checked={selection[key]}
        disabled={disabled}
        onCheckedChange={(v) =>
          setSelection((prev) => ({ ...prev, [key]: Boolean(v) }))
        }
        className="mt-0.5"
      />
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto text-black">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import from an existing website
          </DialogTitle>
          <DialogDescription>
            Paste a website URL and we&apos;ll analyze it with AI to pre-fill your
            site content, images and theme.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="import-url">Website URL</Label>
              <div className="flex gap-2">
                <Input
                  id="import-url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAnalyze();
                    }
                  }}
                  disabled={isImporting}
                />
                <Button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={isImporting || !url.trim()}
                  variant="event-primary"
                >
                  {isImporting ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Alert className="border-slate-200 bg-slate-50 text-slate-800">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                We import content as an editable draft. The AI rewrites copy in
                original wording to avoid copyright issues. Sites that render
                entirely with JavaScript may return limited content. Always
                review before saving.
              </AlertDescription>
            </Alert>

            {analyzeError ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="space-y-1.5 text-sm">
                  <p className="font-semibold leading-snug">
                    {analyzeError.message}
                  </p>
                  {analyzeError.hint ? (
                    <p className="text-xs leading-relaxed text-amber-900/80">
                      {analyzeError.hint}
                    </p>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium break-all">{result.sourceUrl}</span>
              {result.rewritten && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> AI-rewritten
                </Badge>
              )}
            </div>

            {/* What to import */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">What would you like to import?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {toggleRow(
                  "content",
                  "Content & text",
                  "Headings, about, section titles, contact & info pages",
                )}
                {toggleRow("seo", "SEO", "Title, description & keywords")}
                {toggleRow(
                  "social",
                  "Social links",
                  hasSocial ? "Facebook, Instagram, etc." : "None found",
                  !hasSocial,
                )}
                <label
                  className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-slate-50"
                >
                  <Checkbox
                    checked={importColors}
                    onCheckedChange={(v) => setImportColors(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">Color theme</p>
                    <p className="text-xs text-muted-foreground">
                      {result.colorTheme
                        ? "Brand colors from the site (dark themes kept dark)"
                        : "AI theme inspired by the site (contrast-safe)"}
                    </p>
                    {result.colorTheme ? (
                      <div className="mt-2 flex items-center gap-1.5">
                        {(
                          [
                            result.colorTheme.primary,
                            result.colorTheme.header,
                            result.colorTheme.surface,
                            result.colorTheme.secondary,
                          ] as string[]
                        ).map((hex) => (
                          <span
                            key={hex}
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{
                              background: hex.startsWith("#") ? hex : undefined,
                            }}
                            title={hex}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </label>
                {toggleRow(
                  "typography",
                  "Fonts",
                  hasFonts
                    ? [result?.typography.headingName, result?.typography.bodyName]
                        .filter(Boolean)
                        .join(" / ") || "Heading & body fonts"
                    : "None found",
                  !hasFonts,
                )}
                {toggleRow(
                  "logo",
                  "Logo",
                  result.images.logo ? "Detected logo (auto-optimized)" : "None found",
                  !result.images.logo,
                )}
                {toggleRow(
                  "cover",
                  "Cover image",
                  result.images.cover || result.images.gallery.length
                    ? "Hero/banner image"
                    : "None found",
                  !(result.images.cover || result.images.gallery.length),
                )}
                {toggleRow(
                  "favicon",
                  "Favicon",
                  result.images.favicon ? "Site icon" : "None found",
                  !result.images.favicon,
                )}
              </div>
            </div>

            {/* Content preview */}
            {content && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Preview</p>
                  <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 text-sm">
                    <PreviewField label="Banner heading" value={content.banner_heading} />
                    <PreviewField label="Banner sub-heading" value={content.banner_sub_heading} />
                    <PreviewField label="About title" value={content.about_title} />
                    <PreviewField label="About description" value={content.about_description} />
                    <div className="grid grid-cols-2 gap-3">
                      <PreviewField label="Section 1" value={content.event_title_1} />
                      <PreviewField label="Section 2" value={content.event_title_2} />
                    </div>
                    {selection.seo && (
                      <PreviewField label="SEO title" value={content.seo?.title} />
                    )}
                    {selection.typography && hasFonts && (
                      <PreviewField
                        label="Fonts (heading / body)"
                        value={[
                          result.typography.headingName,
                          result.typography.bodyName,
                        ]
                          .filter(Boolean)
                          .join("  /  ")}
                      />
                    )}
                    {(content.company_email || content.company_phone) && (
                      <PreviewField
                        label="Contact"
                        value={[content.company_email, content.company_phone]
                          .filter(Boolean)
                          .join("  ·  ")}
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Logo + Favicon previews */}
            {(result.images.logo || result.images.favicon) && (
              <div className="flex flex-wrap gap-6">
                {result.images.logo && selection.logo && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Logo</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proxiedImageUrl(result.images.logo)}
                      alt="Detected logo"
                      className="h-14 max-w-[180px] rounded border bg-white object-contain p-1"
                      onError={(e) => {
                        e.currentTarget.src = result.images.logo!;
                      }}
                    />
                  </div>
                )}
                {result.images.favicon && selection.favicon && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Favicon</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proxiedImageUrl(result.images.favicon)}
                      alt="Detected favicon"
                      className="h-14 w-14 rounded border bg-white object-contain p-1"
                      onError={(e) => {
                        e.currentTarget.src = result.images.favicon!;
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Cover image chooser */}
            {selection.cover && result.images.gallery.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  Choose a cover image{" "}
                  <span className="font-normal text-muted-foreground">
                    (tap to select)
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {result.images.gallery.map((img) => {
                    const active = selectedCover === img;
                    return (
                      <button
                        type="button"
                        key={img}
                        onClick={() => setSelectedCover(img)}
                        className={`relative aspect-video overflow-hidden rounded-lg border-2 bg-slate-100 transition ${
                          active
                            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30"
                            : "border-transparent hover:border-slate-300"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proxiedImageUrl(img)}
                          alt="Candidate cover"
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.dataset.fallback === "1") return;
                            target.dataset.fallback = "1";
                            // Fall back to direct URL if the proxy fails.
                            target.src = img;
                          }}
                        />
                        {active && (
                          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : selection.cover ? (
              <Alert className="border-slate-200 bg-slate-50 text-slate-800">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  No usable cover images were found on this website. You can
                  still apply the text content, then upload a banner manually in
                  Branding.
                </AlertDescription>
              </Alert>
            ) : null}

            {result.warnings?.length ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="space-y-1 text-xs">
                  {result.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </AlertDescription>
              </Alert>
            ) : null}

            <Separator />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={resetAll}
                disabled={applying}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Try another URL
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={applying}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="event-primary"
                  onClick={() => void handleApply()}
                  disabled={applying}
                >
                  {applying ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Applying…
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Apply to my site
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}
