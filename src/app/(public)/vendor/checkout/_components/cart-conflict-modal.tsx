/**
 * Cart Conflict Modal Component
 *
 * Professional UI component that handles cart conflicts when users try to add
 * items from different events. Provides clear options to either replace the
 * current cart or continue with the existing event.
 */

"use client";

import { useState } from "react";
import {
  ShoppingCart,
  AlertTriangle,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CartConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: {
    name: string;
    slug: string;
    image?: string;
    dateCount: number;
  };
  newEvent: {
    name: string;
    slug: string;
    image?: string;
  };
  onReplaceCart: () => void;
  onContinueWithCurrent: () => void;
  isProcessing?: boolean;
}

export default function CartConflictModal({
  isOpen,
  onClose,
  currentEvent,
  newEvent,
  onReplaceCart,
  onContinueWithCurrent,
  isProcessing = false,
}: CartConflictModalProps) {
  const [selectedAction, setSelectedAction] = useState<
    "replace" | "continue" | null
  >(null);

  const handleReplaceCart = () => {
    setSelectedAction("replace");
    onReplaceCart();
  };

  const handleContinueWithCurrent = () => {
    setSelectedAction("continue");
    onContinueWithCurrent();
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedAction(null);
      onClose();
    }
  };

  const actionButtonClass =
    "h-auto min-h-10 w-full min-w-0 max-w-full shrink whitespace-normal px-3 py-2.5 text-left leading-snug [&_svg]:shrink-0";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg gap-4 overflow-x-hidden p-4 sm:p-6">
        <DialogHeader className="min-w-0 text-center sm:text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>

          <DialogTitle className="text-lg font-semibold text-gray-900">
            Cart Conflict Detected
          </DialogTitle>

          <DialogDescription className="text-sm text-gray-600">
            You already have items from <strong>{currentEvent.name}</strong> in
            your cart.
            <br />
            Choose what you&apos;d like to do:
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Event Comparison */}
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-50 p-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {currentEvent.image ? (
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-200">
                  <img
                    src={currentEvent.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <p className="truncate text-sm font-medium text-gray-900">
                {currentEvent.name}
              </p>
            </div>

            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />

            <div className="flex min-w-0 flex-1 items-center gap-2">
              {newEvent.image ? (
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-200">
                  <img
                    src={newEvent.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {newEvent.name}
                </p>
                <p className="text-xs text-gray-500">New event</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex min-w-0 flex-col gap-2">
            <Button
              variant="destructive"
              onClick={handleReplaceCart}
              disabled={isProcessing}
              className={cn(actionButtonClass, "justify-start")}
            >
              {isProcessing && selectedAction === "replace" ? (
                <>
                  <div className="mr-2 h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-white" />
                  <span className="min-w-0 break-words">Switching events...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <span className="min-w-0 break-words">
                    Replace with {newEvent.name}
                  </span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleContinueWithCurrent}
              disabled={isProcessing}
              className={cn(
                actionButtonClass,
                "justify-start border-slate-300 text-slate-900 hover:bg-slate-50",
              )}
            >
              {isProcessing && selectedAction === "continue" ? (
                <>
                  <div className="mr-2 h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-gray-700" />
                  <span className="min-w-0 break-words">Redirecting...</span>
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  <span className="min-w-0 break-words">
                    Keep {currentEvent.name}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="min-w-0 pt-1 sm:justify-stretch">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className={cn(
              actionButtonClass,
              "justify-center border-slate-300 text-slate-900 hover:bg-slate-50",
            )}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
