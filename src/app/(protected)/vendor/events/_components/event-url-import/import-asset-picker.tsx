"use client";

import { useMemo, useState } from "react";
import { Check, ImageOff, VideoOff, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventImportAssets } from "@/app/api/ai/import-event/types";

function proxiedImageUrl(url: string): string {
  return `/api/ai/import-website/image?url=${encodeURIComponent(url)}`;
}

function ImagePreview({
  url,
  selected,
  onClick,
}: {
  url: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-video overflow-hidden rounded-lg border-2 bg-white/[0.04] text-left transition ${
        selected
          ? "border-[var(--color-primary,#3b82f6)] ring-2 ring-[var(--color-primary,#3b82f6)]/30"
          : "border-white/10 hover:border-white/25"
      }`}
    >
      {loading && !failed ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
      {failed ? (
        <span className="flex h-full items-center justify-center text-slate-600">
          <ImageOff className="h-5 w-5" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxiedImageUrl(url)}
          alt="Imported event candidate"
          className={`h-full w-full object-cover transition-opacity ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          loading="lazy"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      )}
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
          className={`h-full w-full object-cover transition-opacity ${
            loading ? "opacity-0" : "opacity-100"
          }`}
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

export default function EventImportAssetPicker({
  assets,
  onChange,
}: {
  assets: EventImportAssets;
  onChange: (assets: EventImportAssets) => void;
}) {
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

  const setRole = (
    role: "banner" | "package" | "schedulerBackground" | "menuBackground",
    url: string,
  ) => {
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
        <h3 className="text-sm font-semibold text-white">Source images</h3>
        <p className="mt-1 text-xs text-slate-500">
          Select a role for each image. Unavailable images are skipped safely.
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["banner", "Banner"],
          ["package", "Package"],
          ["schedulerBackground", "Schedule"],
          ["menuBackground", "Menu"],
        ].map(([role, label]) => (
          <div key={role} className="min-w-0">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <select
              value={assets[role as keyof EventImportAssets] as string | undefined ?? ""}
              onChange={(event) =>
                event.target.value && setRole(role as Parameters<typeof setRole>[0], event.target.value)
              }
              className="h-8 w-full min-w-0 rounded-md border border-white/10 bg-slate-900 px-2 text-xs text-white outline-none focus:border-white/25"
            >
              <option value="">None</option>
              {candidates.map((url, index) => (
                <option key={url} value={url}>
                  Image {index + 1}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
          Gallery ({assets.gallery.length})
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {candidates.map((url) => (
            <div key={url} className="relative">
              <ImagePreview
                url={url}
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
      </div>
    </section>
  );
}
