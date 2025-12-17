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
import { EmailTemplate } from "../../_lib/types";
import { useEmailTemplate } from "../../_lib/queries";

interface EmailDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  template: EmailTemplate | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function ShowEmailTemplateDialog({
  template,
  showTrigger = true,
  onOpenChange,
  ...props
}: EmailDialogProps) {
  // Fetch complete template data when dialog is open
  const { data: completeTemplate, isLoading } = useEmailTemplate(
    template?.id || 0
  );

  if (!template) {
    return null;
  }

  const formattedDate =
    template && (template as unknown as EmailTemplate).created_at
      ? new Date(
          (template as unknown as EmailTemplate).created_at as unknown as string
        ).toLocaleString()
      : "No date available";

  // Get the complete template data from the query or fallback to the basic template
  const templateData = completeTemplate?.data || template;

  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash className="mr-2 size-4" aria-hidden="true" />
            View Template
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="border-none bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Email Template</DialogTitle>
          {isLoading ? (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-muted-foreground text-sm">
                Loading template details...
              </p>
            </div>
          ) : !templateData ? (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-muted-foreground text-sm">
                No email template found.
              </p>
            </div>
          ) : (
            <div className="px-0 py-2 my-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base/7 font-semibold">
                  {templateData?.title ||
                    ((templateData as unknown as EmailTemplate)
                      ?.subject as unknown as string) ||
                    "Untitled Template"}
                </h3>
              </div>

              {((templateData as unknown as EmailTemplate)
                .email as unknown as string) && (
                <p className="text-sm/6 text-primary underline mt-2">
                  {
                    (templateData as unknown as EmailTemplate)
                      .email as unknown as string
                  }
                </p>
              )}

              {((templateData as unknown as EmailTemplate)
                .body as unknown as string) && (
                <div className="mt-4 border p-4 rounded-md bg-muted">
                  <p className="text-sm/6 text-muted-foreground whitespace-pre-wrap">
                    {
                      (templateData as unknown as EmailTemplate)
                        .body as unknown as string
                    }
                  </p>
                </div>
              )}

              <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                <p>Created: {formattedDate}</p>
                {((templateData as unknown as EmailTemplate)
                  .updated_at as unknown as string) && (
                  <p>
                    Updated:{" "}
                    {new Date(
                      (templateData as unknown as EmailTemplate)
                        .updated_at as unknown as string
                    ).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
