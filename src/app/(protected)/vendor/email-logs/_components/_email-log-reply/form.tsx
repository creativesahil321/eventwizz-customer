import React from "react";
import { EmailLog } from "../../_lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { ReplyFormValues, replyFormSchema } from "./schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { useResendEmail } from "../../_lib/queries";

type MailFormProp = {
  email: EmailLog;
  onSuccess?: () => void;
};
export default function MailForm({ email, onSuccess }: MailFormProp) {
  const resendEmailMutation = useResendEmail();
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replyFormSchema),
    defaultValues: {
      id: email?.id,
      subject: email?.subject ? email?.subject : "",
      message: email?.body ? email?.body : "",
    },
  });

  const onSubmit: SubmitHandler<ReplyFormValues> = async (data) => {
    if (!data.id) {
      return;
    }

    resendEmailMutation.mutate(
      {
        id: data.id,
        subject: data.subject,
        message: data.message,
      },
      {
        onSuccess: (response) => {
          if (response.status) {
            form.reset();
            onSuccess?.();
          }
          // Error handling is done by API interceptor
        },
        onError: () => {
          // Error handling is done by API interceptor
        },
      },
    );
  };
  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 py-6 pb-24"
        >
          <FormField
            control={form.control}
            name="id"
            render={({ field }) => <Input type="hidden" {...field} />}
          />

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-left block">Subject</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Subject"
                    className="text-foreground border-[#e4e4e7]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-left block">Mail Message</FormLabel>
                <FormControl>
                  <TiptapEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Please enter the message"
                    maxLength={5000}
                    maxWords={1000}
                    showAIButton={true}
                    className="min-h-[200px] max-h-[40vh] overflow-y-auto"
                    aiContext={{
                      title: email?.subject || "Email Reply",
                      ctaText: "Reply to the email",
                      ctaUrl: email?.emailTo,
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <section className="sticky bottom-0 z-10 flex w-full justify-end pt-4 pb-2 mt-4">
            <Button
              type="submit"
              variant="event-primary"
              disabled={resendEmailMutation.isPending || !form.watch("id")}
              className={
                resendEmailMutation.isPending
                  ? "opacity-45 pointer-events-none cursor-wait"
                  : ""
              }
            >
              {resendEmailMutation.isPending && <PageLoader />}
              <span>
                {resendEmailMutation.isPending ? "Sending..." : "Send Mail"}
              </span>
            </Button>
          </section>
        </form>
      </Form>
    </>
  );
}
