"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Pencil,
  Trash2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import AddressAutocomplete from "@/app/(protected)/vendor/events/_components/tab-event-form/tabs/_components/address-autocomplete";
import type {
  AIEventInput,
  AIEventGeneratedContent,
  AIEventDate,
  AIEventTicket,
  AIEventTable,
} from "@/app/api/ai/generate-event/route";
import { api } from "@/services/core/api-client";
import type { ApiResponse } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { eventsService } from "@/services/vendor/events/events.service";
import type { EventDetailData } from "@/services/vendor/events/type";
import type { StepOneType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import {
  getDummyImages,
  getImagesByCategoryId,
  urlToImageFile,
  fetchGalleryFiles,
  createPlaceholderEventBanner,
  createPlaceholderPackageImage,
} from "@/app/(on-boarding)/on-boarding/_lib/constants/dummy-images";

const APPLY_STEPS = [
  { label: "Event details & schedule", icon: "📅" },
  { label: "Packages", icon: "📦" },
  { label: "Dates, tickets & tables", icon: "🎟️" },
  { label: "Catering & menu", icon: "🍽️" },
  { label: "Other packages", icon: "🥂" },
  { label: "Location & pricing", icon: "📍" },
  { label: "FAQs", icon: "❓" },
] as const;

const SECTIONS = [
  { id: "stepOne", title: "Event Details & Schedule", icon: "📅" },
  { id: "stepTwo", title: "Packages", icon: "📦" },
  { id: "stepThree", title: "Dates & Tickets", icon: "🎟️" },
  { id: "stepFour", title: "Catering & Menu", icon: "🍽️" },
  { id: "stepFive", title: "Other Packages", icon: "🥂" },
  { id: "stepSix", title: "Location & Pricing", icon: "📍" },
  { id: "stepSeven", title: "FAQs", icon: "❓" },
] as const;

const accent = {
  text: { color: "var(--color-primary, #3b82f6)" } as React.CSSProperties,
  loaderBox: {
    backgroundColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 30%, transparent)",
  } as React.CSSProperties,
};

const inputCls = "bg-white/5 border-white/10 text-white text-xs h-7 placeholder:text-slate-600";
const selectCls =
  "bg-slate-900 border border-white/10 text-white text-xs rounded-md px-2 h-7 outline-none focus:border-white/20";

interface ReviewContentProps {
  content: AIEventGeneratedContent;
  eventInput: AIEventInput;
  categoryId: number;
  onComplete: (eventId: number) => void;
  onRegenerate: () => void;
  onBack: () => void;
}

export default function AIEventReviewContent({
  content,
  eventInput,
  categoryId,
  onComplete,
  onRegenerate,
  onBack,
}: ReviewContentProps) {
  const [editedContent, setEditedContent] = useState<AIEventGeneratedContent>(content);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["stepOne"]));
  const [removedSections, setRemovedSections] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [applyStep, setApplyStep] = useState(-1);
  const [applyDone, setApplyDone] = useState(false);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeSection = (id: string) => {
    setRemovedSections((prev) => new Set([...prev, id]));
    setExpandedSections((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  };

  const restoreSection = (id: string) => {
    setRemovedSections((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  };

  const updateField = useCallback(
    (step: keyof AIEventGeneratedContent, field: string, value: unknown) => {
      setEditedContent((prev) => ({
        ...prev,
        [step]: { ...prev[step], [field]: value },
      }));
    },
    []
  );

  const updateStepThree = useCallback((value: AIEventGeneratedContent["stepThree"]) => {
    setEditedContent((prev) => ({ ...prev, stepThree: value }));
  }, []);

  const updateStepFive = useCallback((value: AIEventGeneratedContent["stepFive"]) => {
    setEditedContent((prev) => ({ ...prev, stepFive: value }));
  }, []);

  const updateStepSeven = useCallback((value: AIEventGeneratedContent["stepSeven"]) => {
    setEditedContent((prev) => ({ ...prev, stepSeven: value }));
  }, []);

  // --- Apply all content via the event service step by step ---
  const applyToEvent = async () => {
    try {
      setIsApplying(true);
      setApplyStep(-1);
      setApplyDone(false);

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const s = editedContent;

      const eventType = eventInput.eventType || "other";
      // Category-based images (API category IDs 1–22): Christmas, New Year, Diwali, etc.
      // Fall back to event-type match only when no category is selected.
      const dummyImages =
        categoryId > 0 ? getImagesByCategoryId(categoryId) : getDummyImages(eventType);

      // Step 0 — Event details (Step 1 API → creates event, returns event_id)
      setApplyStep(0);

      const bannerFile =
        (await urlToImageFile(dummyImages.banner, "event-banner")) ??
        (await createPlaceholderEventBanner(s.stepOne.event_name));

      const schedulerBgUrl = (dummyImages as { scheduler_background?: string }).scheduler_background;
      const schedulerBgFile = schedulerBgUrl
        ? (await urlToImageFile(schedulerBgUrl, "event-scheduler-background")) ??
          (await createPlaceholderEventBanner(`${s.stepOne.event_name} · schedule`))
        : null;

      const stepOneData: StepOneType = {
        step: 1 as const,
        event_category_id: categoryId,
        event_name: s.stepOne.event_name,
        event_banner_heading: s.stepOne.event_banner_heading,
        event_banner_sub_heading: s.stepOne.event_banner_sub_heading,
        about_event_heading: s.stepOne.about_event_heading,
        about_event_sub_heading: s.stepOne.about_event_sub_heading,
        about_event_description: s.stepOne.about_event_description,
        event_schedular_title: s.stepOne.event_schedular_title,
        event_schedular: s.stepOne.event_schedular,
        event_banner_image: bannerFile,
        event_banner_video: null,
        event_schedular_background_image: schedulerBgFile ?? undefined,
      };

      const step1Res = await eventsService.storeStepOneData(stepOneData);
      const eventId =
        (step1Res as unknown as { data?: { id?: number; event_id?: number } })?.data?.id ||
        (step1Res as unknown as { data?: { event_id?: number } })?.data?.event_id;

      if (!eventId) throw new Error("Failed to create event — no event_id returned");

      const detailRes = await api.get<ApiResponse<EventDetailData>>(
        API_ENDPOINTS.VENDOR.EVENT.GET_EVENT.replace("{eventId}", String(eventId)),
        { returnFullResponse: true }
      );
      const vendorLocationId =
        detailRes?.data?.vendor_location_id ??
        detailRes?.data?.stepOne?.vendor_location_id;
      if (!vendorLocationId || vendorLocationId < 1) {
        throw new Error(
          "Could not resolve venue location for this event. Open the event editor and ensure a venue is selected, then try again."
        );
      }

      // Step 1 — Packages (with package image + gallery placeholders by event type)
      setApplyStep(1);
      const packageImage =
        (await urlToImageFile(dummyImages.package, "package-image")) ??
        (await createPlaceholderPackageImage(
          removedSections.has("stepTwo") ? "Package" : s.stepTwo.package_title
        ));

      const galleryUrls = dummyImages.gallery ?? [];
      const galleryFiles =
        galleryUrls.length > 0
          ? await fetchGalleryFiles(galleryUrls).then((files) =>
              files.slice(0, 8)
            )
          : [];

      await eventsService.storeStepTwoData({
        step: 2 as const,
        event_id: eventId,
        package_title: removedSections.has("stepTwo") ? "Package" : s.stepTwo.package_title,
        package_description: removedSections.has("stepTwo") ? "Package details" : s.stepTwo.package_description,
        package_button_name: removedSections.has("stepTwo") ? "Book Now" : s.stepTwo.package_button_name,
        package_details: removedSections.has("stepTwo") ? [{ title: "VIP Access" }] : s.stepTwo.package_details,
        package_image: packageImage,
        gallery: galleryFiles,
      });
      await sleep(300);

      // Step 2 — Dates / Tickets / Tables
      setApplyStep(2);
      if (!removedSections.has("stepThree")) {
        const rawDates = s.stepThree.dates || [];
        const sortedUniqueDates = (() => {
          const sorted = [...rawDates].sort(
            (a, b) =>
              new Date(a.event_date + "T00:00:00").getTime() -
              new Date(b.event_date + "T00:00:00").getTime()
          );
          const seen = new Set<string>();
          return sorted.filter((d) => {
            if (!d.event_date || seen.has(d.event_date)) return false;
            seen.add(d.event_date);
            return true;
          });
        })();
        const dates = sortedUniqueDates.map((d) => {
          const tickets =
            d.booking_type !== "tables"
              ? (d.tickets || []).map((t) => ({
                  title: t.title,
                  description: t.description,
                  total_capacity: parseInt(t.total_capacity) || 100,
                  price: parseInt(t.price) || 50,
                  sold_tickets: 0,
                }))
              : [];

          const tables =
            d.booking_type !== "tickets"
              ? (d.tables || []).map((t) => ({
                  min_persons: parseInt(t.min_persons) || 2,
                  max_persons: parseInt(t.max_persons) || 6,
                  price: parseInt(t.price) || 100,
                  total_tables: parseInt(t.total_tables) || 10,
                  sold_tables: 0,
                }))
              : [];

          return {
            event_date: d.event_date,
            booking_type: d.booking_type,
            tickets,
            tables,
            // Derived from actual array lengths so backend validation passes
            total_ticket_types: d.booking_type !== "tables" ? tickets.length : 0,
            total_table_types: d.booking_type !== "tickets" ? tables.length : 0,
            payment_type: (
              d.booking_type !== "tickets" ? d.payment_type || "full" : "full"
            ) as "full" | "deposit",
            is_deposit_enabled: d.is_deposit_enabled || false,
            deposit_type: (d.deposit_type || "amount") as "amount" | "percentage",
            deposit_value: d.deposit_value ? Number(d.deposit_value) : 0,
            deposit_due_date: d.deposit_due_date || "",
          };
        });

        await eventsService.storeStepThreeData({
          step: 3 as const,
          event_id: eventId,
          vendor_location_id: vendorLocationId,
          dates,
        });
      }
      await sleep(300);

      // Step 3 — Menu (with optional menu background image when catering is enabled)
      setApplyStep(3);
      const hasCatering = !removedSections.has("stepFour") && s.stepFour.catering_option === 1;
      const menuBgUrl = hasCatering
        ? (dummyImages as { menu_background?: string }).menu_background
        : null;
      const menuBgFile = menuBgUrl
        ? (await urlToImageFile(menuBgUrl, "menu-background")) ??
          (await createPlaceholderPackageImage(s.stepFour.menu_title || "Menu"))
        : null;
      await eventsService.storeStepFourData({
        step: 4 as const,
        event_id: eventId,
        catering_option: removedSections.has("stepFour") ? 0 : s.stepFour.catering_option,
        menu_title: hasCatering ? s.stepFour.menu_title : undefined,
        menu_description: hasCatering ? s.stepFour.menu_description : undefined,
        menus: hasCatering ? s.stepFour.menus : undefined,
        menu_background_image: menuBgFile ?? undefined,
      });
      await sleep(300);

      // Step 4 — Drinks / other packages (API always requires title, description, non-empty packages)
      setApplyStep(4);
      const drinksSectionRemoved = removedSections.has("stepFive");
      const mappedDrinkPackages = (s.stepFive.packages ?? [])
        .filter((p) => String(p.title ?? "").trim() !== "")
        .map((p) => ({
          title: p.title,
          description: p.description,
          price: p.price,
          available_quantity: p.available_quantity,
        }));
      const hasUsableDrinksContent =
        !drinksSectionRemoved &&
        String(s.stepFive.drink_title ?? "").trim() !== "" &&
        String(s.stepFive.drink_description ?? "").trim() !== "" &&
        mappedDrinkPackages.length > 0;

      const placeholderDrinkPackages = [
        {
          title: "Standard",
          description: "Standard package",
          price: 50,
          available_quantity: 100,
        },
      ];

      await eventsService.storeStepFiveData({
        step: 5 as const,
        event_id: eventId,
        drink_title: hasUsableDrinksContent
          ? s.stepFive.drink_title.trim()
          : "Drinks",
        drink_description: hasUsableDrinksContent
          ? s.stepFive.drink_description.trim()
          : "Drink packages",
        packages: hasUsableDrinksContent ? mappedDrinkPackages : placeholderDrinkPackages,
      });
      await sleep(300);

      // Step 5 — Location / pricing
      setApplyStep(5);
      if (!removedSections.has("stepSix")) {
        const stepSixFD = new FormData();
        stepSixFD.append("step", "6");
        stepSixFD.append("event_id", String(eventId));
        stepSixFD.append(
          "event_address",
          s.stepSix.event_address || eventInput.venueAddress || ""
        );
        stepSixFD.append("price_start_from", s.stepSix.price_start_from || "0");
        stepSixFD.append(
          "price_start_from_button_text",
          s.stepSix.price_start_from_button_text || "Book Now"
        );
        // Backend requires lat/long; AI only provides address — use UK center so validation passes; vendor can refine in event editor
        stepSixFD.append("lat", "51.5074");
        stepSixFD.append("long", "-0.1278");
        await eventsService.storeStepSixData(stepSixFD);
      }
      await sleep(300);

      // Step 6 — FAQs
      setApplyStep(6);
      if (!removedSections.has("stepSeven")) {
        await eventsService.storeStepSevenData({
          step: 7 as const,
          event_id: eventId,
          faqs: s.stepSeven.faqs,
        });
      }

      // Done
      setApplyStep(APPLY_STEPS.length);
      await sleep(400);
      setApplyDone(true);

      setTimeout(() => onComplete(eventId), 2500);
    } catch (err) {
      console.error("Error applying AI event content:", err);
      setIsApplying(false);
      setApplyStep(-1);
    }
  };

  // --- Applying overlay ---
  if (isApplying) {
    const totalSteps = APPLY_STEPS.length;
    const progressPct =
      applyStep < 0 ? 0 : Math.min(Math.round(((applyStep + 1) / totalSteps) * 100), 100);

    return (
      <div className="relative z-10 flex items-center justify-center min-h-screen w-full px-3 py-6 sm:px-4 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">
          <AnimatePresence mode="wait">
            {applyDone ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="flex flex-col items-center text-center gap-5"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
                >
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Event created! 🎉</h2>
                  <p className="text-sm text-slate-400 mt-2">Redirecting to your event editor…</p>
                </div>
                <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-green-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.2, ease: "linear" }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <div className="text-center mb-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4"
                    style={accent.loaderBox}
                  >
                    <Loader2 className="w-7 h-7" style={accent.text} />
                  </motion.div>
                  <h2 className="text-xl font-bold text-white">Building your event</h2>
                  <p className="text-slate-500 text-xs mt-1">Please don&apos;t close this page</p>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-500">Progress</span>
                    <span className="text-xs font-semibold" style={accent.text}>
                      {progressPct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "var(--color-primary, #3b82f6)" }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>

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
                          isActive ? "bg-white/[0.06] border border-white/10" : "bg-transparent"
                        }`}
                      >
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                          {isDone ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
                            >
                              <Check className="w-3 h-3 text-green-400" />
                            </motion.div>
                          ) : isActive ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Loader2 className="w-4 h-4" style={accent.text} />
                            </motion.div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-white/15" />
                          )}
                        </div>
                        <span className="text-sm mr-1">{step.icon}</span>
                        <span
                          className={`text-sm font-medium ${
                            isDone ? "text-slate-400" : isActive ? "text-white" : "text-slate-600"
                          }`}
                        >
                          {step.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // --- Review UI ---
  return (
    <div className="relative z-10 min-h-screen w-full py-6 px-3 sm:py-10 sm:px-4 md:px-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Review Your Event Content
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm px-1">
            Edit any section below — add, remove, or correct what the AI generated.
            Click <strong className="text-white">Create Event</strong> when ready.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          {SECTIONS.map((section) => {
            const isRemoved = removedSections.has(section.id);
            const isExpanded = expandedSections.has(section.id);

            return (
              <div
                key={section.id}
                className={`rounded-xl border transition-colors ${
                  isRemoved
                    ? "border-white/5 bg-white/[0.01] opacity-50"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => !isRemoved && toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-3 sm:px-4 text-left min-h-[48px] touch-manipulation"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{section.icon}</span>
                    <span
                      className={`text-sm font-medium truncate ${
                        isRemoved ? "text-slate-600 line-through" : "text-white"
                      }`}
                    >
                      {section.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRemoved ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreSection(section.id);
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                        title="Restore section"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        {section.id !== "stepOne" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSection(section.id);
                            }}
                            className="p-1 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                            title="Remove section"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </>
                    )}
                  </div>
                </button>

                {/* Section content */}
                <AnimatePresence>
                  {isExpanded && !isRemoved && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
                        {section.id === "stepOne" && (
                          <StepOneEditor
                            content={editedContent.stepOne}
                            onChange={(f, v) => updateField("stepOne", f, v)}
                          />
                        )}
                        {section.id === "stepTwo" && (
                          <StepTwoEditor
                            content={editedContent.stepTwo}
                            onChange={(f, v) => updateField("stepTwo", f, v)}
                          />
                        )}
                        {section.id === "stepThree" && (
                          <StepThreeEditor
                            content={editedContent.stepThree}
                            onChange={updateStepThree}
                          />
                        )}
                        {section.id === "stepFour" && (
                          <StepFourEditor
                            content={editedContent.stepFour}
                            onChange={(f, v) => updateField("stepFour", f, v)}
                          />
                        )}
                        {section.id === "stepFive" && (
                          <StepFiveEditor
                            content={editedContent.stepFive}
                            onChange={updateStepFive}
                          />
                        )}
                        {section.id === "stepSix" && (
                          <StepSixEditor
                            content={editedContent.stepSix}
                            onChange={(f, v) => updateField("stepSix", f, v)}
                          />
                        )}
                        {section.id === "stepSeven" && (
                          <StepSevenEditor
                            content={editedContent.stepSeven}
                            onChange={updateStepSeven}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-slate-400 hover:text-white hover:bg-white/5 min-h-[44px] touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              onClick={onRegenerate}
              className="text-slate-400 hover:text-white hover:bg-white/5 min-h-[44px] touch-manipulation"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
          </div>

          <Button
            onClick={applyToEvent}
            className="min-h-[44px] h-11 px-6 sm:px-8 rounded-xl text-white font-medium touch-manipulation w-full sm:w-auto"
            style={{ background: "var(--color-primary, #3b82f6)" }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Shared primitives
───────────────────────────────────────────────── */

function EditableField({
  label,
  value,
  onChange,
  maxLength,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      {editing ? (
        <div>
          {multiline ? (
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              maxLength={maxLength}
              rows={3}
              className="bg-white/5 border-white/10 text-white text-sm resize-none"
              onBlur={() => setEditing(false)}
              autoFocus
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              maxLength={maxLength}
              className="bg-white/5 border-white/10 text-white text-sm h-8"
              onBlur={() => setEditing(false)}
              autoFocus
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left group flex items-start gap-2"
        >
          <span className="text-sm text-slate-300 flex-1">
            {value || <span className="text-slate-600 italic">Empty</span>}
          </span>
          <Pencil className="w-3 h-3 text-slate-600 group-hover:text-slate-300 transition-colors mt-1 flex-shrink-0" />
        </button>
      )}
    </div>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-xs text-slate-500 hover:text-white border border-dashed border-white/10 hover:border-white/25 rounded-lg py-2 flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
    >
      <Plus className="w-3 h-3" />
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase text-slate-500 tracking-wide font-medium">
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────
   Step 1 — Event Details & Schedule
───────────────────────────────────────────────── */

function StepOneEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepOne"];
  onChange: (f: string, v: unknown) => void;
}) {
  const schedular = content.event_schedular;

  const updateScheduleItem = (idx: number, field: "title" | "time", value: string) => {
    const updated = schedular.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    onChange("event_schedular", updated);
  };

  const addScheduleItem = () => {
    onChange("event_schedular", [...schedular, { time: "", title: "" }]);
  };

  const removeScheduleItem = (idx: number) => {
    onChange(
      "event_schedular",
      schedular.filter((_, i) => i !== idx)
    );
  };

  return (
    <>
      <EditableField
        label="Event Name"
        value={content.event_name}
        onChange={(v) => onChange("event_name", v)}
        maxLength={40}
      />
      <EditableField
        label="Banner Heading"
        value={content.event_banner_heading}
        onChange={(v) => onChange("event_banner_heading", v)}
        maxLength={50}
      />
      <EditableField
        label="Banner Sub-heading"
        value={content.event_banner_sub_heading}
        onChange={(v) => onChange("event_banner_sub_heading", v)}
        maxLength={80}
      />
      <EditableField
        label="About Heading"
        value={content.about_event_heading}
        onChange={(v) => onChange("about_event_heading", v)}
        maxLength={50}
      />
      <EditableField
        label="About Description"
        value={content.about_event_description}
        onChange={(v) => onChange("about_event_description", v)}
        maxLength={340}
        multiline
      />
      <EditableField
        label="Schedule Title"
        value={content.event_schedular_title}
        onChange={(v) => onChange("event_schedular_title", v)}
        maxLength={40}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Schedule Items</SectionLabel>
        </div>
        <div className="space-y-1.5">
          {schedular.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={item.time}
                onChange={(e) => updateScheduleItem(i, "time", e.target.value)}
                placeholder="HH:mm"
                className={`${inputCls} w-16 font-mono`}
              />
              <Input
                value={item.title}
                onChange={(e) => updateScheduleItem(i, "title", e.target.value)}
                placeholder="Activity"
                className={`${inputCls} flex-1`}
              />
              {schedular.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeScheduleItem(i)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1.5">
          <AddRowButton label="Add schedule item" onClick={addScheduleItem} />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────
   Step 2 — Packages
───────────────────────────────────────────────── */

function StepTwoEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepTwo"];
  onChange: (f: string, v: unknown) => void;
}) {
  const details = content.package_details;

  const updateDetail = (idx: number, value: string) => {
    onChange(
      "package_details",
      details.map((d, i) => (i === idx ? { title: value } : d))
    );
  };

  const addDetail = () => {
    onChange("package_details", [...details, { title: "" }]);
  };

  const removeDetail = (idx: number) => {
    onChange(
      "package_details",
      details.filter((_, i) => i !== idx)
    );
  };

  return (
    <>
      <EditableField
        label="Package Title"
        value={content.package_title}
        onChange={(v) => onChange("package_title", v)}
        maxLength={40}
      />
      <EditableField
        label="Package Description"
        value={content.package_description}
        onChange={(v) => onChange("package_description", v)}
        maxLength={160}
        multiline
      />
      <EditableField
        label="Button Text"
        value={content.package_button_name}
        onChange={(v) => onChange("package_button_name", v)}
        maxLength={18}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Package Features</SectionLabel>
        </div>
        <div className="space-y-1.5">
          {details.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
              <Input
                value={d.title}
                onChange={(e) => updateDetail(i, e.target.value)}
                placeholder="Feature"
                className={`${inputCls} flex-1`}
              />
              {details.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDetail(i)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1.5">
          <AddRowButton label="Add feature" onClick={addDetail} />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────
   Step 3 — Dates, Tickets & Tables  (full CRUD)
───────────────────────────────────────────────── */

function StepThreeEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepThree"];
  onChange: (v: AIEventGeneratedContent["stepThree"]) => void;
}) {
  const { dates } = content;

  const setDates = (newDates: AIEventDate[]) => onChange({ ...content, dates: newDates });

  const addDate = () => {
    setDates([
      ...dates,
      {
        event_date: "",
        booking_type: "tickets",
        tickets: [{ title: "", description: "", total_capacity: "100", price: "50" }],
        tables: [],
      },
    ]);
  };

  const removeDate = (idx: number) => setDates(dates.filter((_, i) => i !== idx));

  const updateDateField = (idx: number, field: keyof AIEventDate, value: unknown) => {
    setDates(
      dates.map((d, i) => {
        if (i !== idx) return d;
        const updated = { ...d, [field]: value } as AIEventDate;
        // Seed default arrays when switching booking_type
        if (field === "booking_type") {
          const bt = value as AIEventDate["booking_type"];
          if (
            (bt === "tickets" || bt === "both") &&
            (!updated.tickets || updated.tickets.length === 0)
          ) {
            updated.tickets = [
              { title: "", description: "", total_capacity: "100", price: "50" },
            ];
          }
          if (
            (bt === "tables" || bt === "both") &&
            (!updated.tables || updated.tables.length === 0)
          ) {
            updated.tables = [
              { min_persons: "2", max_persons: "6", price: "100", total_tables: "10" },
            ];
          }
          if (bt === "tables" || bt === "both") {
            updated.payment_type = updated.payment_type ?? "full";
            updated.is_deposit_enabled = updated.is_deposit_enabled ?? false;
            updated.deposit_type = updated.deposit_type ?? "amount";
            updated.deposit_value = updated.deposit_value ?? "";
            updated.deposit_due_date = updated.deposit_due_date ?? "";
          }
        }
        return updated;
      })
    );
  };

  // Ticket helpers
  const addTicket = (dateIdx: number) =>
    setDates(
      dates.map((d, i) =>
        i === dateIdx
          ? {
              ...d,
              tickets: [
                ...(d.tickets || []),
                { title: "", description: "", total_capacity: "100", price: "50" },
              ],
            }
          : d
      )
    );

  const removeTicket = (dateIdx: number, ticketIdx: number) =>
    setDates(
      dates.map((d, i) =>
        i === dateIdx
          ? { ...d, tickets: (d.tickets || []).filter((_, j) => j !== ticketIdx) }
          : d
      )
    );

  const updateTicket = (
    dateIdx: number,
    ticketIdx: number,
    field: keyof AIEventTicket,
    value: string
  ) =>
    setDates(
      dates.map((d, i) =>
        i === dateIdx
          ? {
              ...d,
              tickets: (d.tickets || []).map((t, j) =>
                j === ticketIdx ? { ...t, [field]: value } : t
              ),
            }
          : d
      )
    );

  // Table helpers
  const addTable = (dateIdx: number) =>
    setDates(
      dates.map((d, i) =>
        i === dateIdx
          ? {
              ...d,
              tables: [
                ...(d.tables || []),
                { min_persons: "2", max_persons: "6", price: "100", total_tables: "10" },
              ],
            }
          : d
      )
    );

  const removeTable = (dateIdx: number, tableIdx: number) =>
    setDates(
      dates.map((d, i) =>
        i === dateIdx
          ? { ...d, tables: (d.tables || []).filter((_, j) => j !== tableIdx) }
          : d
      )
    );

  const updateTable = (
    dateIdx: number,
    tableIdx: number,
    field: keyof AIEventTable,
    value: string
  ) =>
    setDates(
      dates.map((d, i) =>
        i === dateIdx
          ? {
              ...d,
              tables: (d.tables || []).map((t, j) =>
                j === tableIdx ? { ...t, [field]: value } : t
              ),
            }
          : d
      )
    );

  return (
    <div className="space-y-3">
      {dates.map((date, dateIdx) => (
        <div
          key={dateIdx}
          className="border border-white/10 rounded-lg p-3 space-y-3 bg-white/[0.02]"
        >
          {/* Date header row */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date.event_date}
              onChange={(e) => updateDateField(dateIdx, "event_date", e.target.value)}
              className="bg-slate-900 border border-white/10 text-white text-xs rounded-md px-2 h-7 flex-1 min-w-0 outline-none focus:border-white/20"
            />
            <select
              value={date.booking_type}
              onChange={(e) =>
                updateDateField(
                  dateIdx,
                  "booking_type",
                  e.target.value as AIEventDate["booking_type"]
                )
              }
              className={selectCls}
            >
              <option value="tickets">Tickets</option>
              <option value="tables">Tables</option>
              <option value="both">Both</option>
            </select>
            {dates.length > 1 && (
              <button
                type="button"
                onClick={() => removeDate(dateIdx)}
                className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                title="Remove date"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tickets */}
          {(date.booking_type === "tickets" || date.booking_type === "both") && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <SectionLabel>Tickets</SectionLabel>
                <button
                  type="button"
                  onClick={() => addTicket(dateIdx)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add ticket
                </button>
              </div>
              <div className="space-y-2">
                {(date.tickets || []).map((ticket, ticketIdx) => (
                  <div
                    key={ticketIdx}
                    className="bg-white/[0.03] rounded-md p-2 space-y-1.5 border border-white/5"
                  >
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={ticket.title}
                        onChange={(e) => updateTicket(dateIdx, ticketIdx, "title", e.target.value)}
                        placeholder="Ticket title (max 25)"
                        maxLength={25}
                        className={`${inputCls} flex-1`}
                      />
                      {(date.tickets?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicket(dateIdx, ticketIdx)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      value={ticket.description}
                      onChange={(e) =>
                        updateTicket(dateIdx, ticketIdx, "description", e.target.value)
                      }
                      placeholder="Description (max 160)"
                      maxLength={160}
                      className={`${inputCls} w-full`}
                    />
                    <div className="flex gap-1.5">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-600 block mb-0.5">
                          Capacity
                        </label>
                        <Input
                          type="number"
                          value={ticket.total_capacity}
                          onChange={(e) =>
                            updateTicket(dateIdx, ticketIdx, "total_capacity", e.target.value)
                          }
                          placeholder="100"
                          min={1}
                          className={`${inputCls} w-full`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-600 block mb-0.5">
                          Price (£)
                        </label>
                        <Input
                          type="number"
                          value={ticket.price}
                          onChange={(e) =>
                            updateTicket(dateIdx, ticketIdx, "price", e.target.value)
                          }
                          placeholder="50"
                          min={1}
                          className={`${inputCls} w-full`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tables */}
          {(date.booking_type === "tables" || date.booking_type === "both") && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <SectionLabel>Tables</SectionLabel>
                <button
                  type="button"
                  onClick={() => addTable(dateIdx)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add table
                </button>
              </div>
              <div className="space-y-2">
                {(date.tables || []).map((table, tableIdx) => (
                  <div
                    key={tableIdx}
                    className="bg-white/[0.03] rounded-md p-2 space-y-1.5 border border-white/5"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-600 block mb-0.5">
                          Min guests
                        </label>
                        <Input
                          type="number"
                          value={table.min_persons}
                          onChange={(e) =>
                            updateTable(dateIdx, tableIdx, "min_persons", e.target.value)
                          }
                          placeholder="2"
                          min={1}
                          className={`${inputCls} w-full`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-600 block mb-0.5">
                          Max guests
                        </label>
                        <Input
                          type="number"
                          value={table.max_persons}
                          onChange={(e) =>
                            updateTable(dateIdx, tableIdx, "max_persons", e.target.value)
                          }
                          placeholder="6"
                          min={1}
                          className={`${inputCls} w-full`}
                        />
                      </div>
                      {(date.tables?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTable(dateIdx, tableIdx)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-0.5 self-end mb-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-600 block mb-0.5">
                          Price (£)
                        </label>
                        <Input
                          type="number"
                          value={table.price}
                          onChange={(e) =>
                            updateTable(dateIdx, tableIdx, "price", e.target.value)
                          }
                          placeholder="100"
                          min={0}
                          className={`${inputCls} w-full`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-600 block mb-0.5">
                          Total tables
                        </label>
                        <Input
                          type="number"
                          value={table.total_tables}
                          onChange={(e) =>
                            updateTable(dateIdx, tableIdx, "total_tables", e.target.value)
                          }
                          placeholder="10"
                          min={1}
                          className={`${inputCls} w-full`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment & Deposit (tables / both only) */}
          {(date.booking_type === "tables" || date.booking_type === "both") && (
            <div className="border border-white/10 rounded-lg p-3 space-y-3 bg-white/[0.02]">
              <SectionLabel>Payment & Deposit</SectionLabel>
              <p className="text-[10px] text-slate-500">
                Configure full payment or deposit for this date.
              </p>

              {/* Payment type */}
              <div>
                <label className="text-[10px] text-slate-500 block mb-1.5">Payment type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`payment-${dateIdx}`}
                      checked={(date.payment_type ?? "full") === "full"}
                      onChange={() => updateDateField(dateIdx, "payment_type", "full")}
                      className="accent-blue-500"
                    />
                    <span className="text-xs text-slate-300">Full payment</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`payment-${dateIdx}`}
                      checked={date.payment_type === "deposit"}
                      onChange={() => {
                        updateDateField(dateIdx, "payment_type", "deposit");
                        updateDateField(dateIdx, "is_deposit_enabled", true);
                      }}
                      className="accent-blue-500"
                    />
                    <span className="text-xs text-slate-300">Deposit</span>
                  </label>
                </div>
              </div>

              {date.payment_type === "deposit" && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  {/* Enable deposit toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-300 block">Enable deposit</span>
                      <span className="text-[10px] text-slate-500">
                        Allow customers to pay a deposit for this date
                      </span>
                    </div>
                    <Switch
                      checked={date.is_deposit_enabled ?? true}
                      onCheckedChange={(v) => updateDateField(dateIdx, "is_deposit_enabled", v)}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>

                  {date.is_deposit_enabled && (
                    <>
                      {/* Deposit type */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1.5">
                          Deposit type
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`deposit-type-${dateIdx}`}
                              checked={(date.deposit_type ?? "amount") === "amount"}
                              onChange={() => {
                                updateDateField(dateIdx, "deposit_type", "amount");
                                updateDateField(dateIdx, "deposit_value", "");
                              }}
                              className="accent-blue-500"
                            />
                            <span className="text-xs text-slate-300">Fixed amount</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`deposit-type-${dateIdx}`}
                              checked={date.deposit_type === "percentage"}
                              onChange={() => {
                                updateDateField(dateIdx, "deposit_type", "percentage");
                                updateDateField(dateIdx, "deposit_value", "");
                              }}
                              className="accent-blue-500"
                            />
                            <span className="text-xs text-slate-300">Percentage</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">
                            {(date.deposit_type ?? "amount") === "amount"
                              ? "Deposit amount/person (£)"
                              : "Deposit percentage (%)"}
                          </label>
                          <Input
                            type="number"
                            min={(date.deposit_type ?? "amount") === "percentage" ? 20 : 1}
                            max={date.deposit_type === "percentage" ? 80 : undefined}
                            value={date.deposit_value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "") {
                                updateDateField(dateIdx, "deposit_value", "");
                                return;
                              }
                              const num = Number(v);
                              if (date.deposit_type === "percentage") {
                                updateDateField(
                                  dateIdx,
                                  "deposit_value",
                                  String(Math.min(80, Math.max(20, isNaN(num) ? 20 : num)))
                                );
                              } else {
                                updateDateField(dateIdx, "deposit_value", v);
                              }
                            }}
                            placeholder={
                              (date.deposit_type ?? "amount") === "amount"
                                ? "e.g. 50"
                                : "20–80"
                            }
                            className={`${inputCls} w-full`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">
                            Deposit due date
                          </label>
                          <input
                            type="date"
                            value={date.deposit_due_date ?? ""}
                            onChange={(e) =>
                              updateDateField(dateIdx, "deposit_due_date", e.target.value)
                            }
                            min={date.event_date || new Date().toISOString().slice(0, 10)}
                            className="bg-slate-900 border border-white/10 text-white text-xs rounded-md px-2 h-7 w-full outline-none focus:border-white/20"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <AddRowButton label="Add another date" onClick={addDate} />
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Step 4 — Catering & Menu
───────────────────────────────────────────────── */

function StepFourEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepFour"];
  onChange: (f: string, v: unknown) => void;
}) {
  if (content.catering_option === 0 || content.menus.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic">
        No catering for this event. You can add it later from the manual editor.
      </p>
    );
  }
  return (
    <>
      <EditableField
        label="Menu Title"
        value={content.menu_title}
        onChange={(v) => onChange("menu_title", v)}
        maxLength={40}
      />
      <EditableField
        label="Menu Description"
        value={content.menu_description}
        onChange={(v) => onChange("menu_description", v)}
        maxLength={160}
        multiline
      />
      {content.menus.map((menu, i) => (
        <div key={i}>
          <span className="text-xs text-slate-500">{menu.name}</span>
          {menu.items.map((item, j) => (
            <div key={j} className="text-xs text-slate-400 ml-3 mt-0.5">
              • {item.title}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────
   Step 5 — Other Packages  (full CRUD)
───────────────────────────────────────────────── */

function StepFiveEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepFive"];
  onChange: (v: AIEventGeneratedContent["stepFive"]) => void;
}) {
  if (content.packages.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic">
        No other packages. You can add them later from the manual editor.
      </p>
    );
  }

  const updatePackageField = (
    idx: number,
    field: keyof AIEventGeneratedContent["stepFive"]["packages"][number],
    value: string | number
  ) => {
    onChange({
      ...content,
      packages: content.packages.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    });
  };

  const addPackage = () => {
    onChange({
      ...content,
      packages: [
        ...content.packages,
        { title: "", description: "", price: 0, available_quantity: 50 },
      ],
    });
  };

  const removePackage = (idx: number) => {
    onChange({
      ...content,
      packages: content.packages.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-3">
      <EditableField
        label="Section Title"
        value={content.drink_title}
        onChange={(v) => onChange({ ...content, drink_title: v })}
        maxLength={40}
      />
      <EditableField
        label="Section Description"
        value={content.drink_description}
        onChange={(v) => onChange({ ...content, drink_description: v })}
        maxLength={160}
        multiline
      />

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <SectionLabel>Packages</SectionLabel>
          <button
            type="button"
            onClick={addPackage}
            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add package
          </button>
        </div>
        <div className="space-y-2">
          {content.packages.map((pkg, i) => (
            <div
              key={i}
              className="bg-white/[0.03] rounded-md p-2 space-y-1.5 border border-white/5"
            >
              <div className="flex items-center gap-1.5">
                <Input
                  value={pkg.title}
                  onChange={(e) => updatePackageField(i, "title", e.target.value)}
                  placeholder="Package name"
                  className={`${inputCls} flex-1`}
                />
                {content.packages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(i)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input
                value={pkg.description}
                onChange={(e) => updatePackageField(i, "description", e.target.value)}
                placeholder="Description"
                className={`${inputCls} w-full`}
              />
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-600 block mb-0.5">Price (£)</label>
                  <Input
                    type="number"
                    value={pkg.price}
                    onChange={(e) => updatePackageField(i, "price", Number(e.target.value))}
                    placeholder="0"
                    min={0}
                    className={`${inputCls} w-full`}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-600 block mb-0.5">Quantity</label>
                  <Input
                    type="number"
                    value={pkg.available_quantity}
                    onChange={(e) =>
                      updatePackageField(i, "available_quantity", Number(e.target.value))
                    }
                    placeholder="50"
                    min={1}
                    className={`${inputCls} w-full`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Step 6 — Location & Pricing
───────────────────────────────────────────────── */

function StepSixEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepSix"];
  onChange: (f: string, v: unknown) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
          Event Address
        </label>
        <AddressAutocomplete
          value={content.event_address || ""}
          onChange={(address) => onChange("event_address", address)}
          onSelect={(_, address) => onChange("event_address", address)}
          placeholder="Type to search for a UK address or location..."
          className="w-full"
        />
      </div>
      <EditableField
        label="Price Starting From (£)"
        value={content.price_start_from}
        onChange={(v) => onChange("price_start_from", v)}
      />
      <EditableField
        label="Button Text"
        value={content.price_start_from_button_text}
        onChange={(v) => onChange("price_start_from_button_text", v)}
        maxLength={18}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────
   Step 7 — FAQs  (full CRUD)
───────────────────────────────────────────────── */

function StepSevenEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepSeven"];
  onChange: (v: AIEventGeneratedContent["stepSeven"]) => void;
}) {
  const { faqs } = content;

  const updateFaq = (idx: number, field: "question" | "answer", value: string) => {
    onChange({
      ...content,
      faqs: faqs.map((f, i) => (i === idx ? { ...f, [field]: value } : f)),
    });
  };

  const addFaq = () => {
    onChange({ ...content, faqs: [...faqs, { question: "", answer: "" }] });
  };

  const removeFaq = (idx: number) => {
    onChange({ ...content, faqs: faqs.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className="bg-white/[0.03] rounded-md p-2.5 space-y-1.5 border border-white/5"
        >
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] text-slate-500 mt-1.5 font-medium shrink-0">Q</span>
            <Input
              value={faq.question}
              onChange={(e) => updateFaq(i, "question", e.target.value)}
              placeholder="Question"
              className={`${inputCls} flex-1`}
            />
            {faqs.length > 1 && (
              <button
                type="button"
                onClick={() => removeFaq(i)}
                className="text-slate-600 hover:text-red-400 transition-colors p-0.5 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] text-slate-500 mt-1.5 font-medium shrink-0">A</span>
            <Textarea
              value={faq.answer}
              onChange={(e) => updateFaq(i, "answer", e.target.value)}
              placeholder="Answer"
              rows={2}
              className="bg-white/5 border-white/10 text-white text-xs resize-none flex-1 placeholder:text-slate-600"
            />
          </div>
        </div>
      ))}
      <AddRowButton label="Add FAQ" onClick={addFaq} />
    </div>
  );
}
