import { Button } from "@/components/ui/button";
import { History } from "../../_lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UpdateHistoryForm } from "./update-form";
interface UpdateHistoryDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  history: History | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}
export default function UpdateHistoryDialog({
  history,
  showTrigger = true,
  onSuccess,
  onOpenChange,
  ...props
}: UpdateHistoryDialogProps) {
  const onSubmitHandler = (data) => {
    console.log(data, "datadatadatadata");
    // onOpenChange();
  };
  return (
    <>
      <Dialog onOpenChange={onOpenChange} {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="event-outline" size="sm">
              Update Order History
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent className="border border-gray-300 dark:border-border bg-background text-foreground">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-foreground">
              Update History{" "}
            </DialogTitle>
          </DialogHeader>
          <UpdateHistoryForm
            onSubmitHandler={onSubmitHandler}
            history={history}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
