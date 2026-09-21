"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useForm, useFieldArray, type Resolver, type UseFormReturn } from "react-hook-form";
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
} from "lucide-react";
import { NameAvailabilityInputCue } from "@/components/name-availability-input-cue";
import { useSession } from "next-auth/react";
import { env } from "@/env";
import type { AIOnboardingInput } from "@/app/api/ai/generate-onboarding/route";
import { useEventCategories } from "@/services/vendor/events/query";
import { useBrandNameAvailability } from "@/hooks/use-brand-name-availability";
import AddressAutocomplete, {
  cityFromFormattedAddress,
  cityFromGooglePlace,
} from "../steps/step-7/address-autocomplete";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { geocodeLocation } from "../steps/step-11/_lib/actions";
import { roomNamePlaceholder } from "@/lib/room-name-examples";
import {
  hasValidLocationCoordinates,
  parseOptionalCoordinate,
} from "@/lib/to-location-coords-payload";
import { isCoarseUkFallbackPin } from "@/lib/sync-event-location-map";

const EventLocationMap = dynamic(
  () => import("../steps/step-7/event-location-map"),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-32 w-full rounded-lg border border-white/10" />
    ),
  },
);
import { AIChoicePair, AIFlowProgress } from "./ai-choice-pair";
import {
  useAiCollectDraft,
  type AiCollectFormValues,
} from "../../_lib/hooks/use-ai-collect-draft";

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
  "w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors";

const collectInfoSchema = z
  .object({
    has_multiple_locations: z.boolean(),
    has_room_system: z.boolean().optional(),
    /** Object rows: RHF `useFieldArray` excludes `string[]`; default `[]` in `useForm` only. */
    room_names: z.array(z.object({ name: z.string() })),
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
    description: z.string().max(2000, "Max 2000 characters").optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (typeof data.has_room_system !== "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please choose whether you have a room system",
        path: ["has_room_system"],
      });
    }
    if (data.has_room_system === true) {
      const names = data.room_names
        .map((r) => r.name.trim())
        .filter((n) => n.length > 0);
      if (names.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please add at least 2 room names",
          path: ["room_names"],
        });
      }
      if (names.length > 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You can add up to 3 room names only",
          path: ["room_names"],
        });
      }
    }

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
    } else {
      if (!name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Venue name is required",
          path: ["venueName"],
        });
      } else if (name.length >= 2 && !data.selectedPlaceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select a venue from the Google suggestions",
          path: ["venueName"],
        });
      }
    }

    if (
      data.address?.trim() &&
      !hasValidLocationCoordinates(data.latitude, data.longitude)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Drop a pin on the map to confirm your venue location (drag the marker if needed).",
        path: ["latitude"],
      });
    }
  });

type CollectInfoForm = z.infer<typeof collectInfoSchema>;

function CollectInfoDraftSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 space-y-5">
      <Skeleton className="h-2 w-full rounded-full bg-white/10" />
      <Skeleton className="h-4 w-28 bg-white/10" />
      <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
      <Skeleton className="h-4 w-40 bg-white/10" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 rounded-xl bg-white/10" />
        <Skeleton className="h-12 rounded-xl bg-white/10" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
      <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg bg-white/10" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl bg-white/10" />
    </div>
  );
}

const INITIAL_CATEGORY_VISIBLE = 8; // 2 rows × 4 columns

function normalizeCategoryKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9&/]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Icons for static backend categories (match by normalised name). */
const CATEGORY_ICONS: Record<string, string> = {
  "christmas events": "🎄",
  "new year parties": "🎆",
  "halloween events": "🎃",
  "valentines day specials": "💝",
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
  const key = normalizeCategoryKey(categoryName);
  if (CATEGORY_ICONS[key]) return CATEGORY_ICONS[key];
  if (key.includes("valentine")) return "💝";
  return "✨";
}

interface AICollectInfoProps {
  onSubmit: (data: AIOnboardingInput) => void;
  onSwitchToManual: () => void;
  onBackToMode: () => void;
  isLoading: boolean;
  initialData: AIOnboardingInput | null;
  /** GET persistence: only `null` means “never answered” → show location gate. */
  persistedHasMultipleLocations: boolean | null;
  /** GET persistence: when known, room-system question is pre-answered and locked. */
  persistedHasRoomSystem: boolean | null;
  /** Existing room names from persistence (stepFour rooms keys). */
  persistedRoomNames: string[];
}

function resolveKnownHasMultipleLocations(
  initial: AIOnboardingInput | null,
  persisted: boolean | null,
): boolean | null {
  if (typeof initial?.has_multiple_locations === "boolean") {
    return initial.has_multiple_locations;
  }
  if (persisted === true || persisted === false) return persisted;
  return null;
}

function resolveKnownHasRoomSystem(
  initial: AIOnboardingInput | null,
  persisted: boolean | null,
): boolean | null {
  if (typeof initial?.has_room_system === "boolean") {
    return initial.has_room_system;
  }
  if (persisted === true || persisted === false) return persisted;
  return null;
}

type Suggestion = { description: string; place_id: string };

export default function AICollectInfo({
  onSubmit,
  onSwitchToManual,
  onBackToMode,
  isLoading,
  initialData,
  persistedHasMultipleLocations,
  persistedHasRoomSystem,
  persistedRoomNames,
}: AICollectInfoProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [editingAddress, setEditingAddress] = useState(false);
  const knownMultiOnMount = resolveKnownHasMultipleLocations(
    initialData,
    persistedHasMultipleLocations,
  );
  const [locationGateDone, setLocationGateDone] = useState(
    knownMultiOnMount === true || knownMultiOnMount === false,
  );
  const knownRoomSystemOnMount = resolveKnownHasRoomSystem(
    initialData,
    persistedHasRoomSystem,
  );
  const roomSystemLocked =
    knownRoomSystemOnMount === true || knownRoomSystemOnMount === false;

  const form = useForm<CollectInfoForm>({
    resolver: zodResolver(collectInfoSchema) as Resolver<CollectInfoForm>,
    defaultValues: {
      has_multiple_locations:
        knownMultiOnMount ?? false,
      has_room_system:
        typeof initialData?.has_room_system === "boolean"
          ? initialData.has_room_system
          : knownRoomSystemOnMount ?? undefined,
      room_names:
        initialData?.room_names && initialData.room_names.length > 0
          ? initialData.room_names.map((n) => ({ name: n }))
          : persistedRoomNames.length > 0
            ? persistedRoomNames.slice(0, 3).map((n) => ({ name: n }))
          : [],
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
      latitude: parseOptionalCoordinate(initialData?.latitude),
      longitude: parseOptionalCoordinate(initialData?.longitude),
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const roomNames = useFieldArray({
    control: form.control,
    name: "room_names",
  });

  useEffect(() => {
    const known = resolveKnownHasMultipleLocations(
      initialData,
      persistedHasMultipleLocations,
    );
    if (known !== true && known !== false) return;
    setLocationGateDone(true);
    form.setValue("has_multiple_locations", known, { shouldValidate: true });
  }, [initialData, persistedHasMultipleLocations, form]);

  useEffect(() => {
    const knownRoom = resolveKnownHasRoomSystem(initialData, persistedHasRoomSystem);
    if (knownRoom !== true && knownRoom !== false) return;

    form.setValue("has_room_system", knownRoom, { shouldValidate: true });
    if (knownRoom) {
      const incoming =
        initialData?.room_names && initialData.room_names.length > 0
          ? initialData.room_names
          : persistedRoomNames;
      const seeded = incoming
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .slice(0, 3)
        .map((name) => ({ name }));
      if (seeded.length > 0) {
        form.setValue("room_names", seeded, { shouldValidate: true });
      }
    } else {
      form.setValue("room_names", [], { shouldValidate: true });
    }
  }, [initialData, persistedHasRoomSystem, persistedRoomNames, form]);

  useEffect(() => {
    const accountEmail = session?.user?.email?.trim();
    if (!accountEmail) return;
    if (form.getValues("email")?.trim()) return;
    form.setValue("email", accountEmail, { shouldValidate: true });
  }, [session?.user?.email, form]);

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
  const { draftReady, applyRoomToggle, persistDraft } = useAiCollectDraft({
    form: form as unknown as UseFormReturn<AiCollectFormValues>,
    userKey: session?.user?.email?.trim() ?? "",
    sessionStatus,
    initialData,
    persistedHasMultipleLocations,
    persistedHasRoomSystem,
    persistedRoomNames,
    locationGateDone,
    setLocationGateDone,
    isPlaceSelected,
    setIsPlaceSelected,
  });

  useEffect(() => {
    if (!draftReady) return;
    const enabled = form.getValues("has_room_system") === true;
    const rooms = form.getValues("room_names") ?? [];
    if (!enabled) {
      if (roomNames.fields.length > 0) roomNames.replace([]);
      return;
    }
    const next =
      rooms.length >= 2
        ? rooms.slice(0, 3)
        : [...rooms, { name: "" }, { name: "" }].slice(0, 2);
    roomNames.replace(next);
    // Sync field array once after sessionStorage restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draftReady is the hydrate gate
  }, [draftReady]);
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
            "geometry",
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

          const city = cityFromGooglePlace({
            address_components: place.address_components,
            formatted_address: place.formatted_address,
          });
          if (city) {
            form.setValue("city", city, {
              shouldValidate: true,
              shouldDirty: true,
            });
          }

          const loc = place.geometry?.location;
          const nextLat = loc ? loc.lat() : null;
          const nextLng = loc ? loc.lng() : null;
          if (
            nextLat != null &&
            nextLng != null &&
            Number.isFinite(nextLat) &&
            Number.isFinite(nextLng) &&
            !isCoarseUkFallbackPin(nextLat, nextLng)
          ) {
            form.setValue("latitude", nextLat, {
              shouldValidate: true,
              shouldDirty: true,
            });
            form.setValue("longitude", nextLng, {
              shouldValidate: true,
              shouldDirty: true,
            });
          } else {
            form.setValue("latitude", undefined, { shouldValidate: true });
            form.setValue("longitude", undefined, { shouldValidate: true });
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
    form.setValue("latitude", undefined, { shouldValidate: false });
    form.setValue("longitude", undefined, { shouldValidate: false });
    setSearchQuery("");
    setSuggestions([]);
    setIsPlaceSelected(false);
    setEditingAddress(false);
  };

  const venueNameValue = form.watch("venueName");
  const isBrandMode = form.watch("has_multiple_locations") === true;
  const nameForAvailability =
    isBrandMode || isPlaceSelected ? (venueNameValue ?? "") : "";
  const {
    status: brandNameCheckStatus,
    message: brandNameCheckMessage,
    isChecking: brandNameChecking,
    isTaken: brandNameTaken,
  } = useBrandNameAvailability(nameForAvailability, {
    takenFallback: isBrandMode
      ? "This brand name is already in use"
      : "This venue name is already in use",
  });

  const handleFormSubmit = async (data: CollectInfoForm) => {
    if (brandNameTaken || brandNameChecking) return;

    let latitude = parseOptionalCoordinate(data.latitude);
    let longitude = parseOptionalCoordinate(data.longitude);

    if (
      data.address?.trim() &&
      !hasValidLocationCoordinates(latitude, longitude)
    ) {
      const resolved = await geocodeLocation(data.address, data.city);
      if (resolved) {
        latitude = resolved.latitude;
        longitude = resolved.longitude;
        form.setValue("latitude", latitude, { shouldValidate: true });
        form.setValue("longitude", longitude, { shouldValidate: true });
      }
    }

    if (
      data.address?.trim() &&
      !hasValidLocationCoordinates(latitude, longitude)
    ) {
      form.setError("latitude", {
        type: "manual",
        message:
          "Drop a pin on the map to confirm your venue location (drag the marker if needed).",
      });
      return;
    }

    const { selectedPlaceId: _, ...rest } = data;
    const categoryId = data.venueType ? Number(data.venueType) : undefined;
    const category = eventCategories.find((c) => c.id === categoryId);
    const normalizedRoomNames = data.room_names
      .map((r) => r.name.trim())
      .filter((n) => n.length > 0)
      .slice(0, 3);
    const hasValidRoomSystem =
      data.has_room_system === true && normalizedRoomNames.length >= 2;
    const payload: AIOnboardingInput = {
      ...rest,
      latitude,
      longitude,
      venueType: category?.name ?? data.venueType,
      event_category_id: categoryId,
      has_multiple_locations: data.has_multiple_locations,
      has_room_system: hasValidRoomSystem,
      room_names: hasValidRoomSystem ? normalizedRoomNames : [],
    };
    persistDraft(true);
    onSubmit(payload);
  };

  const hasRoomSystem = form.watch("has_room_system");
  const roomNameFields = form.watch("room_names");
  const addressValue = form.watch("address");
  const cityValue = form.watch("city");
  const latitudeValue = form.watch("latitude");
  const longitudeValue = form.watch("longitude");
  const showConfirmedAddress =
    !isBrandMode &&
    isPlaceSelected &&
    Boolean(addressValue?.trim()) &&
    !editingAddress;

  useEffect(() => {
    if (cityValue?.trim() || !addressValue?.trim()) return;
    const parsed = cityFromFormattedAddress(addressValue);
    if (parsed) {
      form.setValue("city", parsed, { shouldValidate: true });
    }
  }, [addressValue, cityValue, form]);

  const descriptionPlaceholder = useMemo(() => {
    if (hasRoomSystem !== true) {
      return `Type it like a WhatsApp note — typos are fine. e.g. "xmas 25th + 27th Dec, 25th pound 50, 27th 90, menu included, deposit 20% 30 days before"`;
    }

    const namedRooms = (roomNameFields ?? [])
      .map((entry) => String(entry?.name ?? "").trim())
      .filter((name) => name.length > 0);

    if (namedRooms.length >= 2) {
      const [first, second] = namedRooms;
      return `e.g. "${first} and ${second} same details, xmas 25th + 27th Dec, 25th pound 50, drinks on ${first} vodka 23, deposit 20% 30 days before"`;
    }

    if (namedRooms.length === 1) {
      const first = namedRooms[0];
      return `e.g. "${first}: xmas 25th + 27th Dec, 25th pound 50, menu included, deposit 20% 30 days before"`;
    }

    return `e.g. "three rooms same details, xmas 25th + 27th Dec, 25th pound 50, drinks on 2 rooms, deposit 20% 30 days before"`;
  }, [hasRoomSystem, roomNameFields]);

  const setRoomSystem = applyRoomToggle;

  const pickMultipleLocations = (value: boolean) => {
    const current = form.getValues("has_multiple_locations");
    const hasVenue = Boolean(form.getValues("venueName")?.trim());
    if (hasVenue && current === value) {
      setLocationGateDone(true);
      persistDraft(true);
      return;
    }
    form.clearErrors("venueName");
    form.setValue("has_multiple_locations", value, { shouldValidate: false });
    form.setValue("venueName", "", { shouldValidate: false });
    form.setValue("selectedPlaceId", "", { shouldValidate: false });
    form.setValue("address", "", { shouldValidate: false });
    form.setValue("city", "", { shouldValidate: false });
    form.setValue("contactNumber", "", { shouldValidate: false });
    form.setValue("latitude", undefined, { shouldValidate: false });
    form.setValue("longitude", undefined, { shouldValidate: false });
    setIsPlaceSelected(false);
    setSearchQuery("");
    setSuggestions([]);
    setEditingAddress(false);
    setLocationGateDone(true);
    persistDraft(true);
  };

  const locationChoiceLocked =
    knownMultiOnMount === true || knownMultiOnMount === false;

  const goBackFromCollect = () => {
    if (locationChoiceLocked) {
      onBackToMode();
      return;
    }
    setLocationGateDone(false);
    persistDraft(true);
  };

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen py-6 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-5">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-sm mb-3"
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
          <h1 className="text-2xl font-bold text-white mb-1.5">
            Tell us about your business
          </h1>
          <div className="text-slate-400 text-sm max-w-md mx-auto">
            {!draftReady ? (
              <Skeleton className="mx-auto h-4 w-64 max-w-full bg-white/10" />
            ) : locationGateDone
              ? isBrandMode
                ? "Enter your brand and contact details. We’ll draft your site, then you review every section before publishing."
                : "Pick your UK venue from Google so we can fill the basics. We’ll draft your site, then you review every section before publishing."
              : "First, tell us if you run more than one venue under the same brand."}
          </div>
        </div>

        {!draftReady ? (
          <CollectInfoDraftSkeleton />
        ) : !locationGateDone ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 space-y-6">
            <AIFlowProgress
              current={1}
              total={3}
              label="Locations"
            />
            <h2 className="text-lg font-semibold text-white text-center">
              Do you have multiple locations?
            </h2>
            <p className="text-slate-400 text-sm text-center max-w-md mx-auto">
              Choose Yes if several venues share one brand. We’ll ask for a
              brand name instead of a single venue listing.
            </p>
            <AIChoicePair
              disabled={isLoading}
              value={undefined}
              onChange={pickMultipleLocations}
              options={[
                { value: true, label: "Yes, multiple locations" },
                { value: false, label: "No, single location" },
              ]}
            />
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={onBackToMode}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to setup options
              </button>
            </div>
          </div>
        ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-6">
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            <AIFlowProgress
              current={2}
              total={3}
              label="Venue & first event"
            />
            <button
              type="button"
              onClick={goBackFromCollect}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors -mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {locationChoiceLocked
                ? "Back to setup options"
                : "Back to location question"}
            </button>

            {/* Brand name (free text) or venue via Google Places */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Building2 className="w-4 h-4" style={themeAccent.text} />
                {isBrandMode ? "Brand name" : "Venue name"}{" "}
                <span className="text-red-400">*</span>
                {!isBrandMode ? (
                  <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    UK listings
                  </span>
                ) : null}
              </label>
              {isBrandMode ? (
                <>
                  <div className="relative">
                    <input
                      {...form.register("venueName")}
                      maxLength={120}
                      placeholder="e.g. Acme Events Co."
                      aria-busy={brandNameChecking || undefined}
                      className={`${INPUT_CLASS} pr-10`}
                    />
                    <NameAvailabilityInputCue
                      checking={brandNameChecking}
                      available={
                        brandNameCheckStatus === "available" &&
                        (venueNameValue?.trim().length ?? 0) >= 2
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Trading name — no Google listing needed.
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
                          shouldValidate: false,
                        });
                        form.setValue("selectedPlaceId", "", {
                          shouldValidate: false,
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
                            No venues found. Try a different name, or include
                            the city.
                          </p>
                        </div>
                      )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Pick a Google listing so address and phone can fill.
                  </p>
                </>
              )}
              {brandNameCheckStatus === "taken" &&
              (venueNameValue?.trim().length ?? 0) >= 2 &&
              brandNameCheckMessage ? (
                <p className="text-xs text-red-400/90 mt-1.5">
                  {brandNameCheckMessage}
                </p>
              ) : null}
              {form.formState.errors.venueName && (
                <p className="text-red-400 text-xs mt-1.5">
                  {form.formState.errors.venueName.message}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Building2 className="w-4 h-4" style={themeAccent.text} />
                Does your venue use multiple rooms or areas?{" "}
                <span className="text-red-400">*</span>
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Yes if packages, dates, menus or drinks differ by room.
              </p>
              {roomSystemLocked ? (
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
                  Using your saved room system preference:{" "}
                  <span className="font-semibold text-white">
                    {hasRoomSystem ? "Yes" : "No"}
                  </span>
                </div>
              ) : (
                <AIChoicePair
                  value={
                    hasRoomSystem === true
                      ? true
                      : hasRoomSystem === false
                        ? false
                        : undefined
                  }
                  onChange={setRoomSystem}
                  options={[
                    { value: true, label: "Yes" },
                    { value: false, label: "No" },
                  ]}
                />
              )}
              {form.formState.errors.has_room_system && (
                <p className="text-red-400 text-xs mt-1.5">
                  {form.formState.errors.has_room_system.message}
                </p>
              )}
            </div>

            {hasRoomSystem === true && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Building2 className="w-4 h-4" style={themeAccent.text} />
                  Room names <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  2–3 names as guests know them.
                </p>
                <div className="space-y-2">
                  {roomNames.fields.map((field, index) => (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          {...form.register(`room_names.${index}.name`)}
                          maxLength={40}
                          placeholder={roomNamePlaceholder(index)}
                          className={INPUT_CLASS}
                        />
                        {roomNames.fields.length > 2 && (
                          <button
                            type="button"
                            onClick={() => roomNames.remove(index)}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {form.formState.errors.room_names?.[index]?.name
                        ?.message && (
                        <p className="text-red-400 text-xs">
                          {
                            form.formState.errors.room_names[index]?.name
                              ?.message
                          }
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {roomNames.fields.length < 3 && (
                    <button
                      type="button"
                      onClick={() => roomNames.append({ name: "" })}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs"
                    >
                      + Add room
                    </button>
                  )}
                  {roomNames.fields.length >= 3 ? (
                    <p className="text-xs text-slate-500">
                      Maximum of 3 rooms in this first draft.
                    </p>
                  ) : null}
                </div>
                {form.formState.errors.room_names && (
                  <p className="text-red-400 text-xs mt-1.5">
                    {
                      (form.formState.errors.room_names as unknown as {
                        message?: string;
                      })?.message
                    }
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <MapPin className="w-4 h-4 shrink-0" style={themeAccent.text} />
                    {isBrandMode
                      ? "Head office address"
                      : "Main venue address"}{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    {isBrandMode
                      ? "Where the brand is based — not a one-off event. We’ll use this as the event location next; you can change it there."
                      : "Your venue. Event nights use this same pin — you only change it next if the night is off-site."}
                  </p>
                  {showConfirmedAddress ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {addressValue}
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingAddress(true)}
                          className="shrink-0 text-xs font-medium text-slate-400 hover:text-white"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">
                        Filled from Google
                      </p>
                    </div>
                  ) : isBrandMode ||
                    editingAddress ||
                    (isPlaceSelected && !addressValue?.trim()) ? (
                    <>
                      <AddressAutocomplete
                        variant="dark"
                        includeEstablishments
                        value={form.watch("address")}
                        onChange={(address) => {
                          form.setValue("address", address, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          form.setValue("latitude", undefined, {
                            shouldValidate: true,
                          });
                          form.setValue("longitude", undefined, {
                            shouldValidate: true,
                          });
                        }}
                        onResolved={({ address, city, phone, latitude, longitude }) => {
                          form.setValue("address", address, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          const nextCity =
                            city || cityFromFormattedAddress(address);
                          if (nextCity) {
                            form.setValue("city", nextCity, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }
                          if (phone) {
                            form.setValue("contactNumber", phone, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }
                          if (
                            latitude != null &&
                            longitude != null &&
                            Number.isFinite(latitude) &&
                            Number.isFinite(longitude) &&
                            !isCoarseUkFallbackPin(latitude, longitude)
                          ) {
                            form.setValue("latitude", latitude, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                            form.setValue("longitude", longitude, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          } else {
                            form.setValue("latitude", undefined, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                            form.setValue("longitude", undefined, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }
                          setEditingAddress(false);
                        }}
                        placeholder={
                          isBrandMode
                            ? "Search for your head office, venue, or street address"
                            : "Search for a street, postcode, or place"
                        }
                        inputClassName={`${INPUT_CLASS} pr-10`}
                        noResultsMessage="No addresses found. Try a street, postcode, or place name."
                        unavailableMessage="Address search is unavailable. Check your connection and try again."
                      />
                      {editingAddress ? (
                        <button
                          type="button"
                          onClick={() => setEditingAddress(false)}
                          className="mt-1.5 text-xs text-slate-500 hover:text-slate-300"
                        >
                          Cancel edit
                        </button>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1.5">
                          Pick a suggestion to fill city and phone.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-500">
                      Address fills when you pick a venue above.
                    </p>
                  )}
                  {form.formState.errors.address && (
                    <p className="text-red-400 text-xs mt-1.5">
                      {form.formState.errors.address.message}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-2 text-sm leading-5">
                    <MapPin
                      className="w-4 h-4 shrink-0"
                      style={themeAccent.text}
                    />
                    <span className="font-medium text-slate-300">City</span>
                    <span
                      className={
                        cityValue?.trim() ? "text-white" : "text-slate-500"
                      }
                    >
                      {cityValue?.trim() || "Fills from the address you pick"}
                    </span>
                  </p>
                  {form.formState.errors.city && (
                    <p className="text-red-400 text-xs mt-1.5">
                      {form.formState.errors.city.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <MapPin className="w-4 h-4 shrink-0" style={themeAccent.text} />
                    Pin <span className="text-red-400">*</span>
                    <span className="font-normal text-slate-500">
                      — drag if it missed the entrance
                    </span>
                  </label>
                  <EventLocationMap
                    compact
                    heightClass="h-32"
                    minHeightPx={128}
                    initialAddress={addressValue}
                    initialLatitude={latitudeValue}
                    initialLongitude={longitudeValue}
                    onLocationChange={({ address, latitude, longitude }) => {
                      if (
                        isCoarseUkFallbackPin(latitude, longitude) ||
                        address.trim().toLowerCase() === "united kingdom"
                      ) {
                        return;
                      }
                      form.setValue("address", address, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      form.setValue("latitude", latitude, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      form.setValue("longitude", longitude, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      const parsedCity = cityFromFormattedAddress(address);
                      if (parsedCity) {
                        form.setValue("city", parsedCity, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }
                    }}
                  />
                  {form.formState.errors.latitude && (
                    <p className="text-red-400 text-xs mt-1.5">
                      {form.formState.errors.latitude.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  {session?.user?.email &&
                  form.watch("email") === session.user.email ? (
                    <p className="text-xs text-slate-500 mt-1">
                      From your account
                    </p>
                  ) : null}
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
                    placeholder="Phone number"
                    maxLength={20}
                    className={INPUT_CLASS}
                  />
                  {form.formState.errors.contactNumber && (
                    <p className="text-red-400 text-xs mt-1.5">
                      {form.formState.errors.contactNumber.message}
                    </p>
                  )}
                </div>
              </div>
              <input type="hidden" {...form.register("city")} />
            </div>

            <div className="space-y-4 pt-3 border-t border-white/10">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                First event
              </p>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Globe className="w-4 h-4" style={themeAccent.text} />
                Event Category <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Tap the type of night — so we draft Christmas, brunch, or NYE
                correctly.
              </p>
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
                        className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg border text-[11px] font-medium transition-all duration-200 min-h-[44px] ${
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
                      className="w-full py-2 rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {showAllCategories
                        ? "Show less"
                        : `Show more categories (${restCategories.length})`}
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

            {/* Description (optional — helps AI) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Info className="w-4 h-4" style={themeAccent.text} />
                Event setup{" "}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                {...form.register("description")}
                placeholder={descriptionPlaceholder}
                rows={3}
                maxLength={2000}
                className={`${INPUT_CLASS} resize-none`}
              />
              <div className="flex justify-end mt-1">
                <p className="text-slate-600 text-xs">
                  {form.watch("description")?.length || 0}/2000
                </p>
              </div>
            </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={onSwitchToManual}
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Switch to Manual
              </button>

              <div className="flex flex-col items-stretch sm:items-end gap-1.5">
                <button
                  type="submit"
                  disabled={isLoading || brandNameChecking || brandNameTaken}
                  className="flex items-center justify-center gap-2 px-8 py-3 rounded-full text-white text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  style={themeAccent.button}
                >
                  <Sparkles className="w-4 h-4" />
                  {isLoading ? "Generating draft…" : "Generate draft & review"}
                  {!isLoading && <ChevronRight className="w-4 h-4" />}
                </button>
                <p className="text-[11px] text-slate-500 text-center sm:text-right">
                  You’ll check every section before publishing
                </p>
              </div>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}
