"use client";

import { useMemo, useRef, useState } from "react";
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
import { useCreateCustomerSupportTicket } from "@/services/customer/support";
import { useBookings } from "@/services/customer/bookings/query";
import { useLocationStore } from "@/store/location.store";
import { useAuthStore } from "@/store/auth.store";
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
  const { data: bookingsResponse } = useBookings({ per_page: 50 });
  const locations = useLocationStore((state) => state.allLocations);
  const selectedLocationId = useLocationStore((state) => state.getLocationId());
  const authLocationId = useAuthStore((state) => state.vendor_location_id);

  const defaultLocationId = useMemo(() => {
    if (selectedLocationId) return String(selectedLocationId);
    if (authLocationId) return String(authLocationId);
    if (locations[0]?.id) return String(locations[0].id);
    return NONE_LOCATION;
  }, [selectedLocationId, authLocationId, locations]);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("general_support");
  const [contactNumber, setContactNumber] = useState("");
  const [bookingLocation, setBookingLocation] = useState<string | null>(null);
  const [booking, setBooking] = useState(NONE_BOOKING);
  const [priority, setPriority] = useState<SupportPriority>("medium");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const contactNumberValue = contactNumber || customer.phone || "";
  const bookings = bookingsResponse?.data ?? [];
  const locationOptions = locations.map((location) => ({
    id: String(location.id),
    name: location.name,
  }));
  const resolvedLocationValue =
    bookingLocation === null ? defaultLocationId : bookingLocation;

  const bookingOptions = useMemo(
    () =>
      bookings.map((item) => ({
        id: String(item.booking_id),
        label: `${item.booking_number} — ${item.event_name}`,
      })),
    [bookings]
  );

  const handleLocationChange = (locationId: string) => {
    setBookingLocation(locationId);
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
      toast.error("Please fill in the subject and description.");
      return;
    }
    if (!contactNumberValue.trim()) {
      toast.error("Please enter your contact number.");
      return;
    }

    const vendorLocationId =
      resolvedLocationValue !== NONE_LOCATION
        ? Number.parseInt(resolvedLocationValue, 10)
        : null;
    const bookingId =
      booking !== NONE_BOOKING ? Number.parseInt(booking, 10) : null;

    try {
      const response = await createTicket.mutateAsync({
        subject: subject.trim(),
        category,
        contact_number: contactNumberValue.trim(),
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

  return (
    <div className="min-w-0 max-w-full">
      <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
        <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            Start a conversation
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            Tell us what&apos;s going on
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Choose the right category so we can route your message to the team
            that can help fastest.
          </p>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g. Wrong seat allocation for Saturday's show"
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
                  onValueChange={(v) => setCategory(v as SupportCategory)}
                >
                  <SelectTrigger className="h-11 bg-gray-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_support">
                      General Support
                    </SelectItem>
                    <SelectItem value="technical_support">
                      Technical Support
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="contactNumber">Contact number</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="e.g. +44 7700 900123"
                  value={contactNumberValue}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="h-11 min-w-0 max-w-full bg-gray-50"
                />
              </div>
            </div>

            <div className="min-w-0 space-y-3 rounded-lg border border-[var(--color-border)] bg-slate-50/40 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Booking details{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Skip this for account, login, or password questions. Only fill
                  it in when your enquiry is about a specific event or venue.
                </p>
              </div>

              <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <Label>Booking location</Label>
                  <Select
                    value={resolvedLocationValue}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger className="h-11 bg-gray-50">
                      <SelectValue placeholder="Optional — select a venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_LOCATION}>
                        Not related to a venue
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
                  <Label>Related booking</Label>
                  <Select value={booking} onValueChange={setBooking}>
                    <SelectTrigger className="h-11 bg-gray-50">
                      <SelectValue placeholder="Optional — link a booking" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_BOOKING}>None</SelectItem>
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
                placeholder="Share as much detail as possible — what happened, when, and what you'd like us to do."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="max-h-[320px] min-h-[140px] min-w-0 max-w-full resize-y overflow-x-hidden bg-gray-50"
              />
            </div>

            <div className="min-w-0 space-y-3">
              <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-gray-50/50 p-6 text-center sm:p-8">
                <Paperclip className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  Drag and drop, or browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, PNG, JPG — up to 10 MB each, max {MAX_SUPPORT_ATTACHMENTS}{" "}
                  files
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
                  Browse files
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
                By submitting you agree to our support terms.
              </p>
              <Button
                type="submit"
                variant="event-primary"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Send className="size-4" />
                {isSubmitting ? "Submitting..." : "Submit enquiry"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
