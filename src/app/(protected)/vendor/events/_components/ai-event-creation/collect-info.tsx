"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  PenTool,
  Mic,
  MicOff,
  Square,
} from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
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

const collectInfoSchema = z.object({
  eventName: z.string().min(2, "Event name must be at least 2 characters").max(40, "Event name max 40 characters"),
  eventType: z.string().min(1, "Please select an event type"),
  eventCategoryId: z.string().min(1, "Please select a category"),
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

const PRICE_OPTIONS = [
  { value: "budget", label: "Budget (£10 – £50)" },
  { value: "mid", label: "Mid-range (£50 – £150)" },
  { value: "premium", label: "Premium (£150 – £500)" },
  { value: "luxury", label: "Luxury (£500+)" },
];

const accent = {
  text: { color: "var(--color-primary, #3b82f6)" } as React.CSSProperties,
  gradient: {
    background: "linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } as React.CSSProperties,
};

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
      eventDescription: initialData?.eventDescription || "",
      guestCount: initialData?.guestCount || "",
      priceRange: initialData?.priceRange || "",
    },
    mode: "onChange",
  });

  const {
    voiceState,
    interimText,
    toggle: toggleVoice,
    isSupported: voiceSupported,
  } = useVoiceInput((text: string) => {
    form.setValue("eventDescription", text, { shouldValidate: true });
  });
  const isListening = voiceState === "listening";

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

  const handleFormSubmit = (data: CollectInfoForm) => {
    const payload: AIEventInput = {
      eventName: data.eventName,
      eventType: data.eventType,
      eventDescription: data.eventDescription,
      guestCount: data.guestCount,
      priceRange: data.priceRange,
      venueName: venueInfo?.name,
      venueCity: venueInfo?.city,
      venueAddress: venueInfo?.address,
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
        <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
              {/* Event Name */}
              <FormField
                control={form.control}
                name="eventName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-slate-300">
                      Event Name <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Summer Gala 2026"
                        maxLength={40}
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="eventCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-slate-300">
                      Category <span className="text-red-400">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={categoriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
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

              {/* Event Type */}
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-slate-300">
                      Event Type <span className="text-red-400">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
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

              {/* Guest Count + Price Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="guestCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-slate-300">
                        Guest Count
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                            <SelectValue placeholder="Select" />
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
                    <FormItem>
                      <FormLabel className="text-sm text-slate-300">
                        Price Range
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRICE_OPTIONS.map((opt) => (
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

              {/* Additional Details with voice input */}
              <FormField
                control={form.control}
                name="eventDescription"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <FormLabel className="text-sm text-slate-300">
                        Additional Details{" "}
                        <span className="text-slate-500 font-normal">(optional)</span>
                      </FormLabel>
                      {voiceSupported ? (
                        <button
                          type="button"
                          onClick={toggleVoice}
                          title={isListening ? "Stop recording" : "Speak your requirements"}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            isListening
                              ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                              : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                          }`}
                        >
                          {isListening ? (
                            <>
                              <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20 pointer-events-none" />
                              <Square className="w-3 h-3 fill-red-400" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3 h-3" />
                              <span>Speak</span>
                            </>
                          )}
                        </button>
                      ) : voiceState === "unsupported" ? (
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <MicOff className="w-3 h-3" />
                          Voice not supported
                        </span>
                      ) : null}
                    </div>
                    {isListening && (
                      <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex gap-0.5 items-end h-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="w-1 rounded-full bg-red-400 animate-pulse"
                              style={{
                                height: `${[60, 100, 75, 90][i - 1]}%`,
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: "0.8s",
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-red-400 font-medium">Listening…</span>
                        {interimText && (
                          <span className="text-xs text-slate-500 italic truncate max-w-[180px]">
                            {interimText}
                          </span>
                        )}
                      </div>
                    )}
                    {voiceState === "error" && (
                      <p className="text-xs text-amber-400 mb-2">
                        Microphone access denied or not available. Allow access in browser settings.
                      </p>
                    )}
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={
                          isListening
                            ? "Listening… speak your requirements…"
                            : "Describe your event — any specific requirements for tickets, tables, pricing, menu, or other packages that the AI should follow…"
                        }
                        maxLength={800}
                        rows={4}
                        className={`bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none ${
                          isListening ? "border-red-500/30 ring-1 ring-red-500/20" : ""
                        }`}
                      />
                    </FormControl>
                    <div className="flex justify-between mt-1">
                      {voiceSupported && !isListening && (
                        <span className="text-[10px] text-slate-600 truncate max-w-[50%] sm:max-w-none">Works best in Chrome or Edge</span>
                      )}
                      <span className="text-xs text-slate-600 ml-auto">
                        {field.value?.length || 0}/800
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={onSwitchToManual}
                  className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors py-2.5 sm:order-2 sm:py-0"
                >
                  <PenTool className="w-3.5 h-3.5 flex-shrink-0" />
                  Switch to manual setup
                </button>
                <Button
                  type="submit"
                  disabled={isLoading || categoriesLoading}
                  className="flex-1 min-h-[44px] h-11 rounded-xl text-white font-medium touch-manipulation w-full sm:w-auto"
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
