import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateSupportTicketForm } from "./create-ticket-form";
import { SupportTicketFormValues } from "./schema";
import { Plus } from "lucide-react";
import { PermissionGuard } from "@/components/permission";

interface CreateCustomerDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  onSuccess?: () => void;
}
export function CreateTicketDialog({
  onSuccess,
  onOpenChange,
  ...props
}: CreateCustomerDialogProps) {
  const onSubmitHandler = (data: SupportTicketFormValues) => {
    if (typeof onOpenChange === "function") {
      // Handle the form submission with the data
      console.log("Submitting ticket data:", data);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      <DialogTrigger asChild>
        <PermissionGuard permissionKey="create-ticket">
          <Button variant="event-primary" className="flex items-center gap-1">
            <Plus size={16} />
            <span>Create New Ticket</span>
          </Button>
        </PermissionGuard>
      </DialogTrigger>
      <DialogContent className="border bg-background text-black">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-foreground">
            Create New Ticket
          </DialogTitle>
        </DialogHeader>
        <CreateSupportTicketForm onSubmitHandler={onSubmitHandler} />
      </DialogContent>
    </Dialog>
  );
}
