"use client";
import * as React from "react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Trash } from "lucide-react";
import { EmailLog } from "../../_lib/types";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { reformatMonetaryAmountsInHtml } from "@/lib/currency-format";

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
  const { formatLocale } = useCurrencyFormat();
  const bodyHtml = (template as EmailLog)?.body as string | undefined;
  const displayBody = useMemo(
    () => reformatMonetaryAmountsInHtml(bodyHtml ?? "", formatLocale),
    [bodyHtml, formatLocale],
  );
  const formattedDate = new Date(
    (template as EmailLog)?.created_at as string,
  ).toLocaleString();
  const attachments = Array.isArray((template as EmailLog)?.attachments)
    ? ((template as EmailLog).attachments as string[]).filter(Boolean)
    : [];
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
      <DialogContent className="border-none bg-background dark:border text-black max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          {!template ? (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-muted-foreground text-sm">
                No email selected.
              </p>
            </div>
          ) : (
            <>
              <DialogTitle>
                <span className="text-2xl font-bold text-foreground">
                  {(template as EmailLog)?.subject as string}
                </span>
              </DialogTitle>
              <div className="mb-2 mt-4 flex items-center justify-between text-sm text-foreground">
                <span className="opacity-70">
                  To:{" "}
                  <span className="lowercase">
                    {(template as EmailLog)?.emailTo as string}
                  </span>
                </span>
                <span className="opacity-70">{formattedDate}</span>
              </div>

              {attachments.length > 0 && (
                <div className="mb-3 mt-1 flex flex-wrap gap-2">
                  {attachments.map((url, index) => (
                    <Button
                      key={`${url}-${index}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(url, "_blank", "noopener,noreferrer")
                      }
                      className="gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {attachments.length > 1
                        ? `View attachment ${index + 1}`
                        : "View attachment"}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogHeader>
        {template && (
          <div
            className="flex-1 min-h-0 overflow-y-auto px-6 pb-6"
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            <div
              className="prose prose-sm max-w-full text-foreground opacity-80 break-words whitespace-normal"
              dangerouslySetInnerHTML={{
                __html: displayBody,
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
