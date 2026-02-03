"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye,
  UtensilsCrossed,
  Hash,
  CheckCircle2,
  Clock,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { Booking } from "../_lib/types";
import { formatBookingStatus } from "../_lib/utils";
import { addCacheBusting } from "@/lib/image-utils";

interface BookingCardProps {
  booking: Booking;
  onViewDetails: (booking: Booking) => void;
  onAddMenu: (booking: Booking) => void;
}

export default function BookingCard({
  booking,
  onViewDetails,
  onAddMenu,
}: BookingCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col h-full relative !p-0 border-[var(--color-border)]">
      {/* Booking ID and Status Badges - Always Visible */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-start justify-between gap-2 px-1">
        <Badge
          variant="secondary"
          className="flex items-center gap-1 px-2 py-0.5 sm:gap-1.5 sm:px-2.5 sm:py-1 bg-white/95 backdrop-blur-sm text-[10px] sm:text-xs font-semibold shadow-md border opacity-100 text-black"
        >
          <Hash className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-black" />
          <span>{booking.booking_number}</span>
        </Badge>

        {/* Status Badge - Always Visible */}
        {(() => {
          const { label, isConfirmed, className } = formatBookingStatus(
            booking.status
          );

          return (
            <Badge
              variant={isConfirmed ? "default" : "secondary"}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs font-semibold shadow-md ${className} opacity-100 backdrop-blur-sm`}
            >
              {isConfirmed ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span>{label}</span>
            </Badge>
          );
        })()}
      </div>

      {/* Event Image */}
      <div className="relative w-full h-48 bg-muted flex-shrink-0 z-0">
        <img
          src={addCacheBusting(
            booking.event_image && booking.event_image.trim() !== ""
              ? booking.event_image
              : "/assets/images/events/event-date-banner.jpg"
          )}
          alt={booking.event_name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Booking Details */}
      <CardContent className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 flex-1">
        {/* Event Name */}
        <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-2 leading-tight">
          {booking.event_name}
        </h3>

        {/* Event Date(s) */}
        {booking.booking_dates && booking.booking_dates.length > 0 && (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className="flex flex-col gap-2 cursor-pointer group">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="flex-1 line-clamp-1">
                      {booking.booking_dates.length === 1
                        ? booking.booking_dates[0].date
                        : `${booking.booking_dates[0].date} ...`}
                    </span>
                  </div>
                  {/* Multiple Dates Indicator */}
                  {booking.booking_dates.length > 1 && (
                    <div className="flex items-center justify-start">
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold w-fit"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                          color: "var(--color-primary)",
                          borderColor:
                            "color-mix(in srgb, var(--color-primary) 30%, transparent)",
                        }}
                      >
                        <CalendarDays className="h-3 w-3" />
                        <span>{booking.booking_dates.length} dates</span>
                      </Badge>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {booking.booking_dates.length > 1 && (
                <TooltipContent
                  side="top"
                  className="max-w-xs p-3 bg-popover border shadow-lg"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-sm mb-2 text-black">
                      All Available Dates ({booking.booking_dates.length}):
                    </p>
                    <div className="space-y-1.5">
                      {booking.booking_dates.map((date, index) => (
                        <div
                          key={date.date_key}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <span className="font-medium text-foreground text-black">
                            {index + 1}.
                          </span>
                          <span className="text-black">{date.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Price */}
        <div className="flex items-center justify-between py-2 sm:py-2.5 border-t border-b border-[var(--color-border)]">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Total Price
          </span>
          <span className="text-lg sm:text-xl font-bold text-[var(--color-primary)]">
            £{booking.total || booking.total_amount}
          </span>
        </div>

        {/* Action Buttons */}
        <div
          className={`grid gap-2 mt-auto ${
            booking.is_menu_choice ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {booking.is_menu_choice && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddMenu(booking)}
              className="h-8 sm:h-9 text-[10px] sm:text-xs font-medium gap-1 sm:gap-1.5 cursor-pointer hover:bg-muted transition-colors"
            >
              <UtensilsCrossed className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Add Menu</span>
              <span className="sm:hidden">Menu</span>
            </Button>
          )}
          <Button
            variant="event-primary"
            size="sm"
            onClick={() => onViewDetails(booking)}
            className="h-8 sm:h-9 text-white text-[10px] sm:text-xs font-medium gap-1 sm:gap-1.5 cursor-pointer"
          >
            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
