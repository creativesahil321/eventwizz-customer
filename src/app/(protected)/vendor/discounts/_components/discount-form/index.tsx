"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  DUMMY_EVENTS,
  DUMMY_LOCATIONS,
  DUMMY_ROOMS,
} from "../../_lib/dummy-data";
import {
  defaultDiscountFormValues,
  discountFormSchema,
  type DiscountFormValues,
} from "../../_lib/schema";
import type { Discount } from "../../_lib/types";
import {
  DISCOUNT_CATEGORY_LABELS,
  DISCOUNT_VALUE_TYPE_LABELS,
  FLAT_MODE_LABELS,
} from "../../_lib/types";

const STEPS = [
  { id: 1, title: "Category" },
  { id: 2, title: "Scope" },
  { id: 3, title: "Value" },
  { id: 4, title: "Expiry" },
  { id: 5, title: "Review" },
] as const;

function discountToFormValues(discount: Discount): DiscountFormValues {
  return {
    name: discount.name ?? "",
    category: discount.category,
    location_id: discount.location_id,
    event_id: discount.event_id,
    room_id: discount.room_id,
    applicable_dates: discount.applicable_dates,
    coupon_code: discount.coupon_code ?? "",
    value_type: discount.value_type,
    discount_value: discount.discount_value,
    flat_mode: discount.flat_mode,
    min_people: discount.min_people,
    valid_from: discount.valid_from ?? "",
    expires_at: discount.expires_at,
    status: discount.status === "expired" ? "inactive" : discount.status,
  };
}

interface DiscountFormWizardProps {
  mode: "create" | "edit";
  initialDiscount?: Discount;
  /** Prefill for create (e.g. from Edit Event → Add discount) */
  initialValues?: Partial<DiscountFormValues>;
}

export function DiscountFormWizard({
  mode,
  initialDiscount,
  initialValues,
}: DiscountFormWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: initialDiscount
      ? discountToFormValues(initialDiscount)
      : { ...defaultDiscountFormValues, ...initialValues },
    mode: "onChange",
  });

  const values = form.watch();

  const locations = useMemo(() => {
    const list = [...DUMMY_LOCATIONS];
    const locId = Number(values.location_id);
    if (locId > 0 && !list.some((l) => l.id === locId)) {
      list.push({ id: locId, name: `Location #${locId}` });
    }
    return list;
  }, [values.location_id]);

  const events = useMemo(() => {
    const list = [...DUMMY_EVENTS];
    const evId = Number(values.event_id);
    if (evId > 0 && !list.some((e) => e.id === evId)) {
      list.push({
        id: evId,
        location_id: Number(values.location_id) || 0,
        name: initialValues?.name?.replace(/ promo$/, "") || `Event #${evId}`,
      });
    }
    return list;
  }, [values.event_id, values.location_id, initialValues?.name]);

  const eventsForLocation = useMemo(
    () =>
      events.filter(
        (e) =>
          !values.location_id ||
          e.location_id === Number(values.location_id) ||
          e.location_id === 0
      ),
    [events, values.location_id]
  );

  const roomsForEvent = useMemo(
    () => DUMMY_ROOMS.filter((r) => r.event_id === Number(values.event_id)),
    [values.event_id]
  );

  const locationName =
    locations.find((l) => l.id === Number(values.location_id))?.name ?? "—";
  const eventName =
    events.find((e) => e.id === Number(values.event_id))?.name ?? "—";
  const roomName =
    DUMMY_ROOMS.find((r) => r.id === Number(values.room_id))?.name ?? "—";

  const validateStep = async (current: number) => {
    if (current === 1) {
      return form.trigger(["category"]);
    }
    if (current === 2) {
      const fields: (keyof DiscountFormValues)[] = ["location_id", "event_id"];
      if (values.category === "date_wise") {
        fields.push("room_id", "applicable_dates");
      }
      if (values.category === "coupon_code") {
        fields.push("coupon_code");
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
    setIsSubmitting(true);
    // Dummy save — replace with POST/PUT when API is ready
    await new Promise((r) => setTimeout(r, 600));
    console.info("[DiscountForm] payload for backend:", data);
    toast.success(
      mode === "create"
        ? "Discount saved (dummy). Payload logged to console for API reference."
        : "Discount updated (dummy). Payload logged to console for API reference."
    );
    setIsSubmitting(false);
    router.push("/vendor/discounts");
  };

  const addDate = (date: string) => {
    if (!date) return;
    const current = form.getValues("applicable_dates") ?? [];
    if (current.includes(date)) return;
    form.setValue("applicable_dates", [...current, date].sort(), {
      shouldValidate: true,
    });
  };

  const removeDate = (date: string) => {
    const current = form.getValues("applicable_dates") ?? [];
    form.setValue(
      "applicable_dates",
      current.filter((d) => d !== date),
      { shouldValidate: true }
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full min-w-0 flex-col gap-4"
      >
        <div className={pageCardClassName()}>
          <div className="mb-6 flex flex-wrap gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  step === s.id &&
                    "border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-medium",
                  step > s.id && "border-emerald-300 bg-emerald-50 text-emerald-800"
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

          {/* Step 1 — Category */}
          {step === 1 ? (
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-base">Discount category</FormLabel>
                  <FormDescription>
                    Choose how this discount targets bookings. Categories are
                    mutually exclusive.
                  </FormDescription>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        // Reset category-specific fields
                        form.setValue("room_id", null);
                        form.setValue("applicable_dates", []);
                        form.setValue("coupon_code", "");
                      }}
                      className="grid gap-3 md:grid-cols-3"
                    >
                      {(
                        Object.keys(
                          DISCOUNT_CATEGORY_LABELS
                        ) as (keyof typeof DISCOUNT_CATEGORY_LABELS)[]
                      ).map((key) => (
                        <Label
                          key={key}
                          htmlFor={`cat-${key}`}
                          className={cn(
                            "flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors",
                            field.value === key &&
                              "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={key} id={`cat-${key}`} />
                            <span className="font-medium">
                              {DISCOUNT_CATEGORY_LABELS[key]}
                            </span>
                          </div>
                          <span className="pl-6 text-xs text-muted-foreground">
                            {key === "event_specific" &&
                              "Applies to the whole selected event."}
                            {key === "date_wise" &&
                              "Applies to a room/hall on selected dates."}
                            {key === "coupon_code" &&
                              "Customer enters a code at checkout."}
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {/* Step 2 — Scope */}
          {step === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        form.setValue("event_id", 0);
                        form.setValue("room_id", null);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={String(loc.id)}>
                            {loc.name}
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
                name="event_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        form.setValue("room_id", null);
                      }}
                      disabled={!values.location_id}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventsForLocation.map((ev) => (
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

              {values.category === "date_wise" ? (
                <>
                  <FormField
                    control={form.control}
                    name="room_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room / Hall</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(v) => field.onChange(Number(v))}
                          disabled={!values.event_id}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roomsForEvent.map((room) => (
                              <SelectItem key={room.id} value={String(room.id)}>
                                {room.name}
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
                    name="applicable_dates"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Applicable dates</FormLabel>
                        <FormDescription>
                          Date-wise targeting — which booked dates get this
                          discount (separate from expiry).
                        </FormDescription>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            type="date"
                            id="add-applicable-date"
                            onChange={(e) => {
                              addDate(e.target.value);
                              e.target.value = "";
                            }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(field.value ?? []).length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              No dates selected yet.
                            </span>
                          ) : (
                            field.value.map((date) => (
                              <button
                                key={date}
                                type="button"
                                onClick={() => removeDate(date)}
                                className="rounded-full border bg-muted px-3 py-1 text-xs hover:bg-destructive/10"
                              >
                                {date} ×
                              </button>
                            ))
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              {values.category === "coupon_code" ? (
                <FormField
                  control={form.control}
                  name="coupon_code"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Coupon code</FormLabel>
                      <FormDescription>
                        Typed by the vendor (not auto-generated). Unique per
                        vendor, case-insensitive. Reusable until expiry.
                      </FormDescription>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="e.g. SUMMER20"
                          className="max-w-sm font-mono uppercase"
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>
          ) : null}

          {/* Step 3 — Value */}
          {step === 3 ? (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="value_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Discount type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (v === "percentage") {
                            form.setValue("flat_mode", null);
                            form.setValue("min_people", null);
                          } else if (!form.getValues("flat_mode")) {
                            form.setValue("flat_mode", "flat_on_total");
                          }
                        }}
                        className="grid gap-3 md:grid-cols-2"
                      >
                        {(
                          Object.keys(
                            DISCOUNT_VALUE_TYPE_LABELS
                          ) as (keyof typeof DISCOUNT_VALUE_TYPE_LABELS)[]
                        ).map((key) => (
                          <Label
                            key={key}
                            htmlFor={`val-${key}`}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border p-4",
                              field.value === key &&
                                "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                            )}
                          >
                            <RadioGroupItem value={key} id={`val-${key}`} />
                            <span className="font-medium">
                              {DISCOUNT_VALUE_TYPE_LABELS[key]}
                            </span>
                          </Label>
                        ))}
                      </RadioGroup>
                    </FormControl>
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
                      <FormControl>
                        <RadioGroup
                          value={field.value ?? "flat_on_total"}
                          onValueChange={field.onChange}
                          className="grid gap-3 md:grid-cols-2"
                        >
                          {(
                            Object.keys(
                              FLAT_MODE_LABELS
                            ) as (keyof typeof FLAT_MODE_LABELS)[]
                          ).map((key) => (
                            <Label
                              key={key}
                              htmlFor={`flat-${key}`}
                              className={cn(
                                "flex cursor-pointer flex-col gap-1 rounded-lg border p-4",
                                field.value === key &&
                                  "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value={key} id={`flat-${key}`} />
                                <span className="font-medium">
                                  {FLAT_MODE_LABELS[key]}
                                </span>
                              </div>
                              <span className="pl-6 text-xs text-muted-foreground">
                                {key === "flat_on_total"
                                  ? "Fixed amount off the total order."
                                  : "Fixed amount off per person; requires minimum headcount."}
                              </span>
                            </Label>
                          ))}
                        </RadioGroup>
                      </FormControl>
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
                values.flat_mode === "flat_per_person" ? (
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
                        <FormDescription>
                          Discount applies only if booking headcount meets this
                          minimum.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Step 4 — Expiry */}
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
                    <FormDescription>
                      After this date the discount can no longer be used.
                    </FormDescription>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}

          {/* Step 5 — Review */}
          {step === 5 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the discount before saving. This payload is what the
                backend API should accept.
              </p>
              <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium">
                    {DISCOUNT_CATEGORY_LABELS[values.category]}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{values.name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="font-medium">{locationName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Event</dt>
                  <dd className="font-medium">{eventName}</dd>
                </div>
                {values.category === "date_wise" ? (
                  <>
                    <div>
                      <dt className="text-muted-foreground">Room</dt>
                      <dd className="font-medium">{roomName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Applicable dates</dt>
                      <dd className="font-medium">
                        {(values.applicable_dates ?? []).join(", ") || "—"}
                      </dd>
                    </div>
                  </>
                ) : null}
                {values.category === "coupon_code" ? (
                  <div>
                    <dt className="text-muted-foreground">Coupon code</dt>
                    <dd className="font-mono font-medium">
                      {values.coupon_code || "—"}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground">Value</dt>
                  <dd className="font-medium">
                    {values.value_type === "percentage"
                      ? `${values.discount_value}%`
                      : `£${values.discount_value}${
                          values.flat_mode === "flat_per_person"
                            ? ` / person (min ${values.min_people})`
                            : " off total"
                        }`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Valid from</dt>
                  <dd className="font-medium">{values.valid_from || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="font-medium">{values.expires_at || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium capitalize">{values.status}</dd>
                </div>
              </dl>
              <pre className="max-h-48 overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
                {JSON.stringify(values, null, 2)}
              </pre>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 1 || isSubmitting}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {step < STEPS.length ? (
              <Button type="button" onClick={goNext}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving…"
                  : mode === "create"
                    ? "Save Discount"
                    : "Update Discount"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
