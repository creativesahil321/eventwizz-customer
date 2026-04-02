"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIEventInput } from "@/app/api/ai/generate-event/route";
import { eventsService } from "@/services/vendor/events/events.service";
import type { EventCategory } from "@/services/vendor/events/type";
import { ApiResponse } from "@/services/core/api-client";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import AddressAutocomplete from "@/app/(protected)/vendor/events/_components/tab-event-form/tabs/_components/address-autocomplete";

const collectInfoSchema = z.object({
  eventName: z.string().min(2, "Event name must be at least 2 characters").max(40, "Event name max 40 characters"),
  eventType: z.string().min(1, "Please select an event type"),
  eventCategoryId: z.string().min(1, "Please select a category"),
  venueAddress: z
    .string()
    .trim()
    .min(5, "Enter the full address or location where this event takes place"),
  eventDescription: z.string().max(800, "Description max 800 characters").optional(),
  guestCount: z.string().optional(),
  priceRange: z.string().optional(),
});

type CollectInfoForm = z.infer<typeof collectInfoSchema>;

interface AICollectInfoProps {
  onSubmit: (input: AIEventInput, categoryId: number) => void;
  onSwitchToManual: () => void;
  isLoading: boolean;
  initialData?: AIEventInput | null;
  venueInfo?: { name?: string; city?: string; address?: string };
}

const GUEST_OPTIONS = [
  { value: "10-50", label: "10 – 50 guests" },
  { value: "50-100", label: "50 – 100 guests" },
  { value: "100-250", label: "100 – 250 guests" },
  { value: "250-500", label: "250 – 500 guests" },
  { value: "500+", label: "500+ guests" },
];

const accent = {
  text: { color: "var(--color-primary, #3b82f6)" } as React.CSSProperties,
  gradient: {
    background: "linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } as React.CSSProperties,
};

const labelClass = "text-sm font-medium text-slate-300";
const formItemClass = "space-y-2";
const selectTriggerClass =
  "bg-white/5 border-white/10 text-white h-10 w-full min-h-10";

export default function AIEventCollectInfo({
  onSubmit,
  onSwitchToManual,
  isLoading,
  initialData,
  venueInfo,
}: AICollectInfoProps) {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const form = useForm<CollectInfoForm>({
    resolver: zodResolver(collectInfoSchema),
    defaultValues: {
      eventName: initialData?.eventName || "",
      eventType: initialData?.eventType || "",
      eventCategoryId: "",
      venueAddress:
        initialData?.venueAddress?.trim() ||
        venueInfo?.address?.trim() ||
        "",
      eventDescription: initialData?.eventDescription || "",
      guestCount: initialData?.guestCount || "",
      priceRange: initialData?.priceRange || "",
    },
    mode: "onChange",
  });

  const currencySymbol = useCurrencySymbol();
  const priceOptions = useMemo(
    () =>
      [
        `Under ${currencySymbol}50 per person`,
        `${currencySymbol}50 – ${currencySymbol}150 per person`,
        `${currencySymbol}150 – ${currencySymbol}500 per person`,
        `${currencySymbol}500+ per person`,
        "Flexible / not sure",
      ].map((text) => ({ value: text, label: text })),
    [currencySymbol],
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await eventsService.getEventCategories();
        const cats = Array.isArray(response)
          ? response
          : (response as ApiResponse<EventCategory[]>).data || [];
        setCategories(cats);
        if (cats.length > 0) {
          const current = form.getValues("eventCategoryId");
          if (!current || current === "") {
            form.setValue("eventCategoryId", String(cats[0].id), {
              shouldValidate: true,
              shouldDirty: true,
            });
          }
        }
      } catch {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fromVenue = venueInfo?.address?.trim();
    if (!fromVenue) return;
    const current = form.getValues("venueAddress")?.trim() ?? "";
    if (current.length < 5) {
      form.setValue("venueAddress", fromVenue, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [venueInfo?.address, form]);

  const handleFormSubmit = (data: CollectInfoForm) => {
    const addr = data.venueAddress.trim();
    const payload: AIEventInput = {
      eventName: data.eventName,
      eventType: data.eventType,
      eventDescription: data.eventDescription,
      guestCount: data.guestCount,
      priceRange: data.priceRange,
      venueName: venueInfo?.name,
      venueCity: venueInfo?.city,
      venueAddress: addr,
    };
    onSubmit(payload, Number(data.eventCategoryId));
  };

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen w-full px-3 py-6 sm:px-4 sm:py-8 md:py-12 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center mx-auto mb-3 sm:mb-4"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 30%, transparent)",
            }}
          >
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" style={accent.text} />
          </motion.div>

          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Create Event with <span style={accent.gradient}>AI</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto px-1">
            Tell us about your event and our AI will generate professional
            content for all sections — descriptions, packages, menus, FAQs and more.
          </p>
        </div>

        {/* Form */}
        <div
          className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-7"
          style={{ colorScheme: "dark" }}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              {/* Event Name */}
              <FormField
                control={form.control}
                name="eventName"
                render={({ field }) => (
                  <FormItem className={formItemClass}>
                    <FormLabel className={labelClass}>
                      Event Name <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Summer Gala 2026"
                        maxLength={40}
                        className="h-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500 shadow-[inset_0_0_0_1000px_rgb(255_255_255/0.05)] [color-scheme:dark] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(255_255_255)] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(39_39_42/0.95)] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category + Event Type — aligned row on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <FormField
                  control={form.control}
                  name="eventCategoryId"
                  render={({ field }) => (
                    <FormItem className={formItemClass}>
                      <FormLabel className={labelClass}>
                        Category <span className="text-red-400">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={categoriesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder={categoriesLoading ? "Loading…" : "Select category"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem className={formItemClass}>
                      <FormLabel className={labelClass}>
                        Event Type <span className="text-red-400">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Wedding", "Corporate", "Party", "Conference", "Concert", "Restaurant", "Sports", "Other"].map((t) => (
                            <SelectItem key={t} value={t.toLowerCase()}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Google Places — same component as manual event “more info” */}
              <FormField
                control={form.control}
                name="venueAddress"
                render={({ field }) => (
                  <FormItem className={formItemClass}>
                    <FormLabel className={labelClass}>
                      Event address <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value ?? ""}
                        onChange={(v) => field.onChange(v)}
                        onSelect={(_placeId, formatted) => {
                          field.onChange(formatted);
                          void form.trigger("venueAddress");
                        }}
                        onBlur={field.onBlur}
                        placeholder="Start typing — search UK addresses & places"
                        variant="dark"
                      />
                    </FormControl>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Choose a suggestion so we save a full formatted address. You can fine-tune on the map in the event editor.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Guest Count + Price Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 sm:items-start">
                <FormField
                  control={form.control}
                  name="guestCount"
                  render={({ field }) => (
                    <FormItem className={formItemClass}>
                      <FormLabel className={labelClass}>Guest Count</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GUEST_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceRange"
                  render={({ field }) => (
                    <FormItem className={formItemClass}>
                      <FormLabel className={labelClass}>Price Range</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priceOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Details */}
              <FormField
                control={form.control}
                name="eventDescription"
                render={({ field }) => (
                  <FormItem className={formItemClass}>
                    <FormLabel className={labelClass}>
                      Additional Details{" "}
                      <span className="text-slate-500 font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe your event — any specific requirements for tickets, tables, pricing, menu, or other packages that the AI should follow…"
                        maxLength={800}
                        rows={4}
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
                      />
                    </FormControl>
                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-slate-600">
                        {field.value?.length || 0}/800
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Buttons */}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <button
                  type="button"
                  onClick={onSwitchToManual}
                  className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors py-2 min-h-[44px] sm:min-h-0 sm:justify-start sm:order-2"
                >
                  <PenTool className="w-3.5 h-3.5 flex-shrink-0" />
                  Switch to manual setup
                </button>
                <Button
                  type="submit"
                  disabled={isLoading || categoriesLoading}
                  className="min-h-[44px] h-11 rounded-xl text-white font-medium touch-manipulation w-full sm:w-auto sm:min-w-[200px] sm:order-1"
                  style={{ background: "var(--color-primary, #3b82f6)" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      Generate Event
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
}
