import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateUserForm } from "./create-form";

interface CreateCustomerDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  onSuccess?: () => void;
}
export function CreateCustomerDialog({
  onSuccess,
  onOpenChange,
  ...props
}: CreateCustomerDialogProps) {
  const onSubmitHandler = () => {
    // Close the dialog after successful creation
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
      <DialogTrigger asChild>
        <Button variant="event-primary" size="sm">
          Add New
        </Button>
      </DialogTrigger>
      <DialogContent className="border bg-background text-black">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-foreground">
            Add New Customer
          </DialogTitle>
        </DialogHeader>
        <CreateUserForm onSubmitHandler={onSubmitHandler} />
      </DialogContent>
    </Dialog>
  );
}
