import React from "react";
import { EmailLog } from "../../_lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { ReplyFormValues, replyFormSchema } from "./schema";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";

const sendMail = async () => {
  return {
    status: true,
  };
};

type MailFormProp = {
  email: EmailLog;
};
export default function MailForm({ email }: MailFormProp) {
  const [loading, setLoading] = React.useState(false);
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replyFormSchema),
    defaultValues: {
      id: email?.id,
      subject: email?.subject ? email?.subject : "",
      message: email?.body ? email?.body : "",
    },
  });

  const onSubmit: SubmitHandler<ReplyFormValues> = async () => {
    setLoading(true);
    try {
      const mailResponse = await sendMail();
      if (mailResponse && "status" in mailResponse && mailResponse.status) {
        toast.success("Email sent successfully!");
        form.reset();
      } else {
        toast.error("Failed to send email");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    }
  };
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-6">
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
                  <Textarea
                    placeholder="Please enter the message"
                    className="text-foreground border-[#e4e4e7] bg-transparent"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <section className="w-full text-right">
            <Button
              type="submit"
              variant="event-primary"
              disabled={loading}
              className={
                loading ? "opacity-45 pointer-events-none cursor-wait" : ""
              }
            >
              {loading && <PageLoader />}
              <span>{loading ? "Sending..." : "Send Mail"}</span>
            </Button>
          </section>
        </form>
      </Form>
    </>
  );
}
