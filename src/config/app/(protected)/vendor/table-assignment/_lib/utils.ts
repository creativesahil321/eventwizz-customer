import { env } from "@/env";
import type { EventDetailData } from "@/services/vendor/events/type";
import { DUMMY_ROWS } from "./constants";
import type { RoomOption, TableAssignmentRow } from "./types";

/** Build absolute URL for API-hosted assets (full URL or relative storage path). */
export function resolveApiAssetUrl(
  path: string | null | undefined,
): string | null {
  if (path == null || path === "") return null;
  const p = String(path).trim();
  if (/^https?:\/\//i.test(p)) return p;
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  const suffix = p.startsWith("/") ? p : `/${p}`;
  return `${base}${suffix}`;
}

/**
 * Spread total booked seats across temp-table slots (integers summing to `total`).
 * Used for UI until the API returns real per-table headcounts.
 */
export function splitBookedAcrossTempSlots(
  total: number,
  slotCount: number,
): number[] {
  if (slotCount <= 0) return [];
  const n = Math.max(0, Math.floor(Number(total) || 0));
  if (n === 0) return Array.from({ length: slotCount }, () => 0);
  const base = Math.floor(n / slotCount);
  const remainder = n % slotCount;
  return Array.from({ length: slotCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** Headcount label for each temp/final slot (booking persons, not table capacity). */
export function formatPersonCountPhrase(
  n: number | undefined,
): string | undefined {
  if (n == null) return undefined;
  if (n === 0) return "0 persons";
  if (n === 1) return "1 person";
  return `${n} persons`;
}

/** Even split of `booked` across final pills when temp slots cannot be aligned. */
export function seatCountsForFinalTablesRow(
  booked: number,
  finalTableCount: number,
): number[] | undefined {
  if (finalTableCount <= 0) return undefined;
  return splitBookedAcrossTempSlots(booked, finalTableCount);
}

/**
 * Per-final persons for pills when the API has not sent per-final `seats` yet. Prefers
 * `tempTableSeatCounts` from the API when aligned with temp slots; otherwise splits `booked`
 * across temp slots, then maps finals by slot id or table label.
 */
export function finalTablePersonCountsFromRow(row: TableAssignmentRow): number[] {
  const { booked, tempTables, finalTables } = row;
  const nFinal = finalTables.length;
  if (nFinal === 0) return [];

  const tempPersons =
    row.tempTableSeatCounts &&
    row.tempTableSeatCounts.length === tempTables.length
      ? row.tempTableSeatCounts
      : tempTables.length > 0
        ? splitBookedAcrossTempSlots(booked, tempTables.length)
        : [];

  if (tempTables.length === 0) {
    return splitBookedAcrossTempSlots(booked, nFinal);
  }

  if (
    row.tempTablesBySlotKey &&
    row.finalTablesBySlotKey &&
    Object.keys(row.tempTablesBySlotKey).length > 0 &&
    Object.keys(row.finalTablesBySlotKey).length > 0
  ) {
    const tempSlotKeys = sortNumericLikeStrings(
      Object.keys(row.tempTablesBySlotKey),
    );
    const finalSlotKeys = sortNumericLikeStrings(
      Object.keys(row.finalTablesBySlotKey),
    );
    return finalSlotKeys.map((sk) => {
      const tempIdx = tempSlotKeys.indexOf(sk);
      if (tempIdx >= 0 && tempIdx < tempPersons.length) {
        return tempPersons[tempIdx] ?? 0;
      }
      return 0;
    });
  }

  const even = splitBookedAcrossTempSlots(booked, nFinal);
  return finalTables.map((ft, i) => {
    const j = tempTables.findIndex(
      (t) => String(t).trim() === String(ft).trim(),
    );
    if (j >= 0 && j < tempPersons.length) return tempPersons[j]!;
    return even[i] ?? 0;
  });
}

export function formatEventDateLabel(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function roomOptionsFromEvent(
  detail: EventDetailData | undefined,
): RoomOption[] {
  const dates = detail?.stepThree?.dates ?? [];
  const map = new Map<string, string>();
  for (const dt of dates) {
    for (const t of dt.tables ?? []) {
      const key = String(t.id);
      if (map.has(key)) continue;
      const label = `${t.min_persons}–${t.max_persons} guests`;
      map.set(key, label);
    }
  }
  return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
}

export function datesForRoom(
  detail: EventDetailData | undefined,
  roomKey: string,
) {
  const dates = detail?.stepThree?.dates ?? [];
  return dates.filter((d) =>
    (d.tables ?? []).some((t) => String(t.id) === roomKey),
  );
}

export function cloneInitialAssignmentRows(): TableAssignmentRow[] {
  return DUMMY_ROWS.map((r) => ({
    ...r,
    finalTables: [...r.finalTables],
    isConfirmed: Boolean(r.isConfirmed),
  }));
}

export function occupiedFinalTablesElsewhere(
  rows: TableAssignmentRow[],
  excludeRowId: string,
): Set<string> {
  const s = new Set<string>();
  for (const o of rows) {
    if (o.id === excludeRowId) continue;
    for (const t of o.finalTables) {
      const n = t.trim();
      if (n) s.add(n);
    }
  }
  return s;
}

export function firstCrossRowTableConflict(
  rows: TableAssignmentRow[],
  excludeRowId: string,
  candidateTables: string[],
): string | null {
  const occupied = occupiedFinalTablesElsewhere(rows, excludeRowId);
  for (const t of candidateTables) {
    const n = t.trim();
    if (n && occupied.has(n)) return n;
  }
  return null;
}

export function getTableOccupantNameElsewhere(
  rows: TableAssignmentRow[],
  excludeRowId: string,
  table: string,
): string | null {
  const n = table.trim();
  if (!n) return null;
  for (const r of rows) {
    if (r.id === excludeRowId) continue;
    if (r.finalTables.some((t) => t.trim() === n)) return r.name;
  }
  return null;
}

/** Same ordering as confirm/save POST: numeric-aware sort. */
export function sortNumericLikeStrings(arr: string[]): string[] {
  const toNum = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return [...arr].sort((a, b) => {
    const na = toNum(a);
    const nb = toNum(b);
    if (na != null && nb != null) return na - nb;
    if (na != null) return -1;
    if (nb != null) return 1;
    return a.localeCompare(b);
  });
}

function isPlainRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

export type ParsedVendorTempTables = {
  tempTables: string[];
  tempTablesBySlotKey?: Record<string, string>;
  /** Present when API sends `{ id, table_number, seats }[]`. */
  tempTableSeatCounts?: number[];
};

export type ParsedVendorFinalTables = {
  finalTables: string[];
  finalTablesBySlotKey?: Record<string, string>;
  /** Present when API sends `{ id, final_table_number, seats }[]`. */
  finalTableSeatCounts?: number[];
};

function parseKeyedTempTables(tt: Record<string, unknown>): ParsedVendorTempTables {
  const tempTablesBySlotKey: Record<string, string> = {};
  for (const [k, v] of Object.entries(tt)) {
    tempTablesBySlotKey[String(k)] = String(v ?? "").trim();
  }
  const slotOrder = sortNumericLikeStrings(Object.keys(tempTablesBySlotKey));
  return {
    tempTables: slotOrder.map((k) => tempTablesBySlotKey[k]!),
    tempTablesBySlotKey,
  };
}

function parseTempTablesArray(tt: unknown[]): ParsedVendorTempTables {
  if (tt.length === 0) return { tempTables: [] };
  const first = tt[0];
  if (
    first != null &&
    typeof first === "object" &&
    !Array.isArray(first) &&
    "table_number" in first
  ) {
    const slots = tt as Array<{
      id?: unknown;
      table_number?: unknown;
      seats?: unknown;
    }>;
    const tempTablesBySlotKey: Record<string, string> = {};
    const seatBySlot: Record<string, number> = {};
    for (const s of slots) {
      if (s == null || typeof s !== "object") continue;
      const id = s.id != null ? String(s.id) : "";
      if (!id) continue;
      tempTablesBySlotKey[id] = String(s.table_number ?? "").trim();
      seatBySlot[id] = Number(s.seats ?? 0) || 0;
    }
    const slotOrder = sortNumericLikeStrings(Object.keys(tempTablesBySlotKey));
    return {
      tempTables: slotOrder.map((k) => tempTablesBySlotKey[k]!),
      tempTablesBySlotKey,
      tempTableSeatCounts: slotOrder.map((k) => seatBySlot[k] ?? 0),
    };
  }
  return { tempTables: tt.map((x) => String(x)) };
}

/** Supports keyed maps, `string[]`, and `{ id, table_number, seats }[]` slot rows. */
export function parseVendorTempTables(tt: unknown): ParsedVendorTempTables {
  if (tt == null) return { tempTables: [] };
  if (Array.isArray(tt)) return parseTempTablesArray(tt);
  if (isPlainRecord(tt)) return parseKeyedTempTables(tt);
  return { tempTables: [] };
}

function parseKeyedFinalTables(ft: Record<string, unknown>): ParsedVendorFinalTables {
  const finalTablesBySlotKey: Record<string, string> = {};
  for (const [k, v] of Object.entries(ft)) {
    finalTablesBySlotKey[String(k)] = String(v ?? "").trim();
  }
  const slotOrder = sortNumericLikeStrings(Object.keys(finalTablesBySlotKey));
  return {
    finalTables: slotOrder.map((k) => finalTablesBySlotKey[k]!),
    finalTablesBySlotKey,
  };
}

function parseFinalTablesArray(ft: unknown[]): ParsedVendorFinalTables {
  if (ft.length === 0) return { finalTables: [] };
  const first = ft[0];
  if (
    first != null &&
    typeof first === "object" &&
    !Array.isArray(first) &&
    "final_table_number" in first
  ) {
    const slots = ft as Array<{
      id?: unknown;
      final_table_number?: unknown;
      seats?: unknown;
    }>;
    const finalTablesBySlotKey: Record<string, string> = {};
    const seatBySlot: Record<string, number> = {};
    for (const s of slots) {
      if (s == null || typeof s !== "object") continue;
      const id = s.id != null ? String(s.id) : "";
      if (!id) continue;
      finalTablesBySlotKey[id] = String(s.final_table_number ?? "").trim();
      seatBySlot[id] = Number(s.seats ?? 0) || 0;
    }
    const slotOrder = sortNumericLikeStrings(Object.keys(finalTablesBySlotKey));
    return {
      finalTables: slotOrder.map((k) => finalTablesBySlotKey[k]!),
      finalTablesBySlotKey,
      finalTableSeatCounts: slotOrder.map((k) => seatBySlot[k] ?? 0),
    };
  }
  return { finalTables: ft.map((x) => String(x)) };
}

/** Supports keyed maps, `string[]`, and `{ id, final_table_number }[]` slot rows. */
export function parseVendorFinalTables(ft: unknown): ParsedVendorFinalTables {
  if (ft == null) return { finalTables: [] };
  if (Array.isArray(ft)) return parseFinalTablesArray(ft);
  if (isPlainRecord(ft)) return parseKeyedFinalTables(ft);
  return { finalTables: [] };
}

/**
 * Legacy: pair sorted temp labels with sorted finals (no slot ids from API).
 */
export function tempTableKeyForRemovedFinal(
  tempTables: string[],
  finalTables: string[],
  removedFinal: string,
): string | null {
  const rf = removedFinal.trim();
  if (!rf) return null;
  const tempKeys = sortNumericLikeStrings(tempTables.map((t) => String(t)));
  const finalVals = sortNumericLikeStrings(finalTables.map((t) => String(t)));
  const idx = finalVals.findIndex((v) => v === rf);
  if (idx < 0) return null;
  if (idx >= tempKeys.length) return null;
  return tempKeys[idx] ?? null;
}

/** Slot id whose final assignment equals `removedFinal` (DELETE sends this slot id). */
export function slotKeyForRemovedFinal(
  finalTablesBySlotKey: Record<string, string>,
  removedFinal: string,
): string | null {
  const rf = removedFinal.trim();
  if (!rf) return null;
  for (const [slotKey, fin] of Object.entries(finalTablesBySlotKey)) {
    if (String(fin).trim() === rf) return slotKey;
  }
  return null;
}

/** After removing one final pill when API uses keyed maps — drops that slot’s entry only. */
export function patchRowAfterFinalRemoval(
  row: TableAssignmentRow,
  removedFinal: string,
): TableAssignmentRow {
  const rf = removedFinal.trim();
  if (
    row.finalTablesBySlotKey &&
    Object.keys(row.finalTablesBySlotKey).length > 0
  ) {
    const sk = slotKeyForRemovedFinal(row.finalTablesBySlotKey, rf);
    if (!sk) {
      return applyFinalTablesUpdate(
        row,
        row.finalTables.filter((t) => t.trim() !== rf),
      );
    }
    const nextMap = { ...row.finalTablesBySlotKey };
    delete nextMap[sk];
    const orderedKeys = sortNumericLikeStrings(Object.keys(nextMap));
    const finalTables = orderedKeys.map((k) => nextMap[k]!);
    const count = finalTables.length;
    const base: TableAssignmentRow = {
      ...row,
      finalTables,
      finalTablesBySlotKey:
        Object.keys(nextMap).length > 0 ? nextMap : undefined,
      isConfirmed: false,
      pendingHint: undefined,
    };
    const withCounts: TableAssignmentRow = {
      ...base,
      finalTableSeatCounts: finalTablePersonCountsFromRow(base),
    };
    if (count === row.booked) {
      return { ...withCounts, status: "assigned" };
    }
    return {
      ...withCounts,
      status: "pending",
      pendingHint: `Pending (${count}/${row.booked})`,
    };
  }
  return applyFinalTablesUpdate(
    row,
    row.finalTables.filter((t) => t.trim() !== rf),
  );
}

export function applyFinalTablesUpdate(
  row: TableAssignmentRow,
  nextTables: string[],
): TableAssignmentRow {
  const trimmed = [
    ...new Set(nextTables.map((t) => t.trim()).filter(Boolean)),
  ];
  const capped = trimmed.slice(0, row.booked);
  const count = capped.length;

  if (row.tempTablesBySlotKey && Object.keys(row.tempTablesBySlotKey).length > 0) {
    const slotKeys = sortNumericLikeStrings(
      Object.keys(row.tempTablesBySlotKey),
    );
    const sortedFinals = sortNumericLikeStrings([...capped]);
    const nextMap: Record<string, string> = {};
    const n = Math.min(slotKeys.length, sortedFinals.length);
    for (let i = 0; i < n; i++) {
      nextMap[slotKeys[i]] = sortedFinals[i];
    }
    const orderedKeys = sortNumericLikeStrings(Object.keys(nextMap));
    const finalTables = orderedKeys.map((k) => nextMap[k]!);
    const nextRowSlot: TableAssignmentRow = {
      ...row,
      finalTables,
      finalTablesBySlotKey: nextMap,
      isConfirmed: false,
      pendingHint: undefined,
    };
    const countsSlot = finalTablePersonCountsFromRow(nextRowSlot);
    if (count === row.booked) {
      return {
        ...nextRowSlot,
        finalTableSeatCounts: countsSlot,
        status: "assigned",
      };
    }
    return {
      ...nextRowSlot,
      finalTableSeatCounts: countsSlot,
      status: "pending",
      pendingHint: `Pending (${count}/${row.booked})`,
    };
  }

  const nextRowLegacy: TableAssignmentRow = {
    ...row,
    finalTables: capped,
  };
  const countsLegacy = finalTablePersonCountsFromRow(nextRowLegacy);

  if (count === row.booked) {
    return {
      ...nextRowLegacy,
      finalTableSeatCounts: countsLegacy,
      status: "assigned",
      isConfirmed: false,
      pendingHint: undefined,
    };
  }
  return {
    ...nextRowLegacy,
    finalTableSeatCounts: countsLegacy,
    status: "pending",
    isConfirmed: false,
    pendingHint: `Pending (${count}/${row.booked})`,
  };
}

export function deriveAssignmentTotals(rows: TableAssignmentRow[]) {
  const totalSeats = rows.reduce((sum, r) => sum + r.booked, 0);
  const completeGuests = rows.filter((r) => r.status === "assigned").length;
  const awaitingGuests = rows.filter((r) => r.status === "pending").length;
  return { totalSeats, completeGuests, awaitingGuests };
}
