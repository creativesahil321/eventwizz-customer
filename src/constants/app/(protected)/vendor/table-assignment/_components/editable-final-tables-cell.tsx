"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TableAssignmentRow } from "../_lib/types";
import { AssignmentStatusBadge } from "./assignment-status-badge";
import { FinalTablePills } from "./final-table-pills";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  row: TableAssignmentRow;
  occupiedElsewhere: Set<string>;
  getOccupantNameElsewhere: (table: string) => string | null;
  onFinalTablesChange: (id: string, tables: string[]) => void;
  onRemoveFinalTable: (finalValue: string) => void;
  onConfirmFinalTables: (id: string) => void;
  isSaving?: boolean;
  isRemovingFinal?: boolean;
};

export function EditableFinalTablesCell({
  row,
  occupiedElsewhere,
  getOccupantNameElsewhere,
  onFinalTablesChange,
  onRemoveFinalTable,
  onConfirmFinalTables,
  isSaving = false,
  isRemovingFinal = false,
}: Props) {
  const [draft, setDraft] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const atMax = row.finalTables.length >= row.booked;
  const isConfirmed = Boolean(row.isConfirmed);
  const draftTrim = draft.trim();
  const alreadyOnThisRow = row.finalTables.some((t) => t.trim() === draftTrim);
  const draftTakenElsewhere =
    Boolean(draftTrim) && occupiedElsewhere.has(draftTrim) && !alreadyOnThisRow;

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (atMax) return;
    if (row.finalTables.some((t) => t.trim() === v)) {
      setDraft("");
      return;
    }
    if (occupiedElsewhere.has(v)) return;
    onFinalTablesChange(row.id, [...row.finalTables, v]);
    setDraft("");
  };

  const n = row.finalTables.length;
  const b = row.booked;

  return (
    <div
      className={cn(
        "box-border w-full min-w-0 max-w-full space-y-1.5",
        draftTakenElsewhere &&
          "rounded-md border border-destructive/35 bg-destructive/[0.04] p-1.5 ring-1 ring-destructive/15",
      )}
    >
      <div role="group" aria-label={`Final tables for ${row.name}`}>
        <FinalTablePills
          values={row.finalTables}
          seatCounts={row.finalTableSeatCounts}
          totalBooked={row.booked}
          onRemove={(label) => onRemoveFinalTable(label)}
          disabled={isSaving || isRemovingFinal}
        />
      </div>

      {!atMax ? (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
          <Input
            id={`final-tables-add-${row.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="e.g. 12"
            className={cn(
              "h-8 min-w-0 flex-1 text-xs tabular-nums transition-shadow duration-200 sm:max-w-[6.5rem]",
              draftTakenElsewhere
                ? "border-destructive/60 focus-visible:ring-destructive/30"
                : "focus-visible:ring-2 focus-visible:ring-primary/20",
            )}
            aria-label={`Add final table for ${row.name}`}
            aria-invalid={draftTakenElsewhere}
            aria-describedby={[
              `final-tables-limit-${row.id}`,
              draftTakenElsewhere ? `final-tables-taken-${row.id}` : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <Button
            type="button"
            variant="event-primary"
            size="sm"
            className="h-8 shrink-0 px-2.5 text-xs font-medium transition-transform duration-200 active:scale-[0.98] sm:shrink-0"
            onClick={add}
            disabled={draftTakenElsewhere || !draftTrim}
          >
            Add
          </Button>
        </div>
      ) : null}

      {draftTakenElsewhere ? (
        <p
          id={`final-tables-taken-${row.id}`}
          className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere] text-xs leading-relaxed text-destructive"
          role="alert"
        >
          Table <span className="font-semibold tabular-nums">{draftTrim}</span>{" "}
          is already assigned to{" "}
          <span className="font-semibold break-words [overflow-wrap:anywhere]">
            {getOccupantNameElsewhere(draftTrim) ?? "another customer"}
          </span>
          . Remove it on their row first, or pick a different number.
        </p>
      ) : null}

      {atMax && !isConfirmed ? (
        <>
          <Button
            type="button"
            variant="event-primary"
            size="sm"
            className="h-8 w-full text-xs sm:w-auto"
            onClick={() => setConfirmOpen(true)}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent className="text-black">
              <AlertDialogHeader>
                <AlertDialogTitle>Save final tables?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to save final tables for{" "}
                  <span className="font-semibold">{row.name}</span>:{" "}
                  <span className="font-semibold tabular-nums">
                    {row.finalTables.join(", ")}
                  </span>
                  .
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-3 sm:space-x-0">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onConfirmFinalTables(row.id);
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Confirm & save"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/40 pt-1.5">
        <AssignmentStatusBadge status={row.status} />
        <p
          id={`final-tables-limit-${row.id}`}
          className={cn(
            "min-w-0 flex-1 text-[11px] leading-tight tabular-nums",
            atMax
              ? "font-medium text-emerald-700 dark:text-emerald-500"
              : "text-muted-foreground",
          )}
        >
          {atMax ? (
            <>
              All persons assigned · {b} of {b} tables
              {isConfirmed ? " · Saved" : ""}
            </>
          ) : (
            <>
              {n} of {b} tables
              {row.status === "pending"
                ? " · Finish to mark as assigned"
                : ""}
            </>
          )}
        </p>
        {row.pendingHint ? (
          <span
            className="max-w-full text-[10px] font-medium leading-tight text-amber-700 dark:text-amber-500"
            title={row.pendingHint}
          >
            {row.pendingHint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
