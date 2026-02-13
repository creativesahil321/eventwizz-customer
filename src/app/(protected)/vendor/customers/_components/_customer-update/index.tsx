import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { Customer } from "../../_lib/types";
import { UpdateCustomerForm } from "./update-form";

interface UpdateCustomerDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  customer: Customer | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}
export function UpdateCustomerDialog({
  customer,
  showTrigger = true,
  onSuccess,
  onOpenChange,
  ...props
}: UpdateCustomerDialogProps) {
  if (!customer) {
    return null;
  }
  
  const fullName = `${customer?.first_name} ${customer?.last_name}`;
  
  const onSubmitHandler = () => {
    // Close the dialog after successful update
    if (typeof onOpenChange === "function") {
      onOpenChange(false);
    }
    // Call the onSuccess callback if provided
    if (typeof onSuccess === "function") {
      onSuccess();
    }
  };
  
  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button variant="event-outline" size="sm">
            <Edit className="mr-2 size-4" aria-hidden="true" />
            Update Customer
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col border bg-background text-black p-6 sm:max-h-[85vh]">
        <DialogHeader className="shrink-0 mb-3">
          <DialogTitle className="text-foreground">
            Update Customer - {fullName}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-2 -mr-2">
          <UpdateCustomerForm
            onSubmitHandler={onSubmitHandler}
            customer={customer}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
