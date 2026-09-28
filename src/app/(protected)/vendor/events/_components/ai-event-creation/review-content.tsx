"use client";

import { BANNER_SUB_HEADING_MAX_CHARS } from "@/lib/hero-copy-limits";
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  ArrowLeft,
  Pencil,
  Trash2,
  RotateCcw,
  Sparkles,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AddressAutocomplete from "@/app/(protected)/vendor/events/_components/tab-event-form/tabs/_components/address-autocomplete";
import type {
  AIEventInput,
  AIEventGeneratedContent,
  AIEventDate,
  AIEventTicket,
  AIEventTable,
} from "@/app/api/ai/generate-event/route";
import {
  getDummyImages,
  getImagesByCategoryId,
} from "@/app/(on-boarding)/on-boarding/_lib/constants/dummy-images";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { STEP_NINE_MAX_FAQS } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import { applyAIGeneratedEventToBackend } from "../../_lib/apply-ai-generated-event";
import { fillAiEventGeneratedDefaults } from "../../_lib/fill-ai-event-content";
import {
  inferAiEventRemovedSections,
  parseAiEventVendorIntent,
} from "../../_lib/ai-event-vendor-intent";
import { getMinEventDateString } from "@/lib/min-event-date";
import { AIEventApplyOverlay } from "./ai-event-apply-overlay";
import { toast } from "sonner";
import type {
  EventImportAssets,
  EventImportSectionId,
} from "@/app/api/ai/import-event/types";
import EventImportAssetPicker from "../event-url-import/import-asset-picker";
import {
  BANNER_HEADING_MAX_WORDS,
  countWords,
  truncateToMaxWords,
} from "@/lib/word-count";
import {
  DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
  DRINK_SECTION_DESCRIPTION_MAX_CHARS,
  DRINK_SECTION_TITLE_MAX_CHARS,
  RICH_DESCRIPTION_MAX_CHARS,
  clampDrinkPackagePrice,
  clampDrinkPackageQuantity,
  DRINK_PACKAGE_PRICE_MAX,
  DRINK_PACKAGE_PRICE_MIN,
  DRINK_PACKAGE_QTY_MAX,
  DRINK_PACKAGE_QTY_MIN,
} from "@/lib/event-form-limits";

const SECTIONS = [
  { id: "stepOne", title: "Event details", icon: "📅" },
  { id: "stepTwo", title: "Packages and schedule", icon: "📦" },
  { id: "stepThree", title: "Dates and tickets", icon: "🎟️" },
  { id: "stepFour", title: "Catering and menu", icon: "🍽️" },
  { id: "stepFive", title: "Drinks & extras", icon: "🥂" },
  { id: "stepSeven", title: "FAQs", icon: "❓" },
] as const;

const inputCls = "bg-white/5 border-white/10 text-white text-xs h-7 placeholder:text-slate-600";
const selectCls =
  "bg-slate-900 border border-white/10 text-white text-xs rounded-md px-2 h-7 outline-none focus:border-white/20";

interface ReviewContentProps {
  content: AIEventGeneratedContent;
  eventInput: AIEventInput;
  categoryId: number;
  onComplete: (eventId: number, isRooms: boolean) => void;
  onRegenerate: () => void;
  onBack: () => void;
  sourceAssets?: EventImportAssets;
  onSourceAssetsChange?: (assets: EventImportAssets) => void;
  initialRemovedSections?: EventImportSectionId[];
  preserveMissingSections?: boolean;
  canApply?: boolean;
}

export default function AIEventReviewContent({
  content,
  eventInput,
  categoryId,
  onComplete,
  onRegenerate,
  onBack,
  sourceAssets,
  onSourceAssetsChange,
  initialRemovedSections,
  preserveMissingSections = false,
  canApply = true,
}: ReviewContentProps) {
  const [editedContent, setEditedContent] = useState<AIEventGeneratedContent>(
    () => fillAiEventGeneratedDefaults(content, eventInput),
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["stepOne"]));
  const [removedSections, setRemovedSections] = useState<Set<string>>(() =>
    new Set([
      ...inferAiEventRemovedSections(
        parseAiEventVendorIntent(
          eventInput.eventDescription,
          eventInput.room_names,
        ),
      ),
      ...(initialRemovedSections ?? []),
    ]),
  );
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
        [step]: { ...(prev[step] ?? {}), [field]: value },
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

      const { eventId, isRooms } = await applyAIGeneratedEventToBackend({
        content: editedContent,
        eventInput,
        categoryId,
        removedSections,
        sourceAssets,
        preserveMissingSections,
        onProgress: setApplyStep,
      });

      setApplyDone(true);
      setTimeout(() => onComplete(eventId, isRooms), 2500);
    } catch (err) {
      console.error("Error applying AI event content:", err);
      setIsApplying(false);
      setApplyStep(-1);
    }
  };

  // --- Applying overlay ---
  if (isApplying) {
    return <AIEventApplyOverlay applyStep={applyStep} applyDone={applyDone} />;
  }

  // --- Review UI ---
  return (
    <div className="relative z-10 min-h-screen w-full py-6 px-3 sm:py-10 sm:px-4 md:px-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Review your event content
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm px-1">
            Edit any section below — add, remove or correct what was generated.
            Select <strong className="text-white">Create event</strong> when you
            are ready.
          </p>
        </div>

        {sourceAssets && onSourceAssetsChange ? (
          <EventImportAssetPicker
            assets={sourceAssets}
            onChange={onSourceAssetsChange}
          />
        ) : null}

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
                            eventInput={eventInput}
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
            disabled={!canApply}
            className="min-h-[44px] h-11 px-6 sm:px-8 rounded-xl text-white font-medium touch-manipulation w-full sm:w-auto"
            style={{ background: "var(--color-primary, #3b82f6)" }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Create event
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
  maxWords,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  /** When set, input is clamped to this many words (same as vendor / onboarding banner rules). */
  maxWords?: number;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const applyLimits = (raw: string) =>
    maxWords != null
      ? truncateToMaxWords(raw, maxWords)
      : maxLength != null && raw.length > maxLength
        ? raw.slice(0, maxLength)
        : raw;

  const charCap = maxWords != null ? undefined : maxLength;

  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      {editing ? (
        <div>
          {multiline ? (
            <Textarea
              value={value}
              onChange={(e) => onChange(applyLimits(e.target.value))}
              maxLength={charCap}
              rows={3}
              className="bg-white/5 border-white/10 text-white text-sm resize-none"
              onBlur={() => setEditing(false)}
              autoFocus
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onChange(applyLimits(e.target.value))}
              maxLength={charCap}
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
            {value || <span className="text-slate-600 italic">No content</span>}
          </span>
          <Pencil className="w-3 h-3 text-slate-600 group-hover:text-slate-300 transition-colors mt-1 flex-shrink-0" />
        </button>
      )}
      {maxWords != null ? (
        <span className="text-[10px] text-slate-500 mt-0.5 block">
          {countWords(value)}/{maxWords} words
        </span>
      ) : null}
    </div>
  );
}

function AddRowButton({
  label,
  onClick,
  disabled,
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-full text-xs text-slate-500 hover:text-white border border-dashed border-white/10 hover:border-white/25 rounded-lg py-2 flex items-center justify-center gap-1.5 transition-colors touch-manipulation disabled:pointer-events-none disabled:opacity-40"
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
  eventInput,
}: {
  content: AIEventGeneratedContent["stepOne"];
  onChange: (f: string, v: unknown) => void;
  eventInput: AIEventInput;
}) {
  return (
    <>
      <EditableField
        label="Event name"
        value={content.event_name}
        onChange={(v) => onChange("event_name", v)}
        maxLength={40}
      />
      <EditableField
        label="Banner heading"
        value={content.event_banner_heading}
        onChange={(v) => onChange("event_banner_heading", v)}
        maxWords={BANNER_HEADING_MAX_WORDS}
      />
      <EditableField
        label="Banner subheading"
        value={content.event_banner_sub_heading}
        onChange={(v) => onChange("event_banner_sub_heading", v)}
        maxLength={BANNER_SUB_HEADING_MAX_CHARS}
      />
      <EditableField
        label="About heading"
        value={content.about_event_heading}
        onChange={(v) => onChange("about_event_heading", v)}
        maxLength={50}
      />
      <EditableField
        label="About subheading"
        value={content.about_event_sub_heading}
        onChange={(v) => onChange("about_event_sub_heading", v)}
        maxLength={80}
      />
      <EditableField
        label="About description"
        value={content.about_event_description}
        onChange={(v) => onChange("about_event_description", v)}
        maxLength={340}
        multiline
      />
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
          Event address
        </label>
        <AddressAutocomplete
          value={content.event_address || ""}
          onChange={(address) => onChange("event_address", address)}
          onSelect={(_, address) => onChange("event_address", address)}
          biasCity={eventInput.venueCity || eventInput.venueName || null}
          biasLatitude={eventInput.venueLatitude ?? null}
          biasLongitude={eventInput.venueLongitude ?? null}
          placeholder="Type to search for a UK address or location…"
          className="w-full"
        />
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
  const schedular = content.event_schedular ?? [];

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

  const updateScheduleItem = (
    idx: number,
    field: "title" | "time",
    value: string,
  ) => {
    const updated = schedular.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    onChange("event_schedular", updated);
  };

  const addScheduleItem = () => {
    onChange("event_schedular", [...schedular, { time: "", title: "" }]);
  };

  const removeScheduleItem = (idx: number) => {
    onChange(
      "event_schedular",
      schedular.filter((_, i) => i !== idx),
    );
  };

  return (
    <>
      <EditableField
        label="Package title"
        value={content.package_title}
        onChange={(v) => onChange("package_title", v)}
        maxLength={40}
      />
      <EditableField
        label="Package description"
        value={content.package_description}
        onChange={(v) => onChange("package_description", v)}
        maxLength={160}
        multiline
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Package features</SectionLabel>
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

      <EditableField
        label="Schedule title"
        value={content.event_schedular_title}
        onChange={(v) => onChange("event_schedular_title", v)}
        maxLength={40}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Schedule items</SectionLabel>
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
   Step 3 — Dates, Tickets & Tables  (full CRUD)
───────────────────────────────────────────────── */

function StepThreeEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepThree"];
  onChange: (v: AIEventGeneratedContent["stepThree"]) => void;
}) {
  const currencySymbol = useCurrencySymbol();
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
              min={getMinEventDateString()}
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
                          Price ({currencySymbol})
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
                          Price ({currencySymbol})
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
              <SectionLabel>Payment and deposit</SectionLabel>
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
                              ? `Deposit amount per person (${currencySymbol})`
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
                            Balance due date
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
        label="Menu title"
        value={content.menu_title}
        onChange={(v) => onChange("menu_title", v)}
        maxLength={40}
      />
      <EditableField
        label="Menu description"
        value={content.menu_description}
        onChange={(v) => onChange("menu_description", v)}
        maxLength={160}
        multiline
      />
      {content.menus.map((menu, i) => (
        <div key={i}>
          <span className="text-xs text-slate-500">{menu.name}</span>
          {(menu.items ?? []).map((item, j) => (
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
   Step 5 — Drinks & extras (full CRUD)
───────────────────────────────────────────────── */

function StepFiveEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepFive"];
  onChange: (v: AIEventGeneratedContent["stepFive"]) => void;
}) {
  const currencySymbol = useCurrencySymbol();
  if (content.drinks_option === 0 || content.packages.length === 0) {
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
        label="Section title"
        value={content.drink_title}
        onChange={(v) => onChange({ ...content, drink_title: v })}
        maxLength={DRINK_SECTION_TITLE_MAX_CHARS}
      />
      <EditableField
        label="Section description"
        value={content.drink_description}
        onChange={(v) => onChange({ ...content, drink_description: v })}
        maxLength={DRINK_SECTION_DESCRIPTION_MAX_CHARS}
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
                  onChange={(e) =>
                    updatePackageField(i, "title", e.target.value)
                  }
                  placeholder="Package name"
                  className={`${inputCls} flex-1`}
                  maxLength={DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS}
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
                onChange={(e) =>
                  updatePackageField(i, "description", e.target.value)
                }
                placeholder="Description"
                className={`${inputCls} w-full`}
                maxLength={RICH_DESCRIPTION_MAX_CHARS}
              />
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-600 block mb-0.5">
                    Price ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    value={pkg.price}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        updatePackageField(i, "price", 0);
                        return;
                      }
                      const n = Number.parseFloat(v);
                      if (!Number.isFinite(n)) return;
                      updatePackageField(i, "price", clampDrinkPackagePrice(n));
                    }}
                    placeholder="0"
                    min={DRINK_PACKAGE_PRICE_MIN}
                    max={DRINK_PACKAGE_PRICE_MAX}
                    className={`${inputCls} w-full`}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-600 block mb-0.5">Quantity</label>
                  <Input
                    type="number"
                    value={pkg.available_quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        updatePackageField(
                          i,
                          "available_quantity",
                          DRINK_PACKAGE_QTY_MIN
                        );
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isFinite(n)) return;
                      updatePackageField(
                        i,
                        "available_quantity",
                        clampDrinkPackageQuantity(n)
                      );
                    }}
                    placeholder="50"
                    min={DRINK_PACKAGE_QTY_MIN}
                    max={DRINK_PACKAGE_QTY_MAX}
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
   Step 7 — FAQs  (full CRUD)
───────────────────────────────────────────────── */

function StepSevenEditor({
  content,
  onChange,
}: {
  content: AIEventGeneratedContent["stepSeven"];
  onChange: (v: AIEventGeneratedContent["stepSeven"]) => void;
}) {
  const faqs = content?.faqs ?? [];

  const updateFaq = (idx: number, field: "question" | "answer", value: string) => {
    onChange({
      ...content,
      faqs: faqs.map((f, i) => (i === idx ? { ...f, [field]: value } : f)),
    });
  };

  const addFaq = () => {
    if (faqs.length >= STEP_NINE_MAX_FAQS) {
      toast.error(`You can add a maximum of ${STEP_NINE_MAX_FAQS} FAQs`);
      return;
    }
    onChange({ ...content, faqs: [...faqs, { question: "", answer: "" }] });
  };

  const removeFaq = (idx: number) => {
    onChange({ ...content, faqs: faqs.filter((_, i) => i !== idx) });
  };

  const atFaqCap = faqs.length >= STEP_NINE_MAX_FAQS;

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
              maxLength={160}
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
              maxLength={500}
              className="bg-white/5 border-white/10 text-white text-xs resize-none flex-1 placeholder:text-slate-600"
            />
          </div>
        </div>
      ))}
      <AddRowButton
        label="Add FAQ"
        onClick={addFaq}
        disabled={atFaqCap}
        title={
          atFaqCap
            ? `Maximum ${STEP_NINE_MAX_FAQS} FAQs per event`
            : undefined
        }
      />
      {atFaqCap && (
        <p className="text-[10px] text-slate-500 text-center">
          Maximum {STEP_NINE_MAX_FAQS} FAQs per event.
        </p>
      )}
    </div>
  );
}
