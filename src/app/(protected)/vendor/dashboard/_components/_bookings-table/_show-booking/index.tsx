"use client";

import { Button } from "@/components/ui/button";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Booking } from "../../../_lib/types";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ShowBookingDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  onSuccess?: () => void;
  booking: Booking | null;
  showTrigger?: boolean;
}

export default function ShowBookingDialog({
  booking,
  showTrigger = false,
  onSuccess,
  onOpenChange,
  ...props
}: ShowBookingDialogProps) {
  const { format: formatMoney } = useCurrencyFormat();

  if (!booking) {
    return null;
  }
  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">Booking Details</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-black">Booking Details</DialogTitle>
          <DialogDescription>
            Review and verify the booking information below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] text-black">
          {booking ? (
            <div className="grid gap-6 py-4">
              {/* Section: Event & User */}
              <div className="space-y-2">
                <div className="grid gap-2">
                  <div>
                    <Label className="text-sm">Event Name</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.event_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm">User</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.user.user_name} ({booking.user.email})
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              {/* Section: Dates */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Booking Date</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(booking.booking_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm">Created At</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(booking.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              {/* Section: Tickets & Capacity */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Tickets</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.tickets}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm">Total Tables</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.total_table}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm">Total People</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.total_people}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              {/* Section: Payment Details */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Paid Amount</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(booking.paid_amount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm">Balance Amount</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(booking.balance_amount)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Discount</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(booking.discount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm">Total Amount</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(booking.total_amount)}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Payment Status</Label>
                  <p className={`mt-1 text-sm capitalize text-foreground`}>
                    {booking.payment_status}
                  </p>
                </div>
                {booking.status && (
                  <div>
                    <Label className="text-sm">Booking Status</Label>
                    <p className={`mt-1 text-sm capitalize text-foreground`}>
                      {booking.status}
                    </p>
                  </div>
                )}
              </div>
              <Separator />
              {/* Section: Transaction History */}
              {booking.transaction_history &&
                booking.transaction_history.length > 0 && (
                  <div className="space-y-2">
                    <Label className="font-medium">Transaction</Label>
                    <div className="space-y-2">
                      {booking.transaction_history.map((tx) => (
                        <div
                          key={tx.id}
                          className="border rounded-md p-2 bg-background dark:bg-slate-800"
                        >
                          <p className="text-sm">
                            <strong>Date:</strong>{" "}
                            {new Date(tx.date).toLocaleString()}
                          </p>
                          <p className="text-sm">
                            <strong>Amount:</strong> {formatMoney(tx.amount)}
                          </p>
                          <p className="text-sm">
                            <strong>Status:</strong> {tx.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="py-4">
              <p className="text-center text-sm text-muted-foreground">
                No booking details available.
              </p>
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button
            onClick={() => {
              if (typeof onSuccess === "function") {
                onSuccess();
              }
              if (typeof onOpenChange === "function") {
                onOpenChange(false);
              }
            }}
            variant="event-ghost"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
