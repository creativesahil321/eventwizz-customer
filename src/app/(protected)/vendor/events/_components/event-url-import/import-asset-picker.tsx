"use client";

import { useMemo, useState } from "react";
import { Check, ImageOff, ImagePlus, VideoOff, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { EventImportAssets } from "@/app/api/ai/import-event/types";

type ImageRole = "banner" | "package" | "schedulerBackground" | "menuBackground";

const IMAGE_ROLES: { role: ImageRole; label: string }[] = [
  { role: "banner", label: "Banner" },
  { role: "package", label: "Package" },
  { role: "schedulerBackground", label: "Schedule" },
  { role: "menuBackground", label: "Menu" },
];

function proxiedImageUrl(url: string): string {
  return `/api/ai/import-website/image?url=${encodeURIComponent(url)}`;
}

function ImageThumb({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <>
      {loading && !failed ? (
        <Skeleton className="absolute inset-0 rounded-none" />
      ) : null}
      {failed ? (
        <span className="flex h-full items-center justify-center text-slate-600">
          <ImageOff className="h-5 w-5" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxiedImageUrl(url)}
          alt={alt}
          className={cn(
            "h-full w-full object-cover transition-opacity",
            loading ? "opacity-0" : "opacity-100",
            className,
          )}
          loading="lazy"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      )}
    </>
  );
}

function ImagePreview({
  url,
  selected,
  onClick,
  alt,
}: {
  url: string;
  selected: boolean;
  onClick: () => void;
  alt: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative aspect-video overflow-hidden rounded-lg border-2 bg-white/[0.04] text-left transition",
        selected
          ? "border-[var(--color-primary,#3b82f6)] ring-2 ring-[var(--color-primary,#3b82f6)]/30"
          : "border-white/10 hover:border-white/25",
      )}
    >
      <ImageThumb url={url} alt={alt} />
      {selected ? (
        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary,#3b82f6)] text-white">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
    </button>
  );
}

function VideoPreview({ url }: { url: string }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
      {loading && !failed ? (
        <Skeleton className="absolute inset-0 rounded-none" />
      ) : null}
      {failed ? (
        <span className="flex h-full items-center justify-center text-slate-600">
          <VideoOff className="h-5 w-5" />
        </span>
      ) : (
        <video
          src={`/api/ai/import-website/image?type=video&url=${encodeURIComponent(url)}`}
          controls
          muted
          preload="metadata"
          className={cn(
            "h-full w-full object-cover transition-opacity",
            loading ? "opacity-0" : "opacity-100",
          )}
          onLoadedMetadata={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}

function RolePhotoSlot({
  label,
  url,
  candidates,
  open,
  onOpenChange,
  onSelect,
}: {
  label: string;
  url: string | undefined;
  candidates: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string | undefined) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              url ? `Change ${label} photo` : `Choose ${label} photo`
            }
            className={cn(
              "relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border-2 text-left transition",
              url
                ? "border-white/15 bg-white/[0.04] hover:border-white/30"
                : "border-dashed border-white/20 bg-white/[0.02] hover:border-white/35",
            )}
          >
            {url ? (
              <>
                <ImageThumb url={url} alt={`${label} photo`} />
                <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 px-1.5 py-0.5 text-center text-[10px] font-medium text-white">
                  Change
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] text-slate-400">
                <ImagePlus className="h-4 w-4" />
                Choose photo
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[120] w-[min(calc(100vw-2rem),18rem)] border-white/10 bg-slate-900 p-2 text-white"
        >
          <p className="px-1 pb-2 text-[11px] font-medium text-slate-300">
            Pick a photo for {label}
          </p>
          <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
            {candidates.map((candidate, index) => (
              <ImagePreview
                key={candidate}
                url={candidate}
                alt={`${label} option ${index + 1}`}
                selected={candidate === url}
                onClick={() => {
                  onSelect(candidate);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
          {url ? (
            <button
              type="button"
              onClick={() => {
                onSelect(undefined);
                onOpenChange(false);
              }}
              className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-md px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-3 w-3" />
              Clear {label}
            </button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function EventImportAssetPicker({
  assets,
  onChange,
}: {
  assets: EventImportAssets;
  onChange: (assets: EventImportAssets) => void;
}) {
  const [openRole, setOpenRole] = useState<ImageRole | null>(null);
  const candidates = useMemo(
    () =>
      Array.from(
        new Set(
          [
            assets.banner,
            assets.package,
            assets.schedulerBackground,
            assets.menuBackground,
            ...assets.gallery,
          ].filter((url): url is string => Boolean(url)),
        ),
      ),
    [assets],
  );

  const setRole = (role: ImageRole, url: string | undefined) => {
    onChange({ ...assets, [role]: url });
  };

  const toggleGallery = (url: string) => {
    const nextGallery = assets.gallery.includes(url)
      ? assets.gallery.filter((candidate) => candidate !== url)
      : [...assets.gallery, url];
    onChange({ ...assets, gallery: nextGallery });
  };

  if (candidates.length === 0 && !assets.bannerVideo) {
    return (
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">
        No source images were found. You can upload images after the draft is
        created. A video banner may still be available below.
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Event photos</h3>
        <p className="mt-1 text-xs text-slate-500">
          Tap Banner, Package, Schedule or Menu and pick the photo you want.
          Tick photos below to keep them in the gallery.
        </p>
      </div>

      {assets.bannerVideo ? (
        <div className="max-w-md space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Video banner
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Imported from the source page
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...assets, bannerVideo: undefined })}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
          <VideoPreview url={assets.bannerVideo} />
        </div>
      ) : null}

      {candidates.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {IMAGE_ROLES.map(({ role, label }) => (
            <RolePhotoSlot
              key={role}
              label={label}
              url={assets[role]}
              candidates={candidates}
              open={openRole === role}
              onOpenChange={(next) => setOpenRole(next ? role : null)}
              onSelect={(url) => setRole(role, url)}
            />
          ))}
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
          Gallery ({assets.gallery.length})
        </p>
        {candidates.length === 0 ? (
          <p className="text-xs text-slate-500">No photos to add yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {candidates.map((url, index) => (
              <div key={url} className="relative">
                <ImagePreview
                  url={url}
                  alt={`Gallery photo ${index + 1}`}
                  selected={assets.gallery.includes(url)}
                  onClick={() => toggleGallery(url)}
                />
                {assets.gallery.includes(url) ? (
                  <button
                    type="button"
                    title="Remove from gallery"
                    onClick={() => toggleGallery(url)}
                    className="absolute bottom-1 right-1 rounded-full bg-slate-950/80 p-1 text-slate-300 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
