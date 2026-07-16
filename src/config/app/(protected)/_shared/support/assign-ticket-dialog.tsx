"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface SupportAssigneeOption {
  id: string;
  name: string;
}

interface AssignTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: string;
  assignees: SupportAssigneeOption[];
  currentAssignee: SupportAssigneeOption | null;
  onAssigned: (assignee: SupportAssigneeOption | null) => void;
  /**
   * When provided, runs instead of the local mock delay.
   * Resolve on success; throw/reject to keep the dialog open.
   */
  onConfirm?: (assignee: SupportAssigneeOption | null) => Promise<void>;
}

export default function AssignTicketDialog({
  open,
  onOpenChange,
  ticketRef,
  assignees,
  currentAssignee,
  onAssigned,
  onConfirm,
}: AssignTicketDialogProps) {
  const staff = assignees.filter((member) => member.id !== "unassigned");
  const [selectedId, setSelectedId] = useState("unassigned");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset only when the dialog opens — do not depend on `staff` (new array each render),
  // or selecting Unassigned gets immediately overwritten by the current assignee.
  useEffect(() => {
    if (!open) return;
    setSelectedId(
      currentAssignee?.id != null && currentAssignee.id !== ""
        ? String(currentAssignee.id)
        : "unassigned"
    );
  }, [open, currentAssignee?.id]);

  const resolveAssignee = (): SupportAssigneeOption | null => {
    if (selectedId === "unassigned") return null;
    return (
      staff.find((member) => String(member.id) === String(selectedId)) ?? null
    );
  };

  const handleConfirm = async () => {
    const assignee = resolveAssignee();
    setIsSubmitting(true);
    try {
      if (onConfirm) {
        await onConfirm(assignee);
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      onOpenChange(false);
      onAssigned(assignee);
      toast.success(
        assignee
          ? `${ticketRef} assigned to ${assignee.name}`
          : `${ticketRef} unassigned`
      );
    } catch {
      // API client / caller already surfaces errors
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="gap-5 bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Assign ticket</DialogTitle>
          <DialogDescription className="text-slate-600">
            Choose a staff member to own this ticket. They will be notified and
            the ticket will appear in their assignee filter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-slate-900">Staff member</Label>
          <RadioGroup
            value={String(selectedId)}
            onValueChange={setSelectedId}
            className="gap-2"
          >
            <label
              htmlFor="assign-unassigned"
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50",
                selectedId === "unassigned" &&
                  "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
              )}
            >
              <RadioGroupItem
                value="unassigned"
                id="assign-unassigned"
                className="shrink-0"
              />
              <span className="text-sm font-medium text-slate-900">
                Unassigned
              </span>
            </label>
            {staff.map((member) => {
              const memberId = String(member.id);
              return (
                <label
                  key={memberId}
                  htmlFor={`assign-${memberId}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50",
                    String(selectedId) === memberId &&
                      "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  )}
                >
                  <RadioGroupItem
                    value={memberId}
                    id={`assign-${memberId}`}
                    className="shrink-0"
                  />
                  <span className="text-sm font-medium text-slate-900">
                    {member.name}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900 sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            disabled={isSubmitting || staff.length === 0}
            onClick={() => void handleConfirm()}
            className="w-full sm:w-auto"
          >
            {isSubmitting
              ? "Assigning..."
              : selectedId === "unassigned"
                ? "Confirm unassign"
                : "Confirm assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
