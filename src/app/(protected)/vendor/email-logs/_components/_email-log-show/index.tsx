"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash } from "lucide-react";
import { EmailLog } from "../../_lib/types";

interface EmailDialogProps extends React.ComponentPropsWithoutRef<
  typeof Dialog
> {
  email: EmailLog | unknown;
  showTrigger?: boolean;
}

export function EmailShowDialog({
  email: template,
  showTrigger = true,
  onOpenChange,
  ...props
}: EmailDialogProps) {
  const formattedDate = new Date(
    (template as EmailLog)?.created_at as string,
  ).toLocaleString();
  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button variant="event-primary" size="sm">
            <Trash className="mr-2 size-4" aria-hidden="true" />
            Send Mail
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="border-none bg-background dark:border text-black">
        <DialogHeader>
          {!template ? (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-muted-foreground text-sm">
                No email selected.
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col rounded-lg p-1 shadow-none">
              <div className="mb-4 pb-2">
                <DialogTitle>
                  <span className="text-2xl font-bold text-foreground">
                    {(template as EmailLog)?.subject as string}
                  </span>
                </DialogTitle>
                <div className="mb-2 mt-6 flex items-center justify-between text-sm text-foreground">
                  <span className="opacity-70">
                    To:{" "}
                    <span className="lowercase">
                      {(template as EmailLog)?.emailTo as string}
                    </span>
                  </span>
                  <span className="opacity-70">{formattedDate}</span>
                </div>
              </div>
              <div className="flex-1">
                <div
                  className="prose prose-sm max-w-full text-foreground opacity-80 break-words whitespace-normal overflow-hidden"
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: ((template as EmailLog)?.body as string) || "",
                  }}
                />
              </div>
            </div>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
