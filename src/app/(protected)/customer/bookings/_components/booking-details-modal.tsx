"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  CreditCard,
  User,
  Hash,
  Receipt,
} from "lucide-react";
import { Booking } from "../_lib/types";
import Image from "next/image";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { parseFormattedMoney } from "@/lib/currency-format";

interface BookingDetailsModalProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingDetailsModal({
  booking,
  open,
  onOpenChange,
}: BookingDetailsModalProps) {
  const { symbol, format: formatMoney } = useCurrencyFormat();

  if (!booking) return null;

  const discountValue = parseFormattedMoney(booking.discount || "0", symbol);
  const balanceValue = parseFormattedMoney(booking.balance_amount || "0", symbol);
  const showDiscount = discountValue !== 0;
  const showBalance = balanceValue !== 0;

  const DetailRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
  }) => (
    <div className="flex items-start gap-3 py-2">
      <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
        <Icon className="h-4 w-4 text-[var(--color-primary)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-base font-medium text-foreground">{value}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center justify-between gap-4">
            <span>Booking Details</span>
            <StatusBadge
              status={booking.payment_status}
              label={booking.payment_status}
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Image */}
          {booking.event_image && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              <Image
                src={booking.event_image}
                alt={booking.event_name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Event Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Event Information</h3>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-foreground">
                {booking.event_name}
              </h4>
              {booking.event_location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{booking.event_location}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Event Details */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Event Details</h3>
            <div className="grid gap-3">
              <DetailRow
                icon={Calendar}
                label="Event Date"
                value={booking.event_date || booking.booking_date}
              />
              {booking.event_time && (
                <DetailRow
                  icon={Clock}
                  label="Event Time"
                  value={booking.event_time}
                />
              )}
              <DetailRow
                icon={Ticket}
                label="Number of Tickets"
                value={`${booking.tickets} Ticket${
                  booking.tickets !== 1 ? "s" : ""
                }`}
              />
            </div>
          </div>

          <Separator />

          {/* Booking Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Booking Information</h3>
            <div className="grid gap-3">
              <DetailRow
                icon={User}
                label="Booked By"
                value={booking.user_name}
              />
              <DetailRow
                icon={Calendar}
                label="Booking Date"
                value={booking.booking_date}
              />
              <DetailRow
                icon={Hash}
                label="Booking ID"
                value={`#${booking.id}`}
              />
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Payment Details</h3>
            <div className="space-y-3">
              <DetailRow
                icon={Receipt}
                label="Transaction ID"
                value={booking.transaction_id}
              />

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid Amount</span>
                  <span className="font-semibold text-green-600">
                    {booking.paid_amount}
                  </span>
                </div>

                {showDiscount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-semibold text-orange-600">
                      -{formatMoney(Math.abs(discountValue))}
                    </span>
                  </div>
                )}

                {showBalance && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Balance Amount
                    </span>
                    <span className="font-semibold text-red-600">
                      {formatMoney(balanceValue)}
                    </span>
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">
                    Total Amount
                  </span>
                  <span className="font-bold text-lg text-[var(--color-primary)]">
                    {booking.total_amount}
                  </span>
                </div>
              </div>

              <DetailRow
                icon={CreditCard}
                label="Payment Method"
                value={booking.payment_status}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
