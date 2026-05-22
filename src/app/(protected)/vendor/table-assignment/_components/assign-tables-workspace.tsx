"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Eye,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  occupiedFinalTablesElsewhere,
  getTableOccupantNameElsewhere,
} from "../_lib/utils";
import type { TableAssignmentRow } from "../_lib/types";
import { EditableFinalTablesCell } from "./editable-final-tables-cell";
import { TempTablePills } from "./temp-table-pills";

type Props = {
  selectedEventName: string;
  selectedRoomLabel: string;
  selectedDateLabel: string;
  assignmentRows: TableAssignmentRow[];
  filteredRows: TableAssignmentRow[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchReset: () => void;
  onFinalTablesChange: (id: string, tables: string[]) => void;
  onRemoveFinalTable: (rowId: string, finalValue: string) => void;
  onConfirmFinalTables: (id: string) => void;
  isSaving?: boolean;
  isRemovingFinal?: boolean;
  onExportCsv: () => void;
  exportDisabled?: boolean;
  seatingPlanImageUrl?: string | null;
  onSeatingPlanFileSelected?: (file: File) => void;
  seatingPlanUploadDisabled?: boolean;
  isUploadingSeatingPlan?: boolean;
};

const SEATING_PLAN_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif";

export function AssignTablesWorkspace({
  selectedEventName,
  selectedRoomLabel,
  selectedDateLabel,
  assignmentRows,
  filteredRows,
  searchQuery,
  onSearchChange,
  onSearchReset,
  onFinalTablesChange,
  onRemoveFinalTable,
  onConfirmFinalTables,
  isSaving = false,
  isRemovingFinal = false,
  onExportCsv,
  exportDisabled = false,
  seatingPlanImageUrl = null,
  onSeatingPlanFileSelected,
  seatingPlanUploadDisabled = false,
  isUploadingSeatingPlan = false,
}: Props) {
  const seatingPlanInputRef = useRef<HTMLInputElement>(null);
  const [seatingPlanModalOpen, setSeatingPlanModalOpen] = useState(false);

  const getOccupantName = useCallback(
    (rowId: string, table: string) =>
      getTableOccupantNameElsewhere(assignmentRows, rowId, table),
    [assignmentRows],
  );

  type SortKey = "customer" | "booked" | "tempTables" | "finalTables";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("customer");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    const dir = sortDir === "asc" ? 1 : -1;
    const cmpText = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: "base" });

    const parseFirstTableToken = (values: string[]) => {
      const first = values.map((v) => String(v).trim()).find(Boolean) ?? "";
      if (!first) return { n: null as number | null, s: "" };
      const n = Number(first);
      return Number.isFinite(n) ? { n, s: first } : { n: null, s: first };
    };

    const cmpTableLists = (aVals: string[], bVals: string[]) => {
      const A = parseFirstTableToken(aVals);
      const B = parseFirstTableToken(bVals);
      if (A.n != null && B.n != null && A.n !== B.n) return (A.n - B.n) * dir;
      return cmpText(A.s, B.s) * dir;
    };

    rows.sort((a, b) => {
      let primary = 0;
      if (sortKey === "booked") primary = (a.booked - b.booked) * dir;
      else if (sortKey === "tempTables")
        primary = cmpTableLists(a.tempTables, b.tempTables);
      else if (sortKey === "finalTables")
        primary = cmpTableLists(a.finalTables, b.finalTables);
      else primary = cmpText(a.name, b.name) * dir;

      if (primary !== 0) return primary;
      return cmpText(a.name, b.name) * dir;
    });
    return rows;
  }, [filteredRows, sortDir, sortKey]);

  const SortableHeader = ({
    title,
    columnKey,
  }: {
    title: string;
    columnKey: SortKey;
  }) => {
    const isActive = sortKey === columnKey;
    const isAsc = isActive && sortDir === "asc";
    const isDesc = isActive && sortDir === "desc";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={
            "-ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
          }
          aria-label={`Sort by ${title}`}
        >
          {title}
          {isDesc ? (
            <ChevronDown />
          ) : isAsc ? (
            <ChevronUp />
          ) : (
            <ChevronsUpDown />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-28">
          <DropdownMenuCheckboxItem
            className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
            checked={isAsc}
            onClick={() => {
              setSortKey(columnKey);
              setSortDir("asc");
            }}
          >
            <ChevronUp />
            Asc
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
            checked={isDesc}
            onClick={() => {
              setSortKey(columnKey);
              setSortDir("desc");
            }}
          >
            <ChevronDown />
            Desc
          </DropdownMenuCheckboxItem>
          {isActive ? (
            <DropdownMenuItem
              className="pl-2 [&_svg]:text-muted-foreground"
              onClick={() => {
                setSortKey("customer");
                setSortDir("asc");
              }}
            >
              <X />
              Reset
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-md dark:bg-card">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-muted/25 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {selectedEventName}{" "}
              {selectedRoomLabel ? (
                <>
                  <span className="px-2 text-muted-foreground/70">·</span>
                  {selectedRoomLabel}{" "}
                </>
              ) : null}
              <span className="px-2 text-muted-foreground/70">·</span>
              {selectedDateLabel}
            </p>
          </div>

          <input
            ref={seatingPlanInputRef}
            type="file"
            accept={SEATING_PLAN_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f && onSeatingPlanFileSelected)
                onSeatingPlanFileSelected(f);
            }}
          />

          {/*
            Align with table columns: 25% = Customer+Booked band, 75% = Temp+Final band (see colgroup).
          */}
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[25%_75%] lg:items-end lg:gap-0">
            <div className="flex min-w-0 flex-col gap-1.5 lg:pr-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Seating plan / floor diagram
              </p>
              <div className="flex flex-wrap gap-2">
                {seatingPlanImageUrl ? (
                  <Button
                    type="button"
                    variant="event-outline"
                    className="h-10 shrink-0 sm:w-auto"
                    onClick={() => setSeatingPlanModalOpen(true)}
                    title="Open the seating layout image for this event date (helps staff match table numbers)."
                    aria-label="View seating plan diagram for this event date"
                  >
                    <Eye className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    View seating plan
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="event-outline"
                  className="h-10 shrink-0 sm:w-auto"
                  disabled={seatingPlanUploadDisabled || isUploadingSeatingPlan}
                  onClick={() => seatingPlanInputRef.current?.click()}
                  title="Upload a PNG, JPG, WebP, or GIF of the room layout / table plan for this date."
                  aria-label="Upload seating plan diagram for this event date"
                >
                  {isUploadingSeatingPlan ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {seatingPlanImageUrl ? "Replace plan" : "Upload seating plan"}
                </Button>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-2 sm:gap-y-2 lg:pl-3">
              <Button
                type="button"
                variant="event-outline"
                className="h-10 w-full shrink-0 sm:w-auto"
                onClick={onExportCsv}
                disabled={exportDisabled}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <label className="sr-only" htmlFor="assign-table-search">
                Search by customer name or table number
              </label>
              <Input
                id="assign-table-search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search name or table…"
                className="h-10 w-full min-w-0 flex-1 sm:min-w-[200px] lg:max-w-md bg-background transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-primary/25"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full shrink-0 sm:w-auto"
                onClick={onSearchReset}
                disabled={!searchQuery.trim()}
              >
                Reset search
              </Button>
            </div>
          </div>
        </div>

        <div
          className="relative w-full min-w-0 px-4 sm:px-6"
          role="region"
          aria-label="Customer table assignments"
        >
          <Table className="w-full min-w-[720px] border-collapse table-fixed">
            <colgroup>
              <col className="min-w-0" style={{ width: "14%" }} />
              <col style={{ width: "11%" }} />
              <col className="min-w-0" style={{ width: "37.5%" }} />
              <col className="min-w-0" style={{ width: "37.5%" }} />
            </colgroup>
            <TableHeader>
                <TableRow className="border-b border-[var(--color-border)] bg-muted/50 hover:bg-muted/50">
                  <TableHead
                    scope="col"
                    className="h-auto min-h-12 whitespace-nowrap bg-muted/50 p-0 py-3 pl-3 pr-1.5 text-left align-middle text-xs font-bold uppercase tracking-wide text-black dark:text-foreground"
                  >
                    <SortableHeader title="Customer" columnKey="customer" />
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto min-h-12 bg-muted/50 p-0 py-3 pl-1.5 pr-3 align-middle text-xs font-bold uppercase tracking-wide text-black dark:text-foreground"
                  >
                    <div className="flex justify-center whitespace-nowrap">
                      <SortableHeader title="Booked" columnKey="booked" />
                    </div>
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto min-h-12 whitespace-nowrap bg-muted/50 p-0 px-3 py-3 text-left align-middle text-xs font-bold uppercase tracking-wide text-black dark:text-foreground"
                  >
                    <SortableHeader
                      title="Temp tables"
                      columnKey="tempTables"
                    />
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto min-h-12 whitespace-nowrap bg-muted/50 p-0 px-3 py-3 text-left align-middle text-xs font-bold uppercase tracking-wide text-black dark:text-foreground"
                  >
                    <SortableHeader
                      title="Final tables"
                      columnKey="finalTables"
                    />
                  </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedRows.map((r) => {
                  const occupiedElsewhere = occupiedFinalTablesElsewhere(
                    assignmentRows,
                    r.id,
                  );
                  return (
                    <TableRow
                      key={r.id}
                      className="group border-b border-border/50 transition-colors duration-200 hover:bg-muted/[0.35]"
                    >
                      <TableCell className="min-w-0 p-0 py-4 pl-3 pr-1.5 align-top whitespace-normal">
                        <div className="truncate font-semibold text-foreground" title={r.name}>
                          {r.name}
                        </div>
                        {r.segment ? (
                          <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {r.segment}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-0 p-0 py-4 pl-1.5 pr-3 align-top text-center whitespace-normal">
                        <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md bg-muted/60 px-1.5 py-1 text-sm font-semibold tabular-nums text-foreground">
                          {r.booked}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 p-0 px-3 py-4 align-top whitespace-normal">
                        <TempTablePills
                          values={r.tempTables}
                          seatCounts={r.tempTableSeatCounts}
                          totalBooked={r.booked}
                        />
                      </TableCell>
                      <TableCell className="min-w-0 p-0 px-3 py-4 align-top whitespace-normal">
                        <EditableFinalTablesCell
                          row={r}
                          occupiedElsewhere={occupiedElsewhere}
                          getOccupantNameElsewhere={(table) =>
                            getOccupantName(r.id, table)
                          }
                          onFinalTablesChange={onFinalTablesChange}
                          onRemoveFinalTable={(finalValue) =>
                            onRemoveFinalTable(r.id, finalValue)
                          }
                          onConfirmFinalTables={onConfirmFinalTables}
                          isSaving={isSaving}
                          isRemovingFinal={isRemovingFinal}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="px-3 py-14 text-center text-sm text-muted-foreground"
                    >
                      {searchQuery.trim() ? (
                        <>
                          No customers match your search.
                          <span className="block mt-1 text-xs text-muted-foreground">
                            Try a different name or table number, or clear the
                            search.
                          </span>
                        </>
                      ) : (
                        <>
                          No bookings yet for this event date.
                          <span className="block mt-1 text-xs text-muted-foreground">
                            Once customers start booking, you’ll see them here
                            to assign final table numbers.
                          </span>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {seatingPlanImageUrl ? (
        <Dialog
          open={seatingPlanModalOpen}
          onOpenChange={setSeatingPlanModalOpen}
          modal
        >
          <DialogContent
            className={
              // Override shared Dialog defaults (centered panel + sm:max-w-lg) for a full-viewport lightbox.
              "!fixed !z-[60] !flex !flex-col !gap-0 !overflow-hidden !border-0 !bg-background !p-0 !shadow-none " +
              "!inset-0 !m-0 !h-dvh !max-h-dvh !min-h-dvh !w-screen !max-w-none " +
              "!translate-x-0 !translate-y-0 rounded-none"
            }
            aria-describedby={undefined}
          >
            <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-4 py-3 pr-4 backdrop-blur-sm sm:px-5">
              <DialogTitle className="text-left text-base font-semibold tracking-tight text-foreground">
                Seating plan
              </DialogTitle>
            </DialogHeader>
            <div className="relative min-h-0 flex-1 bg-muted/50 dark:bg-muted/30">
              {/*
                Use h-full w-full (not max-h/max-w) so the <img> box fills the pane; object-contain
                then scales the bitmap up to fit. max-* alone keeps intrinsic pixel size when small.
              */}
              <div className="absolute inset-0 box-border p-3 sm:p-6">
                <img
                  src={seatingPlanImageUrl}
                  alt="Seating plan"
                  className="h-full w-full min-h-0 object-contain shadow-md ring-1 ring-black/5 dark:ring-white/10"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
