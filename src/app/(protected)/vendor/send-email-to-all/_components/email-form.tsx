"use client";

import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { BulkEmailFormData, EmailSchema } from "./schema";
import { useSendBulkEmailToAllCustomers } from "@/app/(protected)/vendor/customers/_lib/queries";
import { Upload, X, Paperclip } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";

// File Upload Component
const FileUploadField = ({
  value,
  onChange,
}: {
  value: File[];
  onChange: (files: File[]) => void;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      const totalFiles = value.length + newFiles.length;

      if (totalFiles > 5) {
        toast.error("Maximum 5 files allowed");
        return;
      }

      // Check file size (10MB limit per file)
      const oversizedFiles = newFiles.filter(
        (file) => file.size > 10 * 1024 * 1024
      );
      if (oversizedFiles.length > 0) {
        toast.error("File size must be less than 10MB");
        return;
      }

      onChange([...value, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 mb-2">
          Drop files here or click to upload
        </p>
        <input
          type="file"
          multiple
          className="hidden"
          id="bulk-file-upload"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
        />
        <label
          htmlFor="bulk-file-upload"
          className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Paperclip className="mr-2 h-4 w-4" />
          Choose Files
        </label>
        <p className="text-xs text-gray-500 mt-2">
          Max 5 files, 10MB each. Supported: PDF, DOC, DOCX, TXT, JPG, PNG, ZIP
        </p>
      </div>

      {/* File List */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Attached Files ({value.length}/5):
          </p>
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
            >
              <div className="flex items-center space-x-2">
                <Paperclip className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({formatFileSize(file.size)})
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function EmailForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const sendBulkEmailMutation = useSendBulkEmailToAllCustomers();

  const form = useForm<BulkEmailFormData>({
    resolver: zodResolver(EmailSchema),
    defaultValues: {
      subject: "",
      body: "",
      attachments: [],
    },
  });

  const onSubmit: SubmitHandler<BulkEmailFormData> = async (data) => {
    sendBulkEmailMutation.mutate(
      {
        subject: data.subject,
        body: data.body,
        attachments: data.attachments,
      },
      {
        onSuccess: (response) => {
          if (response?.status) {
            // Success toast is handled by API interceptor
            form.reset();
          } else {
            toast.error(response?.message || "Failed to send bulk email");
          }
        },
        onError: (error: Error) => {
          console.error("Error sending bulk email:", error);
          toast.error("Failed to send bulk email");
        },
      }
    );
  };

  return (
    <section
      className={cn("flex relative flex-col gap-6", className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Write your email.</CardTitle>
          <CardDescription>
            Your email will be sent to all customers when you submit this form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email subject" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter email body"
                        rows={8}
                        className="h-40"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachments (Optional)</FormLabel>
                    <FormControl>
                      <FileUploadField
                        value={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                variant="event-primary"
                disabled={sendBulkEmailMutation.isPending}
                type="submit"
                className="w-full"
              >
                {sendBulkEmailMutation.isPending && <PageLoader />}
                {sendBulkEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  );
}
