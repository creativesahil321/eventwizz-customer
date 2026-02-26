"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CustomerDashboardRecentBooking } from "@/services/customer/dashboard";

interface DashboardRecentBookingsProps {
  readonly bookings: CustomerDashboardRecentBooking[];
}

export default function DashboardRecentBookings({
  bookings,
}: DashboardRecentBookingsProps) {
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "confirmed" || statusLower === "completed") {
      return "bg-green-100 text-green-700 border-green-200";
    }
    if (statusLower === "pending") {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    if (statusLower === "cancelled") {
      return "bg-red-100 text-red-700 border-red-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getPaymentStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "paid" || statusLower === "completed") {
      return "bg-green-100 text-green-700 border-green-200";
    }
    if (statusLower === "partial") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (statusLower === "unpaid") {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  return (
    <section className="w-full flex items-center justify-between relative text-black">
      <section className="w-full relative bg-background dark:border p-4 sm:p-6 rounded-md">
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
                <Card
                  key={booking.booking_id}
                  className="hover:shadow-md transition-all cursor-pointer"
                >
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
                                className={`text-xs ${getStatusColor(
                                  booking.status
                                )}`}
                              >
                                {booking.status}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPaymentStatusColor(
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
                                <DollarSign className="h-3 w-3" />
                                <span className="font-medium text-black">
                                  £{booking.total_formatted}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {booking.booking_ref}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Link href={`/customer/bookings/${booking.booking_id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
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
