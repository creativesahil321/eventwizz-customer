import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { History } from "../../_lib/types";
import { Button } from "@/components/ui/button";
interface UpdateHistoryDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  history: History | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}
export default function MailHistoryDialog({
  history,
  showTrigger = true,
  onSuccess,
  onOpenChange,
  ...props
}: UpdateHistoryDialogProps) {
  return (  
    <>
      <Dialog onOpenChange={onOpenChange} {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="event-outline" size="sm">
              Mail
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent className="border border-gray-300 dark:border-border bg-background text-foreground">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-foreground">Message</DialogTitle>
          </DialogHeader>
          {JSON.stringify(history, null, 4)}
        </DialogContent>
      </Dialog>
    </>
  );
}
