"use client";

import React, { useState, useEffect } from "react";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";
import { useLocationsQuery } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { VenueLocation } from "@/types/api.types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import CreateLocationDialog from "@/app/(protected)/vendor/venue-locations/_components/_location-create";
import { appConfig } from "@/config/app";
import { Badge } from "@/components/ui/badge";
import { BrandLogoImage } from "@/components/shared/brand-logo-image";
import {
  MapPin,
  ArrowRight,
  CheckCircle2,
  Loader2,
  XCircle,
  Sparkles,
  Building2,
  LogOut,
} from "lucide-react";
/** Stable image URL for hydration: same on server and client (no Date.now()). */
function stableImageUrl(url: string | null | undefined): string {
  if (!url || url === "null") return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=1`;
}
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { logout } from "@/lib/auth/logout";
import {
  consumeAuthCallbackUrl,
  isVendorDoorEntryCallback,
} from "@/lib/auth/safe-callback-url";
import { getFirstAccessibleVendorPath } from "@/config/menus/first-accessible-vendor-route";
import { usePermissions } from "@/hooks/usePermission";
import {
  LocationActiveEventsCount,
  formatLiveEventsLabel,
} from "@/components/location-selector/active-events-count";

export default function WelcomeLocationSelectionPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const { permissions: storePermissions } = usePermissions();
  const { mutate: switchLocation, isPending } = useSwitchLocation();
  const router = useRouter();

  const { theme } = useTheme();
  const logoSrc = theme?.logo
    ? stableImageUrl(theme.logo)
    : stableImageUrl(appConfig.logo);

  // Resolve greeting only when session is ready — prevents flash
  const sessionReady = sessionStatus === "authenticated" && session?.user != null;
  const welcomeLine =
    sessionReady && session.user.isOnboarded === true ? "Welcome back," : "Welcome,";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const { data: locationsData, isLoading } = useLocationsQuery();
  const locationsList = React.useMemo(() => {
    if (!locationsData) return [];
    if (Array.isArray(locationsData)) return locationsData;
    return locationsData.data || [];
  }, [locationsData]);

  useEffect(() => {
    if (locationsList.length > 0 && !selectedLocationId) {
      const defaultLocation =
        locationsList.find((loc) => loc.is_default) || locationsList[0];
      setSelectedLocationId(defaultLocation.id);
    }
  }, [locationsList, selectedLocationId]);

  const handleLocationSelect = (location: VenueLocation) => {
    setSelectedLocationId(location.id);
  };

  const handleConfirm = () => {
    if (!selectedLocationId) return;
    switchLocation(selectedLocationId, {
      onSuccess: () => {
        const resume = consumeAuthCallbackUrl();
        if (resume && isVendorDoorEntryCallback(resume)) {
          router.push(resume);
          return;
        }
        const next = getFirstAccessibleVendorPath(
          Array.isArray(storePermissions) ? storePermissions : undefined,
        );
        router.push(next);
      },
    });
  };

  const firstName =
    session?.user?.first_name || session?.user?.name?.split(" ")[0] || "User";
  const fullName = session?.user?.name || firstName;
  const userEmail = session?.user?.email || "";
  const rawAvatar = (session?.user as Record<string, unknown>)?.avatar as string | undefined;
  const userAvatar =
    rawAvatar && rawAvatar !== "null" && rawAvatar.trim() !== "" ? rawAvatar : "";
  // Initials fallback when no avatar
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const selectedLocation = locationsList.find(
    (l) => l.id === selectedLocationId,
  );
  const venueName = React.useMemo(() => {
    const selectedName = selectedLocation?.name?.trim();
    if (selectedName) return selectedName;
    const defaultName = locationsList.find((loc) => loc.is_default)?.name?.trim();
    if (defaultName) return defaultName;
    return locationsList[0]?.name?.trim() || "";
  }, [selectedLocation?.name, locationsList]);

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row">
      {/* ── Left panel (desktop only) — gradient uses dynamic theme primary ── */}
      <div
        className="hidden lg:flex flex-col w-[400px] xl:w-[460px] shrink-0 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom right, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 65%, black) 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative z-10 flex h-full flex-col">
          {/* Keep the original logo on a clean header surface for reliable contrast. */}
          <header className="flex h-16 shrink-0 items-center overflow-hidden border-b border-slate-200/80 bg-white px-8 shadow-sm">
            <Link
              href="/"
              aria-label="Home"
              className="inline-flex min-w-0 max-w-full items-center"
            >
              <BrandLogoImage
                src={logoSrc}
                alt={appConfig.name}
                className="h-10 w-auto max-w-[180px] object-contain"
                chrome="light-panel"
              />
            </Link>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-8 pt-8 pb-6">
            {/* Welcome copy */}
            <div className="my-auto py-6">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-medium text-white/90 tracking-wide">
                Venue Management
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-3 min-h-[4.5rem]">
              {sessionReady ? (
                <>
                  {welcomeLine}
                  <br />
                  <span className="text-white/80">{firstName}!</span>
                </>
              ) : (
                <>
                  <Skeleton className="mb-2 h-9 w-48 max-w-full bg-white/20" />
                  <Skeleton className="h-9 w-36 bg-white/20" />
                </>
              )}
            </h1>
            <p className="text-white/65 text-sm leading-relaxed mb-6 max-w-[260px]">
              Pick a location below and jump straight into your dashboard.
            </p>

            {/* Stats pills */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium leading-tight">
                    {locationsList.length} location{locationsList.length !== 1 ? "s" : ""} available
                  </p>
                  <p className="text-white/50 text-xs">on your account</p>
                </div>
              </div>
              {selectedLocation && (
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate leading-tight">
                      {selectedLocation.city || selectedLocation.name}
                    </p>
                    <p className="text-white/50 text-xs">
                      currently selected ·{" "}
                      {formatLiveEventsLabel(
                        selectedLocation.active_events_count,
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* User card + logout */}
            <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-3 bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-3">
              {/* Avatar */}
              <div className="shrink-0">
                {userAvatar ? (
                  <img
                    src={stableImageUrl(userAvatar)}
                    alt={fullName}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white/30"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white/25 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/30">
                    {initials}
                  </div>
                )}
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate leading-tight">
                  {fullName}
                </p>
                {userEmail && (
                  <p className="text-white/55 text-xs truncate mt-0.5">
                    {userEmail}
                  </p>
                )}
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sign out"
                className="shrink-0 h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 text-white" />
                )}
              </button>
            </div>

            <p className="text-white/30 text-xs mt-3 text-center">
              &copy; {new Date().getFullYear()} {appConfig.name}
            </p>
            </div>
            {/* end user card wrapper */}
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/70">
        {/* Mobile header */}
        <header className="lg:hidden flex h-14 shrink-0 items-center justify-between gap-3 overflow-hidden border-b border-gray-100 bg-white px-4">
          <Link href="/" className="inline-flex min-w-0 max-w-full items-center">
            <BrandLogoImage
              src={logoSrc}
              alt={appConfig.name}
              className="h-8 w-auto max-w-[120px] object-contain"
              chrome="light-panel"
            />
          </Link>

          {/* Mobile: user identity + logout */}
          <div className="flex items-center gap-2.5 min-w-0">
            {userAvatar ? (
              <img
                src={stableImageUrl(userAvatar)}
                alt={fullName}
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 hidden xs:block">
              <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                {fullName}
              </p>
              {userEmail && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {userEmail}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign out"
              className="shrink-0 h-8 w-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50 ml-1"
            >
              {isLoggingOut ? (
                <Loader2 className="h-3.5 w-3.5 text-gray-500 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5 text-gray-500" />
              )}
            </button>
          </div>
        </header>

        {/* Scrollable body — centers the card */}
        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6">
          {/* Mobile welcome headline */}
          <div className="lg:hidden text-center mb-5 shrink-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Choose a Location
            </h1>
            <p className="text-sm text-muted-foreground">
              {venueName
                ? `Select a location for ${venueName}`
                : "Select the venue to manage today"}
            </p>
          </div>

          {/*
            Card: flex column, max height = viewport minus fixed chrome.
            The list scrolls INSIDE — button stays pinned at the bottom.
          */}
          <div
            className={cn(
              "w-full max-w-md bg-white rounded-2xl border border-gray-100/80",
              "flex flex-col overflow-hidden animate-slide-up-fade",
              "max-h-[calc(100vh-80px)] lg:max-h-[600px]",
            )}
            style={{
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.04), 0 8px 32px -8px rgba(0,0,0,0.14), inset 0 2px 0 0 var(--color-primary)",
            }}
          >
            {/* Card header */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Your Locations</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {venueName
                    ? `Tap a location to select it for ${venueName}`
                    : "Tap a location to select it"}
                </p>
              </div>
              <CreateLocationDialog />
            </div>

            {/* Scrollable location list */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2.5 select-location-scroll">
              {isLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border-2 border-gray-100 p-4 flex items-start gap-3"
                    >
                      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full max-w-[200px]" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : locationsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-4">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <PlusIcon className="h-7 w-7 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">
                      No locations yet
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create your first location to get started
                    </p>
                    <CreateLocationDialog />
                  </div>
                </div>
              ) : (
                locationsList.map((location) => {
                  const isSelected = selectedLocationId === location.id;
                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location)}
                      className={cn(
                        "w-full text-left rounded-xl border-2 p-4 transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2",
                        isSelected
                          ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5 shadow-sm"
                          : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            isSelected
                              ? "bg-[color:var(--color-primary)] text-white"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          <MapPin className="h-5 w-5" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-semibold text-sm text-gray-900 truncate">
                              {location.city || "Unknown Location"}
                            </span>
                            {location.is_headquarters && (
                              <span className="shrink-0 inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[color:var(--color-primary)] text-white">
                                Head office
                              </span>
                            )}
                            {location.is_default && (
                              <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                In use
                              </span>
                            )}
                            {location.status === false && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-red-300 text-red-600 text-[10px] h-4 px-1.5 gap-0.5"
                              >
                                <XCircle className="h-2.5 w-2.5" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            {location.address || location.name || "—"}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <LocationActiveEventsCount
                              count={location.active_events_count}
                            />
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-primary)]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Selected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Pinned footer — always visible, never pushed off screen */}
            {locationsList.length > 0 && (
              <div className="shrink-0 px-4 py-4 border-t border-gray-100 bg-white">
                {selectedLocation && (
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Continuing as{" "}
                    <span className="font-semibold text-gray-700">
                      {venueName
                        ? `${venueName} · ${selectedLocation.city || selectedLocation.name}`
                        : selectedLocation.city || selectedLocation.name}
                    </span>
                  </p>
                )}
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedLocationId || isPending}
                  variant="event-primary"
                  className="w-full h-11 text-sm font-semibold gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Switching…
                    </>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Desktop footer */}
          <p className="lg:hidden mt-4 text-xs text-muted-foreground shrink-0">
            &copy; {new Date().getFullYear()} {appConfig.name}. All rights
            reserved.
          </p>
        </div>
      </div>

      <style jsx global>{`
        .select-location-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .select-location-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .select-location-scroll::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 99px;
        }
        .select-location-scroll::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up-fade {
          animation: slide-up-fade 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  );
}
