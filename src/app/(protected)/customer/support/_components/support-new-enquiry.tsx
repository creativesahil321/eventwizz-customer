"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SupportCategory, SupportPriority } from "../_lib/types";
import { useSupportCustomerProfile } from "../_lib/use-support-customer-profile";
import {
  useCreateCustomerSupportTicket,
  useCustomerSupportLocationBookings,
  useCustomerSupportLocations,
} from "@/services/customer/support";
import {
  MAX_SUPPORT_ATTACHMENTS,
  SUPPORT_ATTACHMENT_ACCEPT,
  collectSupportAttachments,
  formatSupportFileSize,
} from "@/app/(protected)/_shared/support/message-attachments";
import { cn } from "@/lib/utils";

const NONE_BOOKING = "none";
const NONE_LOCATION = "none";

const PRIORITIES: SupportPriority[] = ["low", "medium", "high"];

export default function SupportNewEnquiry() {
  const router = useRouter();
  const customer = useSupportCustomerProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createTicket = useCreateCustomerSupportTicket();

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("general_support");
  const [contactNumber, setContactNumber] = useState("");
  const [bookingLocation, setBookingLocation] = useState(NONE_LOCATION);
  const [booking, setBooking] = useState(NONE_BOOKING);
  const [priority, setPriority] = useState<SupportPriority>("medium");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const didHydratePhone = useRef(false);

  useEffect(() => {
    if (didHydratePhone.current || !customer.phone) return;
    setContactNumber(customer.phone);
    didHydratePhone.current = true;
  }, [customer.phone]);

  const showBookingDetails = category === "general_support";

  const { data: locationsResponse, isLoading: isLoadingLocations } =
    useCustomerSupportLocations({ enabled: showBookingDetails });
  const { data: bookingsResponse, isLoading: isLoadingBookings } =
    useCustomerSupportLocationBookings(
      showBookingDetails && bookingLocation !== NONE_LOCATION
        ? bookingLocation
        : null
    );

  const locationOptions = useMemo(
    () =>
      (locationsResponse?.data ?? []).map((location) => ({
        id: String(location.location_id),
        name: location.location_name,
      })),
    [locationsResponse?.data]
  );

  const bookingOptions = useMemo(
    () =>
      (bookingsResponse?.data ?? []).map((item) => ({
        id: String(item.booking_id),
        label: `${item.booking_number} — ${item.event_name}`,
      })),
    [bookingsResponse?.data]
  );

  const handleCategoryChange = (value: SupportCategory) => {
    setCategory(value);
    if (value === "technical_support") {
      setBookingLocation(NONE_LOCATION);
      setBooking(NONE_BOOKING);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setBookingLocation(locationId);
    setBooking(NONE_BOOKING);
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    const next = collectSupportAttachments(fileList, {
      currentCount: attachments.length,
    });
    if (next.length) {
      setAttachments((prev) => [...prev, ...next]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Please enter a subject and description.");
      return;
    }
    if (!contactNumber.trim()) {
      toast.error("Please enter your telephone number.");
      return;
    }

    const vendorLocationId =
      showBookingDetails && bookingLocation !== NONE_LOCATION
        ? Number.parseInt(bookingLocation, 10)
        : null;
    const bookingId =
      showBookingDetails && booking !== NONE_BOOKING
        ? Number.parseInt(booking, 10)
        : null;

    try {
      const response = await createTicket.mutateAsync({
        subject: subject.trim(),
        category,
        contact_number: contactNumber.trim(),
        vendor_location_id:
          vendorLocationId != null && !Number.isNaN(vendorLocationId)
            ? vendorLocationId
            : null,
        booking_id:
          bookingId != null && !Number.isNaN(bookingId) ? bookingId : null,
        priority,
        message: description.trim(),
        attachments,
      });

      const ticketKey = response.data?.ticket_key;
      if (typeof ticketKey === "string" && ticketKey) {
        router.push(`/customer/support/inbox/${ticketKey}`);
        return;
      }

      router.push("/customer/support/inbox");
    } catch {
      // API client already surfaces validation / network toasts
    }
  };

  const isSubmitting = createTicket.isPending;
  const bookingSelectDisabled =
    bookingLocation === NONE_LOCATION || isLoadingBookings;

  return (
    <div className="min-w-0 max-w-full">
      <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
        <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            Support enquiry
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            How can we help?
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Please choose a category so we can send your enquiry to the right
            team.
          </p>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g. Unable to view my booking for Saturday"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-11 min-w-0 max-w-full bg-gray-50"
              />
            </div>

            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) =>
                    handleCategoryChange(v as SupportCategory)
                  }
                >
                  <SelectTrigger className="h-11 bg-gray-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_support">
                      Event & booking support
                    </SelectItem>
                    <SelectItem value="technical_support">
                      Account & technical support
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="contactNumber">Telephone number</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="e.g. 07700 900123"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="h-11 min-w-0 max-w-full bg-gray-50"
                />
              </div>
            </div>

            {showBookingDetails ? (
              <div className="min-w-0 space-y-3 rounded-lg border border-[var(--color-border)] bg-slate-50/40 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Booking details{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only complete this if your enquiry relates to a specific
                    booking or venue. Leave blank for account or login issues.
                  </p>
                </div>

                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <Label>Venue</Label>
                    <Select
                      value={bookingLocation}
                      onValueChange={handleLocationChange}
                      disabled={isLoadingLocations}
                    >
                      <SelectTrigger className="h-11 bg-gray-50">
                        <SelectValue
                          placeholder={
                            isLoadingLocations
                              ? "Loading venues…"
                              : "Select a venue (optional)"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_LOCATION}>
                          No venue selected
                        </SelectItem>
                        {locationOptions.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label>Booking</Label>
                    <Select
                      value={booking}
                      onValueChange={setBooking}
                      disabled={bookingSelectDisabled}
                    >
                      <SelectTrigger className="h-11 bg-gray-50">
                        <SelectValue
                          placeholder={
                            bookingLocation === NONE_LOCATION
                              ? "Please select a venue first"
                              : isLoadingBookings
                                ? "Loading bookings…"
                                : "Select a booking (optional)"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_BOOKING}>
                          No booking selected
                        </SelectItem>
                        {bookingOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                      priority === p
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-border)] bg-white hover:bg-muted"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Please include as much detail as you can — what happened, when it occurred, and how we can help."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="max-h-[320px] min-h-[140px] min-w-0 max-w-full resize-y overflow-x-hidden bg-gray-50"
              />
            </div>

            <div className="min-w-0 space-y-3">
              <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-gray-50/50 p-6 text-center sm:p-8">
                <Paperclip className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  Drag and drop files here, or choose files to upload
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, PNG or JPG. Maximum 10 MB per file (up to{" "}
                  {MAX_SUPPORT_ATTACHMENTS} files).
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORT_ATTACHMENT_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <Button
                  type="button"
                  variant="event-outline"
                  size="sm"
                  className="mt-3"
                  disabled={attachments.length >= MAX_SUPPORT_ATTACHMENTS}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose files
                </Button>
              </div>

              {attachments.length > 0 ? (
                <ul className="space-y-2">
                  {attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSupportFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-words text-xs text-muted-foreground">
                By submitting this form, you agree to our support terms.
              </p>
              <Button
                type="submit"
                variant="event-primary"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Send className="size-4" />
                {isSubmitting ? "Sending…" : "Submit enquiry"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
