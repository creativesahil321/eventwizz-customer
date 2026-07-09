"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send } from "lucide-react";
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
import {
  getBookingsByLocation,
  SUPPORT_BOOKING_LOCATIONS,
  SUPPORT_BOOKING_OPTIONS,
} from "../_lib/mock-data";
import type { SupportCategory, SupportPriority } from "../_lib/types";
import { useSupportCustomerProfile } from "../_lib/use-support-customer-profile";
import { cn } from "@/lib/utils";

const NONE_BOOKING = "none";
const NONE_LOCATION = "none";

const PRIORITIES: SupportPriority[] = ["low", "medium", "high"];

export default function SupportNewEnquiry() {
  const router = useRouter();
  const customer = useSupportCustomerProfile();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("general_support");
  const [contactNumber, setContactNumber] = useState("");
  const [bookingLocation, setBookingLocation] = useState(NONE_LOCATION);
  const [booking, setBooking] = useState(NONE_BOOKING);
  const [priority, setPriority] = useState<SupportPriority>("medium");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactNumberValue = contactNumber || customer.phone || "";

  const locationBookings = useMemo(
    () =>
      bookingLocation && bookingLocation !== NONE_LOCATION
        ? getBookingsByLocation(bookingLocation)
        : SUPPORT_BOOKING_OPTIONS,
    [bookingLocation]
  );

  const handleLocationChange = (locationId: string) => {
    setBookingLocation(locationId);
    if (locationId === NONE_LOCATION) {
      setBooking(NONE_BOOKING);
      return;
    }
    const bookingsForLocation = getBookingsByLocation(locationId);
    const stillValid = bookingsForLocation.some((opt) => opt.ref === booking);
    if (!stillValid) setBooking(NONE_BOOKING);
  };

  const handleBookingChange = (ref: string) => {
    setBooking(ref);
    if (ref === NONE_BOOKING) return;
    const selected = SUPPORT_BOOKING_OPTIONS.find((opt) => opt.ref === ref);
    if (selected) setBookingLocation(selected.locationId);
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

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);
    toast.success("Enquiry submitted successfully. We'll get back to you soon.");
    router.push("/customer/support/inbox");
  };

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
                  <SelectTrigger className="bg-gray-50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_support">General Support</SelectItem>
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
                    value={bookingLocation}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger className="h-11 bg-gray-50">
                      <SelectValue placeholder="Optional — select a venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_LOCATION}>
                        Not related to a venue
                      </SelectItem>
                      {SUPPORT_BOOKING_LOCATIONS.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-2">
                  <Label>Related booking</Label>
                  <Select value={booking} onValueChange={handleBookingChange}>
                    <SelectTrigger className="h-11 bg-gray-50">
                      <SelectValue placeholder="Optional — link a booking" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_BOOKING}>None</SelectItem>
                      {locationBookings.map((opt) => (
                        <SelectItem key={opt.ref} value={opt.ref}>
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
                className="min-h-[140px] max-h-[320px] min-w-0 max-w-full resize-y overflow-x-hidden bg-gray-50"
              />
            </div>

            <div className="min-w-0 rounded-lg border border-dashed border-[var(--color-border)] bg-gray-50/50 p-6 text-center sm:p-8">
              <Paperclip className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Drag and drop, or browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, PNG, JPG — up to 10 MB each
              </p>
              <Button type="button" variant="event-outline" size="sm" className="mt-3">
                Browse files
              </Button>
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
