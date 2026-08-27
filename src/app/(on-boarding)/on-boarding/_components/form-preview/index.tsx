"use client";
import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  lazy,
  Suspense,
  useRef,
} from "react";
import { useFormContext } from "../form-provider";
import { OnboardingFormData, type StepFiveType } from "../form-provider/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewProvider } from "@/contexts/preview-context";
import type { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import {
  buildOnboardingStepTwoSiteEssentialsValues,
  siteEssentialsToPreviewRootStyle,
} from "../../_lib/onboarding-site-essentials-bridge";
import { OnboardingPreviewHeader } from "./onboarding-preview-header";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import { firstFooterBrandDescription } from "@/lib/footer-brand-description";
import { SitePreview } from "@/app/(protected)/_shared/sites-essentials/_components/site-preview";
import "@/app/(public)/[locationSlug]/events/[eventSlug]/event-detail.css";
import { headerLinksFromDownloadItems } from "@/lib/event-header-downloads";
import { EVENT_BOOKING_SECTION_CLASSNAME } from "@/lib/event-booking-section-layout";
import { EventHeroBand } from "@/components/public/event-hero-band";
import { EventRoomChooser } from "@/components/public/event-room-chooser";
import { RoomContentTransition } from "@/components/public/room-content-transition";
import {
  EventSectionNav,
  EVENT_SECTION_IDS,
  EVENT_SECTION_NAV_HEIGHT,
  buildEventSectionNavItems,
} from "@/components/public/event-section-nav";
import {
  formatEventHeroDateRange,
  formatEventHeroTimeRange,
} from "@/lib/event-hero-meta";
import { Image as ImageIcon } from "lucide-react";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { useEventCategories } from "@/services/vendor/events/query";
import { normalizeSlug } from "@/lib/utils";
import { scrollToElementIfNeeded } from "@/lib/scroll-to-element-if-needed";
import { useRoomManager } from "../rooms/use-room-manager";
import { listOnboardingPreviewRoomSummaries } from "../rooms/list-onboarding-preview-room-summaries";
import { PreviewDeviceToolbar } from "@/components/preview/preview-device-toolbar";
import { PreviewDeviceFrame } from "@/components/preview/preview-device-frame";
import { ONBOARDING_PREVIEW_HEADER_OFFSET } from "./preview-layout-constants";
import {
  PreviewEditHit,
  PREVIEW_SECTION_EDITOR,
  type PreviewEditorTarget,
} from "./preview-edit-hit";

const HEADER_OFFSET_PX = 72;

// Lazy load components - only import what's actually used
const BrochureSection = lazy(() => import("./_components/brochure-section"));
const DrinkSection = lazy(() => import("./_components/drink-section"));
const FaqSection = lazy(() => import("./_components/faq-section"));
const AboutEventSec = lazy(() => import("./_components/About-event-sec"));
const MenuSection = lazy(() => import("./_components/menu-section"));
const Timeline = lazy(() => import("./_components/Time-line"));
const PackageSection = lazy(() => import("./_components/package-sec"));
const DatesSection = lazy(() => import("./_components/Dates-section"));
const EventGallery = lazy(() => import("./_components/Event-gallery"));

// Component loaders
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
  if (logo instanceof File) {
    const preview = (logo as File & { preview?: string }).preview;
    return preview ?? null;
  }
  if (
    typeof logo === "object" &&
    "preview" in logo &&
    typeof (logo as { preview?: string }).preview === "string"
  ) {
    return (logo as { preview: string }).preview;
  }
  return null;
}

/**
 * Onboarding catering types do not declare a menu background. Persistence / room
 * payloads may still include one — read it without assuming the form union has it.
 */
function resolvePreviewMenuBackground(catering: unknown): string | undefined {
  if (!catering || typeof catering !== "object") return undefined;
  if (!("menu_background_image" in catering)) return undefined;
  const raw = (catering as { menu_background_image?: unknown })
    .menu_background_image;
  if (!raw) return undefined;
  if (typeof raw === "string") return raw;
  if (raw instanceof File) {
    return (raw as File & { preview?: string }).preview ?? undefined;
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "preview" in raw &&
    typeof (raw as { preview?: string }).preview === "string"
  ) {
    return (raw as { preview: string }).preview;
  }
  return undefined;
}

/** Same steps as `form-layout` `splitLayoutSteps` — live preview with tenant theme styles. */
const ONBOARDING_THEME_PREVIEW_STEPS = new Set([2, 3, 4, 5, 6, 7, 8, 9]);
/** Event preview onward — room floating selector is for event pages only, not Site (step 2). */
const EVENT_PREVIEW_ROOM_SELECTOR_STEPS = new Set([3, 4, 5, 6, 7, 8, 9]);

/** Onboarding preview: no social URLs collected yet — suppress theme icons. */
const EMPTY_ONBOARDING_FOOTER_SOCIAL_LINKS = {
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
  youtube: "",
} as const;

// Only load components needed for the current step
export default function FormPreview() {
  const {
    form,
    activeStep,
    activeField,
    previewTheme,
    setActiveStep,
    setActiveField,
    requestFormFieldFocus,
  } = useFormContext();
  const currencySymbol = useCurrencySymbol();
  const { data: categoriesResponse } = useEventCategories();
  const eventCategories = categoriesResponse?.data ?? [];
  const [formState, setFormState] = useState<OnboardingFormData>(
    form.getValues(),
  );
  const [formTick, setFormTick] = useState(0);

  const tryThemePreviewValues = useMemo((): SiteEssentialsFormValues | null => {
    if (!ONBOARDING_THEME_PREVIEW_STEPS.has(activeStep)) return null;
    const categoryName =
      eventCategories.find(
        (category) => category.id === formState.stepThree?.event_category_id,
      )?.name ?? null;
    return buildOnboardingStepTwoSiteEssentialsValues(
      formState,
      previewTheme,
      categoryName,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeStep,
    formState.stepOne,
    formState.stepTwo,
    formState.stepThree,
    formState.stepFour,
    formState.stepFive,
    formState.multiSpace,
    previewTheme,
    formTick,
    eventCategories,
  ]);

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

  /**
   * Footer contact must reflect the onboarding draft (stepOne), not the logged-in
   * vendor's saved theme — otherwise the preview footer shows the real account
   * email/phone/address instead of what the vendor is entering.
   */
  const onboardingFooterContact = useMemo(
    () => ({
      phone: formState.stepOne?.contact_number || null,
      email: formState.stepOne?.email || null,
      address: formState.stepOne?.address || null,
    }),
    [
      formState.stepOne?.contact_number,
      formState.stepOne?.email,
      formState.stepOne?.address,
    ],
  );

  /** Onboarding does not collect social URLs — never leak live vendor theme icons. */
  const onboardingFooterSocialLinks = EMPTY_ONBOARDING_FOOTER_SOCIAL_LINKS;

  const activePreviewBrochure = useMemo(() => {
    const ms = formState.multiSpace;
    const rooms = ms?.rooms ?? [];
    if (!ms?.enabled || rooms.length === 0) {
      return formState.stepSeven;
    }
    const idx = Math.min(
      ms.currentRoomIndex ?? 0,
      Math.max(rooms.length - 1, 0),
    );
    return rooms[idx]?.brochure ?? formState.stepSeven;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.multiSpace, formState.stepSeven, formTick]);

  const activePreviewBrochureLocation = useMemo(() => {
    const location = activePreviewBrochure?.location;
    return {
      title: location?.title || "",
      description:
        location?.description ||
        String(activePreviewBrochure?.event_address ?? "").trim(),
      icon: location?.icon || "",
      latitude: activePreviewBrochure?.latitude,
      longitude: activePreviewBrochure?.longitude,
    };
  }, [activePreviewBrochure]);

  const activePreviewBrochurePrice = useMemo(() => {
    const price = activePreviewBrochure?.price;
    const startFrom = String(
      activePreviewBrochure?.price_start_from ?? "",
    ).trim();
    return {
      title: price?.title || "",
      description:
        price?.description ||
        (startFrom ? `${currencySymbol}${startFrom} PP exc VAT` : ""),
      link: price?.link || "",
      icon: price?.icon || "",
      price_title: price?.price_title || "",
    };
  }, [activePreviewBrochure, currencySymbol]);

  // Brochure downloads — drives `CommonHeader` only (section DOWNLOADS tile removed).
  const downloadsArray = useMemo(() => {
    const downloads: Array<{
      title: string;
      download_link: string[];
    }> = [];
    const normalizeTitle = (value: string) =>
      value.toLowerCase().replace(/[\s_-]+/g, "");
    const hasDownloadSlot = (
      slot: "brochure" | "flyer" | "faq",
      item?: { id?: number; title?: string },
    ) => {
      if (!item) return false;
      const normalizedTitle = normalizeTitle(String(item.title ?? ""));
      if (slot === "brochure") {
        return (
          item.id === 1 ||
          normalizedTitle === "brochure" ||
          normalizedTitle === "eventbrochure"
        );
      }
      if (slot === "flyer") {
        return (
          item.id === 3 ||
          normalizedTitle === "eventflyer" ||
          normalizedTitle === "flyer"
        );
      }
      return (
        item.id === 2 ||
        normalizedTitle === "frequentlyaskedquestions" ||
        normalizedTitle === "faq" ||
        normalizedTitle === "faqdetails"
      );
    };

    if (activePreviewBrochure?.downloads?.length) {
      downloads.push(
        ...activePreviewBrochure.downloads.map(
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

    const individualPdfs: Array<{
      field: File | string | null | undefined;
      title: string;
      slot: "brochure" | "flyer";
    }> = [
      {
        field: activePreviewBrochure?.brochure_pdf,
        title: "Event brochure",
        slot: "brochure",
      },
      {
        field: activePreviewBrochure?.brochure_pdf_2,
        title: "Event Flyer",
        slot: "flyer",
      },
    ];

    individualPdfs.forEach(({ field, title, slot }) => {
      const alreadyRepresentedInDownloads = (
        activePreviewBrochure?.downloads ?? []
      ).some((download) => hasDownloadSlot(slot, download));
      if (
        field &&
        !alreadyRepresentedInDownloads &&
        !downloads.some(
          (d) => normalizeTitle(d.title) === normalizeTitle(title),
        )
      ) {
        downloads.push({
          title,
          download_link: [
            typeof field === "string" ? field : URL.createObjectURL(field),
          ],
        });
      }
    });

    return downloads;
  }, [activePreviewBrochure]);

  const previewHeaderDownloads = useMemo(
    () => headerLinksFromDownloadItems(downloadsArray),
    [downloadsArray],
  );

  // Create refs for scrollable sections
  const headerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const eventHeroRef = useRef<HTMLDivElement | null>(null);
  const aboutEventRef = useRef<HTMLDivElement>(null);
  const datesRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drinkRef = useRef<HTMLDivElement>(null);
  const moreInfoRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const chooserRef = useRef<HTMLDivElement>(null);
  const [roomSelectorScrollVisible, setRoomSelectorScrollVisible] =
    useState(false);

  /** Site preview event cards → jump to Event step (same idea as `/preview/onboarding`). */
  const handlePreviewEventSelect = useCallback(() => {
    void setActiveStep(3);
    previewContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [setActiveStep]);

  const jumpToEditor = useCallback(
    (target: PreviewEditorTarget) => {
      const go = async () => {
        if (activeStep !== target.step) {
          await setActiveStep(target.step);
        }
        // Preview scroll (right) + open/scroll the form panel to the field (left).
        // The delay lets a step switch mount the target step's form first.
        window.setTimeout(() => {
          setActiveField(target.field);
          requestFormFieldFocus(target.field);
        }, 80);
      };
      void go();
    },
    [activeStep, setActiveStep, setActiveField, requestFormFieldFocus],
  );

  const {
    enabled: roomsEnabled,
    rooms: managedRooms,
    currentRoomIndex,
    setCurrentRoomIndex,
  } = useRoomManager();

  const showRoomFloatingSelector = useMemo(() => {
    return (
      roomsEnabled &&
      managedRooms.length > 0 &&
      EVENT_PREVIEW_ROOM_SELECTOR_STEPS.has(activeStep)
    );
  }, [activeStep, roomsEnabled, managedRooms.length]);

  const roomSummaries = useMemo(() => {
    if (!roomsEnabled || managedRooms.length < 2) return [];
    const banner =
      typeof formState.stepThree?.event_banner_image === "string"
        ? formState.stepThree.event_banner_image
        : null;
    return listOnboardingPreviewRoomSummaries(managedRooms, banner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roomsEnabled,
    managedRooms,
    formState.stepThree?.event_banner_image,
    formTick,
  ]);

  const showRoomChooser = showRoomFloatingSelector && roomSummaries.length >= 2;

  const roomContentKey =
    managedRooms[currentRoomIndex]?.id ?? `room-${currentRoomIndex}`;

  const handleRoomChange = useCallback(
    (index: number) => {
      setCurrentRoomIndex(index);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToElementIfNeeded(datesRef.current, {
            headerOffsetPx: HEADER_OFFSET_PX,
            scrollContainer: previewContainerRef.current,
          });
        });
      });
    },
    [setCurrentRoomIndex],
  );

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || !showRoomChooser) {
      setRoomSelectorScrollVisible(false);
      return;
    }

    const handleScroll = () => {
      const chooser = chooserRef.current;
      if (!chooser) {
        setRoomSelectorScrollVisible(
          container.scrollTop > Math.min(280, container.clientHeight * 0.35),
        );
        return;
      }
      const chooserRect = chooser.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const bottomRelative = chooserRect.bottom - containerRect.top;
      // Show sticky room bar once the in-page chooser has scrolled under the header.
      setRoomSelectorScrollVisible(bottomRelative <= HEADER_OFFSET_PX + 24);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    // Device frame width changes (Desktop/Tablet/Mobile) can move chooser geometry.
    const ro = new ResizeObserver(() => handleScroll());
    ro.observe(container);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      ro.disconnect();
    };
  }, [showRoomChooser, activeStep]);

  const activePreviewPackage = useMemo(() => {
    const ms = formState.multiSpace;
    const rooms = ms?.rooms ?? [];
    if (!ms?.enabled || rooms.length === 0) {
      return formState.stepFour;
    }
    const idx = Math.min(
      ms.currentRoomIndex ?? 0,
      Math.max(rooms.length - 1, 0),
    );
    return rooms[idx]?.package ?? formState.stepFour;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.multiSpace, formState.stepFour, formTick]);

  const activePreviewDates = useMemo(() => {
    const ms = formState.multiSpace;
    const rooms = ms?.rooms ?? [];
    if (!ms?.enabled || rooms.length === 0) {
      return formState.stepFive?.dates;
    }
    const idx = Math.min(
      ms.currentRoomIndex ?? 0,
      Math.max(rooms.length - 1, 0),
    );
    const roomDates = rooms[idx]?.dates?.dates;
    if (Array.isArray(roomDates)) {
      return roomDates as StepFiveType["dates"];
    }
    return formState.stepFive?.dates;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.multiSpace, formState.stepFive?.dates, formTick]);

  const activePreviewCatering = useMemo(() => {
    const ms = formState.multiSpace;
    const rooms = ms?.rooms ?? [];
    if (!ms?.enabled || rooms.length === 0) {
      return formState.stepSix;
    }
    const idx = Math.min(
      ms.currentRoomIndex ?? 0,
      Math.max(rooms.length - 1, 0),
    );
    const roomCatering = rooms[idx]?.catering;
    if (roomCatering) {
      return roomCatering;
    }
    return {
      catering_option: formState.stepSix?.catering_option ?? 0,
      menu_title: "",
      menu_description: "",
      menus: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.multiSpace, formState.stepSix?.catering_option, formTick]);

  const activePreviewDrinks = useMemo(() => {
    const ms = formState.multiSpace;
    const rooms = ms?.rooms ?? [];
    if (!ms?.enabled || rooms.length === 0) {
      return formState.stepEight;
    }
    const idx = Math.min(
      ms.currentRoomIndex ?? 0,
      Math.max(rooms.length - 1, 0),
    );
    return rooms[idx]?.drinks ?? formState.stepEight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.multiSpace, formState.stepEight, formTick]);

  const previewEventSlug = useMemo(() => {
    const name = formState.stepThree?.event_name?.trim();
    return name ? normalizeSlug(name) : "onboarding-preview";
  }, [formState.stepThree?.event_name]);

  const activePreviewRoomScope = useMemo(() => {
    const ms = formState.multiSpace;
    if (!ms?.enabled || !ms.rooms?.length) {
      return { roomId: undefined, roomIndex: undefined };
    }
    const idx = Math.min(
      ms.currentRoomIndex ?? 0,
      Math.max(ms.rooms.length - 1, 0),
    );
    return { roomId: ms.rooms[idx]?.id, roomIndex: idx };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.multiSpace, formTick]);

  // Stable gallery for preview: reuse File.preview when set (avoids new blob URLs on reorder so preview updates instantly)
  const galleryPreviewItems = useMemo(() => {
    const gallery = activePreviewPackage?.gallery;
    if (!gallery || gallery.length === 0) {
      return [];
    }
    return gallery
      .map((image) => {
        if (typeof image === "string") {
          const value = String(image).trim();
          if (!value) return null;
          return {
            path: value,
            relativePath: value,
            preview: value,
          };
        }

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
          const value = String(galleryItem.url ?? "").trim();
          if (!value) return null;
          return {
            path: value,
            relativePath: value,
            preview: value,
          };
        }

        if (typeof image === "object" && image !== null) {
          const anyImage = image as {
            preview?: string;
            path?: string;
            relativePath?: string;
          };
          const src =
            anyImage.preview || anyImage.path || anyImage.relativePath || "";
          if (src) {
            return {
              path: anyImage.path || src,
              relativePath: anyImage.relativePath || src,
              preview: anyImage.preview || src,
            };
          }
        }

        return null;
      })
      .filter(
        (
          item,
        ): item is {
          path: string;
          relativePath: string;
          preview: string;
        } => item !== null,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreviewPackage?.gallery, formTick]);

  // Force re-render when form data changes.
  // RHF's watch callback can return the same mutable reference — the tick
  // counter guarantees React schedules a re-render even when the top-level
  // object identity is unchanged, so every useMemo that includes `formTick`
  // in its deps list will re-evaluate.
  useEffect(() => {
    const subscription = form.watch((value) => {
      setFormState(value as OnboardingFormData);
      setFormTick((t) => t + 1);
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
        } else if (activeField.includes("footer_brand_description")) {
          const container = previewContainerRef.current;
          const footer = container.querySelector("[data-preview-footer]");
          if (footer instanceof HTMLElement) {
            const top =
              footer.getBoundingClientRect().top -
              container.getBoundingClientRect().top +
              container.scrollTop -
              16;
            container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
          } else {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: "smooth",
            });
          }
        } else if (
          activeField.includes("about_title") ||
          activeField.includes("about_description") ||
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
        }
        break;

      case 4: // Package details
        if (activeField.includes("event_schedular")) {
          scrollToElement(timelineRef);
        } else if (activeField.includes("gallery")) {
          scrollToElement(galleryRef);
        } else if (
          activeField.includes("package_image") ||
          activeField.includes("package_title") ||
          activeField.includes("package_description") ||
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

      case 7: // Brochure & location
        if (
          activeField.includes("brochure_pdf") ||
          activeField.includes("event_address") ||
          activeField.includes("price_start_from") ||
          activeField.includes("location") ||
          activeField.includes("downloads") ||
          activeField.includes("more_info")
        ) {
          scrollToElement(moreInfoRef);
        }
        break;

      case 8: // Other Packages
        if (
          activeField.includes("drink_") ||
          activeField.includes("packages")
        ) {
          scrollToElement(drinkRef);
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
    () => buildDatesPreviewFromStepFive(activePreviewDates),
    [activePreviewDates],
  );

  const hasPreviewFaqs = useMemo(() => {
    const faqs = formState.stepNine?.faqs ?? [];
    return faqs.some((faq) => faq.question?.trim() || faq.answer?.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.stepNine?.faqs, formTick]);

  // Homepage preview (step 2) — same LocationPageView shell as live + Site Essentials
  const renderStepTwoPreview = () => {
    const tv = tryThemePreviewValues;
    if (!tv) return null;

    const heroHighlight =
      activeField &&
      (activeField.includes("cover_image") ||
        activeField.includes("banner_heading") ||
        activeField.includes("banner_sub_heading"));
    const aboutHighlight =
      activeField &&
      (activeField.includes("about_title") ||
        activeField.includes("about_description"));

    return (
      <div
        className={`event-detail-page transition-all duration-300 ${
          heroHighlight || aboutHighlight
            ? "ring-2 ring-primary ring-opacity-50"
            : ""
        }`}
      >
        <div ref={heroRef} className="contents" />
        <div ref={aboutRef} className="contents" />
        <SitePreview
          formValues={tv}
          scrollContainerRef={previewContainerRef}
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
    const activePreviewPackageLegacy =
      activePreviewPackage as typeof activePreviewPackage & {
        event_schedular_custom_copy?: string;
      };
    const timelineRows = Array.isArray(activePreviewPackage?.event_schedular)
      ? (activePreviewPackage.event_schedular as Array<{
          title?: string;
          time?: string;
        }>)
      : [];
    const hasTimelineTitle =
      String(activePreviewPackage?.event_schedular_title ?? "").trim().length >
      0;
    const hasTimelineSubtitle =
      String(
        activePreviewPackage?.event_schedule_subtitle ||
          activePreviewPackageLegacy?.event_schedular_custom_copy ||
          "",
      ).trim().length > 0;
    const hasTimelineRows = timelineRows.some(
      (row) =>
        String(row?.title ?? "").trim().length > 0 ||
        String(row?.time ?? "").trim().length > 0,
    );
    const showTimelineSection =
      hasTimelineTitle || hasTimelineSubtitle || hasTimelineRows;

    const hasPackagePreview = Boolean(
      activeStep === 4 ||
      String(activePreviewPackage?.package_title ?? "").trim() ||
      String(activePreviewPackage?.package_description ?? "").trim() ||
      activePreviewPackage?.package_image ||
      (activePreviewPackage?.package_details?.length ?? 0) > 0,
    );

    const showDatesPreview = activeStep === 5 || datesPreviewItems.length > 0;
    const showGalleryPreview = galleryPreviewItems.length > 0;
    const showMenuPreview = (activePreviewCatering?.menus?.length ?? 0) > 0;
    const showDrinksPreview = (activePreviewDrinks?.packages?.length ?? 0) > 0;
    const sectionNavItems = buildEventSectionNavItems({
      about: true,
      rooms: showRoomChooser,
      schedule: showTimelineSection,
      packages: hasPackagePreview,
      dates: showDatesPreview,
      gallery: showGalleryPreview,
      menu: showMenuPreview,
      drinks: showDrinksPreview,
      drinksLabel: activePreviewDrinks?.drink_title,
      faqs: hasPreviewFaqs,
    });
    const showSectionNav = sectionNavItems.length > 0;
    const sectionNavStickyTop = ONBOARDING_PREVIEW_HEADER_OFFSET;
    const roomSelectorStickyTop = showSectionNav
      ? `calc(${ONBOARDING_PREVIEW_HEADER_OFFSET} + ${EVENT_SECTION_NAV_HEIGHT})`
      : ONBOARDING_PREVIEW_HEADER_OFFSET;
    const sectionAnchorClass =
      "scroll-mt-[var(--event-sticky-offset,7.25rem)]";
    const heroCityLabel = formState.stepOne?.city?.trim() || "";
    const heroEventLabel =
      formState.stepThree?.event_name?.trim() ||
      formState.stepThree?.event_banner_heading?.trim() ||
      "Event";
    const heroDateLabel = formatEventHeroDateRange(
      datesPreviewItems.map((d) => d.event_date),
    );
    const heroTimeLabel = formatEventHeroTimeRange(
      timelineRows.map((row) => row.time),
    );

    const menuBackgroundImage =
      resolvePreviewMenuBackground(activePreviewCatering);

    return (
      <div
        className="event-detail-page"
        style={{
          ["--event-sticky-offset" as string]: showSectionNav
            ? `calc(${ONBOARDING_PREVIEW_HEADER_OFFSET} + ${EVENT_SECTION_NAV_HEIGHT})`
            : ONBOARDING_PREVIEW_HEADER_OFFSET,
        }}
      >
        {/* Same header chrome as live event detail (`EventDetailClient`); non-interactive when inside PreviewProvider. */}
        <OnboardingPreviewHeader
          scrollContainerRef={previewContainerRef}
          contact_number={formState.stepOne?.contact_number || ""}
          logo={formState.stepTwo?.logo || null}
          headerDownloads={previewHeaderDownloads}
          showRoomSelector={showRoomFloatingSelector}
          roomSelectorVisible={showRoomChooser && roomSelectorScrollVisible}
          onRoomChange={handleRoomChange}
          roomSelectorStickyTop={roomSelectorStickyTop}
        />

        <div
          ref={eventHeroRef}
          className={`transition-all duration-300 ${getHighlightClass(3, "banner")}`}
        >
          <EventHeroBand
            title={
              formState.stepThree?.event_banner_heading?.trim() ||
              formState.stepThree?.event_name?.trim() ||
              ""
            }
            subHeading={
              formState.stepThree?.event_banner_sub_heading?.trim() || null
            }
            bannerImage={formState.stepThree?.event_banner_image ?? null}
            bannerVideo={formState.stepThree?.event_banner_video ?? null}
            bannerHeadingAlign={tryHeroPreviewProps?.bannerHeadingAlign ?? null}
            bannerHeadingValign={
              tryHeroPreviewProps?.bannerHeadingValign ?? null
            }
            accentHint={tryHeroPreviewProps?.bannerHeadingAccent ?? null}
            headingEmphasis={tryHeroPreviewProps?.headingEmphasis ?? undefined}
            breadcrumbs={[
              { label: "Home" },
              ...(heroCityLabel ? [{ label: heroCityLabel }] : []),
              { label: heroEventLabel },
            ]}
            meta={{
              date: heroDateLabel,
              time: heroTimeLabel,
              location: heroCityLabel || null,
            }}
            onEditHero={() =>
              jumpToEditor({ step: 3, field: "event_banner_heading" })
            }
            onEditMeta={(key) => {
              if (key === "date" || key === "time") {
                jumpToEditor({ step: 5, field: "dates" });
                return;
              }
              jumpToEditor({ step: 7, field: "event_address" });
            }}
            emptyMediaSlot={
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={40} className="text-white/40" aria-hidden />
                <span className="text-sm text-white/60">
                  Add a cover image or video above
                </span>
              </div>
            }
          />
        </div>

        {showSectionNav ? (
          <EventSectionNav
            items={sectionNavItems}
            stickyTop={sectionNavStickyTop}
            headerOffsetPx={HEADER_OFFSET_PX}
            scrollContainerRef={previewContainerRef}
            onItemClick={(id) => {
              const target = PREVIEW_SECTION_EDITOR[id];
              if (target) jumpToEditor(target);
            }}
          />
        ) : null}

        {/* About Event */}
        <div
          ref={aboutEventRef}
          id={EVENT_SECTION_IDS.about}
          className={`${sectionAnchorClass} transition-all duration-300 ${getHighlightClass(
            3,
            "about_event",
          )}`}
        >
          <PreviewEditHit
            step={3}
            field="about_event_heading"
            label="About"
            onEdit={jumpToEditor}
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
              headingEmphasis={
                tryHeroPreviewProps?.headingEmphasis ?? undefined
              }
              aboutHeadingAccentHint={
                tryHeroPreviewProps?.bannerHeadingAccent ?? null
              }
            />
          </Suspense>
          </PreviewEditHit>
        </div>

        {showRoomChooser ? (
          <div
            ref={chooserRef}
            id={EVENT_SECTION_IDS.rooms}
            className={sectionAnchorClass}
          >
            <PreviewEditHit
              step={4}
              field="event_schedular_title"
              label="Rooms"
              onEdit={jumpToEditor}
              skipButtons
            >
            <EventRoomChooser
              rooms={roomSummaries}
              currentRoomIndex={currentRoomIndex}
              onRoomChange={handleRoomChange}
              headingEmphasis={
                tryHeroPreviewProps?.headingEmphasis ?? undefined
              }
            />
            </PreviewEditHit>
          </div>
        ) : null}

        {/* Event Schedular */}
        {showTimelineSection && (
          <div
            ref={timelineRef}
            id={EVENT_SECTION_IDS.schedule}
            className={`${sectionAnchorClass} transition-all duration-300 ${getHighlightClass(
              4,
              "event_schedular",
            )}`}
          >
            <PreviewEditHit
              step={4}
              field="event_schedular"
              label="Schedule"
              onEdit={jumpToEditor}
            >
            <Suspense fallback={<SectionLoader />}>
              <RoomContentTransition roomKey={roomContentKey}>
                <Timeline
                  eventSchedularTitle={
                    activePreviewPackage?.event_schedular_title || ""
                  }
                  eventSchedularCopy={
                    activePreviewPackage?.event_schedule_subtitle ||
                    activePreviewPackageLegacy?.event_schedular_custom_copy ||
                    ""
                  }
                  eventSchedular={
                    timelineRows as Array<{
                      title: string;
                      time: string;
                    }>
                  }
                />
              </RoomContentTransition>
            </Suspense>
            </PreviewEditHit>
          </div>
        )}

        {/* Package — hide empty shell (matches live: only real package content) */}
        {hasPackagePreview ? (
          <div
            id={EVENT_SECTION_IDS.packages}
            ref={packageRef}
            className={`${sectionAnchorClass} transition-all duration-300 ${getHighlightClass(
              4,
              "package",
            )}`}
          >
            <PreviewEditHit
              step={4}
              field="package_title"
              label="Package"
              onEdit={jumpToEditor}
            >
            <Suspense fallback={<SectionLoader />}>
              <RoomContentTransition roomKey={roomContentKey}>
                <PackageSection
                  heading={activePreviewPackage?.package_title || ""}
                  image={
                    typeof activePreviewPackage?.package_image === "string"
                      ? {
                          path: activePreviewPackage.package_image,
                          relativePath: activePreviewPackage.package_image,
                          preview: activePreviewPackage.package_image,
                        }
                      : activePreviewPackage?.package_image || null
                  }
                  subHeading={activePreviewPackage?.package_description || ""}
                  packageDetails={
                    activePreviewPackage?.package_details?.map((detail) => ({
                      title: detail.title || "",
                      description: detail.title || "",
                    })) || []
                  }
                  headingEmphasis={
                    tryHeroPreviewProps?.headingEmphasis ?? undefined
                  }
                />
              </RoomContentTransition>
            </Suspense>
            </PreviewEditHit>
          </div>
        ) : (
          <div ref={packageRef} className="hidden" aria-hidden />
        )}

        {/* Event Dates — real dates, or visible while editing the dates step */}
        {showDatesPreview ? (
          <div
            id="booking"
            ref={datesRef}
            className={`${EVENT_BOOKING_SECTION_CLASSNAME} ${sectionAnchorClass} transition-all duration-300 ${getHighlightClass(
              5,
              "dates",
            )}`}
          >
            <PreviewEditHit
              step={5}
              field="dates"
              label="Dates"
              onEdit={jumpToEditor}
            >
            <Suspense fallback={<SectionLoader />}>
              <RoomContentTransition roomKey={roomContentKey}>
                <DatesSection
                  dates={datesPreviewItems}
                  eventSlug={previewEventSlug}
                  eventName={formState.stepThree?.event_name || undefined}
                  eventImage={datesEventImage}
                  roomId={activePreviewRoomScope.roomId}
                  roomIndex={activePreviewRoomScope.roomIndex}
                />
              </RoomContentTransition>
            </Suspense>
            </PreviewEditHit>
          </div>
        ) : (
          <div id="booking" ref={datesRef} className="hidden" aria-hidden />
        )}

        {/* Event Gallery — optional; hidden until at least one image is uploaded */}
        <div
          ref={galleryRef}
          id={EVENT_SECTION_IDS.gallery}
          className={`${sectionAnchorClass} transition-all duration-300 ${getHighlightClass(
            4,
            "gallery",
          )}`}
        >
          {galleryPreviewItems.length > 0 && (
            <PreviewEditHit
              step={4}
              field="gallery"
              label="Gallery"
              onEdit={jumpToEditor}
            >
            <Suspense fallback={<SectionLoader />}>
              <EventGallery gallery={galleryPreviewItems} />
            </Suspense>
            </PreviewEditHit>
          )}
        </div>

        {/* Catering Options — same visibility rule as live event page */}
        <div
          ref={menuRef}
          id={EVENT_SECTION_IDS.menu}
          className={`${sectionAnchorClass} transition-all duration-300 ${getHighlightClass(6, "")}`}
        >
          {(activePreviewCatering?.menus?.length ?? 0) > 0 && (
            <PreviewEditHit
              step={6}
              field="menu_title"
              label="Menu"
              onEdit={jumpToEditor}
            >
            <Suspense fallback={<SectionLoader />}>
              <MenuSection
                menu_title={activePreviewCatering?.menu_title || ""}
                menu_description={activePreviewCatering?.menu_description || ""}
                catering_option={activePreviewCatering?.catering_option ?? 1}
                menus={activePreviewCatering?.menus || []}
                menu_background_image={menuBackgroundImage}
              />
            </Suspense>
            </PreviewEditHit>
          )}
        </div>

        {/* Drinks — before brochure, same order as live event page */}
        <div
          ref={drinkRef}
          id={showDrinksPreview ? EVENT_SECTION_IDS.drinks : undefined}
          className={`${showDrinksPreview ? sectionAnchorClass : ""} transition-all duration-300 ${getHighlightClass(
            8,
            "other-packages",
          )}`}
        >
          {(activePreviewDrinks?.packages?.length ?? 0) > 0 && (
            <PreviewEditHit
              step={8}
              field="drink_title"
              label="Drinks"
              onEdit={jumpToEditor}
            >
            <Suspense fallback={<SectionLoader />}>
              <DrinkSection
                title={activePreviewDrinks?.drink_title || ""}
                description={activePreviewDrinks?.drink_description || ""}
                packages={
                  activePreviewDrinks?.packages?.map((pkg) => ({
                    title: pkg.title,
                    description: pkg.description,
                    price: Number(pkg.price),
                  })) || []
                }
                eventSlug={previewEventSlug}
                roomId={activePreviewRoomScope.roomId}
                roomIndex={activePreviewRoomScope.roomIndex}
                defaultExpanded
              />
            </Suspense>
            </PreviewEditHit>
          )}
        </div>

        {/* Location / prices — downloads live in the header only */}
        <div
          ref={moreInfoRef}
          className={`transition-all duration-300 ${getHighlightClass(
            7,
            "more_info",
          )}`}
        >
          <PreviewEditHit
            step={7}
            field="event_address"
            label="Location"
            onEdit={jumpToEditor}
          >
          <BrochureSection
            location={activePreviewBrochureLocation}
            price={activePreviewBrochurePrice}
          />
          </PreviewEditHit>
        </div>

        {/* FAQs — same visibility rule as live event page */}
        <div
          ref={faqRef}
          id={EVENT_SECTION_IDS.faqs}
          className={`${sectionAnchorClass} transition-all duration-300 ${getHighlightClass(
            9,
            "faqs",
          )}`}
        >
          {hasPreviewFaqs && (
            <PreviewEditHit
              step={9}
              field="question"
              label="FAQs"
              onEdit={jumpToEditor}
            >
            <Suspense fallback={<SectionLoader />}>
              <FaqSection
                faqs={formState.stepNine?.faqs || []}
                defaultExpanded
              />
            </Suspense>
            </PreviewEditHit>
          )}
        </div>

        <FooterSection
          logo={resolveOnboardingLogoUrl(formState.stepTwo?.logo)}
          copyright={tryThemePreviewValues?.copyright ?? undefined}
          contactOverride={onboardingFooterContact}
          socialLinksOverride={onboardingFooterSocialLinks}
          brandDescription={
            firstFooterBrandDescription(
              formState.stepTwo?.footer_brand_description,
              formState.stepTwo?.about_description,
              formState.stepOne?.description,
            )
          }
        />
      </div>
    );
  };

  return (
    <PreviewProvider
      isPreviewMode={true}
      onEventSelect={handlePreviewEventSelect}
    >
      <section className="relative isolate flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950">
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2">
          <PreviewDeviceToolbar />
        </div>
        <PreviewDeviceFrame
          ref={previewContainerRef}
          stageClassName="bg-slate-950 py-1 pl-8 pr-2 pt-1 sm:pl-8 sm:pr-3"
          frameClassName="bg-[color:var(--color-background,#fff)]"
        >
          {/* Avoid transform / overflow-x-hidden here — both break sticky header + room bar. */}
          <div className="w-full min-h-0 min-w-0 max-w-full">
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
        </PreviewDeviceFrame>
      </section>
    </PreviewProvider>
  );
}
