"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MenuBookingDate } from "../_lib/types";
import { cn } from "@/lib/utils";

interface DuplicateMenuModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly bookingDates: MenuBookingDate[];
  readonly currentDateKey: string;
  readonly currentTableId: string;
  readonly currentAttendeeCount: number;
  readonly onDuplicate: (
    targetDateKeys: string[],
    targetTableIds: string[]
  ) => void;
  readonly getAttendeeCount: (dateKey: string, tableId: string) => number;
}

export default function DuplicateMenuModal({
  open,
  onOpenChange,
  bookingDates,
  currentDateKey,
  currentTableId,
  currentAttendeeCount,
  onDuplicate,
  getAttendeeCount,
}: Readonly<DuplicateMenuModalProps>) {
  const [selectedTargets, setSelectedTargets] = useState<
    { dateKey: string; tableId: string }[]
  >([]);

  // Get all possible targets (excluding current table)
  const availableTargets = bookingDates.flatMap((date) =>
    date.tables
      .filter(
        (table) =>
          !(
            date.date_key === currentDateKey &&
            table.table_id === currentTableId
          )
      )
      .map((table) => ({
        dateKey: date.date_key,
        date: date.date,
        tableId: table.table_id,
        tableName: table.table_name,
        guests: table.guests,
        existingCount: getAttendeeCount(date.date_key, table.table_id),
      }))
  );

  const handleToggleTarget = (dateKey: string, tableId: string) => {
    setSelectedTargets((prev) => {
      const exists = prev.some(
        (t) => t.dateKey === dateKey && t.tableId === tableId
      );
      if (exists) {
        return prev.filter(
          (t) => !(t.dateKey === dateKey && t.tableId === tableId)
        );
      }
      return [...prev, { dateKey, tableId }];
    });
  };

  const handleSelectAll = () => {
    if (selectedTargets.length === availableTargets.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(
        availableTargets.map((t) => ({
          dateKey: t.dateKey,
          tableId: t.tableId,
        }))
      );
    }
  };

  const handleDuplicate = () => {
    const dateKeys = [...new Set(selectedTargets.map((t) => t.dateKey))];
    const tableIds = selectedTargets.map((t) => t.tableId);
    onDuplicate(dateKeys, tableIds);
    setSelectedTargets([]);
    onOpenChange(false);
  };

  const hasOverwrites = selectedTargets.some((target) => {
    const t = availableTargets.find(
      (t) => t.dateKey === target.dateKey && t.tableId === target.tableId
    );
    return t && t.existingCount > 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-black">
            <Copy className="h-5 w-5 text-black" />
            Duplicate Menu Selections
          </DialogTitle>
          <DialogDescription className="text-sm text-black">
            Copy {currentAttendeeCount} menu selection
            {currentAttendeeCount !== 1 ? "s" : ""} from the current table to
            other tables. You can then edit names and make adjustments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Select All */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedTargets.length === availableTargets.length}
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer text-black"
              >
                Select All Tables ({availableTargets.length} available)
              </label>
            </div>
            <Badge variant="secondary" className="text-xs text-black">
              {selectedTargets.length} selected
            </Badge>
          </div>

          {/* Warning for overwrites */}
          {hasOverwrites && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 text-black">
                  Some tables have existing selections
                </p>
                <p className="text-xs text-amber-700 mt-0.5 text-black">
                  Duplicating will replace existing menu choices in selected
                  tables
                </p>
              </div>
            </div>
          )}

          {/* Table List */}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="space-y-2 pr-3">
              {availableTargets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-black">
                  <p className="text-sm text-black">
                    No other tables available
                  </p>
                </div>
              ) : (
                availableTargets.map((target) => {
                  const isSelected = selectedTargets.some(
                    (t) =>
                      t.dateKey === target.dateKey &&
                      t.tableId === target.tableId
                  );
                  const hasExisting = target.existingCount > 0;

                  return (
                    <div
                      key={`${target.dateKey}-${target.tableId}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 text-black",
                        isSelected
                          ? "bg-primary/5 border-primary"
                          : "bg-white border-border"
                      )}
                      onClick={() =>
                        handleToggleTarget(target.dateKey, target.tableId)
                      }
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          handleToggleTarget(target.dateKey, target.tableId)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-black">
                            {target.tableName}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs text-black"
                          >
                            {target.date}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground text-black">
                            <Users className="h-3 w-3" />
                            {target.guests} guests
                          </div>
                          {hasExisting && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-amber-100 text-amber-700 text-black"
                            >
                              {target.existingCount} existing
                            </Badge>
                          )}
                          {!hasExisting && (
                            <Badge
                              variant="secondary"
                              className="text-xs text-black"
                            >
                              Empty
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-black flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="event-outline"
            onClick={() => {
              setSelectedTargets([]);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="event-primary"
            onClick={handleDuplicate}
            disabled={selectedTargets.length === 0}
            className="gap-2 text-white"
          >
            <Copy className="h-4 w-4" />
            Duplicate to {selectedTargets.length} Table
            {selectedTargets.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
