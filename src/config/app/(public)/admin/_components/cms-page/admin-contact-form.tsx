"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CmsContentPanel } from "@/components/public/cms-page-ui";
import {
  ADMIN_CONTACT_FORM_SUBJECTS,
  adminContactFormSchema,
  type AdminContactFormValues,
} from "@/lib/admin-contact-form";

const fieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)]";

export function AdminContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AdminContactFormValues>({
    resolver: zodResolver(adminContactFormSchema),
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      subject: "general",
      message: "",
    },
  });

  const onSubmit = async (values: AdminContactFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send your message.");
      }

      toast.success("Message sent", {
        description: "Thank you — we will get back to you shortly.",
      });
      form.reset({
        name: "",
        businessName: "",
        email: "",
        subject: "general",
        message: "",
      });
    } catch (error) {
      toast.error("Unable to send message", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again or email us directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CmsContentPanel>
      <h2
        className="text-xl font-bold text-[color:var(--color-text)] md:text-2xl"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Send us a message
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-text-dimmed)]">
        For technical issues, please include your name, business name,
        screenshots where applicable, and a brief description of the issue.
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-8 space-y-5"
          noValidate
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabelClass}>
                    Your name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your full name"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabelClass}>Business name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your company or venue name"
                      autoComplete="organization"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabelClass}>
                  Email address <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabelClass}>Subject</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ADMIN_CONTACT_FORM_SUBJECTS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabelClass}>Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us how we can help…"
                    rows={6}
                    className="min-h-[160px] resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            variant="event-primary"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl px-6 text-base font-semibold sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                Send Message
                <Plus className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </CmsContentPanel>
  );
}
