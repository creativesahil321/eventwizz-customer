import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreatePaymentForm } from "./create-form";
import { Plus } from "lucide-react";

interface CreatePaymentDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  onSuccess?: () => void;
}
export function CreatePaymentDialog({
  onSuccess,
  onOpenChange,
  ...props
}: CreatePaymentDialogProps) {
  const onSubmitHandler = () => {
    if (typeof onOpenChange === "function") {
      onOpenChange(false);
    }
    if (typeof onSuccess === "function") {
      onSuccess();
    }
  };
  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      <DialogTrigger asChild>
        <Button variant="event-primary" size="sm" className="whitespace-nowrap">
          <Plus className="mr-1 h-4 w-4" />
          Add New
        </Button>
      </DialogTrigger>
      <DialogContent className="border border-gray-300 dark:border-border bg-background text-foreground">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-foreground">Add New Payment</DialogTitle>
        </DialogHeader>
        <CreatePaymentForm onSubmitHandler={onSubmitHandler} />
      </DialogContent>
    </Dialog>
  );
}
