import type { UseFormReturn } from "react-hook-form";
import type { SiteEssentialsFormValues } from "./schema";
import type { WebsiteImportResult } from "@/app/api/ai/import-website/types";

export interface ImportSelection {
  /** Headings, about, section titles, copyright, company + info pages. */
  content: boolean;
  seo: boolean;
  social: boolean;
  /** Heading/body fonts + any required font stylesheet URLs. */
  typography: boolean;
  logo: boolean;
  /** Location page banner (`cover_image`). */
  cover: boolean;
  /** Multi-location main home background (`main_landing_cover_image`). */
  mainLandingCover: boolean;
  favicon: boolean;
  /** Optional override — gallery image for the location page banner. */
  coverUrl?: string;
  /** Optional override — gallery image for the main home background. */
  mainLandingCoverUrl?: string;
}

export interface ApplyImportSummary {
  appliedFields: number;
  imageErrors: string[];
}

type FormType = UseFormReturn<SiteEssentialsFormValues>;

function setIfPresent<K extends keyof SiteEssentialsFormValues>(
  form: FormType,
  name: K,
  value: SiteEssentialsFormValues[K] | undefined | null,
): boolean {
  if (value === undefined || value === null || value === "") return false;
  form.setValue(name, value, { shouldDirty: true, shouldValidate: false });
  return true;
}

async function remoteImageToFile(
  remoteUrl: string,
  baseName: string,
): Promise<File | null> {
  const proxy = `/api/ai/import-website/image?url=${encodeURIComponent(remoteUrl)}`;
  const res = await fetch(proxy);
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob.size || !blob.type.startsWith("image/")) return null;
  const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg";
  return new File([blob], `${baseName}.${ext}`, { type: blob.type });
}

/** Process a remote logo through the existing logo pipeline (bg removal + contrast). */
async function processRemoteLogo(
  logoUrl: string,
  headerBackground: string,
): Promise<File | null> {
  const fd = new FormData();
  fd.append("logo_url", logoUrl);
  if (headerBackground) fd.append("header_background", headerBackground);
  const res = await fetch("/api/logo/process", { method: "POST", body: fd });
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob.size) return null;
  return new File([blob], "logo.png", { type: blob.type || "image/png" });
}

/**
 * Applies an analyzed website result to the Site Essentials form.
 *
 * Text fields are set synchronously; images are fetched (through our same-origin
 * proxy / logo pipeline) and converted to `File`s so they upload exactly like a
 * manual selection. Color import is applied by the caller from
 * `result.colorTheme` (palette-derived) when available.
 */
export async function applyImportedWebsite(
  form: FormType,
  result: WebsiteImportResult,
  selection: ImportSelection,
  options?: { locationSlug?: string | null },
): Promise<ApplyImportSummary> {
  const { content, images, socialLinks, typography } = result;
  let appliedFields = 0;
  const imageErrors: string[] = [];
  const bump = (changed: boolean) => {
    if (changed) appliedFields += 1;
  };

  if (selection.content) {
    bump(setIfPresent(form, "banner_heading", content.banner_heading));
    bump(setIfPresent(form, "banner_sub_heading", content.banner_sub_heading));
    bump(setIfPresent(form, "about_title", content.about_title));
    bump(setIfPresent(form, "about_description", content.about_description));
    bump(setIfPresent(form, "event_title_1", content.event_title_1));
    bump(setIfPresent(form, "event_title_2", content.event_title_2));
    bump(setIfPresent(form, "event_gallery_title", content.event_gallery_title));
    bump(setIfPresent(form, "copyright", content.copyright));
    bump(setIfPresent(form, "about_page_content", content.about_page_content));
    bump(setIfPresent(form, "contact_page_content", content.contact_page_content));
    bump(setIfPresent(form, "company_legal_name", content.company_legal_name));
    bump(setIfPresent(form, "company_email", content.company_email));
    bump(setIfPresent(form, "company_phone", content.company_phone));
    bump(
      setIfPresent(
        form,
        "company_registered_office",
        content.company_registered_office,
      ),
    );
  }

  if (selection.seo) {
    bump(setIfPresent(form, "seo", content.seo));
  }

  if (selection.typography) {
    form.setValue("theme_preset_id", null, { shouldDirty: true });
    if (typography.heading) {
      form.setValue("typography.fontFamily.heading", typography.heading, {
        shouldDirty: true,
      });
      appliedFields += 1;
    }
    if (typography.body) {
      form.setValue("typography.fontFamily.body", typography.body, {
        shouldDirty: true,
      });
      appliedFields += 1;
    }
    if (typography.stylesheetUrls.length > 0) {
      const current = form.getValues("typography.customFontStylesheetUrls") ?? [];
      const merged = Array.from(
        new Set([...current, ...typography.stylesheetUrls]),
      ).slice(0, 5);
      form.setValue("typography.customFontStylesheetUrls", merged, {
        shouldDirty: true,
      });
    }
  }

  if (selection.social) {
    const current = form.getValues("socialLinks");
    const merged = {
      facebook: socialLinks.facebook || current?.facebook || "",
      twitter: socialLinks.twitter || current?.twitter || "",
      instagram: socialLinks.instagram || current?.instagram || "",
      linkedin: socialLinks.linkedin || current?.linkedin || "",
      youtube: socialLinks.youtube || current?.youtube || "",
    };
    if (
      merged.facebook ||
      merged.twitter ||
      merged.instagram ||
      merged.linkedin ||
      merged.youtube
    ) {
      form.setValue("socialLinks", merged, { shouldDirty: true });
      appliedFields += 1;
    }
  }

  // ---- Images (async) ----
  if (selection.logo && images.logo) {
    try {
      const headerBg = form.getValues("colors.header") || "";
      const logoFile = await processRemoteLogo(images.logo, headerBg);
      if (logoFile) {
        form.setValue("logo", logoFile, { shouldDirty: true });
        appliedFields += 1;
      } else {
        imageErrors.push("logo");
      }
    } catch {
      imageErrors.push("logo");
    }
  }

  const locationCoverUrl = selection.coverUrl || images.cover;
  if (selection.cover && locationCoverUrl) {
    try {
      const coverFile = await remoteImageToFile(locationCoverUrl, "cover");
      if (coverFile) {
        form.setValue("cover_image", coverFile, { shouldDirty: true });
        form.setValue("cover_video", null, { shouldDirty: true });
        // Keep Main home city-card preview in sync for the location being edited
        const slug =
          form.getValues("slug")?.trim() ||
          options?.locationSlug?.trim() ||
          "";
        if (slug && !form.getValues("slug")?.trim()) {
          form.setValue("slug", slug, { shouldDirty: false });
        }
        const locations = form.getValues("locations");
        if (slug && Array.isArray(locations) && locations.length > 0) {
          const coverPreviewUrl = URL.createObjectURL(coverFile);
          form.setValue(
            "locations",
            locations.map((loc) =>
              loc.slug?.trim() === slug
                ? { ...loc, cover_image: coverPreviewUrl }
                : loc,
            ),
            { shouldDirty: true },
          );
        }
        appliedFields += 1;
      } else {
        imageErrors.push("location cover image");
      }
    } catch {
      imageErrors.push("location cover image");
    }
  }

  const mainLandingCoverUrl =
    selection.mainLandingCoverUrl || selection.coverUrl || images.cover;
  if (selection.mainLandingCover && mainLandingCoverUrl) {
    try {
      const mainCoverFile = await remoteImageToFile(
        mainLandingCoverUrl,
        "main-landing-cover",
      );
      if (mainCoverFile) {
        form.setValue("main_landing_cover_image", mainCoverFile, {
          shouldDirty: true,
        });
        appliedFields += 1;
      } else {
        imageErrors.push("main home cover image");
      }
    } catch {
      imageErrors.push("main home cover image");
    }
  }

  if (selection.favicon && images.favicon) {
    try {
      const faviconFile = await remoteImageToFile(images.favicon, "favicon");
      if (faviconFile) {
        form.setValue("favicon", faviconFile, { shouldDirty: true });
        appliedFields += 1;
      } else {
        imageErrors.push("favicon");
      }
    } catch {
      imageErrors.push("favicon");
    }
  }

  return { appliedFields, imageErrors };
}
