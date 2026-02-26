"use client";

import Link from "next/link";
import { MapPin, Calendar, Navigation, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useNearbyEvents } from "@/services/customer/dashboard";
import type { NearbyEvent } from "@/services/customer/dashboard";

// --------------- Skeleton ---------------
function NearbyEventsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center justify-between pt-2 border-t">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// --------------- Event Card ---------------
function NearbyEventCard({ event }: { event: NearbyEvent }) {
  return (
    <Link href={`/events/${event.event_slug}`} className="block">
      <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-base line-clamp-2">
              {event.event_name}
            </h3>

            <div className="space-y-1.5">
              {event.date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
                  <span className="text-xs">
                    {new Date(event.date).toLocaleDateString("en-GB", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
              {event.time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
                  <span className="text-xs">{event.time}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
                  <span className="text-xs line-clamp-1">{event.location}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              {event.ticket_type && (
                <Badge
                  variant="outline"
                  className="text-xs h-5 bg-slate-50 border-slate-200 text-[var(--color-primary)] font-medium"
                >
                  {event.ticket_type}
                </Badge>
              )}
              <Badge className="text-xs h-5 ml-auto bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-0">
                <Navigation className="h-2.5 w-2.5 mr-1" />
                {event.distance_km.toFixed(1)} km away
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// --------------- Main Section ---------------
export default function DashboardNearbyEvents() {
  const { lat, lng, loading: locationLoading, permissionDenied, error: locationError } =
    useUserLocation();
  const { city, country } = useReverseGeocode(lat, lng);

  const {
    data,
    isLoading: eventsLoading,
    isError,
  } = useNearbyEvents(lat, lng, city, country);

  const isLoading = locationLoading || (lat !== null && eventsLoading && !data);
  const events = data?.data ?? [];

  // Hide whole section when no events found (and not loading, no errors)
  const showNoEventsState =
    !isLoading && !locationError && !isError && events.length === 0 && lat !== null;
  if (showNoEventsState) {
    return null;
  }

  return (
    <section className="w-full relative bg-background dark:border p-4 sm:p-6 rounded-md">
      <header className="w-full mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl title-header font-bold">
            Events Near You
          </h2>
          {lat !== null && (
            <Badge
              variant="outline"
              className="text-xs h-5 text-green-600 border-green-200 bg-green-50"
            >
              <Navigation className="h-2.5 w-2.5 mr-1" />
              Location active
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {city
            ? `Upcoming events near ${city}${country ? `, ${country}` : ""}`
            : "Discover upcoming events happening around you"}
        </p>
      </header>

      <main className="w-full">
        {/* Loading state */}
        {isLoading && <NearbyEventsSkeleton />}

        {/* Permission denied */}
        {!isLoading && permissionDenied && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Location access denied
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {locationError ??
                  "Enable location access in your browser settings to see nearby events."}
              </p>
            </div>
          </div>
        )}

        {/* Generic location error (unsupported, timeout, etc.) */}
        {!isLoading && !permissionDenied && locationError && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <AlertCircle className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{locationError}</p>
          </div>
        )}

        {/* API error */}
        {!isLoading && isError && !locationError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load nearby events. Please try again later.
            </p>
        {/* No events found */}
        {!isLoading && !locationError && !isError && events.length === 0 && lat !== null && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No events found near your location at the moment.
            </p>
          </div>
        )}

          </div>
        )}

        {/* Events grid */}
        {!isLoading && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <NearbyEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </section>
  );
}
