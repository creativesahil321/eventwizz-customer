"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SupportPriority } from "../_lib/types";
import { useCreateVendorSupportTicket } from "@/services/vendor/support";
import {
  MAX_SUPPORT_ATTACHMENTS,
  SUPPORT_ATTACHMENT_ACCEPT,
  collectSupportAttachments,
  formatSupportFileSize,
} from "@/app/(protected)/_shared/support/message-attachments";
import { cn } from "@/lib/utils";

const PRIORITIES: SupportPriority[] = ["low", "medium", "high"];

export default function VendorSupportNewEnquiry() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createTicket = useCreateVendorSupportTicket();

  const [subject, setSubject] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [priority, setPriority] = useState<SupportPriority>("medium");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleFilesSelected = (fileList: FileList | null) => {
    const next = collectSupportAttachments(fileList, {
      currentCount: attachments.length,
    });
    if (next.length) {
      setAttachments((prev) => [...prev, ...next]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in the subject and description.");
      return;
    }
    if (!contactNumber.trim()) {
      toast.error("Please enter your contact number.");
      return;
    }

    try {
      const response = await createTicket.mutateAsync({
        subject: subject.trim(),
        contact_number: contactNumber.trim(),
        priority,
        description: description.trim(),
        attachments,
      });

      const ticketKey = response.data?.ticket_key;
      if (typeof ticketKey === "string" && ticketKey) {
        router.push(`/vendor/support/inbox/${ticketKey}`);
        return;
      }

      router.push("/vendor/support/inbox");
    } catch {
      // API client already surfaces validation / network toasts
    }
  };

  const isSubmitting = createTicket.isPending;

  return (
    <div className="min-w-0 max-w-full">
      <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
        <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            Contact admin
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            Raise an issue with EventWizz admin
          </h2>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="vendor-subject">Subject</Label>
              <Input
                id="vendor-subject"
                placeholder="e.g. Commission payout timing for Q3 events"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-11 min-w-0 max-w-full bg-gray-50"
              />
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="vendor-contact">Contact number</Label>
              <Input
                id="vendor-contact"
                type="tel"
                placeholder="e.g. +44 7700 900123"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="h-11 min-w-0 max-w-full bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                      priority === p
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-border)] bg-white hover:bg-muted"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="vendor-description">Description</Label>
              <Textarea
                id="vendor-description"
                placeholder="Share as much detail as possible — what happened, when, and what you need from admin."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[140px] max-h-[320px] min-w-0 max-w-full resize-y overflow-x-hidden bg-gray-50"
              />
            </div>

            <div className="min-w-0 space-y-3">
              <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-gray-50/50 p-6 text-center sm:p-8">
                <Paperclip className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  Drag and drop, or browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, PNG, JPG — up to 10 MB each, max {MAX_SUPPORT_ATTACHMENTS}{" "}
                  files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORT_ATTACHMENT_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <Button
                  type="button"
                  variant="event-outline"
                  size="sm"
                  className="mt-3"
                  disabled={attachments.length >= MAX_SUPPORT_ATTACHMENTS}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse files
                </Button>
              </div>

              {attachments.length > 0 ? (
                <ul className="space-y-2">
                  {attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSupportFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex min-w-0 justify-end pt-2">
              <Button
                type="submit"
                variant="event-primary"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Send className="size-4" />
                {isSubmitting ? "Sending..." : "Send to admin"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
