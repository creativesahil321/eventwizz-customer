"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatusColorClass } from "@/lib/status-theme";
import { Calendar, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CustomerDashboardRecentBooking } from "@/services/customer/dashboard";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { parseFormattedMoney } from "@/lib/currency-format";
import { getCustomerBookingDetailPath } from "@/app/(protected)/customer/bookings/_lib/utils";

interface DashboardRecentBookingsProps {
  readonly bookings: CustomerDashboardRecentBooking[];
}

export default function DashboardRecentBookings({
  bookings,
}: DashboardRecentBookingsProps) {
  const { symbol, format: formatMoney } = useCurrencyFormat();

  return (
    <section className="w-full relative text-black">
      <section className="w-full relative bg-background border shadow-sm p-4 sm:p-6 rounded-lg">
        <header className="w-full mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl title-header font-bold">
            Recent Bookings
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Your latest booking history
          </p>
        </header>
        <main className="w-full">
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No recent bookings found
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <Link
                  key={booking.booking_number || booking.booking_id}
                  href={getCustomerBookingDetailPath(booking.booking_number)}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Card className="hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-base line-clamp-1">
                                  {booking.event_name}
                                </h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs border ${getStatusColorClass(
                                    booking.status
                                  )}`}
                                >
                                  {booking.status}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs border ${getStatusColorClass(
                                    booking.payment_status
                                  )}`}
                                >
                                  {booking.payment_status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{booking.created_ago}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Wallet className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium text-black">
                                    {formatMoney(
                                      parseFormattedMoney(
                                        booking.total_formatted,
                                        symbol,
                                      ),
                                    )}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {booking.booking_ref}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {bookings.length > 0 && (
            <Link href="/customer/bookings">
              <Button
                variant="outline"
                size="sm"
                className="mt-4 sm:mt-6 w-full sm:w-auto"
              >
                View All Bookings
              </Button>
            </Link>
          )}
        </main>
      </section>
    </section>
  );
}
