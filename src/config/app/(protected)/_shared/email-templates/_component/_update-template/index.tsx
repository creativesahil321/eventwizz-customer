"use client";
import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { EmailTemplate } from "../../_lib/types";
import { EmailTemplateSchema, FormType } from "./schema";
import { updateEmailTemplate } from "./action";
import { Trash } from "lucide-react";

interface EmailDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  template: EmailTemplate | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

const FormInputField = ({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder: string;
}) => {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground opacity-70">{label}</FormLabel>
          <FormControl>
            <Input {...field} type={type} placeholder={placeholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export function UpdateEmailTemplate({
  template,
  showTrigger = true,
  onSuccess,
  onOpenChange,
  ...props
}: EmailDialogProps) {
  const defaultTemplate: FormType = {
    title: template?.title || "",
    subject: template?.subject?.toString() || "",
    email: template?.email ? String(template.email).toLowerCase() : "",
    body: template?.body?.toString() || "",
  };

  const form = useForm<FormType>({
    resolver: zodResolver(EmailTemplateSchema),
    defaultValues: defaultTemplate,
  });

  const { handleSubmit } = form;

  const onSubmit = async (data: FormType) => {
    try {
      if (!template || !template.id) {
        toast.error("Template ID is missing");
        return;
      }

      const result = await updateEmailTemplate(data, template.id);
      if (result?.status) {
        toast.success(result?.message);
        if (onSuccess) onSuccess();
        if (typeof onOpenChange === "function") {
          onOpenChange(false);
        }
      } else {
        toast.error(result?.message || "Failed to update template");
      }
    } catch (error: unknown) {
      console.error("Update template error:", error);
    }
  };

  if (!template) return null;

  return (
    <section className="bg-background text-foreground">
      <Dialog onOpenChange={onOpenChange} {...props}>
        {showTrigger && (
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash className="mr-2 size-4" aria-hidden="true" />
              Update Email Template
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="border-none">
          <DialogHeader>
            <DialogTitle>Email Template</DialogTitle>
            <FormProvider {...form}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <section className="flex h-full space-y-6 flex-col rounded-lg bg-white shadow-none my-4 py-6">
                  <FormInputField
                    name="title"
                    label="Title"
                    placeholder="Enter template title"
                  />
                  <FormInputField
                    name="subject"
                    label="Subject"
                    placeholder="Enter email subject"
                  />
                  <FormInputField
                    name="email"
                    label="Reply To"
                    type="email"
                    placeholder="Reply-to email"
                  />
                  <FormField
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground opacity-70">
                          Template Content
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter template content"
                            rows={6}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <section className="flex flex-row justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (typeof onOpenChange === "function") {
                          onOpenChange(false);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="event-primary"
                      type="submit"
                      className="ml-2"
                    >
                      Save Changes
                    </Button>
                  </section>
                </section>
              </form>
            </FormProvider>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  );
}
