"use client";

import { useCallback, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { addCacheBusting } from "@/lib/image-utils";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";
import type { SupportAttachment, SupportMessage } from "../_lib/types";
import {
  formatSupportMessageTimestamp,
  groupMessagesByDate,
} from "../_lib/utils";
import { useSupportCustomerProfile } from "../_lib/use-support-customer-profile";

function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function MessageAvatar({
  name,
  image,
  variant,
}: {
  name: string;
  image?: string | null;
  variant: "customer" | "agent";
}) {
  if (isValidUrl(image)) {
    return (
      <img
        src={addCacheBusting(image as string)}
        alt={name}
        className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ring-2 ring-white",
        variant === "customer"
          ? "bg-[var(--color-primary)] text-white"
          : "bg-slate-200 text-slate-700"
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function AttachmentCards({
  attachments,
  align,
}: {
  attachments: SupportAttachment[];
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "mt-2 flex max-w-full flex-wrap gap-2",
        align === "right" ? "justify-end" : "justify-start"
      )}
    >
      {attachments.map((file) => {
        const isImage = /\.(png|jpe?g|gif|webp)$/i.test(file.name);

        return (
          <div
            key={file.name}
            className="flex min-w-[148px] max-w-[200px] flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                isImage ? "bg-blue-50" : "bg-red-50"
              )}
            >
              {isImage ? (
                <ImageIcon className="size-4 text-blue-600" />
              ) : (
                <FileText className="size-4 text-red-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{file.size}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SystemMessagePill({ message }: { message: SupportMessage }) {
  return (
    <div className="flex justify-center py-3">
      <p className="max-w-[92%] rounded-full bg-slate-100 px-4 py-2 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
        {message.content}
        <span className="mx-1.5 text-slate-300">•</span>
        {formatSupportMessageTimestamp(message.createdAt)}
      </p>
    </div>
  );
}

function CustomerMessage({
  message,
  customerName,
  customerImage,
}: {
  message: SupportMessage;
  customerName: string;
  customerImage?: string | null;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex max-w-full flex-row-reverse items-center gap-2.5">
        <MessageAvatar
          name={customerName}
          image={customerImage}
          variant="customer"
        />
        <div className="min-w-0 text-right">
          <p className="text-sm font-semibold text-foreground">{customerName}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatSupportMessageTimestamp(message.createdAt)}
          </p>
        </div>
      </div>

      <div className="max-w-[min(100%,42rem)] rounded-3xl rounded-tr-md bg-[var(--color-primary)] px-4 py-3.5 text-sm leading-relaxed text-white shadow-md">
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </div>

      {message.attachments && message.attachments.length > 0 ? (
        <AttachmentCards attachments={message.attachments} align="right" />
      ) : null}
    </div>
  );
}

function AgentMessage({ message }: { message: SupportMessage }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex max-w-full items-center gap-2.5">
        <MessageAvatar name={message.senderName} variant="agent" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {message.senderName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatSupportMessageTimestamp(message.createdAt)}
          </p>
        </div>
      </div>

      <div className="max-w-[min(100%,42rem)] rounded-3xl rounded-tl-md border border-slate-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-foreground shadow-sm">
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </div>

      {message.attachments && message.attachments.length > 0 ? (
        <AttachmentCards attachments={message.attachments} align="left" />
      ) : null}
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="shrink-0 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

interface SupportConversationThreadProps {
  messages: SupportMessage[];
}

export default function SupportConversationThread({
  messages,
}: SupportConversationThreadProps) {
  const [reply, setReply] = useState("");
  const customer = useSupportCustomerProfile();
  const { data: session } = useSession();
  const user = useAuthStore((state) => state.user);
  const customerImage = user?.avatar || session?.user?.avatar;
  const groupedMessages = groupMessagesByDate(messages);

  const handleSend = useCallback(() => {
    if (!reply.trim()) return;
    setReply("");
  }, [reply]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 px-4 py-5 sm:px-6 sm:py-6">
        {groupedMessages.map((group) => (
          <div key={group.date} className="space-y-5">
            <DateSeparator label={group.date} />

            {group.messages.map((message) => {
              if (message.sender === "system") {
                return <SystemMessagePill key={message.id} message={message} />;
              }

              if (message.sender === "customer") {
                return (
                  <CustomerMessage
                    key={message.id}
                    message={message}
                    customerName={customer.name}
                    customerImage={customerImage}
                  />
                );
              }

              return <AgentMessage key={message.id} message={message} />;
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Textarea
            placeholder="Type your reply. Use @ to mention a teammate."
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[108px] resize-none rounded-none border-0 bg-white px-4 py-4 text-sm shadow-none focus-visible:ring-0"
          />
          <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-muted-foreground hover:bg-slate-100"
                aria-label="Attach file"
              >
                <Paperclip className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-muted-foreground hover:bg-slate-100"
                aria-label="Attach image"
              >
                <ImageIcon className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Cmd + Enter to send
              </span>
              <Button
                type="button"
                variant="event-primary"
                disabled={!reply.trim()}
                onClick={handleSend}
                className="rounded-full px-5"
              >
                <Send className="size-4" />
                Send reply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
