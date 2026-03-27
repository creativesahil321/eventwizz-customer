"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { env } from "@/env";
import AddressAutocomplete from "../steps/step-8/address-autocomplete";
import {
  Sparkles,
  Check,
  ArrowLeft,
  RefreshCw,
  Edit3,
  Layout,
  Calendar,
  Package,
  UtensilsCrossed,
  Wine,
  MapPin,
  HelpCircle,
  Loader2,
  Ticket,
  Plus,
  Trash2,
} from "lucide-react";
import type { AIGeneratedContent } from "@/app/api/ai/generate-onboarding/route";
import type { AIOnboardingInput } from "@/app/api/ai/generate-onboarding/route";
import { useFormContext } from "../../_components/form-provider";
import type { StepFiveType } from "../../_components/form-provider/schema";
import { STEP_NINE_MAX_FAQS } from "../../_components/form-provider/schema";
import {
  getDummyImages,
  getImagesByCategoryId,
  urlToImageFile,
  createPlaceholderLogo,
  createPlaceholderEventBanner,
  createPlaceholderPackageImage,
  fetchGalleryFiles,
} from "../../_lib/constants/dummy-images";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

function clampAiStepNineFaqs(c: AIGeneratedContent): AIGeneratedContent {
  const faqs = (c.stepNine?.faqs ?? []).slice(0, STEP_NINE_MAX_FAQS);
  return {
    ...c,
    stepNine: {
      ...c.stepNine,
      faqs,
    },
  };
}

const themeAccent = {
  text: { color: `var(--color-primary, #3b82f6)` } as React.CSSProperties,
  secondaryText: {
    color: `var(--color-secondary, #8b5cf6)`,
  } as React.CSSProperties,
  badge: {
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)`,
  } as React.CSSProperties,
  iconBox: {
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)`,
  } as React.CSSProperties,
  button: {
    background: `linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
  } as React.CSSProperties,
  loaderBox: {
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 30%, transparent)`,
  } as React.CSSProperties,
  noticeBox: {
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)`,
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 5%, transparent)`,
  } as React.CSSProperties,
};

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  stepLabel: string;
  fields: Array<{
    key: string;
    label: string;
    value: string | number;
    maxLength?: number;
    type?: "text" | "textarea" | "number";
    nested?: boolean;
  }>;
}

interface AIReviewContentProps {
  content: AIGeneratedContent;
  venueInput: AIOnboardingInput;
  onComplete: () => void;
  onRegenerate: () => void;
  onBack: () => void;
}

export default function AIReviewContent({
  content,
  venueInput,
  onComplete,
  onRegenerate,
  onBack,
}: AIReviewContentProps) {
  const { form: globalForm, setActiveStep } = useFormContext();
  const { update: updateSession } = useSession();
  const [editedContent, setEditedContent] = useState<AIGeneratedContent>(() =>
    clampAiStepNineFaqs(content),
  );
  const [reviewSectionIndex, setReviewSectionIndex] = useState(0);
  const [approvedReviewSections, setApprovedReviewSections] = useState<
    Set<string>
  >(new Set());
  const [removedSections, setRemovedSections] = useState<Set<string>>(
    new Set(),
  );
  const [isApplying, setIsApplying] = useState(false);
  const [applyStep, setApplyStep] = useState(-1);

  useEffect(() => {
    setEditedContent(clampAiStepNineFaqs(content));
  }, [content]);

  const APPLY_STEPS = [
    { label: "Venue info", icon: "🏛️" },
    { label: "Landing page", icon: "🎨" },
    { label: "Event details", icon: "📅" },
    { label: "Packages & gallery", icon: "📦" },
    { label: "Dates, tickets & tables", icon: "🎟️" },
    { label: "Catering & menu", icon: "🍽️" },
    { label: "Drink packages", icon: "🥂" },
    { label: "Location & pricing", icon: "📍" },
    { label: "FAQs", icon: "❓" },
  ] as const;

  const removeSection = (id: string) => {
    setRemovedSections((prev) => new Set([...prev, id]));
    setApprovedReviewSections((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const restoreSection = (id: string) => {
    setRemovedSections((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateField = useCallback(
    (sectionPath: string, fieldKey: string, value: string | number) => {
      setEditedContent((prev) => {
        const updated = JSON.parse(JSON.stringify(prev));
        const keys = sectionPath.split(".");
        let target = updated;
        for (const key of keys) {
          target = target[key];
        }
        target[fieldKey] = value;
        return updated;
      });
    },
    [],
  );

  const googleScriptLoadedRef = useRef(false);

  const sections: Section[] = [
    {
      id: "landing-page",
      title: "Landing Page & About",
      icon: <Layout className="w-4 h-4" />,
      stepLabel: "Step 2",
      fields: [
        {
          key: "banner_heading",
          label: "Banner Heading",
          value: editedContent.stepTwo.banner_heading,
          maxLength: 50,
        },
        {
          key: "banner_sub_heading",
          label: "Banner Sub-Heading",
          value: editedContent.stepTwo.banner_sub_heading,
          maxLength: 80,
        },
        {
          key: "about_title",
          label: "About Title",
          value: editedContent.stepTwo.about_title,
          maxLength: 40,
        },
        {
          key: "about_description",
          label: "About Description",
          value: editedContent.stepTwo.about_description,
          maxLength: 340,
          type: "textarea",
        },
        {
          key: "about_link_title",
          label: "CTA Button Text",
          value: editedContent.stepTwo.about_link_title,
          maxLength: 18,
        },
      ],
    },
    {
      id: "event-details",
      title: "Event Details & Schedule",
      icon: <Calendar className="w-4 h-4" />,
      stepLabel: "Step 3",
      fields: [
        {
          key: "event_name",
          label: "Event Name",
          value: editedContent.stepThree.event_name,
          maxLength: 40,
        },
        {
          key: "event_banner_heading",
          label: "Event Banner Heading",
          value: editedContent.stepThree.event_banner_heading,
          maxLength: 50,
        },
        {
          key: "event_banner_sub_heading",
          label: "Event Banner Sub-Heading",
          value: editedContent.stepThree.event_banner_sub_heading,
          maxLength: 80,
        },
        {
          key: "about_event_heading",
          label: "About Event Heading",
          value: editedContent.stepThree.about_event_heading,
          maxLength: 50,
        },
        {
          key: "about_event_sub_heading",
          label: "About Event Sub-Heading",
          value: editedContent.stepThree.about_event_sub_heading,
          maxLength: 80,
        },
        {
          key: "about_event_description",
          label: "Event Description",
          value: editedContent.stepThree.about_event_description,
          maxLength: 340,
          type: "textarea",
        },
        {
          key: "event_schedular_title",
          label: "Schedule Title",
          value: editedContent.stepThree.event_schedular_title,
          maxLength: 40,
        },
      ],
    },
    {
      id: "packages",
      title: "Packages & Gallery",
      icon: <Package className="w-4 h-4" />,
      stepLabel: "Step 4",
      fields: [
        {
          key: "package_title",
          label: "Section Title",
          value: editedContent.stepFour.package_title,
          maxLength: 40,
        },
        {
          key: "package_description",
          label: "Section Description",
          value: editedContent.stepFour.package_description,
          maxLength: 160,
        },
        {
          key: "package_button_name",
          label: "Button Text",
          value: editedContent.stepFour.package_button_name,
          maxLength: 18,
        },
      ],
    },
    {
      id: "dates-tickets",
      title: "Dates, Tickets & Tables",
      icon: <Ticket className="w-4 h-4" />,
      stepLabel: "Step 5",
      fields: [],
    },
    {
      id: "menu",
      title: "Catering & Menu",
      icon: <UtensilsCrossed className="w-4 h-4" />,
      stepLabel: "Step 6",
      fields: [
        {
          key: "menu_title",
          label: "Menu Title",
          value: editedContent.stepSix.menu_title,
          maxLength: 40,
        },
        {
          key: "menu_description",
          label: "Menu Description",
          value: editedContent.stepSix.menu_description,
          maxLength: 160,
        },
      ],
    },
    {
      id: "drinks",
      title: "Other Packages",
      icon: <Wine className="w-4 h-4" />,
      stepLabel: "Step 7",
      fields: [
        {
          key: "drink_title",
          label: "Drinks Title",
          value: editedContent.stepSeven.drink_title,
          maxLength: 40,
        },
        {
          key: "drink_description",
          label: "Section Description",
          value: editedContent.stepSeven.drink_description,
          maxLength: 160,
        },
      ],
    },
    {
      id: "location",
      title: "Location & Pricing",
      icon: <MapPin className="w-4 h-4" />,
      stepLabel: "Step 8",
      fields: [
        {
          key: "event_address",
          label: "Event Address",
          value: editedContent.stepEight.event_address,
        },
        {
          key: "price_start_from",
          label: "Starting Price",
          value: editedContent.stepEight.price_start_from,
          type: "number",
        },
      ],
    },
    {
      id: "faqs",
      title: "Frequently Asked Questions",
      icon: <HelpCircle className="w-4 h-4" />,
      stepLabel: "Step 9",
      fields: editedContent.stepNine.faqs.flatMap((faq, i) => [
        {
          key: `faqs.${i}.question`,
          label: `Q${i + 1}`,
          value: faq.question,
          maxLength: 160,
          nested: true,
        },
        {
          key: `faqs.${i}.answer`,
          label: `A${i + 1}`,
          value: faq.answer,
          maxLength: 500,
          type: "textarea" as const,
          nested: true,
        },
      ]),
    },
  ];

  const visibleReviewSections = sections.filter(
    (s) => !removedSections.has(s.id),
  );
  const visibleReviewIdsKey = visibleReviewSections.map((s) => s.id).join(",");

  useEffect(() => {
    if (visibleReviewSections.length === 0) return;
    setReviewSectionIndex((i) => Math.min(i, visibleReviewSections.length - 1));
  }, [visibleReviewIdsKey, visibleReviewSections.length]);

  useEffect(() => {
    const activeId = visibleReviewSections[reviewSectionIndex]?.id;
    if (activeId !== "location" || googleScriptLoadedRef.current) return;
    const existing = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    );
    if (existing) {
      googleScriptLoadedRef.current = true;
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleScriptLoadedRef.current = true;
    };
    document.head.appendChild(script);
  }, [visibleReviewSections, reviewSectionIndex]);

  useEffect(() => {
    const section = visibleReviewSections[reviewSectionIndex];
    if (!section) return;
    const root = document.querySelector(
      `[data-ai-review-section="${section.id}"]`,
    );
    if (!(root instanceof HTMLElement)) return;
    let raf = 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    raf = requestAnimationFrame(() => {
      t = setTimeout(() => {
        const el = root.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
        );
        el?.focus({ preventScroll: true });
      }, 50);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (t) clearTimeout(t);
    };
  }, [reviewSectionIndex, visibleReviewIdsKey]);

  const canNavigateReviewTo = (targetIndex: number) => {
    for (let j = 0; j < targetIndex; j++) {
      const id = visibleReviewSections[j]?.id;
      if (id && !approvedReviewSections.has(id)) return false;
    }
    return true;
  };

  const goToReviewSection = (idx: number) => {
    if (idx < 0 || idx >= visibleReviewSections.length) return;
    const sec = visibleReviewSections[idx];
    if (approvedReviewSections.has(sec.id)) {
      setReviewSectionIndex(idx);
      return;
    }
    if (!canNavigateReviewTo(idx)) return;
    setReviewSectionIndex(idx);
  };

  const approveCurrentReviewSection = () => {
    const s = visibleReviewSections[reviewSectionIndex];
    if (!s) return;
    setApprovedReviewSections((prev) => new Set(prev).add(s.id));
    if (reviewSectionIndex < visibleReviewSections.length - 1) {
      setReviewSectionIndex((i) => i + 1);
    }
  };

  const approveAllReviewSections = () => {
    setApprovedReviewSections(new Set(visibleReviewSections.map((x) => x.id)));
  };

  const allReviewSectionsApproved =
    visibleReviewSections.length > 0 &&
    visibleReviewSections.every((s) => approvedReviewSections.has(s.id));

  const applyToOnboarding = async () => {
    if (visibleReviewSections.length === 0) {
      toast.error("No sections to apply.");
      return;
    }
    if (!allReviewSectionsApproved) {
      toast.error("Approve all sections first", {
        description:
          "Use Approve on each section or Approve all sections below.",
      });
      return;
    }
    setIsApplying(true);

    try {
      // Category-based images (API category IDs 1–22): Christmas, New Year, Diwali, etc.
      // Fall back to venue-type string match only when no category ID is set.
      const images =
        venueInput.event_category_id && venueInput.event_category_id > 0
          ? getImagesByCategoryId(venueInput.event_category_id)
          : getDummyImages(venueInput.venueType);

      // --- Step 1: Basic Venue Info ---
      setApplyStep(0);
      const stepOneData = {
        step: 1 as const,
        has_multiple_locations: venueInput.has_multiple_locations ?? false,
        name: venueInput.venueName,
        contact_number: venueInput.contactNumber,
        email: venueInput.email,
        address: venueInput.address,
        city: venueInput.city,
        domain: "",
        description: venueInput.description || "",
      };

      globalForm.setValue("stepOne", stepOneData);
      const step1Response = await onboardingService.storeStepData(stepOneData);

      if (!step1Response.status) {
        throw new Error(step1Response.message || "Failed to save venue info");
      }

      const vendorLocationId = step1Response.data?.vendor_location_id;
      if (vendorLocationId) {
        await updateSession({
          vendor_location_id: vendorLocationId,
          on_boarding_step: 2,
        });
      }

      // --- Step 2: Landing Page ---
      setApplyStep(1);
      const coverFile =
        (await urlToImageFile(images.cover, "cover-image")) ??
        (await createPlaceholderPackageImage(venueInput.venueName));

      const logoFile = await createPlaceholderLogo(venueInput.venueName);

      const stepTwoData = {
        step: 2 as const,
        banner_heading: editedContent.stepTwo.banner_heading,
        banner_sub_heading: editedContent.stepTwo.banner_sub_heading,
        about_title: editedContent.stepTwo.about_title,
        about_description: editedContent.stepTwo.about_description,
        about_link_title: editedContent.stepTwo.about_link_title,
        logo: logoFile,
        cover_image: coverFile,
      };

      globalForm.setValue("stepTwo", stepTwoData);
      const step2Response =
        await onboardingService.storeStepTwoData(stepTwoData);
      if (step2Response.status) {
        await updateSession({ on_boarding_step: 3 });
      }

      // --- Step 3: Event Details ---
      setApplyStep(2);
      const bannerFile =
        (await urlToImageFile(images.banner, "event-banner")) ??
        (await createPlaceholderEventBanner(
          editedContent.stepThree.event_name,
        ));

      const stepThreeData = {
        step: 3 as const,
        vendor_location_id: vendorLocationId || 0,
        event_category_id: venueInput.event_category_id ?? 1,
        event_name: editedContent.stepThree.event_name,
        event_banner_image: bannerFile,
        event_banner_video: undefined as unknown as File,
        event_banner_heading: editedContent.stepThree.event_banner_heading,
        event_banner_sub_heading:
          editedContent.stepThree.event_banner_sub_heading,
        about_event_heading: editedContent.stepThree.about_event_heading,
        about_event_sub_heading:
          editedContent.stepThree.about_event_sub_heading,
        about_event_description:
          editedContent.stepThree.about_event_description,
        event_schedular_title: editedContent.stepThree.event_schedular_title,
        event_schedular: editedContent.stepThree.event_schedular,
      };

      globalForm.setValue("stepThree", stepThreeData);
      const step3Response =
        await onboardingService.storeStepThreeData(stepThreeData);

      const eventId =
        step3Response.data?.event_id || step3Response.data?.id || 0;
      if (step3Response.status) {
        await updateSession({ on_boarding_step: 4 });
      }

      // --- Step 4: Packages ---
      setApplyStep(3);
      const packageFile =
        (await urlToImageFile(images.package, "package-image")) ??
        (await createPlaceholderPackageImage(
          editedContent.stepFour.package_title,
        ));

      let galleryFiles: File[] = [];
      try {
        galleryFiles = await fetchGalleryFiles(images.gallery);
      } catch {
        console.warn("Failed to fetch gallery images, skipping");
      }

      const stepFourData = {
        step: 4 as const,
        event_id: eventId,
        package_image: packageFile,
        package_title: editedContent.stepFour.package_title,
        package_description: editedContent.stepFour.package_description,
        package_button_name: editedContent.stepFour.package_button_name,
        package_details: editedContent.stepFour.package_details,
        gallery: galleryFiles,
      };

      globalForm.setValue("stepFour", stepFourData);
      const step4Response =
        await onboardingService.storeStepFourData(stepFourData);
      if (step4Response.status) {
        await updateSession({ on_boarding_step: 5 });
      }

      // --- Step 5: Dates, Tickets & Tables ---
      setApplyStep(4);
      const rawAiDates = editedContent.stepFive?.dates || [];
      const aiDates = (() => {
        const sorted = [...rawAiDates].sort(
          (a, b) =>
            new Date(a.event_date + "T00:00:00").getTime() -
            new Date(b.event_date + "T00:00:00").getTime(),
        );
        const seen = new Set<string>();
        return sorted.filter((d) => {
          if (!d.event_date || seen.has(d.event_date)) return false;
          seen.add(d.event_date);
          return true;
        });
      })();
      const formattedDates = aiDates.map((d) => {
        const bookingType = d.booking_type || "tickets";
        const tickets = (bookingType !== "tables" ? d.tickets || [] : []).map(
          (t) => ({
            title: t.title,
            description: t.description,
            total_capacity: t.total_capacity,
            price: t.price,
          }),
        );
        const tables = (bookingType !== "tickets" ? d.tables || [] : []).map(
          (t) => ({
            min_persons: t.min_persons,
            max_persons: t.max_persons,
            price: t.price,
            total_tables: t.total_tables,
          }),
        );

        const base: Record<string, unknown> = {
          event_date: d.event_date,
          booking_type: bookingType as "tickets" | "tables" | "both",
          total_ticket_types: tickets.length,
          total_table_types: tables.length,
          tickets,
          tables,
        };
        if (bookingType !== "tickets") {
          base.payment_type = (d.payment_type || "full") as "full" | "deposit";
          base.is_deposit_enabled = d.is_deposit_enabled ?? false;
          base.deposit_type = d.deposit_type ?? "amount";
          base.deposit_value = d.deposit_value ?? "";
          base.deposit_due_date = d.deposit_due_date ?? "";
        }
        return base;
      });

      const stepFiveData: StepFiveType = {
        step: 5,
        event_id: eventId,
        dates:
          formattedDates.length > 0
            ? (formattedDates as StepFiveType["dates"])
            : [
                {
                  event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  booking_type: "tickets",
                  total_ticket_types: 1,
                  total_table_types: 0,
                  tickets: [
                    {
                      title: "General Admission",
                      description: "Standard entry ticket",
                      total_capacity: "100",
                      price: "50",
                    },
                  ],
                  tables: [],
                },
              ],
      };

      globalForm.setValue("stepFive", stepFiveData);
      const step5Response =
        await onboardingService.storeStepFiveData(stepFiveData);
      if (step5Response.status) {
        await updateSession({ on_boarding_step: 6 });
      }

      // --- Step 6: Menu (skip API when section removed / no catering — backend requires title if we send) ---
      setApplyStep(5);
      const hasMenus = (editedContent.stepSix.menus?.length ?? 0) > 0;
      const menuRemoved = removedSections.has("menu");
      const stepSixData = {
        step: 6 as const,
        event_id: eventId,
        catering_option: (hasMenus ? 1 : 0) as 0 | 1,
        menu_title: hasMenus ? editedContent.stepSix.menu_title : "",
        menu_description: hasMenus
          ? editedContent.stepSix.menu_description
          : "",
        event_menu_category_id: 1,
        menus: hasMenus ? editedContent.stepSix.menus : [],
      };
      globalForm.setValue("stepSix", stepSixData);
      if (!menuRemoved && hasMenus) {
        const step6Response =
          await onboardingService.storeStepSixData(stepSixData);
        if (step6Response.status) {
          await updateSession({ on_boarding_step: 7 });
        }
      } else {
        await updateSession({ on_boarding_step: 7 });
      }

      // --- Step 7: Drinks (skip API when section removed / no packages — backend requires drink_title if we send) ---
      setApplyStep(6);
      const hasDrinkPackages =
        (editedContent.stepSeven.packages?.length ?? 0) > 0;
      const drinksRemoved = removedSections.has("drinks");
      const stepSevenData = {
        step: 7 as const,
        event_id: eventId,
        drink_title: editedContent.stepSeven.drink_title ?? "",
        drink_description: editedContent.stepSeven.drink_description ?? "",
        packages: editedContent.stepSeven.packages ?? [],
      };
      globalForm.setValue("stepSeven", stepSevenData);
      if (!drinksRemoved && hasDrinkPackages) {
        const step7Response =
          await onboardingService.storeStepSevenData(stepSevenData);
        if (step7Response.status) {
          await updateSession({ on_boarding_step: 8 });
        }
      } else {
        await updateSession({ on_boarding_step: 8 });
      }

      // --- Step 8: Location & Pricing ---
      setApplyStep(7);
      const stepEightData = {
        step: 8,
        event_id: eventId,
        event_address: editedContent.stepEight.event_address,
        price_start_from: editedContent.stepEight.price_start_from,
        price_start_from_button_text:
          editedContent.stepEight.price_start_from_button_text || "Book Now",
        location: editedContent.stepEight.location,
        brochure_pdf: null,
        brochure_pdf_2: null,
        faq_pdf: null,
        downloads: [],
        more_info: [],
      };

      globalForm.setValue("stepEight", stepEightData);

      // Build FormData for step 8 (it expects FormData)
      const step8FormData = new FormData();
      step8FormData.append("step", "8");
      step8FormData.append("event_id", eventId.toString());
      step8FormData.append(
        "event_address",
        editedContent.stepEight.event_address,
      );
      step8FormData.append(
        "price_start_from",
        editedContent.stepEight.price_start_from,
      );
      step8FormData.append(
        "price_start_from_button_text",
        editedContent.stepEight.price_start_from_button_text || "Book Now",
      );

      const step8Response =
        await onboardingService.storeStepEightData(step8FormData);
      if (step8Response.status) {
        await updateSession({ on_boarding_step: 9 });
      }

      // --- Step 9: FAQs ---
      setApplyStep(8);
      const stepNineData = {
        step: 9,
        event_id: eventId,
        faqs: editedContent.stepNine.faqs.slice(0, STEP_NINE_MAX_FAQS),
      };

      globalForm.setValue("stepNine", stepNineData);
      const step9Response =
        await onboardingService.storeStepNineData(stepNineData);
      if (step9Response.status) {
        await updateSession({ on_boarding_step: 10 });
      }

      // Land on step 1 so the vendor can review the full onboarding from the start.
      // Call setActiveStep(10) first so FormProvider's lastCompletedStep reaches the
      // payment step; then step 1 keeps session last_completed_step accurate when
      // updateActiveStep(1) runs (see form-provider updateActiveStep).
      setApplyStep(9);
      await setActiveStep(10);
      await setActiveStep(1);
      globalForm.setValue("activeStep", 1);

      toast.success(
        "Your site has been created! Review each step from the start, then continue to payments and publishing when you are ready.",
      );
      onComplete();
    } catch (error) {
      console.error("Error applying AI content:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to apply content. Please try again.",
      );
    } finally {
      setIsApplying(false);
      setApplyStep(-1);
    }
  };

  if (isApplying) {
    const totalSteps = APPLY_STEPS.length;
    const progressPct =
      applyStep < 0
        ? 0
        : Math.min(Math.round(((applyStep + 1) / totalSteps) * 100), 100);

    return (
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4"
              style={themeAccent.loaderBox}
            >
              <Loader2 className="w-7 h-7" style={themeAccent.text} />
            </motion.div>
            <h2 className="text-xl font-bold text-white">Building your site</h2>
            <p className="text-slate-500 text-xs mt-1">
              Please don&apos;t close this page
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-500">Progress</span>
              <span className="text-xs font-semibold" style={themeAccent.text}>
                {progressPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `var(--color-primary, #3b82f6)` }}
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Step list */}
          <div className="space-y-2">
            {APPLY_STEPS.map((step, idx) => {
              const isDone = idx < applyStep;
              const isActive = idx === applyStep;
              const isPending = idx > applyStep;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? "bg-white/6 border border-white/10"
                      : "bg-transparent"
                  }`}
                >
                  {/* Status icon */}
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                    {isDone ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
                      >
                        <Check className="w-3 h-3 text-green-400" />
                      </motion.div>
                    ) : isActive ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Loader2 className="w-4 h-4" style={themeAccent.text} />
                      </motion.div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/15" />
                    )}
                  </div>
                  {/* Emoji + label */}
                  <span className="text-sm mr-1">{step.icon}</span>
                  <span
                    className={`text-sm font-medium ${isDone ? "text-slate-400" : isActive ? "text-white" : "text-slate-600"}`}
                  >
                    {step.label}
                  </span>
                  {isDone && (
                    <span className="ml-auto text-[10px] text-green-500 font-medium">
                      Done
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="ml-auto text-[10px] font-medium"
                      style={themeAccent.text}
                    >
                      Saving...
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-sm mb-5"
            style={themeAccent.badge}
          >
            <Check className="w-3.5 h-3.5" style={themeAccent.text} />
            <span
              className="text-xs font-medium tracking-wide uppercase"
              style={themeAccent.text}
            >
              Content Generated
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Review your AI-generated content
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Everything below will be applied to your event website. Click any
            field to edit.
          </p>
        </div>

        {/* Sections — guided review */}
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-slate-900/55 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Section{" "}
                  {visibleReviewSections.length === 0
                    ? 0
                    : reviewSectionIndex + 1}{" "}
                  of {visibleReviewSections.length}
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  {approvedReviewSections.size}/{visibleReviewSections.length}{" "}
                  approved
                </p>
              </div>
              <button
                type="button"
                onClick={approveAllReviewSections}
                className="shrink-0 rounded-full border border-[var(--color-primary,#3b82f6)]/40 bg-[color-mix(in_srgb,var(--color-primary,#3b82f6)_12%,transparent)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[color-mix(in_srgb,var(--color-primary,#3b82f6)_20%,transparent)] transition-colors"
              >
                Approve all sections
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {visibleReviewSections.map((sec, idx) => {
                const done = approvedReviewSections.has(sec.id);
                const active = idx === reviewSectionIndex;
                const clickable = done || canNavigateReviewTo(idx);
                return (
                  <button
                    key={sec.id}
                    type="button"
                    disabled={!clickable}
                    onClick={() => goToReviewSection(idx)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                      done
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
                        : active
                          ? "border-[var(--color-primary,#3b82f6)]/50 bg-white/10 text-white"
                          : clickable
                            ? "border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]"
                            : "border-white/5 bg-transparent text-slate-600 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {done ? (
                      <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">
                        {idx + 1}
                      </span>
                    )}
                    <span className="truncate leading-tight">{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {(() => {
              const section = visibleReviewSections[reviewSectionIndex];
              if (!section) {
                return (
                  <p
                    key="empty"
                    className="text-center text-slate-500 text-sm py-10"
                  >
                    No sections to review.
                  </p>
                );
              }
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-lg shadow-black/25"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-white/5 bg-white/[0.03]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg border flex items-center justify-center shrink-0"
                        style={{
                          ...themeAccent.iconBox,
                          color: `var(--color-primary, #3b82f6)`,
                        }}
                      >
                        {section.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">
                          {section.title}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {section.stepLabel}
                          <span className="text-slate-600">
                            {" · "}
                            {section.id === "dates-tickets"
                              ? `${editedContent.stepFive?.dates?.length || 0} dates`
                              : `${section.fields.length} fields`}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    data-ai-review-section={section.id}
                    className="border-t border-white/5"
                  >
                    <div className="px-6 py-4 space-y-4">
                      {section.fields.map((field) => {
                        const sectionMap: Record<string, string> = {
                          "landing-page": "stepTwo",
                          "event-details": "stepThree",
                          packages: "stepFour",
                          "dates-tickets": "stepFive",
                          menu: "stepSix",
                          drinks: "stepSeven",
                          location: "stepEight",
                          faqs: "stepNine",
                        };
                        const sectionPath = sectionMap[section.id];

                        if (
                          section.id === "location" &&
                          field.key === "event_address"
                        ) {
                          return (
                            <div key={field.key} className="group">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                  {field.label}
                                </label>
                                <Edit3 className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <AddressAutocomplete
                                value={
                                  editedContent.stepEight.event_address ?? ""
                                }
                                onChange={(address: string) =>
                                  updateField(
                                    "stepEight",
                                    "event_address",
                                    address,
                                  )
                                }
                                onSelect={(_placeId: string, address: string) =>
                                  updateField(
                                    "stepEight",
                                    "event_address",
                                    address,
                                  )
                                }
                                placeholder="Type to search for a UK address or location..."
                                variant="dark"
                                className="mt-0"
                              />
                              <p className="text-[10px] text-slate-500 mt-1">
                                Search for UK addresses with Google autocomplete
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div key={field.key} className="group">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-medium text-slate-400">
                                {field.label}
                              </label>
                              <div className="flex items-center gap-2">
                                {field.maxLength && (
                                  <span className="text-[10px] text-slate-600">
                                    {String(field.value).length}/
                                    {field.maxLength}
                                  </span>
                                )}
                                <Edit3 className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                            {field.type === "textarea" ? (
                              <textarea
                                value={String(field.value)}
                                maxLength={field.maxLength}
                                onChange={(e) => {
                                  if (field.nested && field.key.includes(".")) {
                                    const parts = field.key.split(".");
                                    setEditedContent((prev) => {
                                      const updated = JSON.parse(
                                        JSON.stringify(prev),
                                      );
                                      const stepData = updated[sectionPath];
                                      if (
                                        parts[0] === "faqs" &&
                                        stepData.faqs
                                      ) {
                                        const idx = parseInt(parts[1]);
                                        const prop = parts[2];
                                        if (stepData.faqs[idx]) {
                                          stepData.faqs[idx][prop] =
                                            e.target.value;
                                        }
                                      }
                                      return updated;
                                    });
                                  } else {
                                    updateField(
                                      sectionPath,
                                      field.key,
                                      e.target.value,
                                    );
                                  }
                                }}
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors resize-none"
                              />
                            ) : (
                              <input
                                type={
                                  field.type === "number" ? "number" : "text"
                                }
                                value={String(field.value)}
                                maxLength={field.maxLength}
                                onChange={(e) => {
                                  if (field.nested && field.key.includes(".")) {
                                    const parts = field.key.split(".");
                                    setEditedContent((prev) => {
                                      const updated = JSON.parse(
                                        JSON.stringify(prev),
                                      );
                                      const stepData = updated[sectionPath];
                                      if (
                                        parts[0] === "faqs" &&
                                        stepData.faqs
                                      ) {
                                        const idx = parseInt(parts[1]);
                                        const prop = parts[2];
                                        if (stepData.faqs[idx]) {
                                          stepData.faqs[idx][prop] =
                                            e.target.value;
                                        }
                                      }
                                      return updated;
                                    });
                                  } else {
                                    updateField(
                                      sectionPath,
                                      field.key,
                                      e.target.value,
                                    );
                                  }
                                }}
                                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
                              />
                            )}
                          </div>
                        );
                      })}

                      {/* Optional: Remove menu section (Step 6) */}
                      {section.id === "menu" && (
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-[11px] text-slate-600 mb-1.5">
                            Menu is optional — some venues have no catering.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditedContent((prev) => ({
                                ...prev,
                                stepSix: {
                                  ...prev.stepSix,
                                  menus: [],
                                  menu_title: "",
                                  menu_description: "",
                                },
                              }));
                              removeSection("menu");
                            }}
                            className="w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/25 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove menu section (no catering)
                          </button>
                        </div>
                      )}

                      {/* Schedule items for step 3 */}
                      {section.id === "event-details" &&
                        editedContent.stepThree.event_schedular?.length > 0 && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-xs font-medium text-slate-400 mb-3">
                              Schedule Items
                            </p>
                            <div className="space-y-2">
                              {editedContent.stepThree.event_schedular.map(
                                (item, idx) => (
                                  <div key={idx} className="flex gap-2">
                                    <input
                                      type="time"
                                      value={item.time}
                                      onChange={(e) => {
                                        setEditedContent((prev) => {
                                          const updated = JSON.parse(
                                            JSON.stringify(prev),
                                          );
                                          updated.stepThree.event_schedular[
                                            idx
                                          ].time = e.target.value;
                                          return updated;
                                        });
                                      }}
                                      className="w-28 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                    <input
                                      value={item.title}
                                      maxLength={40}
                                      onChange={(e) => {
                                        setEditedContent((prev) => {
                                          const updated = JSON.parse(
                                            JSON.stringify(prev),
                                          );
                                          updated.stepThree.event_schedular[
                                            idx
                                          ].title = e.target.value;
                                          return updated;
                                        });
                                      }}
                                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Package details for step 4 */}
                      {section.id === "packages" &&
                        editedContent.stepFour.package_details?.length > 0 && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-xs font-medium text-slate-400 mb-3">
                              Package Features
                            </p>
                            <div className="space-y-2">
                              {editedContent.stepFour.package_details.map(
                                (detail, idx) => (
                                  <input
                                    key={idx}
                                    value={detail.title}
                                    maxLength={40}
                                    onChange={(e) => {
                                      setEditedContent((prev) => {
                                        const updated = JSON.parse(
                                          JSON.stringify(prev),
                                        );
                                        updated.stepFour.package_details[
                                          idx
                                        ].title = e.target.value;
                                        return updated;
                                      });
                                    }}
                                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                  />
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Dates, Tickets & Tables for step 5 */}
                      {section.id === "dates-tickets" &&
                        editedContent.stepFive?.dates?.length > 0 && (
                          <div className="space-y-4">
                            {editedContent.stepFive.dates.map(
                              (date, dateIdx) => (
                                <div
                                  key={dateIdx}
                                  className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-white">
                                      Event Date {dateIdx + 1}
                                    </h4>
                                    {editedContent.stepFive.dates.length >
                                      1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditedContent((prev) => {
                                            const updated = JSON.parse(
                                              JSON.stringify(prev),
                                            );
                                            updated.stepFive.dates.splice(
                                              dateIdx,
                                              1,
                                            );
                                            return updated;
                                          });
                                        }}
                                        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Date & Booking Type */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs text-slate-400 mb-1 block">
                                        Date
                                      </label>
                                      <input
                                        type="date"
                                        value={date.event_date}
                                        onChange={(e) => {
                                          setEditedContent((prev) => {
                                            const updated = JSON.parse(
                                              JSON.stringify(prev),
                                            );
                                            updated.stepFive.dates[
                                              dateIdx
                                            ].event_date = e.target.value;
                                            return updated;
                                          });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-slate-400 mb-1 block">
                                        Booking Type
                                      </label>
                                      <select
                                        value={date.booking_type}
                                        onChange={(e) => {
                                          setEditedContent((prev) => {
                                            const updated = JSON.parse(
                                              JSON.stringify(prev),
                                            );
                                            const newType = e.target.value as
                                              | "tickets"
                                              | "tables"
                                              | "both";
                                            updated.stepFive.dates[
                                              dateIdx
                                            ].booking_type = newType;
                                            if (newType === "tickets") {
                                              updated.stepFive.dates[
                                                dateIdx
                                              ].tables = [];
                                              updated.stepFive.dates[
                                                dateIdx
                                              ].payment_type = "full";
                                              updated.stepFive.dates[
                                                dateIdx
                                              ].is_deposit_enabled = false;
                                            }
                                            if (newType === "tables")
                                              updated.stepFive.dates[
                                                dateIdx
                                              ].tickets = [];
                                            if (newType === "both") {
                                              if (
                                                !updated.stepFive.dates[dateIdx]
                                                  .tickets.length
                                              )
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].tickets = [
                                                  {
                                                    title: "General Admission",
                                                    description:
                                                      "Standard ticket",
                                                    total_capacity: "100",
                                                    price: "50",
                                                  },
                                                ];
                                              if (
                                                !updated.stepFive.dates[dateIdx]
                                                  .tables.length
                                              )
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].tables = [
                                                  {
                                                    min_persons: "2",
                                                    max_persons: "6",
                                                    price: "100",
                                                    total_tables: "10",
                                                  },
                                                ];
                                            }
                                            if (
                                              newType === "tables" ||
                                              newType === "both"
                                            ) {
                                              if (
                                                updated.stepFive.dates[dateIdx]
                                                  .payment_type === undefined
                                              )
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].payment_type = "full";
                                              if (
                                                updated.stepFive.dates[dateIdx]
                                                  .deposit_type === undefined
                                              )
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].deposit_type = "amount";
                                              if (
                                                updated.stepFive.dates[dateIdx]
                                                  .deposit_value === undefined
                                              )
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].deposit_value = "";
                                              if (
                                                updated.stepFive.dates[dateIdx]
                                                  .deposit_due_date ===
                                                undefined
                                              )
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].deposit_due_date = "";
                                            }
                                            return updated;
                                          });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors [&>option]:bg-slate-900 [&>option]:text-white"
                                      >
                                        <option value="tickets">
                                          Tickets Only
                                        </option>
                                        <option value="tables">
                                          Tables Only
                                        </option>
                                        <option value="both">
                                          Tickets & Tables
                                        </option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Deposit (per date, for tables/both) */}
                                  {(date.booking_type === "tables" ||
                                    date.booking_type === "both") && (
                                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-3">
                                      <p className="text-xs font-medium text-slate-400">
                                        Payment &amp; deposit
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <label className="text-[10px] text-slate-500 block mb-1">
                                            Payment type
                                          </label>
                                          <select
                                            value={date.payment_type ?? "full"}
                                            onChange={(e) => {
                                              setEditedContent((prev) => {
                                                const updated = JSON.parse(
                                                  JSON.stringify(prev),
                                                );
                                                const v = e.target.value as
                                                  | "full"
                                                  | "deposit";
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].payment_type = v;
                                                if (v === "full") {
                                                  updated.stepFive.dates[
                                                    dateIdx
                                                  ].is_deposit_enabled = false;
                                                  updated.stepFive.dates[
                                                    dateIdx
                                                  ].deposit_type = "amount";
                                                  updated.stepFive.dates[
                                                    dateIdx
                                                  ].deposit_value = "";
                                                  updated.stepFive.dates[
                                                    dateIdx
                                                  ].deposit_due_date = "";
                                                }
                                                return updated;
                                              });
                                            }}
                                            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50 [&>option]:bg-slate-900"
                                          >
                                            <option value="full">
                                              Full payment
                                            </option>
                                            <option value="deposit">
                                              Deposit
                                            </option>
                                          </select>
                                        </div>
                                        {date.payment_type === "deposit" && (
                                          <>
                                            <div className="sm:col-span-2 flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                id={`deposit-enabled-${dateIdx}`}
                                                checked={
                                                  date.is_deposit_enabled ??
                                                  true
                                                }
                                                onChange={(e) => {
                                                  setEditedContent((prev) => {
                                                    const updated = JSON.parse(
                                                      JSON.stringify(prev),
                                                    );
                                                    updated.stepFive.dates[
                                                      dateIdx
                                                    ].is_deposit_enabled =
                                                      e.target.checked;
                                                    if (!e.target.checked) {
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].deposit_value = "";
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].deposit_due_date = "";
                                                    }
                                                    return updated;
                                                  });
                                                }}
                                                className="rounded border-white/20 bg-white/5"
                                              />
                                              <label
                                                htmlFor={`deposit-enabled-${dateIdx}`}
                                                className="text-xs text-slate-400"
                                              >
                                                Allow customers to pay deposit
                                                for this date
                                              </label>
                                            </div>
                                            {date.is_deposit_enabled !==
                                              false && (
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:col-span-2">
                                                <div>
                                                  <label className="text-[10px] text-slate-500 block mb-1">
                                                    Deposit type
                                                  </label>
                                                  <select
                                                    value={
                                                      date.deposit_type ??
                                                      "amount"
                                                    }
                                                    onChange={(e) => {
                                                      setEditedContent(
                                                        (prev) => {
                                                          const updated =
                                                            JSON.parse(
                                                              JSON.stringify(
                                                                prev,
                                                              ),
                                                            );
                                                          updated.stepFive.dates[
                                                            dateIdx
                                                          ].deposit_type = e
                                                            .target.value as
                                                            | "amount"
                                                            | "percentage";
                                                          updated.stepFive.dates[
                                                            dateIdx
                                                          ].deposit_value = "";
                                                          return updated;
                                                        },
                                                      );
                                                    }}
                                                    className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50 [&>option]:bg-slate-900"
                                                  >
                                                    <option value="amount">
                                                      Fixed amount
                                                    </option>
                                                    <option value="percentage">
                                                      Percentage
                                                    </option>
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="text-[10px] text-slate-500 block mb-1">
                                                    {date.deposit_type ===
                                                    "percentage"
                                                      ? "Deposit %"
                                                      : "Deposit amount"}
                                                  </label>
                                                  <input
                                                    type="number"
                                                    min={
                                                      date.deposit_type ===
                                                      "percentage"
                                                        ? 20
                                                        : 1
                                                    }
                                                    max={
                                                      date.deposit_type ===
                                                      "percentage"
                                                        ? 80
                                                        : undefined
                                                    }
                                                    value={
                                                      date.deposit_value ?? ""
                                                    }
                                                    placeholder={
                                                      date.deposit_type ===
                                                      "percentage"
                                                        ? "20–80"
                                                        : "Amount"
                                                    }
                                                    onChange={(e) => {
                                                      setEditedContent(
                                                        (prev) => {
                                                          const updated =
                                                            JSON.parse(
                                                              JSON.stringify(
                                                                prev,
                                                              ),
                                                            );
                                                          updated.stepFive.dates[
                                                            dateIdx
                                                          ].deposit_value =
                                                            e.target.value;
                                                          return updated;
                                                        },
                                                      );
                                                    }}
                                                    className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[10px] text-slate-500 block mb-1">
                                                    Deposit due date
                                                  </label>
                                                  <input
                                                    type="date"
                                                    value={
                                                      date.deposit_due_date ??
                                                      ""
                                                    }
                                                    onChange={(e) => {
                                                      setEditedContent(
                                                        (prev) => {
                                                          const updated =
                                                            JSON.parse(
                                                              JSON.stringify(
                                                                prev,
                                                              ),
                                                            );
                                                          updated.stepFive.dates[
                                                            dateIdx
                                                          ].deposit_due_date =
                                                            e.target.value;
                                                          return updated;
                                                        },
                                                      );
                                                    }}
                                                    className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                  />
                                                </div>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Tickets */}
                                  {(date.booking_type === "tickets" ||
                                    date.booking_type === "both") &&
                                    date.tickets?.length > 0 && (
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <p
                                            className="text-xs font-medium"
                                            style={themeAccent.text}
                                          >
                                            Tickets
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditedContent((prev) => {
                                                const updated = JSON.parse(
                                                  JSON.stringify(prev),
                                                );
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].tickets.push({
                                                  title: "New Ticket",
                                                  description:
                                                    "Ticket description",
                                                  total_capacity: "50",
                                                  price: "50",
                                                });
                                                return updated;
                                              });
                                            }}
                                            className="flex items-center gap-1 text-[10px]"
                                            style={themeAccent.text}
                                          >
                                            <Plus className="w-3 h-3" /> Add
                                            Ticket
                                          </button>
                                        </div>
                                        <div className="space-y-2">
                                          {date.tickets.map((ticket, tIdx) => (
                                            <div
                                              key={tIdx}
                                              className="grid grid-cols-9 gap-2 items-start p-2 rounded bg-white/[0.03]"
                                            >
                                              <div className="col-span-2">
                                                <input
                                                  value={ticket.title}
                                                  maxLength={25}
                                                  placeholder="Title"
                                                  onChange={(e) => {
                                                    setEditedContent((prev) => {
                                                      const updated =
                                                        JSON.parse(
                                                          JSON.stringify(prev),
                                                        );
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].tickets[tIdx].title =
                                                        e.target.value;
                                                      return updated;
                                                    });
                                                  }}
                                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                />
                                              </div>
                                              <div className="col-span-3">
                                                <input
                                                  value={ticket.description}
                                                  maxLength={160}
                                                  placeholder="Description"
                                                  onChange={(e) => {
                                                    setEditedContent((prev) => {
                                                      const updated =
                                                        JSON.parse(
                                                          JSON.stringify(prev),
                                                        );
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].tickets[
                                                        tIdx
                                                      ].description =
                                                        e.target.value;
                                                      return updated;
                                                    });
                                                  }}
                                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                />
                                              </div>
                                              <div className="col-span-1">
                                                <input
                                                  type="number"
                                                  value={ticket.total_capacity}
                                                  placeholder="Cap"
                                                  onChange={(e) => {
                                                    setEditedContent((prev) => {
                                                      const updated =
                                                        JSON.parse(
                                                          JSON.stringify(prev),
                                                        );
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].tickets[
                                                        tIdx
                                                      ].total_capacity =
                                                        e.target.value;
                                                      return updated;
                                                    });
                                                  }}
                                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                />
                                              </div>
                                              <div className="col-span-2">
                                                <input
                                                  type="number"
                                                  value={ticket.price}
                                                  placeholder="Price"
                                                  onChange={(e) => {
                                                    setEditedContent((prev) => {
                                                      const updated =
                                                        JSON.parse(
                                                          JSON.stringify(prev),
                                                        );
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].tickets[tIdx].price =
                                                        e.target.value;
                                                      return updated;
                                                    });
                                                  }}
                                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                />
                                              </div>
                                              <div className="col-span-1 flex justify-center">
                                                {date.tickets.length > 1 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEditedContent(
                                                        (prev) => {
                                                          const updated =
                                                            JSON.parse(
                                                              JSON.stringify(
                                                                prev,
                                                              ),
                                                            );
                                                          updated.stepFive.dates[
                                                            dateIdx
                                                          ].tickets.splice(
                                                            tIdx,
                                                            1,
                                                          );
                                                          return updated;
                                                        },
                                                      );
                                                    }}
                                                    className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                  {/* Tables */}
                                  {(date.booking_type === "tables" ||
                                    date.booking_type === "both") &&
                                    date.tables?.length > 0 && (
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <p
                                            className="text-xs font-medium"
                                            style={themeAccent.secondaryText}
                                          >
                                            Tables
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditedContent((prev) => {
                                                const updated = JSON.parse(
                                                  JSON.stringify(prev),
                                                );
                                                updated.stepFive.dates[
                                                  dateIdx
                                                ].tables.push({
                                                  min_persons: "2",
                                                  max_persons: "6",
                                                  price: "100",
                                                  total_tables: "10",
                                                });
                                                return updated;
                                              });
                                            }}
                                            className="flex items-center gap-1 text-[10px]"
                                            style={themeAccent.secondaryText}
                                          >
                                            <Plus className="w-3 h-3" /> Add
                                            Table
                                          </button>
                                        </div>
                                        <div className="space-y-2">
                                          {date.tables.map((table, tbIdx) => (
                                            <div
                                              key={tbIdx}
                                              className="grid grid-cols-10 gap-2 items-center p-2 rounded bg-white/[0.03]"
                                            >
                                              <div className="col-span-2">
                                                <label className="text-[10px] text-slate-500 block mb-0.5">
                                                  Min
                                                </label>
                                                <input
                                                  type="number"
                                                  value={table.min_persons}
                                                  onChange={(e) => {
                                                    setEditedContent((prev) => {
                                                      const updated =
                                                        JSON.parse(
                                                          JSON.stringify(prev),
                                                        );
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].tables[
                                                        tbIdx
                                                      ].min_persons =
                                                        e.target.value;
                                                      return updated;
                                                    });
                                                  }}
                                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                />
                                              </div>
                                              <div className="col-span-2">
                                                <label className="text-[10px] text-slate-500 block mb-0.5">
                                                  Max
                                                </label>
                                                <input
                                                  type="number"
                                                  value={table.max_persons}
                                                  onChange={(e) => {
                                                    setEditedContent((prev) => {
                                                      const updated =
                                                        JSON.parse(
                                                          JSON.stringify(prev),
                                                        );
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].tables[
                                                        tbIdx
                                                      ].max_persons =
                                                        e.target.value;
                                                      return updated;
                                                    });
                                                  }}
                                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                />
                                              </div>
                                              <div className="col-span-2">
                                                <label className="text-[10px] text-slate-500 block mb-0.5">
                                                  Price
                                                </label>
                                                <input
                                                  type="number"
                                                  value={table.price}
                                                  onChange={(e) => {
                                                    setEditedContent((prev) => {
                                                      const updated =
                                                        JSON.parse(
                                                          JSON.stringify(prev),
                                                        );
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].tables[tbIdx].price =
                                                        e.target.value;
                                                      return updated;
                                                    });
                                                  }}
                                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                />
                                              </div>
                                              <div className="col-span-3">
                                                <label className="text-[10px] text-slate-500 block mb-0.5">
                                                  Total Tables
                                                </label>
                                                <input
                                                  type="number"
                                                  value={table.total_tables}
                                                  onChange={(e) => {
                                                    setEditedContent((prev) => {
                                                      const updated =
                                                        JSON.parse(
                                                          JSON.stringify(prev),
                                                        );
                                                      updated.stepFive.dates[
                                                        dateIdx
                                                      ].tables[
                                                        tbIdx
                                                      ].total_tables =
                                                        e.target.value;
                                                      return updated;
                                                    });
                                                  }}
                                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50"
                                                />
                                              </div>
                                              <div className="col-span-1 flex justify-center pt-4">
                                                {date.tables.length > 1 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEditedContent(
                                                        (prev) => {
                                                          const updated =
                                                            JSON.parse(
                                                              JSON.stringify(
                                                                prev,
                                                              ),
                                                            );
                                                          updated.stepFive.dates[
                                                            dateIdx
                                                          ].tables.splice(
                                                            tbIdx,
                                                            1,
                                                          );
                                                          return updated;
                                                        },
                                                      );
                                                    }}
                                                    className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              ),
                            )}

                            {/* Add Date button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditedContent((prev) => {
                                  const updated = JSON.parse(
                                    JSON.stringify(prev),
                                  );
                                  const nextDate = new Date();
                                  nextDate.setMonth(
                                    nextDate.getMonth() +
                                      2 +
                                      updated.stepFive.dates.length,
                                  );
                                  updated.stepFive.dates.push({
                                    event_date: nextDate
                                      .toISOString()
                                      .split("T")[0],
                                    booking_type: "tickets",
                                    tickets: [
                                      {
                                        title: "General Admission",
                                        description: "Standard entry ticket",
                                        total_capacity: "100",
                                        price: "50",
                                      },
                                    ],
                                    tables: [],
                                    payment_type: "full",
                                    is_deposit_enabled: false,
                                    deposit_type: "amount",
                                    deposit_value: "",
                                    deposit_due_date: "",
                                  });
                                  return updated;
                                });
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/10 hover:border-blue-500/30 text-slate-500 hover:text-blue-400 text-xs transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Another Event Date
                            </button>
                          </div>
                        )}

                      {/* Drink packages for step 7 (optional) */}
                      {section.id === "drinks" && (
                        <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-400">
                              Drink Packages
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditedContent((prev) => ({
                                  ...prev,
                                  stepSeven: {
                                    ...prev.stepSeven,
                                    packages: [],
                                    drink_title: "",
                                    drink_description: "",
                                  },
                                }));
                                removeSection("drinks");
                              }}
                              className="w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/25 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove other packages section
                            </button>
                          </div>
                          <div className="space-y-3">
                            {editedContent.stepSeven.packages.map(
                              (pkg, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-white/5 space-y-2"
                                >
                                  <input
                                    value={pkg.title}
                                    maxLength={25}
                                    placeholder="Package title"
                                    onChange={(e) => {
                                      setEditedContent((prev) => {
                                        const updated = JSON.parse(
                                          JSON.stringify(prev),
                                        );
                                        updated.stepSeven.packages[idx].title =
                                          e.target.value;
                                        return updated;
                                      });
                                    }}
                                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                  />
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      value={pkg.price}
                                      placeholder="Price"
                                      onChange={(e) => {
                                        setEditedContent((prev) => {
                                          const updated = JSON.parse(
                                            JSON.stringify(prev),
                                          );
                                          updated.stepSeven.packages[
                                            idx
                                          ].price = Number(e.target.value);
                                          return updated;
                                        });
                                      }}
                                      className="w-28 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                    <input
                                      type="number"
                                      value={pkg.available_quantity}
                                      placeholder="Qty"
                                      onChange={(e) => {
                                        setEditedContent((prev) => {
                                          const updated = JSON.parse(
                                            JSON.stringify(prev),
                                          );
                                          updated.stepSeven.packages[
                                            idx
                                          ].available_quantity = Number(
                                            e.target.value,
                                          );
                                          return updated;
                                        });
                                      }}
                                      className="w-28 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t border-white/5 bg-slate-950/50">
                    <span className="text-xs text-slate-500">
                      {visibleReviewSections[reviewSectionIndex]
                        ? `Reviewing ${visibleReviewSections[reviewSectionIndex].title} (section ${reviewSectionIndex + 1} of ${visibleReviewSections.length})`
                        : ""}
                    </span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          goToReviewSection(reviewSectionIndex - 1)
                        }
                        disabled={reviewSectionIndex === 0}
                        className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        Previous section
                      </button>
                      <button
                        type="button"
                        onClick={approveCurrentReviewSection}
                        className="rounded-full px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 transition-colors"
                      >
                        Approve section
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          goToReviewSection(reviewSectionIndex + 1)
                        }
                        disabled={
                          reviewSectionIndex >= visibleReviewSections.length - 1
                        }
                        className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        Next section
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* Removed optional sections restore strip */}
        {removedSections.size > 0 && (
          <div className="mt-3 p-3 rounded-xl border border-white/5 bg-slate-900/40 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-600 mr-1">
              Removed sections:
            </span>
            {removedSections.has("menu") && (
              <button
                type="button"
                onClick={() => restoreSection("menu")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs transition-colors"
              >
                <Plus className="w-3 h-3" />
                Catering &amp; Menu
              </button>
            )}
            {removedSections.has("drinks") && (
              <button
                type="button"
                onClick={() => restoreSection("drinks")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs transition-colors"
              >
                <Plus className="w-3 h-3" />
                Other Packages
              </button>
            )}
          </div>
        )}

        {/* Placeholder images notice */}
        <div
          className="mt-6 p-4 rounded-xl border"
          style={themeAccent.noticeBox}
        >
          <p className="text-xs" style={themeAccent.text}>
            <Sparkles className="w-3 h-3 inline mr-1" />
            <strong>Note:</strong> AI will use professional placeholder images
            for your site. You can replace them anytime from your dashboard.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm font-medium border border-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate All
            </button>
          </div>
          <button
            onClick={applyToOnboarding}
            disabled={isApplying || !allReviewSectionsApproved}
            title={
              !allReviewSectionsApproved
                ? "Approve all sections first"
                : undefined
            }
            className="flex items-center gap-2 px-8 py-3 rounded-full text-white text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            style={themeAccent.button}
          >
            <Sparkles className="w-4 h-4" />
            Apply & Create My Site
          </button>
        </div>
      </div>
    </div>
  );
}
