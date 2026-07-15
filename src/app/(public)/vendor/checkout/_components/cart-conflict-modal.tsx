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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
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

        <div className="space-y-4">
          {/* Event Comparison */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              {currentEvent.image && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <img
                    src={currentEvent.image}
                    alt={currentEvent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {currentEvent.name}
                </p>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-gray-400" />

            <div className="flex items-center gap-2">
              {newEvent.image && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <img
                    src={newEvent.image}
                    alt={newEvent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {newEvent.name}
                </p>
                <p className="text-xs text-gray-500">New event</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              variant="destructive"
              onClick={handleReplaceCart}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing && selectedAction === "replace" ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Switching events...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Replace with {newEvent.name}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleContinueWithCurrent}
              disabled={isProcessing}
              className="w-full border-slate-300 text-slate-900 hover:bg-slate-50"
            >
              {isProcessing && selectedAction === "continue" ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                  Redirecting...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Keep {currentEvent.name}
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="w-full border-slate-300 text-slate-900 hover:bg-slate-50"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
