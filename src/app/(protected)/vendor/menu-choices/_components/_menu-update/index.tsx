import { MenuChoice } from "../../_lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UpdateMenuForm from "./form";
interface UpdateMenuDialogDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  menu: MenuChoice | null;
}
export default function UpdateMenuDialog({
  menu,
  ...props
}: UpdateMenuDialogDialogProps) {
  return (
    <>
      <section className="w-full">
        <Dialog {...props}>
          <DialogContent className="sm:max-w-[525px] text-black">
            <DialogHeader>
              <DialogTitle>Update Menu</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you&apos;re
                done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <UpdateMenuForm menu={menu} />
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </>
  );
}
