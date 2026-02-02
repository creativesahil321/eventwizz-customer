"use client";

import type { Table } from "@tanstack/react-table";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { History } from "../_lib/types";
import {
  useBulkDeleteBookings,
  useBulkEmailSend,
  useBulkExportBookings,
} from "../_lib/queries";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { Trash2, Mail, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TableToolbarActionsProps {
  table: Table<History>;
}

export function TableToolbarActions({ table }: TableToolbarActionsProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: "",
    body: "",
  });
  const [exportDate, setExportDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const bulkDeleteMutation = useBulkDeleteBookings();
  const bulkEmailMutation = useBulkEmailSend();
  const bulkExportMutation = useBulkExportBookings();
  const bulkDeleteInProgressRef = useRef(false);
  const bulkEmailInProgressRef = useRef(false);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedBookingIds: (number | string)[] = selectedRows
    .map((row) => row.original.booking_id ?? row.original.id)
    .filter((id): id is number | string => id != null);
  const hasSelection = selectedRows.length > 0;

  const handleBulkDelete = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Guard against duplicate calls
    if (bulkDeleteInProgressRef.current || bulkDeleteMutation.isPending) {
      return;
    }

    if (selectedBookingIds.length === 0) {
      toast.error("No bookings selected");
      return;
    }

    bulkDeleteInProgressRef.current = true;

    try {
      await bulkDeleteMutation.mutateAsync(selectedBookingIds);
      // Success toast is shown by the API interceptor
      table.resetRowSelection();
      setDeleteDialogOpen(false);
    } catch (error: unknown) {
      // Error is already handled by the mutation and API interceptor
      console.error("Bulk delete error:", error);
    } finally {
      bulkDeleteInProgressRef.current = false;
    }
  };

  const handleBulkEmail = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Guard against duplicate calls
    if (bulkEmailInProgressRef.current || bulkEmailMutation.isPending) {
      return;
    }

    if (selectedBookingIds.length === 0) {
      toast.error("No bookings selected");
      return;
    }

    const bodyText = emailData.body.replace(/<[^>]*>/g, "").trim();
    if (!emailData.subject.trim() || !bodyText) {
      toast.error("Please provide both subject and body");
      return;
    }

    bulkEmailInProgressRef.current = true;
    try {
      await bulkEmailMutation.mutateAsync({
        bookingIds: selectedBookingIds,
        subject: emailData.subject,
        body: emailData.body,
      });
      // Success toast is shown by the API interceptor
      setEmailDialogOpen(false);
      setEmailData({ subject: "", body: "" });
      table.resetRowSelection();
    } catch (error: unknown) {
      // Error is already handled by the mutation and API interceptor
      console.error("Bulk email error:", error);
    } finally {
      bulkEmailInProgressRef.current = false;
    }
  };

  const handleBulkExport = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (selectedBookingIds.length === 0) {
      toast.error("No bookings selected");
      return;
    }

    if (!exportDate) {
      toast.error("Please provide an export date");
      return;
    }

    try {
      await bulkExportMutation.mutateAsync({
        bookingIds: selectedBookingIds,
        date: exportDate,
      });
      toast.success(`Bookings exported successfully`);
      setExportDialogOpen(false);
      table.resetRowSelection();
    } catch (error) {
      // Error is already handled by the mutation and API interceptor
      console.error("Bulk export error:", error);
    }
  };

  return (
    <>
      <nav className="flex items-center gap-2">
        {/* Bulk Actions (only show when items are selected) */}
        {hasSelection && (
          <>
            <Button
              onClick={() => setEmailDialogOpen(true)}
              variant="event-outline"
              disabled={bulkEmailMutation.isPending}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email ({selectedRows.length})
            </Button>

            <Button
              onClick={() => setExportDialogOpen(true)}
              variant="event-outline"
              disabled={bulkExportMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              Export ({selectedRows.length})
            </Button>

            <Button
              onClick={() => setDeleteDialogOpen(true)}
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedRows.length})
            </Button>
          </>
        )}
      </nav>

      {/* Bulk Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] text-black">
          <DialogHeader>
            <DialogTitle>Send Bulk Email</DialogTitle>
            <DialogDescription>
              Send email to {selectedRows.length} selected booking(s). You can
              use placeholders like {"{name}"} in the body.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Your Booking Update is here"
                value={emailData.subject}
                onChange={(e) =>
                  setEmailData((prev) => ({ ...prev, subject: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">Body</Label>
              <TiptapEditor
                value={emailData.body}
                onChange={(html) =>
                  setEmailData((prev) => ({ ...prev, body: html }))
                }
                placeholder="Hello {name}, this is your booking has been updated..."
                maxLength={5000}
                maxWords={1000}
                showAIButton
                className="min-h-[200px]"
                aiContext={{
                  title: "Bulk booking email",
                  description:
                    "Email to customers about their booking update. Use placeholders like {name} for the customer name.",
                }}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{name}"} as a placeholder for the customer&apos;s name
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="event-outline"
              onClick={() => setEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="event-primary"
              onClick={(e) => handleBulkEmail(e)}
              disabled={bulkEmailMutation.isPending}
            >
              {bulkEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[500px] text-black">
          <DialogHeader>
            <DialogTitle>Export Bookings</DialogTitle>
            <DialogDescription>
              Export {selectedRows.length} selected booking(s) to CSV with a
              specific date filter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="export-date">Export Date</Label>
              <Input
                id="export-date"
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="event-outline"
              onClick={() => setExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="event-primary"
              onClick={(e) => handleBulkExport(e)}
              disabled={bulkExportMutation.isPending}
            >
              {bulkExportMutation.isPending ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="text-black">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedRows.length} selected booking(s). This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBulkDelete(e);
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
