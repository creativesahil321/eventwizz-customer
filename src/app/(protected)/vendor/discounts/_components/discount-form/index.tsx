"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { useLocationStore } from "@/store/location.store";
import { useCustomers } from "@/app/(protected)/vendor/customers/_lib/queries";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import {
  defaultDiscountFormValues,
  discountFormSchema,
  type DiscountFormValues,
} from "../../_lib/schema";
import type { Discount, DiscountLocationWithEvents } from "../../_lib/types";
import {
  CUSTOMER_AUDIENCE_LABELS,
  DISCOUNT_CATEGORY_LABELS,
  DISCOUNT_VALUE_TYPE_LABELS,
  FLAT_MODE_LABELS,
} from "../../_lib/types";
import {
  buildDiscountStorePayload,
  normalizeFlatMode,
} from "../../_lib/build-store-payload";
import {
  useCreateDiscount,
  useDiscountLocationsWithEvents,
} from "../../_lib/queries";
import { DiscountScopeMultiSelect } from "../discount-scope-multi-select";
import { ApplicableDatesPicker } from "../applicable-dates-picker";
import { parseRoomKey, toRoomKey } from "../../_lib/room-key";

const EMPTY_LOCATIONS: DiscountLocationWithEvents[] = [];

const STEPS = [
  { id: 1, title: "Category" },
  { id: 2, title: "Scope" },
  { id: 3, title: "Value" },
  { id: 4, title: "Expiry" },
  { id: 5, title: "Review" },
] as const;

/** Card radios without Radix RadioGroup — avoids React 19 useComposedRefs loops */
function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; description?: string }[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn("grid w-full min-w-0 gap-3", className)}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-h-11 w-full min-w-0 cursor-pointer touch-manipulation flex-col gap-1 rounded-lg border p-3 text-left transition-colors sm:p-4",
              "hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5",
              selected &&
                "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "relative flex size-4 shrink-0 items-center justify-center rounded-full border border-input shadow-xs",
                  selected && "border-[var(--color-primary)]"
                )}
              >
                {selected ? (
                  <span className="size-2 rounded-full bg-[var(--color-primary,#009ead)]" />
                ) : null}
              </span>
              <span className="min-w-0 text-sm font-medium break-words sm:text-base">
                {opt.label}
              </span>
            </div>
            {opt.description ? (
              <span className="pl-6 text-xs text-pretty break-words text-muted-foreground">
                {opt.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function discountToFormValues(discount: Discount): DiscountFormValues {
  const audience =
    discount.customer_audience === "selected" ? "selected" : "all_active";
  return {
    name: discount.name ?? "",
    category: discount.category,
    location_ids: discount.vendor_location_id
      ? [discount.vendor_location_id]
      : [],
    event_ids: discount.vendor_event_id ? [discount.vendor_event_id] : [],
    room_keys:
      discount.room_id && discount.vendor_event_id
        ? [toRoomKey(discount.vendor_event_id, discount.room_id)]
        : [],
    applicable_date_ids: [],
    coupon_code: discount.coupon_code ?? "",
    customer_audience: audience,
    customer_ids: discount.customers?.map((c) => c.id) ?? [],
    value_type: discount.discount_type,
    discount_value: discount.amount,
    flat_mode: normalizeFlatMode(discount.flat_mode),
    min_people: discount.min_people,
    valid_from: discount.valid_from ?? "",
    expires_at: discount.expires_at,
    status: discount.status === "expired" ? "inactive" : discount.status,
  };
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Something went wrong";
  const err = error as {
    message?: string;
    response?: { data?: { message?: string; errors?: unknown } };
  };
  const apiMessage = err.response?.data?.message;
  const errors = err.response?.data?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors.filter((e) => typeof e === "string").join(", ") || apiMessage || err.message || "Request failed";
  }
  if (errors && typeof errors === "object") {
    const flat = Object.values(errors as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v) => typeof v === "string") as string[];
    if (flat.length) return flat.join(", ");
  }
  return apiMessage || err.message || "Request failed";
}

interface DiscountFormWizardProps {
  mode: "create" | "edit";
  initialDiscount?: Discount;
  initialValues?: Partial<DiscountFormValues>;
}

export function DiscountFormWizard({
  mode,
  initialDiscount,
  initialValues,
}: DiscountFormWizardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearch, 500);
  const createDiscount = useCreateDiscount();

  const selectedLocation = useLocationStore((s) => s.selectedLocation);

  const currentVendorLocationId = useMemo(() => {
    const fromStore = selectedLocation?.id
      ? Number(selectedLocation.id)
      : 0;
    const fromSession = session?.user?.vendor_location_id
      ? Number(session.user.vendor_location_id)
      : 0;
    return fromStore > 0 ? fromStore : fromSession > 0 ? fromSession : 0;
  }, [selectedLocation?.id, session?.user?.vendor_location_id]);

  const { data: locationsData, isLoading: locationsLoading } =
    useDiscountLocationsWithEvents();
  const locationsWithEvents = locationsData ?? EMPTY_LOCATIONS;

  const form = useForm<DiscountFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(discountFormSchema) as any,
    defaultValues: initialDiscount
      ? discountToFormValues(initialDiscount)
      : {
          ...defaultDiscountFormValues,
          ...initialValues,
          location_ids:
            Array.isArray(initialValues?.location_ids) &&
            initialValues.location_ids.length > 0
              ? initialValues.location_ids
              : currentVendorLocationId > 0
                ? [currentVendorLocationId]
                : [],
          event_ids: Array.isArray(initialValues?.event_ids)
            ? initialValues.event_ids
            : [],
          room_keys: Array.isArray(initialValues?.room_keys)
            ? initialValues.room_keys
            : [],
        },
    mode: "onChange",
  });

  const values = form.watch();
  const selectedLocationIds = Array.isArray(values.location_ids)
    ? values.location_ids
    : [];
  const selectedEventIds = Array.isArray(values.event_ids)
    ? values.event_ids
    : [];
  const selectedRoomKeys = Array.isArray(values.room_keys)
    ? values.room_keys
    : [];
  const selectedRoomKeySet = useMemo(
    () => new Set(selectedRoomKeys),
    [selectedRoomKeys]
  );

  // Same search API as Customers page
  const {
    data: customersResponse,
    isLoading: customersLoading,
    isFetching: customersFetching,
  } = useCustomers(
    {
      page: 1,
      per_page: 30,
      search: debouncedCustomerSearch,
      status: "active",
    },
    undefined,
    {
      enabled:
        values.category === "coupon_code" &&
        values.customer_audience === "selected",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  );

  const locationOptions = useMemo(
    () =>
      locationsWithEvents.map((loc) => ({
        id: loc.id,
        name: loc.city || `Location #${loc.id}`,
        hint:
          (loc.events?.length ?? 0) > 0
            ? `${loc.events.length} event${loc.events.length === 1 ? "" : "s"}`
            : "No events",
      })),
    [locationsWithEvents]
  );

  const eventOptions = useMemo(() => {
    const byId = new Map<
      number,
      { id: number; name: string; group?: string; hint?: string }
    >();
    for (const loc of locationsWithEvents) {
      if (!selectedLocationIds.includes(loc.id)) continue;
      const locName = loc.city || `Location #${loc.id}`;
      for (const e of loc.events ?? []) {
        byId.set(e.id, {
          id: e.id,
          name: e.name,
          group: locName,
          hint: `${e.rooms?.length ?? 0} room${
            (e.rooms?.length ?? 0) === 1 ? "" : "s"
          }`,
        });
      }
    }
    for (const evId of selectedEventIds) {
      if (!byId.has(evId)) {
        const label =
          initialDiscount?.event?.name ||
          (initialValues?.name
            ? String(initialValues.name).replace(/ promo$/, "")
            : null) ||
          `Event #${evId}`;
        byId.set(evId, { id: evId, name: label, group: "Other" });
      }
    }
    return Array.from(byId.values());
  }, [
    locationsWithEvents,
    selectedLocationIds,
    selectedEventIds,
    initialValues?.name,
    initialDiscount?.event?.name,
  ]);

  const roomOptions = useMemo(() => {
    const list: {
      id: string;
      name: string;
      group?: string;
      hint?: string;
    }[] = [];
    for (const loc of locationsWithEvents) {
      if (!selectedLocationIds.includes(loc.id)) continue;
      const locName = loc.city || `Location #${loc.id}`;
      for (const e of loc.events ?? []) {
        if (!selectedEventIds.includes(e.id)) continue;
        for (const r of e.rooms ?? []) {
          list.push({
            id: toRoomKey(e.id, r.id),
            name: r.name,
            group: `${locName} · ${e.name}`,
            hint: `${r.dates?.length ?? 0} date${
              (r.dates?.length ?? 0) === 1 ? "" : "s"
            }`,
          });
        }
      }
    }
    return list;
  }, [locationsWithEvents, selectedLocationIds, selectedEventIds]);

  /** Selected events that have no rooms — still show in Room picker for clarity */
  const roomEmptyGroups = useMemo(() => {
    const groups: { label: string; message: string }[] = [];
    for (const loc of locationsWithEvents) {
      if (!selectedLocationIds.includes(loc.id)) continue;
      const locName = loc.city || `Location #${loc.id}`;
      for (const e of loc.events ?? []) {
        if (!selectedEventIds.includes(e.id)) continue;
        if ((e.rooms?.length ?? 0) > 0) continue;
        groups.push({
          label: `${locName} · ${e.name}`,
          message: "No rooms for this event",
        });
      }
    }
    return groups;
  }, [locationsWithEvents, selectedLocationIds, selectedEventIds]);

  /** Dates only for selected event+room pairs (not every event sharing a room id) */
  const availableDateGroups = useMemo(() => {
    const groups: {
      key: string;
      locationName: string;
      eventName: string;
      eventId: number;
      roomId: number;
      roomName: string;
      dates: { id: number; date: string }[];
    }[] = [];

    for (const loc of locationsWithEvents) {
      if (!selectedLocationIds.includes(loc.id)) continue;
      const locationName = loc.city || `Location #${loc.id}`;
      for (const e of loc.events ?? []) {
        if (!selectedEventIds.includes(e.id)) continue;
        for (const r of e.rooms ?? []) {
          const key = toRoomKey(e.id, r.id);
          if (!selectedRoomKeySet.has(key)) continue;
          groups.push({
            key,
            locationName,
            eventName: e.name,
            eventId: e.id,
            roomId: r.id,
            roomName: r.name,
            dates: (r.dates ?? [])
              .filter((d) => d?.id != null && d?.date)
              .map((d) => ({ id: d.id, date: d.date }))
              .sort((a, b) => a.date.localeCompare(b.date)),
          });
        }
      }
    }

    return groups.sort((a, b) =>
      `${a.locationName}${a.eventName}${a.roomName}`.localeCompare(
        `${b.locationName}${b.eventName}${b.roomName}`
      )
    );
  }, [
    locationsWithEvents,
    selectedLocationIds,
    selectedEventIds,
    selectedRoomKeySet,
  ]);

  const dateIdsForRoomKeys = (keys: string[]) => {
    const keySet = new Set(keys);
    const ids: number[] = [];
    for (const loc of locationsWithEvents) {
      for (const e of loc.events ?? []) {
        for (const r of e.rooms ?? []) {
          if (!keySet.has(toRoomKey(e.id, r.id))) continue;
          for (const d of r.dates ?? []) {
            if (d?.id != null) ids.push(d.id);
          }
        }
      }
    }
    return ids;
  };

  const customers = Array.isArray(customersResponse?.data)
    ? customersResponse.data
    : [];

  const selectedCustomerIds = Array.isArray(values.customer_ids)
    ? values.customer_ids
    : [];
  const selectedApplicableDateIds = Array.isArray(values.applicable_date_ids)
    ? values.applicable_date_ids
    : [];

  const selectedDateLabels = useMemo(() => {
    const byId = new Map<number, string>();
    for (const group of availableDateGroups) {
      for (const d of group.dates) byId.set(d.id, d.date);
    }
    return selectedApplicableDateIds
      .map((id) => byId.get(id))
      .filter((d): d is string => Boolean(d));
  }, [availableDateGroups, selectedApplicableDateIds]);

  const locationName =
    selectedLocationIds.length === 0
      ? "—"
      : selectedLocationIds
          .map(
            (id) =>
              locationOptions.find((l) => l.id === id)?.name ?? `Location #${id}`
          )
          .join(", ");
  const eventName =
    selectedEventIds.length === 0
      ? "—"
      : selectedEventIds
          .map(
            (id) =>
              eventOptions.find((e) => e.id === id)?.name ?? `Event #${id}`
          )
          .join(", ");
  const roomName =
    selectedRoomKeys.length === 0
      ? "—"
      : selectedRoomKeys
          .map((key) => {
            const opt = roomOptions.find((r) => String(r.id) === String(key));
            if (!opt) return key;
            return opt.group ? `${opt.name} (${opt.group})` : opt.name;
          })
          .join(", ");

  const pruneEventsForLocations = (locationIds: number[]) => {
    const allowed = new Set<number>();
    for (const loc of locationsWithEvents) {
      if (!locationIds.includes(loc.id)) continue;
      for (const e of loc.events ?? []) allowed.add(e.id);
    }
    return selectedEventIds.filter((id) => allowed.has(id));
  };

  const pruneRoomsForEvents = (eventIds: number[]) => {
    const allowedEvents = new Set(eventIds);
    return selectedRoomKeys.filter((key) => {
      const parsed = parseRoomKey(key);
      return parsed ? allowedEvents.has(parsed.eventId) : false;
    });
  };

  const pruneDatesForRoomKeys = (roomKeys: string[]) => {
    const allowed = new Set(dateIdsForRoomKeys(roomKeys));
    return selectedApplicableDateIds.filter((id) => allowed.has(id));
  };

  const validateStep = async (current: number) => {
    if (current === 1) return form.trigger(["category"]);
    if (current === 2) {
      const fields: (keyof DiscountFormValues)[] = [
        "location_ids",
        "event_ids",
      ];
      if (values.category === "date_wise") {
        fields.push("room_keys", "applicable_date_ids");
      }
      if (values.category === "coupon_code") {
        fields.push("coupon_code", "customer_audience", "customer_ids");
      }
      return form.trigger(fields);
    }
    if (current === 3) {
      const fields: (keyof DiscountFormValues)[] = [
        "value_type",
        "discount_value",
      ];
      if (values.value_type === "flat") {
        fields.push("flat_mode", "min_people");
      }
      return form.trigger(fields);
    }
    if (current === 4) {
      return form.trigger(["expires_at", "valid_from", "status", "name"]);
    }
    return true;
  };

  const goNext = async () => {
    const ok = await validateStep(step);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: DiscountFormValues) => {
    if (mode === "edit") {
      toast.message("Update API not connected yet — create is live.");
      return;
    }

    const payload = buildDiscountStorePayload(data);
    try {
      const res = await createDiscount.mutateAsync(payload);
      const emailsNote =
        data.category === "coupon_code" &&
        data.status === "active" &&
        res?.data?.emails_sent_at
          ? " Coupon emails were queued."
          : data.category === "coupon_code" && data.status === "active"
            ? " Coupon emails will be queued."
            : "";
      toast.success((res?.message || "Discount created") + emailsNote);
      router.push("/vendor/discounts");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleCustomer = (id: number, checked: boolean) => {
    const current = Array.isArray(form.getValues("customer_ids"))
      ? form.getValues("customer_ids")
      : [];
    form.setValue(
      "customer_ids",
      checked ? [...current, id] : current.filter((x) => x !== id),
      { shouldValidate: true, shouldDirty: true }
    );
  };

  const isSubmitting = createDiscount.isPending;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full min-w-0 flex-col gap-4"
      >
        <div className={pageCardClassName("min-w-0 overflow-x-hidden")}>
          <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm",
                  step === s.id &&
                    "border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-medium",
                  step > s.id &&
                    "border-emerald-300 bg-emerald-50 text-emerald-800"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    step > s.id
                      ? "bg-emerald-600 text-white"
                      : step === s.id
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s.id ? <Check className="h-3 w-3" /> : s.id}
                </span>
                {s.title}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-base">Discount category</FormLabel>
                  <FormDescription>
                    Choose how this discount targets bookings — selection
                    continues to the next step.
                  </FormDescription>
                  <ChoiceCards
                    value={field.value}
                    onChange={(key) => {
                      field.onChange(key);
                      form.setValue("room_keys", []);
                      form.setValue("applicable_date_ids", []);
                      form.setValue("coupon_code", "");
                      form.setValue("customer_audience", "all_active");
                      form.setValue("customer_ids", []);
                      setStep(2);
                    }}
                    className="md:grid-cols-3"
                    options={(
                      Object.keys(
                        DISCOUNT_CATEGORY_LABELS
                      ) as (keyof typeof DISCOUNT_CATEGORY_LABELS)[]
                    ).map((key) => ({
                      value: key,
                      label: DISCOUNT_CATEGORY_LABELS[key],
                      description:
                        key === "event_specific"
                          ? "Applies to the whole selected event."
                          : key === "date_wise"
                            ? "Applies to a room/hall on selected dates."
                            : "Customer enters a code at checkout. Active coupons email the audience.",
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {step === 2 ? (
            <div className="min-w-0 space-y-4">
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location_ids"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Location</FormLabel>
                      <DiscountScopeMultiSelect
                        options={locationOptions}
                        value={field.value ?? []}
                        onChange={(ids) => {
                          const locationIds = ids.map(Number);
                          field.onChange(locationIds);
                          const nextEvents = pruneEventsForLocations(locationIds);
                          const nextRooms = pruneRoomsForEvents(nextEvents);
                          form.setValue("event_ids", nextEvents, {
                            shouldValidate: true,
                          });
                          form.setValue("room_keys", nextRooms, {
                            shouldValidate: true,
                          });
                          form.setValue(
                            "applicable_date_ids",
                            pruneDatesForRoomKeys(nextRooms),
                            { shouldValidate: true }
                          );
                        }}
                        disabled={locationsLoading}
                        loading={locationsLoading}
                        placeholder="Select locations"
                        searchPlaceholder="Search locations…"
                        emptyLabel="No locations with events."
                        unitLabel="locations selected"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="event_ids"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Event</FormLabel>
                      <DiscountScopeMultiSelect
                        options={eventOptions}
                        value={field.value ?? []}
                        onChange={(ids) => {
                          const eventIds = ids.map(Number);
                          field.onChange(eventIds);
                          const nextRooms = pruneRoomsForEvents(eventIds);
                          form.setValue("room_keys", nextRooms, {
                            shouldValidate: true,
                          });
                          form.setValue(
                            "applicable_date_ids",
                            pruneDatesForRoomKeys(nextRooms),
                            { shouldValidate: true }
                          );
                        }}
                        disabled={
                          selectedLocationIds.length === 0 || locationsLoading
                        }
                        loading={locationsLoading}
                        placeholder={
                          selectedLocationIds.length === 0
                            ? "Select location first"
                            : eventOptions.length === 0
                              ? "No events at selected locations"
                              : "Select events"
                        }
                        searchPlaceholder="Search events…"
                        emptyLabel="No events found."
                        unitLabel="events selected"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {values.category === "date_wise" ? (
                <div className="min-w-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="room_keys"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Room / Hall</FormLabel>
                        <FormDescription>
                          Grouped by event — same room name can appear under more
                          than one event.
                        </FormDescription>
                        <DiscountScopeMultiSelect
                          options={roomOptions}
                          emptyGroups={roomEmptyGroups}
                          value={field.value ?? []}
                          onChange={(keys) => {
                            const nextKeys = keys.map(String);
                            const prev = new Set(field.value ?? []);
                            field.onChange(nextKeys);

                            // Keep dates for still-selected rooms; auto-select
                            // all dates for newly added rooms.
                            const kept = pruneDatesForRoomKeys(nextKeys);
                            const added = nextKeys.filter((k) => !prev.has(k));
                            const auto = dateIdsForRoomKeys(added);
                            form.setValue(
                              "applicable_date_ids",
                              [...new Set([...kept, ...auto])],
                              { shouldValidate: true }
                            );
                          }}
                          disabled={
                            selectedEventIds.length === 0 || locationsLoading
                          }
                          loading={locationsLoading}
                          placeholder={
                            selectedEventIds.length === 0
                              ? "Select event first"
                              : roomOptions.length === 0 &&
                                  roomEmptyGroups.length === 0
                                ? "No rooms for selected events"
                                : "Select rooms"
                          }
                          searchPlaceholder="Search rooms…"
                          emptyLabel="No rooms found."
                          unitLabel="rooms selected"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicable_date_ids"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Applicable dates</FormLabel>
                        <FormDescription>
                          Open a city, then an event, then adjust room dates.
                        </FormDescription>
                        {selectedRoomKeys.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Select a room first to see available dates.
                          </p>
                        ) : (
                          <ApplicableDatesPicker
                            groups={availableDateGroups}
                            selectedIds={field.value ?? []}
                            onChange={(ids) => field.onChange(ids)}
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              {values.category === "coupon_code" ? (
                <div className="min-w-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="coupon_code"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Coupon code</FormLabel>
                        <FormDescription>
                          Unique per vendor, case-insensitive.
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="e.g. SUMMER20"
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            inputMode="text"
                            className="w-full max-w-sm font-mono uppercase"
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_audience"
                    render={({ field }) => (
                      <FormItem className="min-w-0 space-y-3">
                        <FormLabel>Customer audience</FormLabel>
                        <ChoiceCards
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            if (v === "all_active") {
                              form.setValue("customer_ids", []);
                            }
                            setCustomerSearch("");
                          }}
                          className="min-w-0 sm:grid-cols-2"
                          options={(
                            Object.keys(
                              CUSTOMER_AUDIENCE_LABELS
                            ) as (keyof typeof CUSTOMER_AUDIENCE_LABELS)[]
                          ).map((key) => ({
                            value: key,
                            label: CUSTOMER_AUDIENCE_LABELS[key],
                            description:
                              key === "all_active"
                                ? "Email every active customer when this coupon is activated."
                                : "Choose who should receive the coupon email.",
                          }))}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {values.customer_audience === "selected" ? (
                    <FormField
                      control={form.control}
                      name="customer_ids"
                      render={() => (
                        <FormItem className="min-w-0">
                          <FormLabel>Select customers</FormLabel>
                          <div className="relative min-w-0">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={customerSearch}
                              onChange={(e) =>
                                setCustomerSearch(e.target.value)
                              }
                              placeholder="Search by name or email…"
                              className="w-full pl-9"
                              enterKeyHint="search"
                              autoComplete="off"
                            />
                          </div>
                          {selectedCustomerIds.length > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {selectedCustomerIds.length} selected
                              {customersFetching ? " · searching…" : ""}
                            </p>
                          ) : null}
                          {customersLoading ? (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading customers…
                            </p>
                          ) : customers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {debouncedCustomerSearch
                                ? "No customers match your search."
                                : "No active customers found."}
                            </p>
                          ) : (
                            <div
                              className={cn(
                                "max-h-[min(16rem,45vh)] min-w-0 space-y-0.5 overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border p-2 sm:max-h-56 sm:p-3",
                                customersFetching && "opacity-70"
                              )}
                            >
                              {customers.map((c) => {
                                const checked = selectedCustomerIds.includes(
                                  c.id
                                );
                                const label =
                                  `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() ||
                                  c.email;
                                return (
                                  <div
                                    key={c.id}
                                    className="flex min-h-11 min-w-0 cursor-pointer touch-manipulation items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 active:bg-muted/80"
                                    onClick={() =>
                                      toggleCustomer(c.id, !checked)
                                    }
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Enter" ||
                                        e.key === " "
                                      ) {
                                        e.preventDefault();
                                        toggleCustomer(c.id, !checked);
                                      }
                                    }}
                                    role="checkbox"
                                    aria-checked={checked}
                                    tabIndex={0}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      className="shrink-0"
                                      onCheckedChange={(v) =>
                                        toggleCustomer(c.id, v === true)
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="min-w-0 flex-1 overflow-hidden">
                                      <span className="block truncate text-sm font-medium">
                                        {label}
                                      </span>
                                      <span className="block truncate text-xs text-muted-foreground">
                                        {c.email}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="value_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Discount type</FormLabel>
                    <ChoiceCards
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        if (v === "percentage") {
                          form.setValue("flat_mode", null);
                          form.setValue("min_people", null);
                        } else if (!form.getValues("flat_mode")) {
                          form.setValue("flat_mode", "on_total");
                        }
                      }}
                      className="sm:grid-cols-2"
                      options={(
                        Object.keys(
                          DISCOUNT_VALUE_TYPE_LABELS
                        ) as (keyof typeof DISCOUNT_VALUE_TYPE_LABELS)[]
                      ).map((key) => ({
                        value: key,
                        label: DISCOUNT_VALUE_TYPE_LABELS[key],
                      }))}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {values.value_type === "flat" ? (
                <FormField
                  control={form.control}
                  name="flat_mode"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Flat mode</FormLabel>
                      <ChoiceCards
                        value={field.value ?? "on_total"}
                        onChange={field.onChange}
                        className="sm:grid-cols-2"
                        options={(
                          Object.keys(
                            FLAT_MODE_LABELS
                          ) as (keyof typeof FLAT_MODE_LABELS)[]
                        ).map((key) => ({
                          value: key,
                          label: FLAT_MODE_LABELS[key],
                          description:
                            key === "on_total"
                              ? "Fixed amount off the total order."
                              : "Fixed amount off per person; requires minimum headcount.",
                        }))}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="discount_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {values.value_type === "percentage"
                          ? "Percentage (%)"
                          : "Amount (£)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {values.value_type === "flat" &&
                values.flat_mode === "per_person" ? (
                  <FormField
                    control={form.control}
                    name="min_people"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum people</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Display name (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g. Summer Festival 15% Off"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid from (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Status on save</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activate now</SelectItem>
                        <SelectItem value="inactive">Save as inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    {values.category === "coupon_code" &&
                    values.status === "active" ? (
                      <FormDescription>
                        Activating a coupon queues emails to the selected
                        audience on submit.
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review before saving. This is the payload sent to{" "}
                <code className="rounded bg-muted px-1">
                  POST /vendor/discounts/store
                </code>
                .
              </p>
              <dl className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:p-4 md:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium break-words">
                    {DISCOUNT_CATEGORY_LABELS[values.category]}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Location / Event</dt>
                  <dd className="font-medium break-words">
                    {locationName} · {eventName}
                  </dd>
                </div>
                {values.category === "date_wise" ? (
                  <>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Room</dt>
                      <dd className="font-medium break-words">{roomName}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Dates</dt>
                      <dd className="font-medium break-words">
                        {(selectedDateLabels.length
                          ? selectedDateLabels.join(", ")
                          : "—") || "—"}
                      </dd>
                    </div>
                  </>
                ) : null}
                {values.category === "coupon_code" ? (
                  <>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Coupon</dt>
                      <dd className="font-mono font-medium break-all">
                        {values.coupon_code || "—"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Audience</dt>
                      <dd className="font-medium break-words">
                        {CUSTOMER_AUDIENCE_LABELS[values.customer_audience]}
                        {values.customer_audience === "selected"
                          ? ` (${selectedCustomerIds.length})`
                          : ""}
                      </dd>
                    </div>
                  </>
                ) : null}
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Value</dt>
                  <dd className="font-medium break-words">
                    {values.value_type === "percentage"
                      ? `${values.discount_value}%`
                      : `£${values.discount_value}${
                          values.flat_mode === "per_person"
                            ? ` / person (min ${values.min_people})`
                            : " off total"
                        }`}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="font-medium">{values.expires_at || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium capitalize">{values.status}</dd>
                </div>
              </dl>
              <pre className="max-h-48 overflow-auto rounded-md border bg-slate-950 p-3 text-[11px] leading-relaxed break-all text-slate-100 sm:max-h-56 sm:text-xs">
                {JSON.stringify(buildDiscountStorePayload(values), null, 2)}
              </pre>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 1 || isSubmitting}
              className="w-full touch-manipulation sm:w-auto"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {step < STEPS.length ? (
              <Button
                type="button"
                onClick={goNext}
                className="w-full touch-manipulation sm:w-auto"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || mode === "edit"}
                className="w-full touch-manipulation sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  "Save Discount"
                ) : (
                  "Update (API pending)"
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
