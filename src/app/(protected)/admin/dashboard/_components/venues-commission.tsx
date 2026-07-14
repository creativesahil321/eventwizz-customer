"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface VenueCommission {
  id: number;
  name: string;
  commission: string;
  value: number;
  lastUpdated?: string;
}

interface VenuesCommissionProps {
  venues: VenueCommission[];
}

export default function VenuesCommission({
  venues = [],
}: VenuesCommissionProps) {
  const venuesList = venues.length ? venues : [];
  const lastUpdated = venuesList[0]?.lastUpdated;

  return (
    <Card className="border shadow-sm bg-white h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div>
          <CardTitle className="text-2xl mb-0 title-header font-medium">
            Venues with Highest Commission
          </CardTitle>
        </div>

        <div className="space-y-8 mt-8 flex-grow">
          {venuesList.length > 0 ? (
            venuesList.map((venue) => (
              <div key={venue.id} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{venue.name}</span>
                  <span className="text-sm font-medium">{venue.commission}</span>
                </div>
                <Progress
                  value={venue.value}
                  className={cn(
                    "h-2 bg-slate-100",
                    "[&>div]:bg-[var(--color-primary)]"
                  )}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No venue data for this period.</p>
          )}

          {lastUpdated && (
            <div className="mt-auto pt-8">
              <p className="text-xs text-gray-400 text-right">
                Last updated: {lastUpdated}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
