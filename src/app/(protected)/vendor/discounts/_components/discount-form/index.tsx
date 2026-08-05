"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  todayIsoDate,
  type DiscountFormValues,
} from "../../_lib/schema";
import type { Discount, DiscountEventWithDates } from "../../_lib/types";
import {
  CUSTOMER_AUDIENCE_LABELS,
  DISCOUNT_CREATE_CATEGORIES,
  DISCOUNT_VALUE_TYPE_LABELS,
  FLAT_MODE_LABELS,
} from "../../_lib/types";
import {
  buildDiscountStorePayload,
  normalizeFlatMode,
} from "../../_lib/build-store-payload";
import {
  useCreateDiscount,
  useDiscountEventsWithDates,
} from "../../_lib/queries";

const EMPTY_EVENTS: DiscountEventWithDates[] = [];

const STEPS = [
  { id: 1, title: "Type" },
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
    category:
      discount.category === "coupon_code" ? "coupon_code" : "discount",
    location_id: discount.vendor_location_id ?? 0,
    event_id: discount.vendor_event_id ?? 0,
    room_id: discount.room_id ?? 0,
    date_id: discount.date_id ?? 0,
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
  const [selectedCustomersMeta, setSelectedCustomersMeta] = useState<
    Record<number, { id: number; name: string; email: string }>
  >({});
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

  const { data: eventsData, isLoading: eventsLoading } =
    useDiscountEventsWithDates(currentVendorLocationId);
  const eventsWithDates = eventsData ?? EMPTY_EVENTS;

  const form = useForm<DiscountFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(discountFormSchema) as any,
    defaultValues: initialDiscount
      ? discountToFormValues(initialDiscount)
      : {
          ...defaultDiscountFormValues,
          ...initialValues,
          location_id:
            initialValues?.location_id && initialValues.location_id > 0
              ? initialValues.location_id
              : currentVendorLocationId > 0
                ? currentVendorLocationId
                : 0,
          event_id:
            initialValues?.event_id && initialValues.event_id > 0
              ? initialValues.event_id
              : 0,
        },
    mode: "onChange",
  });

  const values = form.watch();
  const selectedLocationId = Number(values.location_id) || 0;
  const selectedEventId = Number(values.event_id) || 0;
  const selectedRoomId = Number(values.room_id) || 0;
  const selectedDateId = Number(values.date_id) || 0;
  const isDiscountCategory = values.category === "discount";

  // Header location drives the discount (same as create event)
  useEffect(() => {
    if (mode === "edit") return;
    if (currentVendorLocationId <= 0) return;
    const current = form.getValues("location_id");
    if (current === currentVendorLocationId) return;
    form.setValue("location_id", currentVendorLocationId, {
      shouldValidate: true,
    });
    form.setValue("event_id", 0, { shouldValidate: true });
    form.setValue("room_id", 0);
    form.setValue("date_id", 0);
  }, [currentVendorLocationId, mode, form]);

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

  const headerLocationName =
    selectedLocation?.city ||
    selectedLocation?.name ||
    (selectedLocationId > 0 ? `Location #${selectedLocationId}` : null);

  const selectedEvent = useMemo(
    () => eventsWithDates.find((e) => e.id === selectedEventId) ?? null,
    [eventsWithDates, selectedEventId]
  );

  const eventOptions = useMemo(() => {
    const list = eventsWithDates.map((e) => ({
      id: e.id,
      name: e.name,
    }));
    if (
      selectedEventId > 0 &&
      !list.some((e) => e.id === selectedEventId)
    ) {
      list.push({
        id: selectedEventId,
        name:
          initialDiscount?.event?.name ||
          (initialValues?.name
            ? String(initialValues.name).replace(/ promo$/, "")
            : null) ||
          `Event #${selectedEventId}`,
      });
    }
    return list;
  }, [
    eventsWithDates,
    selectedEventId,
    initialValues?.name,
    initialDiscount?.event?.name,
  ]);

  /** Event dates — uses API `date_id` */
  const dateOptions = useMemo(() => {
    if (!selectedEvent) return [] as { id: number; date: string }[];
    return (selectedEvent.dates ?? [])
      .filter((d) => d?.date_id != null && d?.date)
      .map((d) => ({ id: d.date_id, date: d.date }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedEvent]);

  /** Rooms for the single selected date */
  const roomOptions = useMemo(() => {
    if (!selectedEvent || selectedDateId <= 0) {
      return [] as { id: number; name: string }[];
    }
    const day = (selectedEvent.dates ?? []).find(
      (d) => d.date_id === selectedDateId
    );
    return (day?.rooms ?? [])
      .filter((r) => r?.id != null)
      .map((r) => ({ id: r.id, name: r.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedEvent, selectedDateId]);

  const selectedDateNeedsRoom = roomOptions.length > 0;

  const customers = Array.isArray(customersResponse?.data)
    ? customersResponse.data
    : [];

  const selectedCustomerIds = Array.isArray(values.customer_ids)
    ? values.customer_ids
    : [];

  const customerDisplayName = (c: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }) =>
    `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || "Customer";

  // Keep names for selected customers even after search results change
  useEffect(() => {
    if (!customers.length || selectedCustomerIds.length === 0) return;
    setSelectedCustomersMeta((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const c of customers) {
        if (!selectedCustomerIds.includes(c.id)) continue;
        const name = customerDisplayName(c);
        const existing = next[c.id];
        if (
          !existing ||
          existing.name !== name ||
          existing.email !== (c.email ?? "")
        ) {
          next[c.id] = { id: c.id, name, email: c.email ?? "" };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [customers, selectedCustomerIds]);

  const selectedCustomersForReview = useMemo(
    () =>
      selectedCustomerIds.map((id) => {
        const meta = selectedCustomersMeta[id];
        return meta ?? { id, name: `Customer #${id}`, email: "" };
      }),
    [selectedCustomerIds, selectedCustomersMeta]
  );

  const locationName = headerLocationName || "—";
  const eventName =
    selectedEventId > 0
      ? eventOptions.find((e) => e.id === selectedEventId)?.name ??
        `Event #${selectedEventId}`
      : "—";

  function formatDateLabel(iso: string) {
    try {
      return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  const roomName =
    selectedRoomId > 0
      ? roomOptions.find((r) => r.id === selectedRoomId)?.name ??
        `Room #${selectedRoomId}`
      : "—";
  const selectedDateLabel =
    selectedDateId > 0
      ? (() => {
          const d = dateOptions.find((x) => x.id === selectedDateId);
          return d ? formatDateLabel(d.date) : `Date #${selectedDateId}`;
        })()
      : "—";

  const selectDate = (dateId: number) => {
    form.setValue("date_id", dateId, { shouldValidate: true });
    form.clearErrors("date_id");
    form.setValue("room_id", 0, { shouldValidate: true });
    form.clearErrors("room_id");
  };

  const validateStep = async (current: number) => {
    if (current === 1) return form.trigger(["category"]);
    if (current === 2) {
      const fields: (keyof DiscountFormValues)[] = [
        "location_id",
        "event_id",
      ];
      if (isDiscountCategory) {
        if (dateOptions.length > 0 && selectedDateId <= 0) {
          form.setError("date_id", {
            type: "manual",
            message: "Please select a date",
          });
          return false;
        }
        fields.push("date_id");
        if (selectedDateNeedsRoom && selectedRoomId <= 0) {
          form.setError("room_id", {
            type: "manual",
            message: "Please select a room",
          });
          return false;
        }
        if (selectedDateNeedsRoom) fields.push("room_id");
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
          ? " Coupon emails have been queued."
          : data.category === "coupon_code" && data.status === "active"
            ? " Coupon emails will be queued."
            : "";
      toast.success((res?.message || "Discount saved successfully.") + emailsNote);
      router.push("/vendor/discounts");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleCustomer = (
    id: number,
    checked: boolean,
    meta?: { name: string; email: string }
  ) => {
    const current = Array.isArray(form.getValues("customer_ids"))
      ? form.getValues("customer_ids")
      : [];
    form.setValue(
      "customer_ids",
      checked ? [...current, id] : current.filter((x) => x !== id),
      { shouldValidate: true, shouldDirty: true }
    );
    setSelectedCustomersMeta((prev) => {
      if (!checked) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (!meta) return prev;
      return { ...prev, [id]: { id, name: meta.name, email: meta.email } };
    });
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
                  <FormLabel className="text-base">What would you like to create?</FormLabel>
                  <FormDescription>
                    Select Discount or Coupon Code to continue. This applies to
                    the location currently selected in the header.
                  </FormDescription>
                  <ChoiceCards
                    value={
                      field.value === "coupon_code"
                        ? "coupon_code"
                        : "discount"
                    }
                    onChange={(key) => {
                      field.onChange(key);
                      form.setValue("coupon_code", "");
                      form.setValue("customer_audience", "all_active");
                      form.setValue("customer_ids", []);
                      setSelectedCustomersMeta({});
                      form.setValue("room_id", 0);
                      form.setValue("date_id", 0);
                      setStep(2);
                    }}
                    className="sm:grid-cols-2"
                    options={DISCOUNT_CREATE_CATEGORIES.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                      description: opt.description,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {step === 2 ? (
            <div className="min-w-0 space-y-4">
              {selectedLocationId <= 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Please select a location in the header first. Discounts and
                  coupons apply to that location only.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Location:{" "}
                  <span className="font-medium text-foreground">
                    {headerLocationName}
                  </span>{" "}
                  (from header)
                </p>
              )}

              {selectedLocationId > 0 &&
              !eventsLoading &&
              eventOptions.length === 0 ? (
                <div className="max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p className="font-medium">
                    No published events for{" "}
                    {headerLocationName || "this location"}
                  </p>
                  <p className="mt-1 text-amber-900/90">
                    Please create and publish an event for this location, then
                    return here to add a discount or coupon.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/vendor/events/create">Create an event</Link>
                  </Button>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="event_id"
                  render={({ field }) => (
                    <FormItem className="min-w-0 max-w-xl">
                      <FormLabel>Event</FormLabel>
                      <Select
                        value={
                          field.value > 0 ? String(field.value) : undefined
                        }
                        onValueChange={(v) => {
                          const eventId = Number(v);
                          field.onChange(eventId);
                          form.setValue("room_id", 0);
                          form.setValue("date_id", 0);
                          form.clearErrors("room_id");
                          form.clearErrors("date_id");
                        }}
                        disabled={
                          selectedLocationId <= 0 || eventsLoading
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full sm:h-10">
                            <SelectValue
                              placeholder={
                                selectedLocationId <= 0
                                  ? "Select a location in the header first"
                                  : eventsLoading
                                    ? "Loading events…"
                                    : "Select an event"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventOptions.map((ev) => (
                            <SelectItem key={ev.id} value={String(ev.id)}>
                              {ev.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isDiscountCategory && selectedEventId > 0 ? (
                <div className="min-w-0 max-w-xl space-y-4">
                  {dateOptions.length > 0 ? (
                    <FormField
                      control={form.control}
                      name="date_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormDescription>
                            Choose one event date for this discount.
                          </FormDescription>
                          <Select
                            value={
                              field.value > 0
                                ? String(field.value)
                                : undefined
                            }
                            onValueChange={(v) => selectDate(Number(v))}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 w-full sm:h-10">
                                <SelectValue placeholder="Select a date" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dateOptions.map((d) => (
                                <SelectItem key={d.id} value={String(d.id)}>
                                  {formatDateLabel(d.date)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      This event has no dates yet.
                    </p>
                  )}

                  {/* Room only when the chosen date has rooms in the API */}
                  {selectedDateId > 0 && selectedDateNeedsRoom ? (
                    <FormField
                      control={form.control}
                      name="room_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room</FormLabel>
                          <FormDescription>
                            Rooms available on this date.
                          </FormDescription>
                          <Select
                            value={
                              field.value > 0
                                ? String(field.value)
                                : undefined
                            }
                            onValueChange={(v) => {
                              form.setValue("room_id", Number(v), {
                                shouldValidate: true,
                              });
                              form.clearErrors("room_id");
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 w-full sm:h-10">
                                <SelectValue placeholder="Select a room" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roomOptions.map((room) => (
                                <SelectItem
                                  key={room.id}
                                  value={String(room.id)}
                                >
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
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
                          Must be unique for your venue. Letters and numbers
                          only; not case-sensitive.
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="e.g. SUMMER20"
                            maxLength={40}
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            inputMode="text"
                            className="w-full max-w-full font-mono uppercase sm:max-w-sm"
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
                        <FormLabel>Who should receive this coupon?</FormLabel>
                        <ChoiceCards
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            if (v === "all_active") {
                              form.setValue("customer_ids", []);
                              setSelectedCustomersMeta({});
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
                                ? "Email all active customers when this coupon is activated."
                                : "Choose specific customers to email.",
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
                          <FormLabel>Customers</FormLabel>
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
                                const label = customerDisplayName(c);
                                return (
                                  <div
                                    key={c.id}
                                    className="flex min-h-11 min-w-0 cursor-pointer touch-manipulation items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 active:bg-muted/80"
                                    onClick={() =>
                                      toggleCustomer(c.id, !checked, {
                                        name: label,
                                        email: c.email ?? "",
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Enter" ||
                                        e.key === " "
                                      ) {
                                        e.preventDefault();
                                        toggleCustomer(c.id, !checked, {
                                          name: label,
                                          email: c.email ?? "",
                                        });
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
                                        toggleCustomer(c.id, v === true, {
                                          name: label,
                                          email: c.email ?? "",
                                        })
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
                    <FormLabel>Value type</FormLabel>
                    <ChoiceCards
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        if (v === "percentage") {
                          form.setValue("flat_mode", null);
                          form.setValue("min_people", null);
                        } else if (!form.getValues("flat_mode")) {
                          form.setValue("flat_mode", "total");
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
                      <FormLabel>How should the fixed amount apply?</FormLabel>
                      <ChoiceCards
                        value={field.value ?? "total"}
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
                            key === "total"
                              ? "A fixed amount off the booking total."
                              : "A fixed amount off per person. A minimum party size is required.",
                        }))}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
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
                          min={0.01}
                          max={
                            values.value_type === "percentage" ? 100 : 100000
                          }
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
                        <FormLabel>Minimum party size</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={500}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Display name (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        maxLength={120}
                        placeholder="e.g. Summer Festival 15% Off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid from (optional)</FormLabel>
                    <FormDescription>
                      Leave blank to start as soon as it is activated.
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                        max={values.expires_at || undefined}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          // Re-check expiry relationship when start date changes
                          void form.trigger(["valid_from", "expires_at"]);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry date</FormLabel>
                    <FormDescription>
                      Must be today or a future date.
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        min={
                          values.valid_from?.trim() &&
                          values.valid_from > todayIsoDate()
                            ? values.valid_from
                            : todayIsoDate()
                        }
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          void form.trigger(["expires_at", "valid_from"]);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Status when saved</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full max-w-full sm:h-10 sm:max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activate immediately</SelectItem>
                        <SelectItem value="inactive">Save as inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    {values.category === "coupon_code" &&
                    values.status === "active" ? (
                      <FormDescription>
                        Activating a coupon will queue emails to the chosen
                        audience when you save.
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}

          {step === 5 ? (
            <div className="w-full min-w-0 max-w-2xl space-y-4 sm:space-y-5">
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                  Ready to save?
                </h3>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">
                  A quick check before this{" "}
                  {values.category === "coupon_code" ? "coupon" : "discount"}{" "}
                  goes live for {locationName}.
                </p>
              </div>

              <div className="min-w-0 overflow-hidden rounded-xl border bg-background shadow-sm">
                <div className="border-b bg-muted/30 px-3 py-4 sm:px-6 sm:py-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {values.category === "coupon_code"
                      ? "Coupon offer"
                      : "Discount offer"}
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                    {values.value_type === "percentage"
                      ? `${values.discount_value}% off`
                      : `£${Number(values.discount_value).toFixed(
                          Number(values.discount_value) % 1 === 0 ? 0 : 2
                        )}${
                          values.flat_mode === "per_person"
                            ? " per person"
                            : " off the total"
                        }`}
                  </p>
                  {values.category === "coupon_code" &&
                  values.coupon_code?.trim() ? (
                    <p className="mt-3 inline-flex max-w-full items-center rounded-md border bg-background px-2.5 py-1 font-mono text-sm font-medium tracking-wide break-all">
                      {values.coupon_code.trim()}
                    </p>
                  ) : null}
                  {values.name?.trim() ? (
                    <p className="mt-2 text-sm break-words text-muted-foreground">
                      {values.name.trim()}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0 space-y-5 px-3 py-4 sm:px-6 sm:py-5">
                  <section className="min-w-0 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Applies to
                    </h4>
                    <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                      <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                        <dt className="text-xs text-muted-foreground">
                          Location
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium break-words">
                          {locationName}
                        </dd>
                      </div>
                      <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                        <dt className="text-xs text-muted-foreground">Event</dt>
                        <dd className="mt-0.5 text-sm font-medium break-words">
                          {eventName}
                        </dd>
                      </div>
                      {isDiscountCategory && selectedDateId > 0 ? (
                        <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                          <dt className="text-xs text-muted-foreground">Date</dt>
                          <dd className="mt-0.5 text-sm font-medium">
                            {selectedDateLabel}
                          </dd>
                        </div>
                      ) : null}
                      {isDiscountCategory && selectedRoomId > 0 ? (
                        <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                          <dt className="text-xs text-muted-foreground">Room</dt>
                          <dd className="mt-0.5 text-sm font-medium break-words">
                            {roomName}
                          </dd>
                        </div>
                      ) : null}
                      {values.value_type === "flat" &&
                      values.flat_mode === "per_person" &&
                      values.min_people ? (
                        <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                          <dt className="text-xs text-muted-foreground">
                            Minimum party size
                          </dt>
                          <dd className="mt-0.5 text-sm font-medium">
                            {values.min_people}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>

                  {values.category === "coupon_code" ? (
                    <section className="min-w-0 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Email audience
                      </h4>
                      {values.customer_audience === "all_active" ? (
                        <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm font-medium">
                          All active customers
                        </p>
                      ) : (
                        <div className="min-w-0 overflow-hidden rounded-lg border bg-muted/20">
                          <div className="border-b px-3 py-2 text-xs text-muted-foreground">
                            {selectedCustomersForReview.length} customer
                            {selectedCustomersForReview.length === 1
                              ? ""
                              : "s"}{" "}
                            selected
                          </div>
                          <ul className="max-h-[min(12rem,40vh)] divide-y overflow-y-auto overscroll-contain sm:max-h-48">
                            {selectedCustomersForReview.map((c) => (
                              <li
                                key={c.id}
                                className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5"
                              >
                                <span className="truncate text-sm font-medium">
                                  {c.name}
                                </span>
                                {c.email ? (
                                  <span className="truncate text-xs text-muted-foreground">
                                    {c.email}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  ) : null}

                  <section className="min-w-0 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Schedule
                    </h4>
                    <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                      {values.valid_from?.trim() ? (
                        <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                          <dt className="text-xs text-muted-foreground">
                            Valid from
                          </dt>
                          <dd className="mt-0.5 text-sm font-medium">
                            {formatDateLabel(values.valid_from)}
                          </dd>
                        </div>
                      ) : null}
                      <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                        <dt className="text-xs text-muted-foreground">
                          Expires
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium">
                          {values.expires_at
                            ? formatDateLabel(values.expires_at)
                            : "—"}
                        </dd>
                      </div>
                      <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5 sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">
                          When saved
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium">
                          {values.status === "active"
                            ? "Activate immediately"
                            : "Save as inactive"}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>
              </div>

              {values.category === "coupon_code" &&
              values.status === "active" ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-pretty text-amber-950">
                  {values.customer_audience === "selected"
                    ? `Saving as active will email this coupon to ${selectedCustomersForReview.length} selected customer${selectedCustomersForReview.length === 1 ? "" : "s"}.`
                    : "Saving as active will email this coupon to all active customers."}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="sticky bottom-0 z-10 mt-6 border-t bg-background/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mt-8 sm:bg-transparent sm:pt-4 sm:pb-0 sm:backdrop-blur-none">
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 1 || isSubmitting}
              className="h-11 w-full touch-manipulation sm:h-10 sm:w-auto"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {step < STEPS.length ? (
              <Button
                type="button"
                onClick={goNext}
                className="h-11 w-full touch-manipulation sm:h-10 sm:w-auto"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || mode === "edit"}
                className="h-11 w-full touch-manipulation sm:h-10 sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  values.category === "coupon_code"
                    ? "Save coupon"
                    : "Save discount"
                ) : (
                  "Update (API pending)"
                )}
              </Button>
            )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
