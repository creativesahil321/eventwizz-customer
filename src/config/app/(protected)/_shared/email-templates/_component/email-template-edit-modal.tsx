"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EmailTemplateForm from "./email-template-form";
import { EmailTemplate } from "../_lib/types";

interface EmailTemplateEditModalProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  template: EmailTemplate | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export default function EmailTemplateEditModal({
  template,
  showTrigger = false,
  onSuccess,
  onOpenChange,
  ...props
}: EmailTemplateEditModalProps) {
  if (!template) {
    return null;
  }

  const templateName = template?.title || template?.name || "Template";

  const onSubmitHandler = () => {
    onSuccess?.();
    onOpenChange?.(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 border border-gray-300 dark:border-border bg-background text-foreground">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-black dark:text-white">
            Edit Email Template
          </DialogTitle>
          <DialogDescription>
            Update the template title, subject, and content below.
          </DialogDescription>
        </DialogHeader>
        <EmailTemplateForm
          template={template}
          onSubmitHandler={onSubmitHandler}
        />
      </DialogContent>
    </Dialog>
  );
}
