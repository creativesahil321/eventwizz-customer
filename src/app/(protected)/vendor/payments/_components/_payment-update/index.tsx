import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash } from "lucide-react";
import { UpdatePaymentForm } from "./update-form";
import { Payment } from "../../_lib/types";

interface UpdatePaymentDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  payment: Payment | null;
  showTrigger?: boolean;
}
export function UpdatePaymentDialog({
  payment,
  showTrigger = true,
  onOpenChange,
  ...props
}: UpdatePaymentDialogProps) {
  if (!payment) {
    return null;
  }
  const onSubmitHandler = (data: unknown) => {
    console.log(data, "datadatadatadata");
    // onOpenChange();
  };
  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button variant="event-primary" size="sm">
            <Trash className="mr-2 size-4" aria-hidden="true" />
            Update Payment
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="border border-gray-300 dark:border-border bg-background text-foreground">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-foreground">Update Payment</DialogTitle>
        </DialogHeader>
        <UpdatePaymentForm
          onSubmitHandler={onSubmitHandler}
          payment={payment}
        />
      </DialogContent>
    </Dialog>
  );
}
