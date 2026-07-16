"use client";
import Link from "next/link";
import { Badge as BadgeComponent } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Ticket } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  ticketType: string;
  eventSlug?: string;
  locationSlug?: string;
}

interface DashboardEventsProps {
  title: string;
  events: Event[];
}

export default function DashboardEvents({
  title,
  events,
}: DashboardEventsProps) {
  return (
    <section className="w-full relative text-black">
      <section className="w-full relative bg-background border shadow-sm p-4 sm:p-6 rounded-lg">
        <header className="w-full mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl title-header font-bold">
            {title || "Upcoming Events"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Your upcoming events and bookings
          </p>
        </header>
        <main className="w-full">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No upcoming events at the moment
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => {
                const eventHref =
                  event.locationSlug && event.eventSlug
                    ? `/${event.locationSlug}/events/${event.eventSlug}`
                    : null;
                const showTicketType =
                  event.ticketType && event.ticketType !== "Day Pass";

                const cardContent = (
                  <Card
                    key={event.id}
                    className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full"
                  >
                    <CardContent className="p-4 h-full flex flex-col">
                      <div className="space-y-3 flex-1">
                        <h3 className="font-semibold text-base line-clamp-2">
                          {event.title}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
                            <span className="text-xs">{event.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
                            <span className="text-xs">{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
                            <span className="text-xs line-clamp-1">
                              {event.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t mt-auto">
                          {showTicketType ? (
                            <div className="flex items-center gap-1.5">
                              <Ticket className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                              <BadgeComponent
                                variant="outline"
                                className="text-xs h-5 bg-slate-50 text-slate-700 border-slate-200 font-medium text-[var(--color-primary)]"
                              >
                                {event.ticketType}
                              </BadgeComponent>
                            </div>
                          ) : (
                            <span />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                          >
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );

                return eventHref ? (
                  <Link key={event.id} href={eventHref} className="block h-full">
                    {cardContent}
                  </Link>
                ) : (
                  cardContent
                );
              })}
            </div>
          )}

        </main>
      </section>
    </section>
  );
}
