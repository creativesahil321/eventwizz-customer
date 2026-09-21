"use client";

import { Check, ImageIcon } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import type { EventRoomChooserItem } from "@/lib/event-room-chooser-item";
import { previewGridCols1UntilMd } from "@/lib/preview-container-layout";
import { PUBLIC_MOTION_DURATION_MEDIUM, PUBLIC_MOTION_EASE } from "@/lib/public-rhythm";

type EventRoomChooserProps = {
  rooms: EventRoomChooserItem[];
  currentRoomIndex: number;
  onRoomChange: (index: number) => void;
  /** Matches the vendor theme `typography.headingEmphasis` used across sections. */
  headingEmphasis?: HeadingEmphasis | null;
  /** Optional heading accent substring (e.g. "Room"). */
  headingAccentHint?: string | null;
  className?: string;
};

/**
 * In-flow "Choose Your Room" section for multi-room public events.
 *
 * Replaces the disconnected floating pill with a dedicated, content-aligned
 * card selector so room choice belongs to the booking flow (Hero → Choose Room
 * → Packages) instead of competing with the header.
 */
export function EventRoomChooser({
  rooms,
  currentRoomIndex,
  onRoomChange,
  headingEmphasis,
  headingAccentHint,
  className,
}: EventRoomChooserProps) {
  if (rooms.length < 2) return null;

  const clampedIndex = Math.min(
    Math.max(currentRoomIndex, 0),
    Math.max(rooms.length - 1, 0),
  );
  const safeIndex = rooms[clampedIndex]?.disabled
    ? Math.max(
        0,
        rooms.findIndex((room) => !room.disabled),
      )
    : clampedIndex;

  return (
    <section
      aria-label="Choose your room"
      className={cn(
        "w-full bg-[var(--color-background)] px-4 py-16 md:py-20",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center md:mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Book your space
          </p>
          <SiteHeading
            level={2}
            title="Choose Your Room"
            accentHint={headingAccentHint}
            emphasis={headingEmphasis ?? undefined}
            variant="onSurface"
            align="center"
            className="!text-3xl !font-black !leading-[1.1] md:!text-4xl"
          />
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-text-dimmed)] md:text-base">
            Select a space to see its packages, menus and available dates.
          </p>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5",
            previewGridCols1UntilMd,
            rooms.length >= 3 && "lg:grid-cols-3",
          )}
        >
          {rooms.map((room) => {
            const isDisabled = Boolean(room.disabled);
            const isActive = !isDisabled && room.index === safeIndex;

            return (
              <button
                key={`${room.room_id}-${room.index}`}
                type="button"
                onClick={() => {
                  if (isDisabled) return;
                  onRoomChange(room.index);
                }}
                disabled={isDisabled}
                aria-pressed={isActive}
                aria-disabled={isDisabled}
                aria-label={
                  isDisabled
                    ? `${room.name} unavailable — no dates`
                    : `Select ${room.name}`
                }
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-[var(--color-surface)] text-left",
                  PUBLIC_MOTION_DURATION_MEDIUM,
                  PUBLIC_MOTION_EASE,
                  "transition-all motion-reduce:transition-none",
                  "active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2",
                  isDisabled
                    ? "cursor-not-allowed border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] opacity-55 shadow-none"
                    : isActive
                      ? "scale-[1.01] border-[color:var(--color-primary)] shadow-[0_22px_45px_-20px_color-mix(in_srgb,var(--color-primary)_60%,transparent)] ring-1 ring-[color:var(--color-primary)]"
                      : cn(
                          "border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] shadow-[0_12px_30px_-24px_rgba(0,0,0,0.35)]",
                          "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1 [@media(hover:hover)_and_(pointer:fine)]:hover:border-[color:color-mix(in_srgb,var(--color-primary)_45%,transparent)] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_22px_45px_-24px_rgba(0,0,0,0.4)]",
                        ),
                )}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[color:color-mix(in_srgb,var(--color-text)_6%,var(--color-surface))]">
                  {room.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external / cache-busted CMS URLs
                    <img
                      src={addCacheBusting(room.thumbnail)}
                      alt=""
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-200 ease-out motion-reduce:transition-none",
                        !isDisabled &&
                          "[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105",
                        isDisabled && "grayscale",
                      )}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-[var(--color-text-dimmed)]" />
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

                  {isDisabled ? (
                    <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
                      No dates
                    </span>
                  ) : isActive ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--color-primary)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-primary-foreground,white)] shadow-sm">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      Selected
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
                  <h3 className="truncate text-base font-bold text-[var(--color-text)] sm:text-lg">
                    {room.name}
                  </h3>

                  {isDisabled ? (
                    <p className="text-xs leading-relaxed text-[var(--color-text-dimmed)] sm:text-sm">
                      Dates not available for this room yet.
                    </p>
                  ) : room.highlights.length > 0 ? (
                    <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-text-dimmed)] sm:text-sm">
                      {room.highlights.join(" • ")}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
