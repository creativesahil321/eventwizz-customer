"use client";

import React, { useState, useEffect } from "react";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";
import { useLocationsQuery } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { VenueLocation } from "@/types/api.types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { InfoCircledIcon, PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import CreateLocationDialog from "@/app/(protected)/vendor/venue-locations/_components/_location-create";
import { appConfig } from "@/config/app";
import { Badge } from "@/components/ui/badge";
import { XCircle } from "lucide-react";

export default function WelcomeLocationSelectionPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const { mutate: switchLocation, isPending } = useSwitchLocation();
  const { data: session } = useSession();
  const router = useRouter();

  // Use TanStack Query to fetch locations (support { data, meta } or array)
  const { data: locationsData, isLoading } = useLocationsQuery();
  const locationsList = React.useMemo(() => {
    if (!locationsData) return [];
    if (Array.isArray(locationsData)) return locationsData;
    return locationsData.data || [];
  }, [locationsData]);

  // Auto-select default location on mount
  useEffect(() => {
    if (locationsList.length > 0 && !selectedLocationId) {
      const defaultLocation =
        locationsList.find((loc) => loc.is_default) || locationsList[0];
      setSelectedLocationId(defaultLocation.id);
    }
  }, [locationsList, selectedLocationId]);

  // Handler for selecting a location
  const handleLocationSelect = (location: VenueLocation) => {
    setSelectedLocationId(location.id);
  };

  // Handler for confirming selection
  const handleConfirm = () => {
    if (!selectedLocationId) return;

    switchLocation(selectedLocationId, {
      onSuccess: () => {
        router.push("/vendor/dashboard");
      },
    });
  };

  const firstName =
    session?.user?.first_name || session?.user?.name?.split(" ")[0] || "User";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Logo at the top */}
      <div className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/images/logos/eventwizz-logo.png"
              alt={appConfig.name}
              width={140}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </div>

      {/* Main content centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl mx-auto">
          {/* Welcome message with improved styling */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[color:var(--color-primary)] to-blue-600 mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Welcome, {firstName}! 👋
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-md mx-auto">
              Please select a location to continue to your dashboard
            </p>
          </div>

          {/* Locations section with enhanced design */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 md:p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                  Choose a Location
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <InfoCircledIcon className="h-4 w-4 text-[color:var(--color-primary)] flex-shrink-0" />
                  <p>Locations are venues where your events are hosted</p>
                </div>
              </div>
              <CreateLocationDialog />
            </div>

            {isLoading || isPending ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-[color:var(--color-primary)] border-t-transparent mb-4"></div>
                <p className="text-sm text-gray-600">Loading locations...</p>
              </div>
            ) : (
              <>
                {locationsList && locationsList.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {locationsList.map((location) => (
                      <div
                        key={location.id}
                        className={cn(
                          "border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 group",
                          selectedLocationId === location.id
                            ? "border-[color:var(--color-primary)] bg-gradient-to-br from-[color:var(--color-primary-light,#f0f9fa)] to-blue-50 shadow-md ring-2 ring-[color:var(--color-primary)] ring-opacity-20"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-md bg-white",
                        )}
                        onClick={() => handleLocationSelect(location)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-blue-600 flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-lg text-gray-900 truncate">
                                  {location.city || "Unknown Location"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {location.is_default && (
                                  <div className="text-xs bg-gradient-to-r from-[color:var(--color-primary)] to-blue-600 text-white px-3 py-1 rounded-full font-semibold shadow-sm whitespace-nowrap">
                                    Default
                                  </div>
                                )}
                                {location.status === false && (
                                  <Badge
                                    variant="outline"
                                    className="border-red-500 text-red-600 flex items-center gap-1 h-5 px-2 text-[10px] whitespace-nowrap"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="text-sm text-gray-600 mb-3 ml-12 line-clamp-2">
                              {location.address || location.name}
                            </div>

                            <div className="flex items-center gap-3 ml-12 pt-3 border-t border-gray-100">
                              <div className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                <span className="font-mono">
                                  {location.slug}
                                </span>
                              </div>
                              {selectedLocationId === location.id && (
                                <div className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-primary)]">
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Selected
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200">
                      <PlusIcon className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Locations Found
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm">
                      You haven&apos;t created any locations yet. Locations are
                      venues where you host your events.
                    </p>
                    <CreateLocationDialog />
                  </div>
                )}
              </>
            )}

            {/* Action buttons */}
            {locationsList && locationsList.length > 0 && (
              <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedLocationId || isPending}
                  variant="event-primary"
                  size="lg"
                  className="px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 min-w-[200px]"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Continue to Dashboard
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Help text */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <InfoCircledIcon className="h-4 w-4 text-gray-400" />
              Need help with locations?{" "}
              <Link
                href="/help/locations"
                className="text-[color:var(--color-primary)] hover:underline font-medium transition-colors"
              >
                Learn more
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer at the bottom */}
      <footer className="w-full bg-white/60 backdrop-blur-sm border-t border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <div className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {appConfig.name}. All rights
            reserved.
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
