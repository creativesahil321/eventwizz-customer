"use client";

import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { VendorBookingComment } from "@/services/vendor/bookings/bookings.service";

interface VendorBookingNotesPanelProps {
  notes: VendorBookingComment[];
  canUpdate: boolean;
  newNote: string;
  onNewNoteChange: (value: string) => void;
  onAddNote: () => void;
  isSubmitting?: boolean;
}

function formatNoteDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function VendorBookingNotesPanel({
  notes,
  canUpdate,
  newNote,
  onNewNoteChange,
  onAddNote,
  isSubmitting = false,
}: VendorBookingNotesPanelProps) {
  const canSubmit = newNote.trim().length > 0 && !isSubmitting;

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-card p-4 py-3 sm:p-6 sm:py-3.5 lg:p-8 lg:py-3.5">
        <p className="text-[10px] font-extrabold tracking-[0.18em] leading-none uppercase text-foreground">
          Booking notes
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {canUpdate
            ? "Staff and vendors can add notes for this booking."
            : "View-only: existing notes are shown below."}
        </p>
      </div>

      {canUpdate ? (
        <div className="border-b border-border bg-card p-4 sm:p-6 lg:p-8 lg:pt-4">
          <Textarea
            placeholder="Add a note (e.g. dietary requirements, setup time, special requests…)"
            value={newNote}
            onChange={(event) => onNewNoteChange(event.target.value)}
            className="min-h-[96px] resize-none rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground"
            disabled={isSubmitting}
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={onAddNote}
              className="h-9 gap-2 rounded-lg px-4 text-sm font-semibold shadow-none hover:opacity-[0.92] disabled:opacity-40"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-foreground, var(--primary-foreground))",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" strokeWidth={2} />
              )}
              Add note
            </Button>
          </div>
        </div>
      ) : null}

      <ScrollArea className={notes.length > 3 ? "max-h-72" : undefined}>
        <div className="divide-y divide-border/60 bg-card">
          {notes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
              No notes yet.
            </p>
          ) : (
            notes.map((note, index) => (
              <div
                key={`${note.createdAt}-${index}`}
                className="space-y-1.5 px-4 py-4 sm:px-6 lg:px-8"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {note.authorName}
                  </p>
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {note.role}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatNoteDate(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
