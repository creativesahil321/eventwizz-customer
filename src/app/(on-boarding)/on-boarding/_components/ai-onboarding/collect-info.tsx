"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader } from "@googlemaps/js-api-loader";
import {
  Sparkles,
  Building2,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  ChevronRight,
  Globe,
  Search,
  X,
  Info,
  Mic,
  MicOff,
  Square,
} from "lucide-react";
import { env } from "@/env";
import type { AIOnboardingInput } from "@/app/api/ai/generate-onboarding/route";
import { useEventCategories } from "@/services/vendor/events/query";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useCurrencySymbol } from "@/hooks/use-currency-format";

const themeAccent = {
  badge: {
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)`,
  } as React.CSSProperties,
  text: { color: `var(--color-primary, #3b82f6)` } as React.CSSProperties,
  button: {
    background: `linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
  } as React.CSSProperties,
  selectedCard: {
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 40%, transparent)`,
  } as React.CSSProperties,
};

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors";

const collectInfoSchema = z
  .object({
    has_multiple_locations: z.boolean(),
    venueName: z.string(),
    selectedPlaceId: z.string().optional(),
    venueType: z.string().min(1, "Please select an event category"),
    city: z.string().min(1, "City is required"),
    address: z.string().min(1, "Address is required"),
    contactNumber: z
      .string()
      .min(1, "Contact number is required")
      .max(20, "Max 20 characters")
      .regex(/^[\d\s\-+()]+$/, "Invalid phone format"),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    eventType: z.string().optional(),
    guestCount: z.string().optional(),
    priceRange: z.string().optional(),
    description: z.string().max(800, "Max 800 characters").optional(),
  })
  .superRefine((data, ctx) => {
    const multi = data.has_multiple_locations === true;
    const name = data.venueName?.trim() ?? "";
    if (multi) {
      if (!name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Brand name is required",
          path: ["venueName"],
        });
      } else if (name.length > 120) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Brand name must be at most 120 characters",
          path: ["venueName"],
        });
      }
      return;
    }
    if (!name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Venue name is required",
        path: ["venueName"],
      });
      return;
    }
    if (name.length >= 2 && !data.selectedPlaceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a venue from the Google suggestions",
        path: ["venueName"],
      });
    }
  });

type CollectInfoForm = z.infer<typeof collectInfoSchema>;

const INITIAL_CATEGORY_VISIBLE = 8; // 2 rows × 4 columns

/** Icons for static backend categories (match by name, case-insensitive). */
const CATEGORY_ICONS: Record<string, string> = {
  "christmas events": "🎄",
  "new year parties": "🎆",
  "halloween events": "🎃",
  "valentine's day specials": "💝",
  "easter events": "🐣",
  "bottomless brunch": "🥂",
  "lipstick powder & paint": "💄",
  "live music & gigs": "🎵",
  "dj nights & club events": "🎧",
  "comedy shows": "🎤",
  "drag shows & brunches": "👠",
  "themed parties (90s, 00s, ibiza, etc.)": "🪩",
  "themed parties": "🪩",
  "food & drink festivals": "🍔",
  "street food markets": "🥡",
  "pride events": "🌈",
  "afrobeats / bashment nights": "🎶",
  "day raves / outdoor parties": "☀️",
  "open mic & spoken word": "🎙️",
  "networking & business events": "🤝",
  "workshops & masterclasses": "📚",
  diwali: "🪔",
  eid: "🌙",
};

function getCategoryIcon(categoryName: string): string {
  const key = categoryName.toLowerCase().trim();
  return CATEGORY_ICONS[key] ?? "📌";
}

interface AICollectInfoProps {
  onSubmit: (data: AIOnboardingInput) => void;
  onSwitchToManual: () => void;
  isLoading: boolean;
  initialData: AIOnboardingInput | null;
}

type Suggestion = { description: string; place_id: string };

export default function AICollectInfo({
  onSubmit,
  onSwitchToManual,
  isLoading,
  initialData,
}: AICollectInfoProps) {
  const currencySymbol = useCurrencySymbol();
  const [locationGateDone, setLocationGateDone] = useState(
    typeof initialData?.has_multiple_locations === "boolean",
  );

  const form = useForm<CollectInfoForm>({
    resolver: zodResolver(collectInfoSchema),
    defaultValues: {
      has_multiple_locations:
        initialData?.has_multiple_locations ?? false,
      venueName: initialData?.venueName || "",
      selectedPlaceId: "",
      venueType:
        initialData?.event_category_id != null
          ? String(initialData.event_category_id)
          : initialData?.venueType || "",
      city: initialData?.city || "",
      address: initialData?.address || "",
      contactNumber: initialData?.contactNumber || "",
      email: initialData?.email || "",
      eventType: initialData?.eventType || "",
      guestCount: initialData?.guestCount || "",
      priceRange: initialData?.priceRange || "",
      description: initialData?.description || "",
    },
    mode: "onChange",
  });

  const selectedVenueType = form.watch("venueType");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { data: categoriesResponse, isLoading: isCategoriesLoading } =
    useEventCategories();
  const eventCategories = React.useMemo(
    () => categoriesResponse?.data ?? [],
    [categoriesResponse?.data],
  );
  const firstPageCategories = eventCategories.slice(
    0,
    INITIAL_CATEGORY_VISIBLE,
  );
  const restCategories = eventCategories.slice(INITIAL_CATEGORY_VISIBLE);
  const hasMoreCategories = restCategories.length > 0;

  // When categories load, sync venueType from name to id if needed (e.g. after "Back" with old data)
  useEffect(() => {
    if (eventCategories.length === 0 || !selectedVenueType) return;
    const isNumericId = /^\d+$/.test(selectedVenueType);
    if (
      isNumericId &&
      eventCategories.some((c) => String(c.id) === selectedVenueType)
    )
      return;
    const byName = eventCategories.find(
      (c) => c.name.toLowerCase() === selectedVenueType.toLowerCase(),
    );
    if (byName)
      form.setValue("venueType", String(byName.id), { shouldValidate: true });
  }, [eventCategories, selectedVenueType, form]);

  // --- Google Places Autocomplete ---
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPlaceSelected, setIsPlaceSelected] = useState(
    !!initialData?.venueName &&
      initialData?.has_multiple_locations !== true,
  );
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(
    null,
  );
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      libraries: ["places"],
    });
    loader.load().then(() => {
      if (window.google?.maps?.places) {
        autocompleteRef.current =
          new window.google.maps.places.AutocompleteService();
      }
    });
  }, []);

  const handleVenueSearch = useCallback(
    (query: string) => {
      if (isPlaceSelected) return;
      setSearchQuery(query);
      if (!query) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!autocompleteRef.current) {
          setIsSearching(false);
          return;
        }
        autocompleteRef.current.getPlacePredictions(
          {
            input: query,
            types: ["establishment"],
            componentRestrictions: { country: ["gb"] },
          },
          (predictions, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              setSuggestions(
                predictions.map((p) => ({
                  description: p.description,
                  place_id: p.place_id,
                })),
              );
            } else {
              setSuggestions([]);
            }
            setIsSearching(false);
          },
        );
      }, 300);
    },
    [isPlaceSelected],
  );

  const handlePlaceSelect = useCallback(
    (suggestion: Suggestion) => {
      setSuggestions([]);
      setSearchQuery("");
      setIsPlaceSelected(true);

      // Set selectedPlaceId and venue name immediately so validation passes
      // even before getDetails callback runs (avoids "Please select from Google" error)
      form.setValue("selectedPlaceId", suggestion.place_id, {
        shouldValidate: true,
      });
      form.setValue("venueName", suggestion.description || "", {
        shouldValidate: true,
      });

      if (!window.google?.maps?.places?.PlacesService) return;

      const service = new window.google.maps.places.PlacesService(
        document.createElement("div"),
      );
      service.getDetails(
        {
          placeId: suggestion.place_id,
          fields: [
            "name",
            "formatted_address",
            "formatted_phone_number",
            "international_phone_number",
            "website",
            "url",
            "business_status",
            "address_components",
          ],
        },
        (place, status) => {
          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !place
          )
            return;

          form.setValue(
            "venueName",
            place.name ?? suggestion.description ?? "",
            {
              shouldValidate: true,
            },
          );
          form.setValue(
            "contactNumber",
            place.international_phone_number ??
              place.formatted_phone_number ??
              "",
            { shouldValidate: true },
          );
          form.setValue("address", place.formatted_address ?? "", {
            shouldValidate: true,
          });

          if (place.address_components) {
            const cityComp = place.address_components.find(
              (c) =>
                c.types.includes("locality") ||
                c.types.includes("postal_town") ||
                c.types.includes("administrative_area_level_1"),
            );
            if (cityComp) {
              form.setValue("city", cityComp.long_name, {
                shouldValidate: true,
              });
            }
          }
        },
      );
    },
    [form],
  );

  const handleClearPlace = () => {
    form.setValue("venueName", "");
    form.setValue("selectedPlaceId", "");
    form.setValue("address", "");
    form.setValue("city", "");
    form.setValue("contactNumber", "");
    setSearchQuery("");
    setSuggestions([]);
    setIsPlaceSelected(false);
  };

  const handleFormSubmit = (data: CollectInfoForm) => {
    const { selectedPlaceId: _, ...rest } = data;
    const categoryId = data.venueType ? Number(data.venueType) : undefined;
    const category = eventCategories.find((c) => c.id === categoryId);
    const payload: AIOnboardingInput = {
      ...rest,
      venueType: category?.name ?? data.venueType,
      event_category_id: categoryId,
      has_multiple_locations: data.has_multiple_locations,
    };
    onSubmit(payload);
  };

  const isBrandMode = form.watch("has_multiple_locations") === true;

  const pickMultipleLocations = (value: boolean) => {
    form.setValue("has_multiple_locations", value, { shouldValidate: true });
    if (value) {
      form.setValue("selectedPlaceId", "", { shouldValidate: true });
      setIsPlaceSelected(false);
      setSearchQuery("");
      setSuggestions([]);
    }
    setLocationGateDone(true);
  };

  // ─── Voice input for description ────────────────────────────────────────
  const {
    voiceState,
    interimText,
    toggle: toggleVoice,
    isSupported: voiceSupported,
  } = useVoiceInput((text: string) => {
    form.setValue("description", text, { shouldValidate: true });
  });
  const isListening = voiceState === "listening";

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-sm mb-5"
            style={themeAccent.badge}
          >
            <Sparkles className="w-3.5 h-3.5" style={themeAccent.text} />
            <span
              className="text-xs font-medium tracking-wide uppercase"
              style={themeAccent.text}
            >
              AI-Powered Setup
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Tell us about your business
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {locationGateDone
              ? isBrandMode
                ? "Enter your brand name (any name is fine) and your business details below. Our AI will generate your website."
                : "Search for your venue on Google (UK only) and select it from the suggestions to autofill details. Our AI will then generate your entire website."
              : "First, let us know if you operate more than one location so we can tailor labels and data for your setup."}
          </p>
        </div>

        {!locationGateDone ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 space-y-6">
            <h2 className="text-lg font-semibold text-white text-center">
              Do you have multiple locations?
            </h2>
            <p className="text-slate-400 text-sm text-center max-w-md mx-auto">
              Choose Yes if you run several venues under one brand. We’ll use
              brand-oriented labels and the correct fields for your account.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => pickMultipleLocations(true)}
                className="px-6 py-3 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-50"
                style={themeAccent.button}
              >
                Yes, multiple locations
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => pickMultipleLocations(false)}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                No, single location
              </button>
            </div>
          </div>
        ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8">
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-6"
          >
            {/* Brand name (free text) or venue via Google Places */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Building2 className="w-4 h-4" style={themeAccent.text} />
                {isBrandMode ? "Brand name" : "Venue Name"}{" "}
                <span className="text-red-400">*</span>
              </label>
              {isBrandMode ? (
                <>
                  <input
                    {...form.register("venueName")}
                    maxLength={120}
                    placeholder="e.g. Acme Events Co."
                    className={INPUT_CLASS}
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Type your trading or brand name — it does not need to match
                    a Google listing.
                  </p>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Search className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      value={
                        isPlaceSelected ? form.watch("venueName") : searchQuery
                      }
                      onChange={(e) => {
                        if (isPlaceSelected) return;
                        const value = e.target.value;
                        handleVenueSearch(value);
                        form.setValue("venueName", value, {
                          shouldValidate: true,
                        });
                        form.setValue("selectedPlaceId", "", {
                          shouldValidate: true,
                        });
                      }}
                      readOnly={isPlaceSelected}
                      placeholder="Search for your venue on Google..."
                      className={`${INPUT_CLASS} pl-10 pr-10 ${
                        isPlaceSelected
                          ? "bg-green-500/10 border-green-500/20"
                          : ""
                      }`}
                    />
                    {isSearching && !isPlaceSelected && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                      </div>
                    )}
                    {isPlaceSelected && (
                      <button
                        type="button"
                        onClick={handleClearPlace}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {suggestions.length > 0 && !isPlaceSelected && searchQuery && (
                      <ul className="absolute z-50 bg-slate-800 border border-white/10 rounded-xl w-full mt-1.5 max-h-60 overflow-auto shadow-2xl">
                        {suggestions.map((sug, i) => (
                          <li
                            key={i}
                            onClick={() => handlePlaceSelect(sug)}
                            className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                          >
                            <div className="flex items-start gap-2.5">
                              <MapPin
                                className="w-4 h-4 mt-0.5 flex-shrink-0"
                                style={themeAccent.text}
                              />
                              <span className="text-sm text-slate-300">
                                {sug.description}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {searchQuery &&
                      suggestions.length === 0 &&
                      !isSearching &&
                      !isPlaceSelected && (
                        <div className="absolute z-50 bg-slate-800 border border-white/10 rounded-xl w-full mt-1.5 p-3.5 shadow-2xl">
                          <p className="text-sm text-slate-500 text-center">
                            No venues found. Try a different search, or switch
                            to Manual to enter details manually.
                          </p>
                        </div>
                      )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Only verified venues from Google suggestions can be used —
                    same as manual mode. Select one from the dropdown.
                  </p>
                </>
              )}
              {form.formState.errors.venueName && (
                <p className="text-red-400 text-xs mt-1.5">
                  {form.formState.errors.venueName.message}
                </p>
              )}
            </div>

            {/* Event Category: 2×4 initially, "More" to expand (same list as manual step 3) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                <Globe className="w-4 h-4" style={themeAccent.text} />
                Event Category <span className="text-red-400">*</span>
              </label>
              {isCategoriesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-lg bg-white/5 border border-white/10 animate-pulse"
                    />
                  ))}
                </div>
              ) : eventCategories.length > 0 ? (
                <div className="space-y-2">
                  {/* First 2 rows × 4 columns (2 cols on mobile) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {firstPageCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          form.setValue("venueType", String(cat.id), {
                            shouldValidate: true,
                          })
                        }
                        className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg border text-[11px] font-medium transition-all duration-200 min-h-[52px] ${
                          selectedVenueType === String(cat.id)
                            ? ""
                            : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300"
                        }`}
                        style={
                          selectedVenueType === String(cat.id)
                            ? {
                                ...themeAccent.selectedCard,
                                color: `var(--color-primary, #93c5fd)`,
                              }
                            : undefined
                        }
                      >
                        <span className="text-base leading-none">
                          {getCategoryIcon(cat.name)}
                        </span>
                        <span className="text-center leading-tight line-clamp-2">
                          {cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                  {hasMoreCategories && (
                    <button
                      type="button"
                      onClick={() => setShowAllCategories((v) => !v)}
                      className="w-full py-2 rounded-lg border border-dashed border-white/20 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-300 hover:border-white/30 transition-colors"
                    >
                      {showAllCategories
                        ? "Show less"
                        : `More categories (${restCategories.length} more)`}
                    </button>
                  )}
                  {showAllCategories && hasMoreCategories && (
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {restCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              form.setValue("venueType", String(cat.id), {
                                shouldValidate: true,
                              })
                            }
                            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border text-[11px] font-medium transition-all duration-200 min-h-[48px] ${
                              selectedVenueType === String(cat.id)
                                ? ""
                                : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300"
                            }`}
                            style={
                              selectedVenueType === String(cat.id)
                                ? {
                                    ...themeAccent.selectedCard,
                                    color: `var(--color-primary, #93c5fd)`,
                                  }
                                : undefined
                            }
                          >
                            <span className="text-base leading-none">
                              {getCategoryIcon(cat.name)}
                            </span>
                            <span className="text-center leading-tight line-clamp-2">
                              {cat.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No categories available. Please try again or switch to Manual
                  setup.
                </p>
              )}
              {form.formState.errors.venueType && (
                <p className="text-red-400 text-xs mt-1.5">
                  {form.formState.errors.venueType.message}
                </p>
              )}
            </div>

            {/* Two column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Mail className="w-4 h-4" style={themeAccent.text} />
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  {...form.register("email")}
                  type="email"
                  placeholder="venue@example.com"
                  className={INPUT_CLASS}
                />
                {form.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1.5">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Phone className="w-4 h-4" style={themeAccent.text} />
                  Contact Number <span className="text-red-400">*</span>
                </label>
                <input
                  {...form.register("contactNumber")}
                  type="tel"
                  placeholder="+44 123 456 7890"
                  maxLength={20}
                  className={INPUT_CLASS}
                />
                {form.formState.errors.contactNumber && (
                  <p className="text-red-400 text-xs mt-1.5">
                    {form.formState.errors.contactNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <MapPin className="w-4 h-4" style={themeAccent.text} />
                  Address <span className="text-red-400">*</span>
                </label>
                <input
                  {...form.register("address")}
                  placeholder={
                    isBrandMode
                      ? "Head office or main site address"
                      : "Full venue address"
                  }
                  className={INPUT_CLASS}
                />
                {form.formState.errors.address && (
                  <p className="text-red-400 text-xs mt-1.5">
                    {form.formState.errors.address.message}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <MapPin className="w-4 h-4" style={themeAccent.text} />
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  {...form.register("city")}
                  placeholder={
                    isBrandMode
                      ? "e.g. London (main trading city)"
                      : "e.g. London"
                  }
                  className={INPUT_CLASS}
                />
                {form.formState.errors.city && (
                  <p className="text-red-400 text-xs mt-1.5">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>
            </div>

            {/* Enhanced Description with Voice */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Info className="w-4 h-4" style={themeAccent.text} />
                  Describe your event setup{" "}
                  <span className="text-slate-500 font-normal">
                    (optional but helps AI)
                  </span>
                </label>

                {/* Voice button */}
                {voiceSupported ? (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    title={
                      isListening ? "Stop recording" : "Speak your requirements"
                    }
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border ${
                      isListening
                        ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                        : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    {isListening ? (
                      <>
                        {/* Pulsing ring */}
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

              <p className="text-slate-500 text-xs mb-2.5 leading-relaxed">
                The more detail you give, the better AI generates your site.
                Include ticket types, table configurations, pricing, food
                preferences, guest count, etc.
                {voiceSupported && (
                  <span className="text-slate-600">
                    {" "}
                    — or tap <strong className="text-slate-500">
                      Speak
                    </strong>{" "}
                    and just talk.
                  </span>
                )}
              </p>

              {/* Listening indicator */}
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
                  <span className="text-xs text-red-400 font-medium">
                    Listening… speak clearly
                  </span>
                  {interimText && (
                    <span className="text-xs text-slate-500 italic truncate max-w-[180px]">
                      {interimText}
                    </span>
                  )}
                </div>
              )}

              {voiceState === "error" && (
                <p className="text-xs text-amber-400 mb-2">
                  ⚠ Microphone access denied or not available. Please allow
                  access in your browser settings.
                </p>
              )}

              <textarea
                {...form.register("description")}
                placeholder={
                  isListening
                    ? "Listening… speak your requirements…"
                    : `Example: "We host premium wedding events for 200+ guests. We offer 2 ticket types: General (${currencySymbol}50) and VIP (${currencySymbol}120, includes dinner). We have 50 tables…"`
                }
                rows={5}
                maxLength={800}
                className={`${INPUT_CLASS} resize-none transition-all duration-300 ${
                  isListening ? "border-red-500/30 ring-1 ring-red-500/20" : ""
                }`}
              />
              <div className="flex items-center justify-between mt-1">
                {voiceSupported && !isListening && (
                  <p className="text-[10px] text-slate-600">
                    🎤 Works best in Chrome or Edge
                  </p>
                )}
                <p className="text-slate-600 text-xs ml-auto">
                  {form.watch("description")?.length || 0}/800
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onSwitchToManual}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Switch to Manual
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 rounded-full text-white text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                style={themeAccent.button}
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? "Generating..." : "Generate My Site"}
                {!isLoading && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}
