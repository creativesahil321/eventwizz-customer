"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VenueCommission {
  id: number;
  name: string;
  commission: string;
  value: number; // For progress calculation
}

interface VenuesCommissionProps {
  venues: VenueCommission[];
}

export default function VenuesCommission({
  venues = [],
}: VenuesCommissionProps) {
  // If no specific venues provided, we'll create default structure
  const defaultVenues = [
    { id: 1, name: "Koepp - Kuhn", commission: "$99120.60", value: 95 },
    { id: 2, name: "Tromp - Ziemann", commission: "$14478.03", value: 85 },
    { id: 3, name: "Krajcik Group", commission: "$63911.81", value: 65 },
    { id: 4, name: "Cartwright - Nolan", commission: "$4477.44", value: 45 },
    { id: 5, name: "Dickinson - Kling", commission: "$20039.15", value: 25 },
  ];

  const venuesList = venues.length ? venues : defaultVenues;

  return (
    <Card className="border-none shadow-sm bg-white h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div>
          <CardTitle className="text-2xl mb-0 title-header font-medium">
            Venues with Highest Commission
          </CardTitle>
        </div>

        <div className="space-y-8 mt-8 flex-grow">
          {venuesList.map((venue) => (
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
          ))}

          {/* Add minimal information section at the bottom to fill space */}
          <div className="mt-auto pt-8">
            <p className="text-xs text-gray-400 text-right">
              Last updated: Today at 9:45 AM
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
