"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  formatGuideDate,
  isDiscountDateOfferBlank,
  todayIsoDate,
  type DiscountFormValues,
} from "../../_lib/schema";
import type { Discount, DiscountEventWithDates } from "../../_lib/types";
import {
  CUSTOMER_AUDIENCE_DESCRIPTIONS,
  CUSTOMER_AUDIENCE_LABELS,
  DISCOUNT_CREATE_CATEGORIES,
  DISCOUNT_OFFER_KIND_LABELS,
} from "../../_lib/types";
import {
  buildDiscountStorePayload,
  discountToFormValues,
} from "../../_lib/build-store-payload";
import {
  buildCustomerPreviewItems,
  buildEventCatalogSlots,
  discountEventRequiresRoom,
  findDiscountEventCatalogDay,
  formatFormOfferValueLabel,
  isRoomFirstDiscountEvent,
  listDiscountEventRooms,
} from "../../_lib/offers";
import {
  useCreateDiscount,
  useDiscountEventsWithDates,
  useUpdateDiscount,
} from "../../_lib/queries";
import { DiscountWizardSkeleton } from "../discount-form-skeleton";
import { useHeaderLocationId } from "@/hooks/use-header-location-id";
import { DiscountDatesEditor } from "./discount-dates-editor";
import {
  DiscountCustomerDatesPreview,
  formatDiscountPreviewBadge,
} from "./discount-customer-dates-preview";
import { EventCouponStrip } from "@/components/public/event-coupon-strip";
import {
  COUPON_BANNER_HEADING_MAX,
  COUPON_BANNER_TEXT_MAX,
  COUPON_STRIP_DEFAULT_HEADING,
  couponToStripProps,
} from "@/lib/coupon-strip-props";

const EMPTY_EVENTS: DiscountEventWithDates[] = [];

const DISCOUNT_STEPS = [
  { id: 1, title: "Type" },
  { id: 2, title: "Event" },
  { id: 3, title: "Dates" },
  { id: 4, title: "Review" },
] as const;

const COUPON_STEPS = [
  { id: 1, title: "Type" },
  { id: 2, title: "Scope" },
  { id: 3, title: "Offer" },
  { id: 4, title: "Review" },
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
                "border-[var(--color-primary)] bg-[var(--color-primary)]/5",
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "relative flex size-4 shrink-0 items-center justify-center rounded-full border border-input shadow-xs",
                  selected && "border-[var(--color-primary)]",
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

function eventCatalogSummary(
  event: DiscountEventWithDates | null,
): string | null {
  if (!event) return null;

  if (isRoomFirstDiscountEvent(event)) {
    const rooms = event.rooms ?? [];
    const dateCount = rooms.reduce(
      (sum, room) => sum + (room.dates?.length ?? 0),
      0,
    );
    const roomLabel = rooms.length === 1 ? "1 room" : `${rooms.length} rooms`;
    if (dateCount === 0) {
      return `${roomLabel} · no upcoming dates yet`;
    }
    const dateLabel = dateCount === 1 ? "1 date" : `${dateCount} dates`;
    return `${roomLabel} · ${dateLabel} available next`;
  }

  const dates = event.dates ?? [];
  const dateCount = dates.length;
  if (dateCount === 0) return "No dates on this event yet";
  const roomSlots = dates.reduce(
    (sum, d) => sum + (d.rooms?.length ? d.rooms.length : 1),
    0,
  );
  const dateLabel = dateCount === 1 ? "1 date" : `${dateCount} dates`;
  if (roomSlots <= dateCount) return `${dateLabel} available next`;
  return `${dateLabel} · ${roomSlots} date/room options next`;
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
  const { status: sessionStatus } = useSession();
  /** Edit locks category — skip Type and start on Scope / Event. */
  const firstStep = mode === "edit" ? 2 : 1;
  const [step, setStep] = useState(firstStep);
  /** Prevents Next double-click from landing on Create and saving immediately. */
  const [createArmed, setCreateArmed] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomersMeta, setSelectedCustomersMeta] = useState<
    Record<number, { id: number; name: string; email: string }>
  >(() =>
    Object.fromEntries(
      (initialDiscount?.customers ?? []).map((customer) => [
        customer.id,
        {
          id: customer.id,
          name:
            customer.full_name || customer.email || `Customer #${customer.id}`,
          email: customer.email ?? "",
        },
      ]),
    ),
  );
  const debouncedCustomerSearch = useDebounce(customerSearch, 500);
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();

  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const currentVendorLocationId = useHeaderLocationId();

  const [locationHydrated, setLocationHydrated] = useState(false);
  useEffect(() => setLocationHydrated(true), []);
  const locationResolved = locationHydrated && sessionStatus !== "loading";

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
          dates: initialValues?.dates ?? [],
        },
    mode: "onChange",
  });

  const values = form.watch();
  const selectedLocationId = Number(values.location_id) || 0;
  const selectedEventId = Number(values.event_id) || 0;
  const isDiscountCategory = values.category === "discount";
  const allSteps = isDiscountCategory ? DISCOUNT_STEPS : COUPON_STEPS;
  const lastStep = allSteps[allSteps.length - 1]?.id ?? 4;
  /** Stepper tabs — Type omitted in edit (category is locked). */
  const visibleSteps = useMemo(
    () =>
      mode === "edit"
        ? allSteps.filter((s) => s.id !== 1)
        : [...allSteps],
    [allSteps, mode],
  );

  useEffect(() => {
    if (step !== lastStep) {
      setCreateArmed(false);
      return;
    }
    setCreateArmed(false);
    const id = window.setTimeout(() => setCreateArmed(true), 300);
    return () => window.clearTimeout(id);
  }, [step, lastStep]);

  // Edit: never show Type; keep category fixed to the saved record.
  useEffect(() => {
    if (mode !== "edit" || !initialDiscount) return;
    const locked =
      initialDiscount.category === "coupon_code" ? "coupon_code" : "discount";
    if (form.getValues("category") !== locked) {
      form.setValue("category", locked, { shouldDirty: false });
    }
    if (step < firstStep) setStep(firstStep);
  }, [mode, initialDiscount, form, step, firstStep]);

  const savedValidFrom = values.original_valid_from?.trim() ?? "";
  const minValidFrom =
    savedValidFrom && savedValidFrom < todayIsoDate()
      ? savedValidFrom
      : todayIsoDate();

  useEffect(() => {
    if (currentVendorLocationId <= 0) return;
    const current = form.getValues("location_id");
    if (current === currentVendorLocationId) return;

    if (mode === "edit") {
      if (current > 0) return;
      form.setValue("location_id", currentVendorLocationId, {
        shouldValidate: true,
      });
      return;
    }

    form.setValue("location_id", currentVendorLocationId, {
      shouldValidate: true,
    });
    form.setValue("event_id", 0, { shouldValidate: true });
    form.setValue("dates", [], { shouldValidate: true });
  }, [currentVendorLocationId, mode, form]);

  // Coupons: percentage only — coerce legacy flat / flat-total edits.
  useEffect(() => {
    if (values.category !== "coupon_code") return;
    if (values.value_type === "percentage" && values.flat_mode == null) return;
    form.setValue("value_type", "percentage", { shouldValidate: true });
    form.setValue("flat_mode", null);
    form.setValue("min_people", null);
  }, [values.category, values.value_type, values.flat_mode, form]);

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
    } as any,
  );

  const headerLocationName =
    selectedLocation?.city ||
    selectedLocation?.name ||
    (selectedLocationId > 0 ? `Location #${selectedLocationId}` : null);

  const discountLocationId = initialDiscount
    ? initialDiscount.vendor_location_id || initialDiscount.location?.id || 0
    : 0;
  const locationMismatch =
    mode === "edit" &&
    locationResolved &&
    discountLocationId > 0 &&
    currentVendorLocationId > 0 &&
    discountLocationId !== currentVendorLocationId;

  const selectedEvent = useMemo(
    () => eventsWithDates.find((e) => e.id === selectedEventId) ?? null,
    [eventsWithDates, selectedEventId],
  );

  // Backfill event_date labels from the events catalog after hydrate / event load.
  useEffect(() => {
    if (!isDiscountCategory || !selectedEvent) return;
    const rows = form.getValues("dates") ?? [];
    if (!rows.length) return;
    let changed = false;
    const next = rows.map((row) => {
      if (!(row.date_id > 0)) return row;
      const day = findDiscountEventCatalogDay(
        selectedEvent,
        row.date_id,
        Number(row.room_id) || 0,
      );
      if (!day?.date || row.event_date === day.date) return row;
      changed = true;
      return { ...row, event_date: day.date };
    });
    if (changed) {
      form.setValue("dates", next, { shouldDirty: false });
    }
  }, [isDiscountCategory, selectedEvent, form]);

  const eventOptions = useMemo(() => {
    const list = eventsWithDates.map((e) => ({
      id: e.id,
      name: e.name,
    }));
    if (selectedEventId > 0 && !list.some((e) => e.id === selectedEventId)) {
      list.push({
        id: selectedEventId,
        name: initialDiscount?.event?.name || `Event #${selectedEventId}`,
      });
    }
    return list;
  }, [eventsWithDates, selectedEventId, initialDiscount?.event?.name]);

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
    `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() ||
    c.email ||
    "Customer";

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
    [selectedCustomerIds, selectedCustomersMeta],
  );

  const eventName =
    selectedEventId > 0
      ? (eventOptions.find((e) => e.id === selectedEventId)?.name ??
        `Event #${selectedEventId}`)
      : "—";

  const selectedEventSummary = eventCatalogSummary(selectedEvent);

  /** Live strip preview while editing coupon banner fields. */
  const couponStripPreview = useMemo(() => {
    if (isDiscountCategory || !values.show_on_banner) return null;
    return couponToStripProps({
      coupon_code: values.coupon_code?.trim() || "YOURCODE",
      banner_heading: values.banner_heading,
      dynamic_text: values.dynamic_text,
      value_type: values.value_type,
      discount_value: values.discount_value,
      flat_mode: values.flat_mode,
      expires_at: values.expires_at,
      show_on_banner: true,
    });
  }, [
    isDiscountCategory,
    values.show_on_banner,
    values.coupon_code,
    values.banner_heading,
    values.dynamic_text,
    values.value_type,
    values.discount_value,
    values.flat_mode,
    values.expires_at,
  ]);

  const reviewDatesByDay = useMemo(() => {
    const rows = values.dates ?? [];
    const groups: {
      dateKey: string;
      dateLabel: string;
      items: {
        index: number;
        roomName: string;
        kind: string;
        valueLabel: string;
        validFrom: string;
        expiry: string;
        showOnPage: boolean;
        isLive: boolean;
      }[];
    }[] = [];
    const indexByKey = new Map<string, number>();

    rows.forEach((row, index) => {
      if (!(row.date_id > 0)) return;
      const day = findDiscountEventCatalogDay(
        selectedEvent,
        row.date_id,
        Number(row.room_id) || 0,
      );
      const dateKey = row.event_date || day?.date || `id-${row.date_id}`;
      const dateLabel = row.event_date
        ? formatGuideDate(row.event_date)
        : day?.date
          ? formatGuideDate(day.date)
          : "—";
      const roomName =
        row.room_id > 0
          ? (day?.roomName ?? `Room #${row.room_id}`)
          : "Whole date";
      const kind =
        row.value_type === "percentage"
          ? "Percentage"
          : row.flat_mode === "per_person"
            ? "Flat/person"
            : "Percentage";
      const item = {
        index,
        roomName,
        kind,
        valueLabel: formatFormOfferValueLabel(row),
        validFrom: row.valid_from?.trim()
          ? formatGuideDate(row.valid_from)
          : "—",
        expiry: row.expires_at ? formatGuideDate(row.expires_at) : "—",
        showOnPage: row.show_on_banner !== false,
        isLive: row.is_live !== false,
      };
      const existing = indexByKey.get(dateKey);
      if (existing === undefined) {
        indexByKey.set(dateKey, groups.length);
        groups.push({ dateKey, dateLabel, items: [item] });
      } else {
        groups[existing].items.push(item);
      }
    });

    return groups;
  }, [values.dates, selectedEvent]);

  /** All event date/room slots — discounted ones overlay the offer; others show list price. */
  const reviewCustomerPreviewItems = useMemo(() => {
    if (!isDiscountCategory || !selectedEvent) return [];
    return buildCustomerPreviewItems(
      buildEventCatalogSlots(selectedEvent),
      values.dates ?? [],
      formatDiscountPreviewBadge,
      "review-preview",
    );
  }, [isDiscountCategory, values.dates, selectedEvent]);

  const reviewEventRoomTabs = useMemo(
    () =>
      isDiscountCategory ? listDiscountEventRooms(selectedEvent) : [],
    [isDiscountCategory, selectedEvent],
  );

  /** Drop auto-filled slots the vendor never configured — offers are optional per date. */
  const pruneBlankDiscountDates = () => {
    const rows = form.getValues("dates") ?? [];
    const kept = rows.filter(
      (row) => row.date_id > 0 && !isDiscountDateOfferBlank(row),
    );
    if (kept.length !== rows.length) {
      form.setValue("dates", kept, {
        shouldValidate: false,
        shouldDirty: true,
      });
      form.clearErrors("dates");
    }
    return kept;
  };

  const validateDiscountDatesRooms = () => {
    const rows = form.getValues("dates") ?? [];
    let ok = true;
    rows.forEach((row, index) => {
      if (!(row.date_id > 0) || isDiscountDateOfferBlank(row)) return;
      if (
        discountEventRequiresRoom(selectedEvent, row.date_id) &&
        !(row.room_id > 0)
      ) {
        form.setError(`dates.${index}.room_id`, {
          type: "manual",
          message: "Please select a room",
        });
        ok = false;
      }
    });
    return ok;
  };

  const validateStep = async (current: number) => {
    if (current === 1) return form.trigger(["category"]);

    if (isDiscountCategory) {
      if (current === 2) {
        return form.trigger(["location_id", "event_id"]);
      }
      if (current === 3) {
        pruneBlankDiscountDates();
        const ok = await form.trigger(["dates"]);
        const roomsOk = validateDiscountDatesRooms();
        return ok && roomsOk;
      }
      return true;
    }

    // Coupon
    if (current === 2) {
      return form.trigger([
        "location_id",
        "event_id",
        "coupon_code",
        "show_on_banner",
        "banner_heading",
        "dynamic_text",
        "customer_audience",
        "customer_ids",
      ]);
    }
    if (current === 3) {
      const fields: (keyof DiscountFormValues)[] = [
        "value_type",
        "discount_value",
        "expires_at",
        "valid_from",
        "status",
      ];
      if (values.value_type === "flat") {
        // Date discounts: flat is per-person only.
        fields.push("flat_mode", "min_people");
      }
      return form.trigger(fields);
    }
    return true;
  };

  const goNext = async () => {
    const ok = await validateStep(step);
    if (!ok) return;
    setStep(Math.min(step + 1, lastStep));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, firstStep));

  const goToStep = async (target: number) => {
    if (target === step) return;
    if (target < firstStep || target > lastStep) return;

    if (target < step) {
      setStep(target);
      return;
    }

    for (let s = step; s < target; s++) {
      const ok = await validateStep(s);
      if (!ok) {
        setStep(s);
        return;
      }
    }
    setStep(target);
  };

  /** Persist only when Review Create / Save is clicked (never via form submit / Next). */
  const saveDiscount = async (data: DiscountFormValues) => {
    if (step !== lastStep || !createArmed) return;

    if (data.category === "discount") {
      const kept = pruneBlankDiscountDates();
      if (kept.length === 0) {
        setStep(3);
        form.setError("dates", {
          type: "manual",
          message: "Set at least one date offer (value and expiry).",
        });
        return;
      }
      data = { ...data, dates: kept };
      if (!validateDiscountDatesRooms()) {
        setStep(3);
        return;
      }
    }

    const payload = buildDiscountStorePayload(data);
    try {
      if (mode === "edit" && initialDiscount) {
        await updateDiscount.mutateAsync({ id: initialDiscount.id, payload });
      } else {
        await createDiscount.mutateAsync(payload);
      }
      router.push("/vendor/discounts");
    } catch {
      // Stay on the wizard so the vendor can correct and retry
    }
  };

  const onCreateClick = () => {
    if (step !== lastStep || !createArmed) return;
    void form.handleSubmit(saveDiscount)();
  };

  const onFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    e.preventDefault();
  };

  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const toggleCustomer = (
    id: number,
    checked: boolean,
    meta?: { name: string; email: string },
  ) => {
    const current = Array.isArray(form.getValues("customer_ids"))
      ? form.getValues("customer_ids")
      : [];
    form.setValue(
      "customer_ids",
      checked ? [...current, id] : current.filter((x) => x !== id),
      { shouldValidate: true, shouldDirty: true },
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

  const visibleCustomerIds = customers.map((c) => c.id);
  const allVisibleSelected =
    visibleCustomerIds.length > 0 &&
    visibleCustomerIds.every((id) => selectedCustomerIds.includes(id));

  const selectAllVisibleCustomers = () => {
    const current = new Set(selectedCustomerIds);
    const metaUpdates: Record<
      number,
      { id: number; name: string; email: string }
    > = {};
    for (const c of customers) {
      current.add(c.id);
      metaUpdates[c.id] = {
        id: c.id,
        name: customerDisplayName(c),
        email: c.email ?? "",
      };
    }
    form.setValue("customer_ids", Array.from(current), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setSelectedCustomersMeta((prev) => ({ ...prev, ...metaUpdates }));
  };

  const clearSelectedCustomers = () => {
    form.setValue("customer_ids", [], {
      shouldValidate: true,
      shouldDirty: true,
    });
    setSelectedCustomersMeta({});
  };

  const isSubmitting = createDiscount.isPending || updateDiscount.isPending;

  if (locationMismatch) {
    const ownerName =
      initialDiscount?.location?.name || `Location #${discountLocationId}`;
    return (
      <div className={pageCardClassName("min-w-0")}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">This discount belongs to {ownerName}</p>
          <p className="mt-1 text-amber-900/90">
            You are currently viewing {headerLocationName || "another location"}
            . Switch the location in the header to {ownerName} to edit this
            discount.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/vendor/discounts">Back to Discounts</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    if (!locationResolved || (selectedLocationId > 0 && eventsLoading)) {
      return <DiscountWizardSkeleton />;
    }

    if (selectedLocationId <= 0) {
      return (
        <div className={pageCardClassName("min-w-0")}>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Select a location first</p>
            <p className="mt-1 text-amber-900/90">
              Choose a location in the header. Discounts and coupons apply to
              that location only.
            </p>
          </div>
        </div>
      );
    }

    if (eventsWithDates.length === 0) {
      return (
        <div className={pageCardClassName("min-w-0")}>
          <div className="rounded-lg border border-dashed border-[#D6ECEF] bg-[#F7FCFC] px-4 py-10 text-center">
            <p className="font-medium text-[#0F172A]">
              No published events for {headerLocationName || "this location"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              A discount or coupon always applies to an event. Create and
              publish one for this location, then come back to add an offer.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/vendor/events/create">Create an event</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/vendor/discounts">Back to Discounts</Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={onFormSubmit}
        onKeyDown={onFormKeyDown}
        className="flex w-full min-w-0 flex-col gap-4"
      >
        <div className={pageCardClassName("min-w-0 overflow-x-hidden")}>
          <div
            role="tablist"
            aria-label="Discount steps"
            className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {visibleSteps.map((s, index) => {
              const isCurrent = step === s.id;
              const isComplete = step > s.id;
              const displayNum = index + 1;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-current={isCurrent ? "step" : undefined}
                  disabled={isSubmitting}
                  onClick={() => void goToStep(s.id)}
                  className={cn(
                    "flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors touch-manipulation sm:px-3 sm:text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40",
                    "disabled:pointer-events-none disabled:opacity-60",
                    isCurrent &&
                      "border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-medium",
                    isComplete &&
                      "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                    !isCurrent &&
                      !isComplete &&
                      "text-muted-foreground hover:border-[var(--color-primary)]/40 hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      isComplete
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isComplete ? <Check className="h-3 w-3" /> : displayNum}
                  </span>
                  {s.title}
                </button>
              );
            })}
          </div>

          {/* Step 1 — Type (create only; category is locked when editing) */}
          {step === 1 && mode === "create" ? (
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-base">
                    What would you like to create?
                  </FormLabel>
                  <FormDescription>
                    Uses the location in the header. Discount = automatic on
                    dates you pick. Coupon = a code customers enter at checkout.
                  </FormDescription>
                  <ChoiceCards
                    value={
                      field.value === "coupon_code" ? "coupon_code" : "discount"
                    }
                    onChange={(key) => {
                      field.onChange(key);
                      form.setValue("coupon_code", "");
                      form.setValue("show_on_banner", true);
                      form.setValue(
                        "banner_heading",
                        COUPON_STRIP_DEFAULT_HEADING,
                      );
                      form.setValue("dynamic_text", "");
                      form.setValue("customer_audience", "all_active");
                      form.setValue("customer_ids", []);
                      form.setValue("dates", []);
                      setSelectedCustomersMeta({});
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

          {/* Discount Step 2 — Event */}
          {step === 2 && isDiscountCategory ? (
            <div className="min-w-0 space-y-5">
              <div>
                <h3 className="text-base font-medium">Which event?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Offers apply only to dates from this event. You pick those
                  next.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium text-foreground">
                  {headerLocationName || "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  (from header)
                </span>
              </div>
              <FormField
                control={form.control}
                name="event_id"
                render={({ field }) => (
                  <FormItem className="min-w-0 max-w-lg">
                    <FormLabel>Event</FormLabel>
                    <Select
                      value={field.value > 0 ? String(field.value) : undefined}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        form.setValue("dates", [], { shouldDirty: true });
                      }}
                      disabled={eventsLoading || mode === "edit"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventOptions.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mode === "edit" ? (
                      <FormDescription>
                        Event can’t be changed after the discount is created.
                      </FormDescription>
                    ) : selectedEventSummary ? (
                      <p className="text-sm text-muted-foreground">
                        {selectedEventSummary}
                      </p>
                    ) : (
                      <FormDescription>
                        Dates and rooms on the next step come from this event.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}

          {/* Discount Step 3 — Dates */}
          {step === 3 && isDiscountCategory ? (
            <DiscountDatesEditor
              form={form}
              selectedEvent={selectedEvent}
              disabled={isSubmitting}
            />
          ) : null}

          {/* Coupon Step 2 — Scope */}
          {step === 2 && !isDiscountCategory ? (
            <div className="min-w-0 space-y-5">
              <div>
                <h3 className="text-base font-medium">Scope</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Location:{" "}
                  <span className="font-medium text-foreground">
                    {headerLocationName || "—"}
                  </span>{" "}
                  (from header). Coupons are tied to one event.
                </p>
              </div>

              <FormField
                control={form.control}
                name="event_id"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Event</FormLabel>
                    <Select
                      value={field.value > 0 ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={eventsLoading || mode === "edit"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full max-w-full sm:max-w-md">
                          <SelectValue placeholder="Select an event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventOptions.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mode === "edit" ? (
                      <FormDescription>
                        Event can’t be changed after the coupon is created.
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coupon_code"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Coupon code</FormLabel>
                    <FormDescription>
                      {mode === "edit"
                        ? "Code can’t be changed after the coupon is created."
                        : "Typed in manually — not auto-generated. Letters and numbers only; not case-sensitive."}
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
                        disabled={mode === "edit"}
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
                name="show_on_banner"
                render={({ field }) => (
                  <FormItem className="flex min-w-0 flex-row items-start gap-3 rounded-lg border bg-muted/20 p-3 sm:p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="min-w-0 space-y-1">
                      <FormLabel className="cursor-pointer text-sm font-medium leading-snug">
                        Show on event page banner
                      </FormLabel>
                      <FormDescription className="text-pretty">
                        Promote this code in the marketing strip at the top of
                        the event page. Turn off for private or email-only
                        coupons.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {values.show_on_banner ? (
                <div className="min-w-0 space-y-3">
                  <FormField
                    control={form.control}
                    name="banner_heading"
                    render={({ field }) => {
                      const length = (field.value ?? "").length;
                      return (
                        <FormItem className="min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <FormLabel>
                              Banner heading{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <span
                              className={cn(
                                "text-xs tabular-nums text-muted-foreground",
                                length >= COUPON_BANNER_HEADING_MAX &&
                                  "font-medium text-amber-700",
                              )}
                            >
                              {length}/{COUPON_BANNER_HEADING_MAX}
                            </span>
                          </div>
                          <FormDescription>
                            Small eyebrow above the main line (shown in
                            uppercase on the strip). Required when the banner is
                            on.
                          </FormDescription>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder={COUPON_STRIP_DEFAULT_HEADING}
                              maxLength={COUPON_BANNER_HEADING_MAX}
                              className="w-full max-w-full sm:max-w-lg"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="dynamic_text"
                    render={({ field }) => {
                      const length = (field.value ?? "").length;
                      return (
                        <FormItem className="min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <FormLabel>
                              Banner subheading{" "}
                              <span className="font-normal text-muted-foreground">
                                (optional)
                              </span>
                            </FormLabel>
                            <span
                              className={cn(
                                "text-xs tabular-nums text-muted-foreground",
                                length >= COUPON_BANNER_TEXT_MAX &&
                                  "font-medium text-amber-700",
                              )}
                            >
                              {length}/{COUPON_BANNER_TEXT_MAX}
                            </span>
                          </div>
                          <FormDescription>
                            Optional main promo line on the event page strip.
                            Offer badge and countdown use the Offer step values.
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder="e.g. Claim your 20% off afternoon tea"
                              maxLength={COUPON_BANNER_TEXT_MAX}
                              rows={2}
                              className="w-full max-w-full resize-none sm:max-w-lg"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {couponStripPreview ? (
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Banner preview
                      </p>
                      <div className="overflow-hidden rounded-lg border shadow-sm">
                        <EventCouponStrip
                          {...couponStripPreview}
                          position="static"
                          dismissible={false}
                          previewMode
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Countdown uses the Expiry date from the Offer step.
                        Badge uses the offer value.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="customer_audience"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-3">
                    <FormLabel>Who can use this coupon?</FormLabel>
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
                          CUSTOMER_AUDIENCE_LABELS,
                        ) as (keyof typeof CUSTOMER_AUDIENCE_LABELS)[]
                      ).map((key) => ({
                        value: key,
                        label: CUSTOMER_AUDIENCE_LABELS[key],
                        description: CUSTOMER_AUDIENCE_DESCRIPTIONS[key],
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <FormLabel className="mb-0">Customers</FormLabel>
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedCustomerIds.length > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={clearSelectedCustomers}
                            >
                              Clear selection
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                            disabled={
                              customersLoading || customers.length === 0
                            }
                            onClick={() => {
                              if (allVisibleSelected) {
                                const visible = new Set(visibleCustomerIds);
                                form.setValue(
                                  "customer_ids",
                                  selectedCustomerIds.filter(
                                    (id) => !visible.has(id),
                                  ),
                                  {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  },
                                );
                                setSelectedCustomersMeta((prev) => {
                                  const next = { ...prev };
                                  for (const id of visible) delete next[id];
                                  return next;
                                });
                              } else {
                                selectAllVisibleCustomers();
                              }
                            }}
                          >
                            {allVisibleSelected
                              ? "Deselect all shown"
                              : "Select all shown"}
                          </Button>
                        </div>
                      </div>
                      <FormDescription>
                        Search and select customers by name or email. The code
                        is emailed only to those you pick.
                      </FormDescription>
                      <div className="relative mt-2">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search customers…"
                          className="pl-8"
                        />
                      </div>
                      <div className="mt-2 max-h-[min(16rem,45vh)] space-y-1 overflow-y-auto overscroll-contain rounded-lg border p-2">
                        {customersLoading || customersFetching ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground">
                            Loading customers…
                          </p>
                        ) : customers.length === 0 ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground">
                            No customers found.
                          </p>
                        ) : (
                          customers.map((c) => {
                            const checked = selectedCustomerIds.includes(c.id);
                            const label = customerDisplayName(c);
                            return (
                              <div
                                key={c.id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 transition-colors",
                                  checked
                                    ? "bg-[var(--color-primary)]/5"
                                    : "hover:bg-muted/60",
                                )}
                                onClick={() =>
                                  toggleCustomer(c.id, !checked, {
                                    name: label,
                                    email: c.email ?? "",
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
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
                          })
                        )}
                      </div>
                      {selectedCustomerIds.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {selectedCustomerIds.length} selected
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>
          ) : null}

          {/* Coupon Step 3 — Offer */}
          {step === 3 && !isDiscountCategory ? (
            <div className="min-w-0 space-y-5">
              <div>
                <h3 className="text-base font-medium">Offer & validity</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  One value and one booking window for the whole coupon code.
                </p>
              </div>

              <FormItem className="space-y-3">
                <FormLabel>Offer type</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Coupons are percentage off the booking total.
                </p>
              </FormItem>

              <FormField
                control={form.control}
                name="discount_value"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Percentage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step={1}
                        value={
                          field.value != null && Number(field.value) > 0
                            ? field.value
                            : ""
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          // 0 = unset; input stays blank while cleared
                          field.onChange(raw === "" ? 0 : Number(raw));
                        }}
                        className="w-full max-w-full sm:max-w-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="valid_from"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Valid from</FormLabel>
                      <FormDescription>
                        Optional. The code only works for bookings in this
                        window.
                      </FormDescription>
                      <FormControl>
                        <Input
                          type="date"
                          min={minValidFrom}
                          max={values.expires_at || undefined}
                          value={field.value ?? ""}
                          onChange={field.onChange}
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
                    <FormItem className="min-w-0">
                      <FormLabel>Expiry</FormLabel>
                      <FormDescription>
                        After this date the code stops working automatically.
                        Also drives the banner countdown.
                      </FormDescription>
                      <FormControl>
                        <Input
                          type="date"
                          min={todayIsoDate()}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {values.show_on_banner && couponStripPreview ? (
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Banner preview
                  </p>
                  <div className="overflow-hidden rounded-lg border shadow-sm">
                    <EventCouponStrip
                      {...couponStripPreview}
                      position="static"
                      dismissible={false}
                      previewMode
                    />
                  </div>
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3 sm:p-4">
                    <div className="min-w-0 space-y-1">
                      <FormLabel className="text-sm font-medium">
                        {field.value === "active" ? "Live" : "Paused"}
                      </FormLabel>
                      <FormDescription className="text-pretty">
                        Off pauses checkout use; settings stay saved. You can
                        turn it back on anytime.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "active"}
                        onCheckedChange={(on) =>
                          field.onChange(on ? "active" : "inactive")
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          ) : null}

          {/* Step 4 — Review */}
          {step === 4 ? (
            <div className="min-w-0 space-y-5">
              <div>
                <h3 className="text-base font-medium">Review</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check everything looks right before saving.
                </p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Display name (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={
                          isDiscountCategory
                            ? "e.g. August midweek offer"
                            : "e.g. Welcome coupon"
                        }
                        maxLength={120}
                        className="w-full max-w-full sm:max-w-md"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="min-w-0 space-y-4 rounded-xl border bg-muted/10 p-3 sm:p-4">
                <section className="min-w-0 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Basics
                  </h4>
                  <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">Type</dt>
                      <dd className="mt-0.5 text-sm font-medium">
                        {isDiscountCategory ? "Discount" : "Coupon Code"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">Event</dt>
                      <dd className="mt-0.5 text-sm font-medium">
                        {eventName}
                      </dd>
                    </div>
                  </dl>
                </section>

                {isDiscountCategory ? (
                  <section className="min-w-0 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Offers ({values.dates?.length ?? 0})
                      {reviewDatesByDay.length > 1
                        ? ` · ${reviewDatesByDay.length} days`
                        : ""}
                    </h4>
                    {reviewDatesByDay.length === 0 ? (
                      <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                        No dates added.
                      </p>
                    ) : (
                      <div className="min-w-0 space-y-2.5">
                        {reviewDatesByDay.map((group) => (
                          <div
                            key={group.dateKey}
                            className="min-w-0 overflow-hidden rounded-lg border bg-white"
                          >
                            <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                              <p className="text-sm font-semibold text-foreground">
                                {group.dateLabel}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {group.items.length}{" "}
                                {group.items.length === 1 ? "offer" : "offers"}
                              </p>
                            </div>
                            <ul className="divide-y">
                              {group.items.map((item) => (
                                <li
                                  key={`review-date-${item.index}`}
                                  className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                      {item.roomName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.kind} · {item.valueLabel}
                                      {item.showOnPage
                                        ? " · badge on page"
                                        : " · badge hidden"}
                                      {item.isLive ? " · live" : " · paused"}
                                    </p>
                                  </div>
                                  <p className="shrink-0 text-xs text-muted-foreground sm:text-right">
                                    {item.validFrom} → {item.expiry}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    {reviewCustomerPreviewItems.length > 0 ? (
                      <DiscountCustomerDatesPreview
                        items={reviewCustomerPreviewItems}
                        rooms={reviewEventRoomTabs}
                        className="pt-1"
                      />
                    ) : null}
                  </section>
                ) : (
                  <>
                    <section className="min-w-0 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Coupon
                      </h4>
                      <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                          <dt className="text-xs text-muted-foreground">
                            Code
                          </dt>
                          <dd className="mt-0.5 font-mono text-sm font-medium">
                            {values.coupon_code?.trim() || "—"}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                          <dt className="text-xs text-muted-foreground">
                            Event page banner
                          </dt>
                          <dd className="mt-0.5 text-sm font-medium">
                            {values.show_on_banner ? "Shown" : "Hidden"}
                          </dd>
                        </div>
                        {values.show_on_banner ? (
                          <>
                            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                              <dt className="text-xs text-muted-foreground">
                                Banner heading
                              </dt>
                              <dd className="mt-0.5 text-sm font-medium text-pretty">
                                {values.banner_heading?.trim() || "—"}
                              </dd>
                            </div>
                            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                              <dt className="text-xs text-muted-foreground">
                                Banner subheading
                              </dt>
                              <dd className="mt-0.5 text-sm font-medium text-pretty">
                                {values.dynamic_text?.trim() || "—"}
                              </dd>
                            </div>
                          </>
                        ) : null}
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                          <dt className="text-xs text-muted-foreground">
                            Offer
                          </dt>
                          <dd className="mt-0.5 text-sm font-medium">
                            {values.value_type === "percentage"
                              ? `${values.discount_value}% off`
                              : values.flat_mode === "per_person"
                                ? `£${values.discount_value} / person${
                                    values.min_people
                                      ? ` (min ${values.min_people})`
                                      : ""
                                  }`
                                : `${values.discount_value}% off`}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                          <dt className="text-xs text-muted-foreground">
                            Window
                          </dt>
                          <dd className="mt-0.5 text-sm font-medium">
                            {values.valid_from?.trim()
                              ? formatGuideDate(values.valid_from)
                              : "—"}{" "}
                            →{" "}
                            {values.expires_at
                              ? formatGuideDate(values.expires_at)
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <section className="min-w-0 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Audience
                      </h4>
                      {values.customer_audience === "all_active" ? (
                        <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm font-medium">
                          Everyone — customers and guest checkouts
                        </p>
                      ) : (
                        <div className="overflow-hidden rounded-lg border bg-muted/20">
                          <div className="border-b px-3 py-2 text-xs text-muted-foreground">
                            {selectedCustomersForReview.length} customer
                            {selectedCustomersForReview.length === 1
                              ? ""
                              : "s"}{" "}
                            selected
                          </div>
                          <ul className="max-h-[min(12rem,40vh)] divide-y overflow-y-auto">
                            {selectedCustomersForReview.map((c) => (
                              <li
                                key={c.id}
                                className="flex flex-col gap-0.5 px-3 py-2.5"
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
                  </>
                )}
              </div>

              {values.category === "coupon_code" &&
              values.status === "active" ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-pretty text-amber-950">
                  {values.customer_audience === "selected"
                    ? `Saving as live will email this coupon to ${selectedCustomersForReview.length} selected customer${selectedCustomersForReview.length === 1 ? "" : "s"}.`
                    : "Saving as live may email this coupon to your customers."}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="sticky bottom-0 z-10 mt-6 border-t bg-background/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mt-8 sm:bg-transparent sm:pt-4 sm:pb-0 sm:backdrop-blur-none">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {step > firstStep ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <Button asChild type="button" variant="outline">
                    <Link href="/vendor/discounts">Cancel</Link>
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {step < lastStep ? (
                  <Button
                    type="button"
                    onClick={() => void goNext()}
                    disabled={isSubmitting}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={onCreateClick}
                    disabled={isSubmitting || !createArmed}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : mode === "edit" ? (
                      "Save changes"
                    ) : (
                      "Create"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
