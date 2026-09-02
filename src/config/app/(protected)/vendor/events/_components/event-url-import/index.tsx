"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Globe, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { AIEventInput } from "@/app/api/ai/generate-event/route";
import type { EventCategory } from "@/services/vendor/events/type";
import type { EventImportResult } from "@/app/api/ai/import-event/types";
import { eventsService } from "@/services/vendor/events/events.service";
import { roomService } from "@/services/vendor/onboarding/room.service";
import { useEventUrlImport } from "../../_lib/hooks/useEventUrlImport";
import AIEventReviewContent from "../ai-event-creation/review-content";

const MAX_ROOMS = 3;

interface EventUrlImportFlowProps {
  onComplete: (eventId: number, isRooms: boolean) => void;
  venueInfo?: {
    name?: string;
    city?: string;
    address?: string;
    latitude?: number | string;
    longitude?: number | string;
  };
}

type VendorRoom = { id: number; name: string };

function normalizeRoomName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeUrl(value: string): string {
  return /^https?:\/\//i.test(value.trim())
    ? value.trim()
    : `https://${value.trim()}`;
}

export default function EventUrlImportFlow({
  onComplete,
  venueInfo,
}: EventUrlImportFlowProps) {
  const { importEvent, isImporting } = useEventUrlImport();
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<EventImportResult | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(
    null,
  );
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [vendorRooms, setVendorRooms] = useState<VendorRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [useRooms, setUseRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [assets, setAssets] = useState(result?.assets ?? { gallery: [] });
  const [reviewVersion, setReviewVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void eventsService
      .getEventCategories()
      .then((response) => {
        if (cancelled) return;
        const data = Array.isArray(response)
          ? response
          : (response as { data?: EventCategory[] }).data ?? [];
        setCategories(data);
        if (data[0]) setCategoryId(String(data[0].id));
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    void roomService
      .listVendorRooms()
      .then((response) => {
        if (cancelled) return;
        const data = Array.isArray(response?.data) ? response.data : [];
        setVendorRooms(
          data
            .map((room) => ({
              id: Number(room.id),
              name: String(room.name ?? "").trim(),
            }))
            .filter((room) => room.id > 0 && room.name)
            .slice(0, MAX_ROOMS),
        );
      })
      .catch(() => {
        if (!cancelled) setVendorRooms([]);
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sourceRoomNames = useMemo(
    () => (result?.roomCandidates ?? []).map((room) => room.name).filter(Boolean),
    [result],
  );

  const eventInput = useMemo<AIEventInput | null>(() => {
    if (!result) return null;
    const selectedRooms = vendorRooms.filter((room) =>
      selectedRoomIds.includes(room.id),
    );
    const roomNames =
      useRooms && selectedRooms.length >= 2
        ? selectedRooms.map((room) => room.name)
        : useRooms
          ? sourceRoomNames
          : [];
    return {
      eventName: result.content.stepOne.event_name,
      eventType: result.eventTypeSuggestion || "other",
      eventDescription: result.content.stepOne.about_event_description,
      venueName: venueInfo?.name,
      venueCity: venueInfo?.city,
      venueAddress:
        result.content.stepOne.event_address?.trim() ||
        venueInfo?.address ||
        "",
      venueLatitude: venueInfo?.latitude,
      venueLongitude: venueInfo?.longitude,
      has_room_system: useRooms && roomNames.length >= 2,
      room_names: roomNames,
      selected_room_ids:
        useRooms && selectedRooms.length >= 2
          ? selectedRooms.map((room) => room.id)
          : undefined,
      room_mappings: useRooms
        ? roomNames.map((name, index) => ({
            source_name: sourceRoomNames[index] || name,
            room_id: selectedRooms[index]?.id,
            target_name: name,
          }))
        : undefined,
    };
  }, [
    result,
    selectedRoomIds,
    sourceRoomNames,
    useRooms,
    venueInfo?.address,
    venueInfo?.city,
    venueInfo?.latitude,
    venueInfo?.longitude,
    venueInfo?.name,
    vendorRooms,
  ]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setError(null);
    const response = await importEvent(normalizeUrl(url), { rewrite: true });
    if (response.error) {
      setError(response.error);
      return;
    }
    if (!response.data) return;

    setResult(response.data);
    setAssets(response.data.assets);
    setReviewVersion((version) => version + 1);
    const hasSourceRooms = response.data.roomCandidates.length >= 2;
    setUseRooms(hasSourceRooms);

    const sourceRoomKeys = new Set(
      response.data.roomCandidates.map((room) => normalizeRoomName(room.name)),
    );
    const matchingIds = vendorRooms
      .filter((room) => sourceRoomKeys.has(normalizeRoomName(room.name)))
      .map((room) => room.id)
      .slice(0, MAX_ROOMS);
    setSelectedRoomIds(matchingIds);
  };

  const toggleRoom = (id: number) => {
    setSelectedRoomIds((current) =>
      current.includes(id)
        ? current.filter((roomId) => roomId !== id)
        : current.length >= MAX_ROOMS
          ? current
          : [...current, id],
    );
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setAssets({ gallery: [] });
    setSelectedRoomIds([]);
    setUseRooms(false);
  };

  if (!result || !eventInput) {
    return (
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center overflow-y-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center sm:mb-8">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 sm:mb-4 sm:h-14 sm:w-14">
              <Globe className="h-6 w-6 text-sky-300 sm:h-7 sm:w-7" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-white sm:text-2xl">
              Import event from <span className="text-sky-300">URL</span>
            </h1>
            <p className="mx-auto max-w-sm px-1 text-xs text-slate-400 sm:text-sm">
              Paste one public event page and we&apos;ll prepare editable event
              details, images, packages, menus, schedules, and FAQs.
            </p>
          </div>

          <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-7">
            <div className="space-y-2">
              <Label htmlFor="event-import-url" className="text-sm text-slate-300">
                Event page URL
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="event-import-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleAnalyze();
                    }
                  }}
                  placeholder="https://example.com/events/summer-gala"
                  disabled={isImporting}
                  className="h-11 min-w-0 border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={isImporting || !url.trim()}
                  className="h-11 shrink-0 text-white sm:min-w-[130px]"
                  style={{ background: "var(--color-primary, #3b82f6)" }}
                >
                  {isImporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {isImporting ? "Analysing…" : "Analyse page"}
                </Button>
              </div>
            </div>

            <Alert className="border-sky-400/20 bg-sky-400/5 text-sky-100">
              <Sparkles className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed">
                The importer reads one public page only. Review everything
                before creating a draft. Pages behind login, paywalls, or bot
                protection may return limited content.
              </AlertDescription>
            </Alert>

            {error ? (
              <Alert className="border-amber-400/20 bg-amber-400/5 text-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <AlertDescription className="space-y-1 text-xs">
                  <p className="font-semibold">{error.message}</p>
                  {error.hint ? <p className="text-amber-200/80">{error.hint}</p> : null}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const roomSelectionValid =
    !useRooms ||
    (vendorRooms.length > 0
      ? selectedRoomIds.length >= 2
      : sourceRoomNames.length >= 2);

  return (
    <div className="relative z-10 min-h-screen w-full overflow-y-auto px-3 py-6 sm:px-4 sm:py-10 md:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-sky-300">
              Imported event review
            </p>
            <h1 className="mt-1 break-words text-xl font-bold text-white sm:text-2xl">
              {result.content.stepOne.event_name || "Imported event"}
            </h1>
            <p className="mt-1 break-all text-xs text-slate-500">{result.sourceUrl}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            className="min-h-[44px] shrink-0 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            New URL
          </Button>
        </div>

        {result.warnings.length > 0 ? (
          <Alert className="border-amber-400/20 bg-amber-400/5 text-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <AlertDescription className="space-y-1 text-xs">
              {result.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-2 sm:p-4">
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Event category</Label>
            {categoriesLoading ? (
              <Skeleton className="h-10 w-full rounded-md bg-white/10" />
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Venue fallback</Label>
            <p className="min-h-10 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              {venueInfo?.address || "Selected venue address will be used if the page has no address."}
            </p>
          </div>
          {sourceRoomNames.length > 0 ? (
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-2 text-xs text-slate-300">
                <Checkbox
                  checked={useRooms}
                  onCheckedChange={(checked) => setUseRooms(Boolean(checked))}
                />
                Import room-specific content
              </Label>
              <p className="text-xs text-slate-500">
                Found: {sourceRoomNames.join(", ")}. Choose matching rooms from
                this venue when available.
              </p>
              {useRooms && roomsLoading ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-10 rounded-md bg-white/10" />
                  ))}
                </div>
              ) : null}
              {useRooms && !roomsLoading && vendorRooms.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {vendorRooms.map((room) => (
                    <label
                      key={room.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
                    >
                      <Checkbox
                        checked={selectedRoomIds.includes(room.id)}
                        onCheckedChange={() => toggleRoom(room.id)}
                      />
                      {room.name}
                    </label>
                  ))}
                </div>
              ) : null}
              {useRooms && !roomsLoading && vendorRooms.length === 0 ? (
                <p className="text-xs text-amber-200/80">
                  No existing venue rooms were found. The imported room names
                  will be used to create rooms when the draft is created.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        {!categoryId || !roomSelectionValid ? (
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">
            Select an event category and at least two rooms when room import is
            enabled.
          </p>
        ) : null}

        <AIEventReviewContent
          key={reviewVersion}
          content={result.content}
          eventInput={eventInput}
          categoryId={Number(categoryId)}
          onComplete={onComplete}
          onRegenerate={() => void handleAnalyze()}
          onBack={reset}
          sourceAssets={assets}
          onSourceAssetsChange={setAssets}
          initialRemovedSections={result.missingSections}
          preserveMissingSections
          canApply={Boolean(categoryId) && roomSelectionValid}
        />
      </div>
    </div>
  );
}
