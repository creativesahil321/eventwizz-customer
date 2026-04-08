"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  useRef,
  useContext,
} from "react";
import { useFormContext } from "../form-provider";
import { OnboardingFormData, type StepFiveType } from "../form-provider/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewProvider } from "@/contexts/preview-context";
import CommonHeader from "@/components/shared/common-header";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import type { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import {
  buildOnboardingStepTwoSiteEssentialsValues,
  siteEssentialsToPreviewRootStyle,
} from "../../_lib/onboarding-site-essentials-bridge";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import { PreviewThemeCustomizer } from "@/components/preview/preview-theme-customizer";
import VendorEventFooter from "@/app/(public)/vendor/_components/EventListPage/footer";
import ExperienceSection from "@/app/(public)/vendor/_components/EventListPage/experience";
import { SitePreviewDummyEventSection } from "@/app/(public)/vendor/_components/EventListPage/site-preview-dummy-events";

import "@/app/(public)/[locationSlug]/events/[eventSlug]/event-detail.css";

// Lazy load components - only import what's actually used
const BrochureSection = lazy(() => import("./_components/brochure-section"));
const DrinkSection = lazy(() => import("./_components/drink-section"));
const FaqSection = lazy(() => import("./_components/faq-section"));
const AboutEventSec = lazy(() => import("./_components/About-event-sec"));
const EventHeroSec = lazy(() => import("./_components/Event-hero-sec"));
const MenuSection = lazy(() => import("./_components/menu-section"));
const Timeline = lazy(() => import("./_components/Time-line"));
const PackageSection = lazy(() => import("./_components/package-sec"));
const DatesSection = lazy(() => import("./_components/Dates-section"));
const HomepageHeroSec = lazy(() => import("./_components/Homepage-hero-sec"));
const EventGallery = lazy(() => import("./_components/Event-gallery"));

// Component loaders
const BannerLoader = () => <Skeleton className="w-full h-64 rounded-lg" />;
const SectionLoader = () => (
  <div className="space-y-4 my-8">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </div>
);

/** Lowest ticket/table price per date for customer-facing date cards (preview). */
function minPriceFromStepFiveDate(d: StepFiveType["dates"][number]): number {
  const nums: number[] = [];
  for (const t of d.tickets ?? []) {
    const n = Number(t.price);
    if (!Number.isNaN(n) && n >= 0) nums.push(n);
  }
  for (const t of d.tables ?? []) {
    const n = Number(t.price);
    if (!Number.isNaN(n) && n >= 0) nums.push(n);
  }
  if (nums.length === 0) return 0;
  return Math.min(...nums);
}

function buildDatesPreviewFromStepFive(
  dates: StepFiveType["dates"] | undefined,
): Array<{ event_date: string; price: number }> {
  if (!dates?.length) return [];
  return dates.map((d) => ({
    event_date: d.event_date,
    price: minPriceFromStepFiveDate(d),
  }));
}

/** String URL for vendor footer override (matches CommonHeader logo resolution). */
function resolveOnboardingLogoUrl(
  logo: string | File | null | undefined,
): string | null {
  if (logo == null) return null;
  if (typeof logo === "string") return logo;
  if (
    typeof logo === "object" &&
    "preview" in logo &&
    typeof (logo as { preview?: string }).preview === "string"
  ) {
    return (logo as { preview: string }).preview;
  }
  return null;
}

/** Same steps as `form-layout` `splitLayoutSteps` — sidebar + live preview (Try theme applies here). */
const ONBOARDING_THEME_PREVIEW_STEPS = new Set([2, 3, 4, 5, 6, 7, 8, 9]);

// Only load components needed for the current step
export default function FormPreview() {
  const { form, activeStep, activeField } = useFormContext();
  const { theme } = useContext(ServerContext);
  const userAdjustedTryThemeRef = useRef(false);
  const [trySiteValues, setTrySiteValues] =
    useState<SiteEssentialsFormValues | null>(null);

  const [formState, setFormState] = useState<OnboardingFormData>(
    form.getValues(),
  );

  const handleTryThemeValuesChange = useCallback(
    (next: SiteEssentialsFormValues) => {
      userAdjustedTryThemeRef.current = true;
      setTrySiteValues(next);
    },
    [],
  );

  useEffect(() => {
    if (!ONBOARDING_THEME_PREVIEW_STEPS.has(activeStep)) return;
    const fresh = buildOnboardingStepTwoSiteEssentialsValues(
      formState,
      theme as ThemeSchema | null | undefined,
    );
    setTrySiteValues((prev) => {
      if (!userAdjustedTryThemeRef.current || !prev) return fresh;
      return {
        ...fresh,
        colors: prev.colors,
        typography: prev.typography,
        banner_heading_align: prev.banner_heading_align,
        banner_heading_valign: prev.banner_heading_valign,
        banner_heading_accent: prev.banner_heading_accent,
      };
    });
  }, [activeStep, formState.stepOne, formState.stepTwo, theme]);

  const tryThemePreviewValues = useMemo((): SiteEssentialsFormValues | null => {
    if (!ONBOARDING_THEME_PREVIEW_STEPS.has(activeStep)) return null;
    return (
      trySiteValues ??
      buildOnboardingStepTwoSiteEssentialsValues(
        formState,
        theme as ThemeSchema | null | undefined,
      )
    );
  }, [activeStep, trySiteValues, formState.stepOne, formState.stepTwo, theme]);

  const tryHeroPreviewProps = useMemo(() => {
    if (
      !tryThemePreviewValues ||
      !ONBOARDING_THEME_PREVIEW_STEPS.has(activeStep)
    ) {
      return null;
    }
    const accent = tryThemePreviewValues.banner_heading_accent;
    return {
      bannerHeadingAlign: tryThemePreviewValues.banner_heading_align ?? null,
      bannerHeadingValign: tryThemePreviewValues.banner_heading_valign ?? null,
      bannerHeadingAccent:
        typeof accent === "string" && accent.trim() ? accent.trim() : null,
      headingEmphasis:
        tryThemePreviewValues.typography?.headingEmphasis ?? null,
    };
  }, [tryThemePreviewValues, activeStep]);

  // Build downloads array for preview
  const buildDownloadsArray = (): Array<{
    title: string;
    download_link: string[];
  }> => {
    const downloads: Array<{
      title: string;
      download_link: string[];
    }> = [];

    // Add downloads from the downloads array (main source)
    if (formState.stepEight?.downloads?.length) {
      downloads.push(
        ...formState.stepEight.downloads.map(
          (download: {
            title?: string;
            pdf?: File | null;
            download_link?: string[];
          }) => ({
            title: download.title || "Download",
            download_link: [
              download.pdf instanceof File
                ? URL.createObjectURL(download.pdf)
                : download.download_link?.[0] || "#",
            ],
          }),
        ),
      );
    }

    // Add individual PDF fields as fallback (for backward compatibility)
    const individualPdfs: Array<{
      field: File | string | null | undefined;
      title: string;
    }> = [
      {
        field: formState.stepEight?.brochure_pdf,
        title: "Event Details",
      },
      {
        field: formState.stepEight?.brochure_pdf_2,
        title: "Event Flyer",
      },
      {
        field: formState.stepEight?.faq_pdf,
        title: "FAQ Details",
      },
    ];

    individualPdfs.forEach(({ field, title }) => {
      if (field && !downloads.some((d) => d.title === title)) {
        downloads.push({
          title,
          download_link: [
            typeof field === "string" ? field : URL.createObjectURL(field),
          ],
        });
      }
    });

    return downloads;
  };

  const downloadsArray = buildDownloadsArray();

  // Create refs for scrollable sections
  const headerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const eventHeroRef = useRef<HTMLDivElement>(null);
  const aboutEventRef = useRef<HTMLDivElement>(null);
  const datesRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drinkRef = useRef<HTMLDivElement>(null);
  const moreInfoRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Stable gallery for preview: reuse File.preview when set (avoids new blob URLs on reorder so preview updates instantly)
  const galleryPreviewItems = useMemo(() => {
    const gallery = formState.stepFour?.gallery;
    if (!gallery || gallery.length === 0) {
      return Array(8).fill({
        path: "/assets/images/gallery-image.png",
        relativePath: "/assets/images/gallery-image.png",
        preview: "/assets/images/gallery-image.png",
      });
    }
    return gallery.map((image) => {
      if (image instanceof File) {
        const fileWithPreview = image as File & { preview?: string };
        return {
          path: image.name,
          relativePath: image.name,
          preview: fileWithPreview.preview || URL.createObjectURL(image),
        };
      }
      if (typeof image === "object" && image !== null && "url" in image) {
        const galleryItem = image as { id: number; url: string };
        return {
          path: galleryItem.url,
          relativePath: galleryItem.url,
          preview: galleryItem.url,
        };
      }
      return image as { path: string; relativePath: string; preview: string };
    });
  }, [formState.stepFour?.gallery]);

  // Force re-render when form data changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      setFormState(value as OnboardingFormData);
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Effect to scroll to the section being edited based on active field
  useEffect(() => {
    if (!activeField || !previewContainerRef.current) return;

    const scrollToElement = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (ref?.current && previewContainerRef?.current) {
        previewContainerRef.current.scrollTo({
          top: ref.current.offsetTop - 20,
          behavior: "smooth",
        });
      }
    };

    // Map active fields to their respective sections based on step number
    switch (activeStep) {
      case 1: // Contact information
        scrollToElement(headerRef); // Most likely just header info
        break;

      case 2: // Site creation
        if (activeField.includes("logo")) {
          scrollToElement(headerRef);
        } else if (
          activeField.includes("cover_image") ||
          activeField.includes("banner_heading") ||
          activeField.includes("sub_heading")
        ) {
          scrollToElement(heroRef);
        } else if (
          activeField.includes("title") ||
          activeField.includes("description") ||
          activeField.includes("link_title")
        ) {
          scrollToElement(aboutRef);
        }
        break;

      case 3: // Event details/category
        if (
          activeField.includes("header_banner") ||
          activeField.includes("banner_heading") ||
          activeField.includes("banner_sub_heading")
        ) {
          scrollToElement(eventHeroRef);
        } else if (
          activeField.includes("about_event_") ||
          activeField.includes("event_category")
        ) {
          scrollToElement(aboutEventRef);
        } else if (activeField.includes("event_schedular")) {
          scrollToElement(timelineRef);
        }
        break;

      case 4: // Package details
        if (activeField.includes("gallery")) {
          scrollToElement(galleryRef);
        } else if (
          activeField.includes("package_image") ||
          activeField.includes("package_title") ||
          activeField.includes("package_description") ||
          activeField.includes("package_button_name") ||
          activeField.includes("package_details")
        ) {
          scrollToElement(packageRef);
        }
        break;

      case 5: // Event dates
        if (activeField.includes("dates")) {
          scrollToElement(datesRef);
        }
        break;

      case 6: // Catering options
        if (
          activeField.includes("catering") ||
          activeField.includes("title") ||
          activeField.includes("description") ||
          activeField.includes("menus")
        ) {
          scrollToElement(menuRef);
        }
        break;

      case 7: // Other Packages
        if (
          activeField.includes("drink_") ||
          activeField.includes("packages")
        ) {
          scrollToElement(drinkRef);
        }
        break;

      case 8: // More Info
        if (
          activeField.includes("brochure_pdf") ||
          activeField.includes("faq_pdf") ||
          activeField.includes("event_address") ||
          activeField.includes("price_start_from") ||
          activeField.includes("price_start_from_button_text") ||
          activeField.includes("location") ||
          activeField.includes("downloads") ||
          activeField.includes("more_info")
        ) {
          scrollToElement(moreInfoRef);
        }
        break;

      case 9: // FAQs
        if (
          activeField.includes("question") ||
          activeField.includes("answer")
        ) {
          scrollToElement(faqRef);
        }
        break;

      default:
        // For other steps, no specific scrolling behavior
        break;
    }
  }, [activeStep, activeField]);

  // When editing dates, scroll the preview so the booking strip is in view (split layout).
  useEffect(() => {
    if (activeStep !== 5) return;
    const id = window.requestAnimationFrame(() => {
      const container = previewContainerRef.current;
      const target = datesRef.current;
      if (!container || !target) return;
      container.scrollTo({
        top: Math.max(0, target.offsetTop - 24),
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [activeStep]);

  const datesPreviewItems = useMemo(
    () => buildDatesPreviewFromStepFive(formState.stepFive?.dates),
    [formState.stepFive?.dates],
  );

  // Render homepage preview (step 2) — mirrors the real vendor public site layout
  const renderStepTwoPreview = () => {
    return (
      <div className="event-detail-page">
        {/* Site Header — onboarding variant (non-interactive) */}
        <CommonHeader
          contact_number={formState.stepOne?.contact_number || ""}
          logo={formState.stepTwo?.logo || null}
          variant="onboarding"
          hasBackgroundImage={Boolean(formState.stepTwo?.cover_image)}
        />

        {/* Homepage Hero */}
        <div
          ref={heroRef}
          className={`transition-all duration-300 ${
            activeField &&
            (activeField.includes("cover_image") ||
              activeField.includes("banner_heading") ||
              activeField.includes("banner_sub_heading"))
              ? "ring-2 ring-primary ring-opacity-50"
              : ""
          }`}
        >
          <Suspense fallback={<BannerLoader />}>
            <HomepageHeroSec
              coverImage={formState.stepTwo?.cover_image || null}
              heading={formState.stepTwo?.banner_heading || ""}
              sub_heading={formState.stepTwo?.banner_sub_heading || ""}
              contact_number={formState.stepOne?.contact_number || ""}
              logo={formState.stepTwo?.logo || null}
              {...(tryHeroPreviewProps ?? {})}
            />
          </Suspense>
        </div>

        {/* About / Experience section — same component as the live vendor site */}
        <div
          ref={aboutRef}
          className={`transition-all duration-300 ${
            activeField &&
            (activeField.includes("about_title") ||
              activeField.includes("about_description") ||
              activeField.includes("about_link_title"))
              ? "ring-2 ring-primary ring-opacity-50"
              : ""
          }`}
        >
          <ExperienceSection
            aboutTitle={formState.stepTwo?.about_title || ""}
            aboutDescription={formState.stepTwo?.about_description || ""}
            aboutLinkTitle={formState.stepTwo?.about_link_title || ""}
          />
        </div>

        {/* Dummy events — shows vendors how the events grid/carousel will look */}
        <SitePreviewDummyEventSection
          sectionTitle="Latest Events"
          band="secondary"
        />
        <SitePreviewDummyEventSection
          sectionTitle="Popular Events"
          band="background"
        />

        {/* Footer */}
        <VendorEventFooter
          logo={resolveOnboardingLogoUrl(formState.stepTwo?.logo)}
        />
      </div>
    );
  };

  // Function to get highlight class for a section based on current step and active field
  const getHighlightClass = (step: number, fieldPattern: string) => {
    return activeStep === step &&
      activeField &&
      activeField.includes(fieldPattern)
      ? "ring-2 ring-primary ring-opacity-50 scroll-mt-20"
      : "";
  };

  // Always render the full site preview for other steps
  const renderFullSitePreview = () => {
    const eventBannerImageStr =
      typeof formState.stepThree?.event_banner_image === "string"
        ? formState.stepThree.event_banner_image
        : undefined;
    const eventBannerVideoStr =
      typeof formState.stepThree?.event_banner_video === "string"
        ? formState.stepThree.event_banner_video
        : undefined;
    const datesEventImage = eventBannerImageStr ?? eventBannerVideoStr;

    return (
      <div className="event-detail-page">
        {/* Same header chrome as live event detail (`EventDetailClient`); non-interactive when inside PreviewProvider. */}
        <CommonHeader
          contact_number={formState.stepOne?.contact_number || ""}
          logo={formState.stepTwo?.logo || null}
          variant="default"
        />

        {/* Event Hero with Floating Header */}
        <div
          ref={eventHeroRef}
          className={`transition-all duration-300 ${getHighlightClass(
            3,
            "banner",
          )}`}
        >
          <Suspense fallback={<BannerLoader />}>
            <EventHeroSec
              heading={
                formState.stepThree?.event_banner_heading?.trim() ||
                formState.stepThree?.event_name?.trim() ||
                ""
              }
              image={formState.stepThree?.event_banner_image || null}
              video={formState.stepThree?.event_banner_video || null}
              banner_sub_heading={
                formState.stepThree?.event_banner_sub_heading || ""
              }
              contact_number={formState.stepOne?.contact_number || ""}
              logo={formState.stepTwo?.logo || null}
              {...(tryHeroPreviewProps ?? {})}
            />
          </Suspense>
        </div>

        {/* About Event */}
        <div
          ref={aboutEventRef}
          className={`transition-all duration-300 ${getHighlightClass(
            3,
            "about_event",
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <AboutEventSec
              about_event_sub_heading={
                formState.stepThree?.about_event_sub_heading || ""
              }
              about_event_heading={
                formState.stepThree?.about_event_heading || ""
              }
              about_event_description={
                formState.stepThree?.about_event_description || ""
              }
              headingEmphasis={tryHeroPreviewProps?.headingEmphasis ?? undefined}
              aboutHeadingAccentHint={
                tryHeroPreviewProps?.bannerHeadingAccent ?? null
              }
              aboutHeadingAlign={
                tryHeroPreviewProps?.bannerHeadingAlign ?? undefined
              }
            />
          </Suspense>
        </div>

        {/* Event Schedular */}
        <div
          ref={timelineRef}
          className={`transition-all duration-300 ${getHighlightClass(
            3,
            "event_schedular",
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <Timeline
              eventSchedularTitle={
                formState.stepThree?.event_schedular_title || ""
              }
              eventSchedular={formState.stepThree?.event_schedular || []}
            />
          </Suspense>
        </div>

        {/* Package */}
        <div
          ref={packageRef}
          className={`transition-all duration-300 ${getHighlightClass(
            4,
            "package",
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <PackageSection
              heading={formState.stepFour?.package_title || ""}
              image={
                typeof formState.stepFour?.package_image === "string"
                  ? {
                      path: formState.stepFour.package_image,
                      relativePath: formState.stepFour.package_image,
                      preview: formState.stepFour.package_image,
                    }
                  : formState.stepFour?.package_image || null
              }
              subHeading={formState.stepFour?.package_description || ""}
              packageDetails={
                formState?.stepFour?.package_details?.map((detail) => ({
                  title: detail.title || "",
                  description: detail.title || "", // Use title as description since it's not in the schema
                })) || []
              }
              buttonLink={
                formState.stepFour?.package_button_name ? "#booking" : ""
              }
              buttonName={formState.stepFour?.package_button_name || ""}
            />
          </Suspense>
        </div>

        {/* Event Dates */}
        <div
          id="booking"
          ref={datesRef}
          className={`transition-all duration-300 ${getHighlightClass(
            5,
            "dates",
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <DatesSection
              dates={datesPreviewItems}
              eventName={formState.stepThree?.event_name || undefined}
              eventImage={datesEventImage}
            />
          </Suspense>
        </div>

        {/* Event Gallery */}
        <div
          ref={galleryRef}
          className={`transition-all duration-300 ${getHighlightClass(
            4,
            "gallery",
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <EventGallery gallery={galleryPreviewItems} />
          </Suspense>
        </div>

        {/* Catering Options — same visibility rule as live event page */}
        <div
          ref={menuRef}
          className={`transition-all duration-300 ${getHighlightClass(6, "")}`}
        >
          {(formState.stepSix?.menus?.length ?? 0) > 0 && (
            <Suspense fallback={<SectionLoader />}>
              <MenuSection
                menu_title={formState.stepSix?.menu_title || ""}
                menu_description={formState.stepSix?.menu_description || ""}
                catering_option={formState.stepSix?.catering_option ?? 1}
                menus={formState.stepSix?.menus || []}
              />
            </Suspense>
          )}
        </div>

        {/* Other Packages */}
        <div
          ref={drinkRef}
          className={`transition-all duration-300 ${getHighlightClass(
            7,
            "other-packages",
          )}`}
        >
          {(formState.stepSeven?.packages?.length ?? 0) > 0 && (
            <Suspense fallback={<SectionLoader />}>
              <DrinkSection
                title={formState.stepSeven?.drink_title || ""}
                description={formState.stepSeven?.drink_description || ""}
                packages={
                  formState.stepSeven?.packages.map((pkg) => ({
                    title: pkg.title,
                    description: pkg.description,
                    price: Number(pkg.price),
                  })) || []
                }
                defaultExpanded
              />
            </Suspense>
          )}
        </div>

        {/*more_info and faqs */}
        <div
          ref={moreInfoRef}
          className={`transition-all duration-300 ${getHighlightClass(
            8,
            "more_info",
          )}`}
        >
          <BrochureSection
            location={{
              title: formState.stepEight?.location?.title || "",
              description: formState.stepEight?.location?.description || "",
              icon: formState.stepEight?.location?.icon || "",
              latitude: formState.stepEight?.latitude,
              longitude: formState.stepEight?.longitude,
            }}
            downloads={downloadsArray}
            price={{
              title: formState.stepEight?.price?.title || "",
              description: formState.stepEight?.price?.description || "",
              link: formState.stepEight?.price?.link || "",
              icon: formState.stepEight?.price?.icon || "",
              price_title: formState.stepEight?.price?.price_title || "",
            }}
          />
        </div>

        {/* FAQs — same visibility rule as live event page */}
        <div
          ref={faqRef}
          className={`transition-all duration-300 ${getHighlightClass(
            9,
            "faqs",
          )}`}
        >
          {(formState.stepNine?.faqs?.length ?? 0) > 0 && (
            <Suspense fallback={<SectionLoader />}>
              <FaqSection
                faqs={formState.stepNine?.faqs || []}
                defaultExpanded
              />
            </Suspense>
          )}
        </div>

        <VendorEventFooter
          logo={resolveOnboardingLogoUrl(formState.stepTwo?.logo)}
        />
      </div>
    );
  };

  return (
    <PreviewProvider isPreviewMode={true}>
      <section className="relative isolate bg-background flex h-full w-full flex-col overflow-hidden">
        <div
          ref={previewContainerRef}
          className="max-w-full h-[calc(100vh-120px)] flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
        >
          {/* No transform here — Tailwind `scale-*` sets `transform` and traps `position:fixed` (Try theme tab) inside this box. */}
          <div className="w-full max-w-full scale-100 origin-top overflow-x-hidden">
            {ONBOARDING_THEME_PREVIEW_STEPS.has(activeStep) &&
            tryThemePreviewValues ? (
              <div
                style={siteEssentialsToPreviewRootStyle(tryThemePreviewValues)}
                className="relative w-full min-h-0 bg-[color:var(--color-background)] text-[color:var(--color-text)] font-body"
              >
                <SiteEssentialsGoogleFontsLoader
                  linkId="onboarding-google-fonts-try-theme"
                  headingStack={
                    tryThemePreviewValues.typography?.fontFamily?.heading
                  }
                  bodyStack={tryThemePreviewValues.typography?.fontFamily?.body}
                  customStylesheetUrls={
                    tryThemePreviewValues.typography?.customFontStylesheetUrls
                  }
                />
                {activeStep === 2
                  ? renderStepTwoPreview()
                  : renderFullSitePreview()}
              </div>
            ) : (
              renderFullSitePreview()
            )}
          </div>
        </div>
        {/* Outside scroll + no transformed ancestors so `fixed` in Try theme pins to the viewport (whole preview column), not the content width. */}
        {ONBOARDING_THEME_PREVIEW_STEPS.has(activeStep) &&
          tryThemePreviewValues && (
            <PreviewThemeCustomizer
              values={tryThemePreviewValues}
              onValuesChange={handleTryThemeValuesChange}
              brandName={
                formState.stepOne?.name?.trim() ||
                (theme as ThemeSchema | null | undefined)?.name?.trim() ||
                "Your site"
              }
              sheetDescription="Tap colors or fonts — your preview updates live. Same Try theme flow as Site Essentials; save permanently there after onboarding."
            />
          )}
      </section>
    </PreviewProvider>
  );
}
