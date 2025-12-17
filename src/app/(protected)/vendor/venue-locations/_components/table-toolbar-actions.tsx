import React from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Download } from "lucide-react";
import { Location } from "../_lib/types";

interface TableToolbarActionsProps {
  table: Table<Location>;
}

export function TableToolbarActions({ table }: TableToolbarActionsProps) {
  // Handler to refresh data in the table
  const handleRefresh = React.useCallback(() => {
    table.resetRowSelection();
    table.resetSorting();
    // This will trigger a re-fetch in the parent component
  }, [table]);

  // Handler to export data as CSV
  const handleExport = React.useCallback(() => {
    // Get current data from the table
    const data = table.getFilteredRowModel().rows.map((row) => row.original);

    // Convert to CSV format
    const headers = ["ID", "Name", "City", "Address", "Default", "Created At"];

    const csvRows = [
      headers.join(","),
      ...data.map((item) =>
        [
          item.id,
          `"${item.name}"`,
          `"${item.city}"`,
          `"${item.address || ""}"`,
          item.is_default ? "Yes" : "No",
          item.created_at || "",
        ].join(",")
      ),
    ];

    // Create CSV file and download
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `venue-locations-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [table]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        onClick={handleRefresh}
      >
        <RefreshCcw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        onClick={handleExport}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
      </Button>
    </div>
  );
}
