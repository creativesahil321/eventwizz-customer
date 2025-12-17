"use client";
import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { emailTemplateService } from "@/services/common/email-template/email-template.service";

// Define the schema for the email template form
const EmailTemplateEditSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  subject: z
    .string()
    .min(3, { message: "Subject must be at least 3 characters." }),
  salutation: z.string().optional(),
  message_body: z
    .string()
    .min(10, { message: "Message body must be at least 10 characters." }),
  footer_body: z.string().optional(),
  button_enable: z.boolean().default(false),
  button_label: z.string().optional(),
  button_link: z.string().optional(),
  bottom_enable: z.boolean().default(false),
  bottom_title: z.string().optional(),
  bottom_body: z.string().optional(),
});

type FormType = z.infer<typeof EmailTemplateEditSchema>;

interface EmailTemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId?: number;
  onSaved?: () => void;
}

export default function EmailTemplateEditModal({
  isOpen,
  onClose,
  templateId,
  onSaved,
}: EmailTemplateEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [shortCodes, setShortCodes] = useState<string[]>([]);
  const [isFormLoaded, setIsFormLoaded] = useState(false);

  // Using 'any' type to avoid TypeScript errors with react-hook-form
  const form = useForm<FormType>({
    resolver: zodResolver(EmailTemplateEditSchema),
    defaultValues: {
      title: "",
      subject: "",
      salutation: "",
      message_body: "",
      footer_body: "",
      button_enable: false,
      button_label: "",
      button_link: "",
      bottom_enable: false,
      bottom_title: "",
      bottom_body: "",
    },
  });

  // Reset the form and loading state when the dialog is closed
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setIsFormLoaded(false);
    }
  }, [isOpen, form]);

  // Fetch template details when the modal is opened
  useEffect(() => {
    if (isOpen && templateId && !isFormLoaded) {
      fetchTemplateDetails();
    }
  }, [isOpen, templateId, isFormLoaded]);

  const fetchTemplateDetails = async () => {
    if (!templateId) return;

    setLoading(true);
    try {
      const response = await emailTemplateService.getTemplateById(templateId);

      // Set form values directly using setValue for each field
      if (response) {
        form.setValue("title", response.name || "");
        form.setValue("subject", response.subject || "");
        form.setValue("salutation", response.salutation || "");
        form.setValue("message_body", response.message_body || "");
        form.setValue("footer_body", response.footer_body || "");
        form.setValue("button_enable", !!response.button_level);
        form.setValue("button_label", response.button_level || "");
        form.setValue("button_link", response.button_link || "");
        form.setValue(
          "bottom_enable",
          !!(response.bottom_title || response.bottom_body)
        );
        form.setValue("bottom_title", response.bottom_title || "");
        form.setValue("bottom_body", response.bottom_body || "");

        // Set available short codes if any
        if (response.short_codes && Array.isArray(response.short_codes)) {
          setShortCodes(response.short_codes);
        }
      } else {
        console.error("No template data found in response");
        toast.error("Template data not found");
      }
    } catch (error) {
      console.error("Error fetching template details:", error);
      toast.error("Failed to load template details");
    } finally {
      setLoading(false);
      setIsFormLoaded(true);
    }
  };

  const onSubmit = async (data: FormType) => {
    if (!templateId) return;

    setLoading(true);
    try {
      // Prepare the data to be sent to the API
      const requestData = {
        name: data.title,
        subject: data.subject,
        salutation: data.salutation,
        message_body: data.message_body,
        footer_body: data.footer_body,
        // Convert to appropriate API structure
        button_level: data.button_enable ? data.button_label : undefined,
        button_link: data.button_enable ? data.button_link : undefined,
        bottom_title: data.bottom_enable ? data.bottom_title : undefined,
        bottom_body: data.bottom_enable ? data.bottom_body : undefined,
        // Include optional values
        footer_status: data.footer_body ? 1 : 0,
        bottom_status: data.bottom_enable ? 1 : 0,
      };

      await emailTemplateService.updateTemplate(templateId, requestData);

      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Email Template</DialogTitle>
        </DialogHeader>

        {loading && !form.formState.isSubmitting ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin [--color-primary:var(--color-primary)]" />
            <span className="ml-2">Loading template...</span>
          </div>
        ) : (
          <FormProvider {...form}>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <Tabs
                  defaultValue="basic"
                  value={activeTab}
                  onValueChange={setActiveTab}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="basic" className="flex-1">
                      Basic Details
                    </TabsTrigger>
                    <TabsTrigger value="content" className="flex-1">
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="footer" className="flex-1">
                      Footer & Button
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter template title"
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
                          <FormLabel>Email Subject</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter email subject"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="content" className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="salutation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salutation</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Dear Customer,"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message_body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Body</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter message content"
                              rows={8}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {shortCodes.length > 0 && (
                      <div className="bg-muted p-3 rounded-md">
                        <h3 className="text-sm font-medium mb-2">
                          Available Short Codes:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {shortCodes.map((code) => (
                            <span
                              key={code}
                              className="inline-block bg-[var(--color-secondary)]/10 text-[var(--color-primary)] px-2 py-1 rounded text-xs"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="footer" className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="footer_body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Footer Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter footer content"
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border rounded-md p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="button_enable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Include Call-to-Action Button
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch("button_enable") && (
                        <>
                          <FormField
                            control={form.control}
                            name="button_label"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Button Label</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., Click Here"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="button_link"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Button Link</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="https://example.com"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>

                    <div className="border rounded-md p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="bottom_enable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Include Bottom Section</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch("bottom_enable") && (
                        <>
                          <FormField
                            control={form.control}
                            name="bottom_title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bottom Section Title</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., Additional Information"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="bottom_body"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bottom Section Content</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Enter bottom section content"
                                    rows={4}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="event-secondary"
                    onClick={onClose}
                    disabled={loading || form.formState.isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="event-primary"
                    disabled={loading || form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
