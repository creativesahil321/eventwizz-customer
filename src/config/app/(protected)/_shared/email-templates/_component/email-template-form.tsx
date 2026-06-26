import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  emailTemplateFormSchema,
  EmailTemplateFormValues,
} from "./email-template-form-schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { EmailTemplate } from "../_lib/types";
import { emailTemplateService } from "@/services/common/email-template/email-template.service";
import { toast } from "sonner";

interface EmailTemplateFormProps {
  template: EmailTemplate;
  onSubmitHandler: () => void;
}

const EmailTemplateForm = ({
  template,
  onSubmitHandler,
}: EmailTemplateFormProps) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [shortCodes, setShortCodes] = React.useState<string[]>([]);

  const defaultValues: Partial<EmailTemplateFormValues> = {
    subject: template?.subject ?? template?.when_received ?? "",
    body: (typeof template?.body === "string" ? template.body : "") || "",
    signature: template?.signature ?? "",
  };

  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateFormSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (template?.short_codes && Array.isArray(template.short_codes)) {
      setShortCodes(template.short_codes);
    }
  }, [template]);

  const onSubmit: SubmitHandler<EmailTemplateFormValues> = async (data) => {
    if (!template?.id) return;

    // Validate placeholders before sending – only allowed ones are accepted by the API
    if (shortCodes.length > 0) {
      const bodyPlaceholders = extractPlaceholders(data.body || "");
      const sigPlaceholders = extractPlaceholders(data.signature || "");
      const invalid: string[] = [];
      bodyPlaceholders.forEach((p) => {
        if (!allowedSet.has(p.toLowerCase())) invalid.push(p);
      });
      sigPlaceholders.forEach((p) => {
        if (!allowedSet.has(p.toLowerCase())) invalid.push(p);
      });
      if (invalid.length > 0) {
        const invalidList = [...new Set(invalid)].join(", ");
        toast.error(
          `Invalid placeholder(s): ${invalidList}. Only use the buttons above: ${shortCodes.join(", ")}`,
          { duration: 6000 },
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await emailTemplateService.updateTemplate(template.id, {
        subject: data.subject,
        body: data.body,
        signature: data.signature,
      });
      form.reset();
      onSubmitHandler();
    } catch {
      // Error toast handled by Axios interceptor globally
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to insert short code at cursor position
  // Extract all [[placeholder]] patterns from HTML/text
  const extractPlaceholders = (text: string): string[] => {
    if (!text || typeof text !== "string") return [];
    const matches = text.match(/\[\[([^\]]+)\]\]/g);
    return matches ? [...new Set(matches)] : [];
  };

  const insertShortCode = (code: string, fieldName: "body" | "signature") => {
    const currentValue = form.getValues(fieldName) || "";
    const newValue = currentValue + " " + code;
    form.setValue(fieldName, newValue);
  };

  const allowedSet = React.useMemo(
    () => new Set(shortCodes.map((c) => c.toLowerCase())),
    [shortCodes],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-4">
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-left block font-semibold text-base">
                  Email Subject
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Welcome to [[site_title]]"
                    className="text-foreground h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {shortCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Insert into content:
              </p>
              <div className="flex flex-wrap gap-2">
                {shortCodes.map((code) => (
                  <button
                    key={`body-${code}`}
                    type="button"
                    onClick={() => insertShortCode(code, "body")}
                    className="inline-flex items-center gap-1.5 bg-muted hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary text-foreground px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer"
                    title={`Insert ${code} into content`}
                  >
                    <span className="opacity-70">+</span>
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-left block font-semibold text-base">
                  Email Content
                </FormLabel>
                <FormControl>
                  <TiptapEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Write your email content. Use the buttons above to insert placeholders."
                    maxLength={10000}
                    maxWords={2000}
                    showAIButton={true}
                    className="min-h-[200px]"
                    aiContext={{
                      title: template?.name || template?.title || "Email",
                      description:
                        form.watch("subject") || "Email template body",
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {shortCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Insert into signature:
              </p>
              <div className="flex flex-wrap gap-2">
                {shortCodes.map((code) => (
                  <button
                    key={`sig-${code}`}
                    type="button"
                    onClick={() => insertShortCode(code, "signature")}
                    className="inline-flex items-center gap-1.5 bg-muted hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary text-foreground px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer"
                    title={`Insert ${code} into signature`}
                  >
                    <span className="opacity-70">+</span>
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="signature"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-left block font-semibold text-base">
                  Email Signature{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <TiptapEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="e.g., Regards, [[site_title]] Team"
                    maxLength={500}
                    maxWords={100}
                    showAIButton={false}
                    className="min-h-[80px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button
            type="submit"
            variant="event-primary"
            disabled={isSubmitting}
            className="space-x-2"
          >
            {isSubmitting && <PageLoader />}
            <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default React.memo(EmailTemplateForm);
