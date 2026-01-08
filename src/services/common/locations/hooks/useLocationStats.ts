/**
 * Hook to fetch location statistics for enhanced location cards
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

// Mock data structure - replace with actual API call
interface LocationStats {
  eventsCount: number;
  venuesCount: number;
  liveEventsCount: number;
  upcomingEvent?: { date: string; name: string };
  categories?: string[];
  startingPrice?: number;
  isHot?: boolean;
  isNew?: boolean;
}

/**
 * Generate mock location stats
 * TODO: Replace with actual API integration
 */
function generateMockLocationStats(
  locations: Array<{ slug: string }>
): Record<string, LocationStats> {
  const stats: Record<string, LocationStats> = {};

  locations.forEach((location, idx) => {
    const eventsCount = Math.floor(Math.random() * 50) + 5;
    const venuesCount = Math.floor(Math.random() * 10) + 1;
    const liveEventsCount =
      Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0;
    const isHot = eventsCount > 30;
    const isNew = idx === locations.length - 1 || idx === locations.length - 2;

    // Generate random categories
    const allCategories = ["music", "party", "sports", "dining"];
    const categoryCount = Math.floor(Math.random() * 3) + 1;
    const categories = allCategories
      .sort(() => 0.5 - Math.random())
      .slice(0, categoryCount);

    // Generate upcoming event
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * 14) + 1);

    const eventNames = [
      "Summer Music Festival",
      "Neon Night Party",
      "Weekend Brunch",
      "Sports Championship",
      "Live Jazz Night",
      "Comedy Show",
      "Food Tasting Event",
    ];

    stats[location.slug] = {
      eventsCount,
      venuesCount,
      liveEventsCount,
      upcomingEvent: {
        date: nextDate.toISOString(),
        name: eventNames[Math.floor(Math.random() * eventNames.length)],
      },
      categories,
      startingPrice: Math.floor(Math.random() * 50) + 10,
      isHot,
      isNew,
    };
  });

  return stats;
}

/**
 * Fetch location statistics from API
 * TODO: Implement actual API call to backend
 */
async function fetchLocationStats(
  locations: Array<{ slug: string }>
): Promise<Record<string, LocationStats>> {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500));

  // For now, return mock data
  // In production, replace with actual API call:
  // const response = await api.get('/common/locations/stats', {
  //   params: { slugs: locations.map(l => l.slug).join(',') }
  // });
  // return response.data;

  return generateMockLocationStats(locations);
}

/**
 * Hook to fetch and manage location statistics
 */
export function useLocationStats(locations: Array<{ slug: string }>) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["location-stats", locations.map((l) => l.slug).join(",")],
    queryFn: () => fetchLocationStats(locations),
    enabled: locations.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const locationStats = useMemo(() => {
    return data || {};
  }, [data]);

  return {
    locationStats,
    isLoadingStats: isLoading,
    error,
  };
}
