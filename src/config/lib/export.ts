import type { Table } from "@tanstack/react-table";

/**
 * Triggers a browser download for a Blob (e.g. server-generated CSV/PDF).
 * Centralizes the object-URL lifecycle so callers don't duplicate the
 * create-link/click/revoke dance.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Laravel `Content-Disposition: attachment; filename="subscribers.csv"`. */
export function filenameFromContentDisposition(
  header: string | undefined,
  fallback: string,
): string {
  if (!header) return fallback;
  const star = header.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/['"]/g, ""));
    } catch {
      return star[1].trim().replace(/['"]/g, "");
    }
  }
  const match = header.match(/filename="?([^";]+)"?/i);
  const name = match?.[1]?.trim();
  return name || fallback;
}

export function exportTableToCSV<TData>(
  /**
   * The table to export.
   * @type Table<TData>
   */
  table: Table<TData>,
  opts: {
    /**
     * The filename for the CSV file.
     * @default "table"
     * @example "tasks"
     */
    filename?: string;
    /**
     * The columns to exclude from the CSV file.
     * @default []
     * @example ["select", "actions"]
     */
    excludeColumns?: (keyof TData | "select" | "actions")[];

    /**
     * Whether to export only the selected rows.
     * @default false
     */
    onlySelected?: boolean;
  } = {}
): void {
  const {
    filename = "table",
    excludeColumns = [],
    onlySelected = false,
  } = opts;

  // Retrieve headers (column names)
  const headers = table
    .getAllLeafColumns()
    .map((column) => column.id)
    .filter((id) => !excludeColumns.includes(id as keyof TData));

  // Build CSV content
  const csvContent = [
    headers.join(","),
    ...(onlySelected
      ? table.getFilteredSelectedRowModel().rows
      : table.getRowModel().rows
    ).map((row) =>
      headers
        .map((header) => {
          const cellValue = row.getValue(header);
          // Handle values that might contain commas or newlines
          return typeof cellValue === "string"
            ? `"${cellValue.replace(/"/g, '""')}"`
            : cellValue;
        })
        .join(",")
    ),
  ].join("\n");

  // Create a Blob with CSV content
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Create a link and trigger the download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportRowsToCSV(
  rows: Array<Record<string, unknown>>,
  opts: {
    filename?: string;
    headers: Array<{ key: string; label: string }>;
  },
): void {
  const { filename = "export", headers } = opts;

  const escapeCell = (value: unknown) => {
    if (value == null) return "";
    const s = String(value);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    headers.map((h) => escapeCell(h.label)).join(","),
    ...rows.map((row) =>
      headers.map((h) => escapeCell(row[h.key])).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
