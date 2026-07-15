"use client";

import { useCallback, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Lock,
  Paperclip,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getModKeyLabel } from "@/app/(protected)/_shared/support/mod-key";
import {
  MAX_SUPPORT_ATTACHMENTS,
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_IMAGE_ATTACHMENT_ACCEPT,
  collectSupportAttachments,
  formatSupportFileSize,
} from "@/app/(protected)/_shared/support/message-attachments";
import SupportMessageAvatar from "@/app/(protected)/_shared/support/support-message-avatar";
import SupportMessageScroller from "@/app/(protected)/_shared/support/support-message-scroller";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";
import type { SupportAttachment, SupportMessage } from "../_lib/types";
import {
  formatSupportMessageTimestamp,
  groupMessagesByDate,
} from "../_lib/utils";
import { useStoreCustomerSupportMessage } from "@/services/customer/support";

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
        "mt-1 flex max-w-full flex-wrap gap-1.5",
        align === "right" ? "justify-end" : "justify-start"
      )}
    >
      {attachments.map((file) => {
        const isImage =
          file.mimeType?.startsWith("image/") ||
          /\.(png|jpe?g|gif|webp)$/i.test(file.name);

        const content = (
          <>
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                isImage ? "bg-blue-50" : "bg-red-50"
              )}
            >
              {isImage ? (
                <ImageIcon className="size-3.5 text-blue-600" />
              ) : (
                <FileText className="size-3.5 text-red-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-foreground">
                {file.name}
              </p>
              {file.size ? (
                <p className="text-[10px] text-muted-foreground">{file.size}</p>
              ) : null}
            </div>
          </>
        );

        if (file.url) {
          return (
            <a
              key={`${file.name}-${file.url}`}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-[120px] max-w-[180px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {content}
            </a>
          );
        }

        return (
          <div
            key={file.name}
            className="flex min-w-[120px] max-w-[180px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

function SystemMessagePill({ message }: { message: SupportMessage }) {
  return (
    <div className="flex justify-center py-1">
      <p className="max-w-[92%] rounded-full bg-slate-100 px-3 py-1 text-center text-[10px] leading-snug text-muted-foreground">
        {message.content}
        <span className="mx-1 text-slate-300">•</span>
        {formatSupportMessageTimestamp(message.createdAt)}
      </p>
    </div>
  );
}

function CustomerMessage({
  message,
  customerImage,
}: {
  message: SupportMessage;
  customerImage?: string | null;
}) {
  const displayName = message.senderName?.trim() || "You";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex max-w-full flex-row-reverse items-center gap-1.5">
        <SupportMessageAvatar
          name={displayName}
          image={customerImage}
          variant="self"
        />
        <div className="min-w-0 text-right">
          <p className="text-xs font-semibold text-foreground">{displayName}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatSupportMessageTimestamp(message.createdAt)}
          </p>
        </div>
      </div>

      <div className="max-w-[min(100%,42rem)] rounded-2xl rounded-tr-md bg-[var(--color-primary)] px-3 py-2 text-[13px] leading-snug text-white shadow-sm">
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
    <div className="flex flex-col items-start gap-1">
      <div className="flex max-w-full items-center gap-1.5">
        <SupportMessageAvatar name={message.senderName} variant="other" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">
            {message.senderName}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatSupportMessageTimestamp(message.createdAt)}
          </p>
        </div>
      </div>

      <div className="max-w-[min(100%,42rem)] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-snug text-foreground shadow-sm">
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
    <div className="flex items-center gap-2 py-1">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="shrink-0 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

interface SupportConversationThreadProps {
  ticketKey: string;
  messages: SupportMessage[];
  isComposerDisabled?: boolean;
  onReopen?: () => void;
  closedReopenMessage?: string;
  showReopenHint?: boolean;
  reopenHintMessage?: string;
  onMessageSent?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function SupportConversationThread({
  ticketKey,
  messages,
  isComposerDisabled = false,
  onReopen,
  closedReopenMessage = "This ticket is closed. Reopen it to continue the conversation.",
  showReopenHint = false,
  reopenHintMessage = "Send a message to reopen this ticket.",
  onMessageSent,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: SupportConversationThreadProps) {
  const [reply, setReply] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [stickToBottomKey, setStickToBottomKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const storeMessage = useStoreCustomerSupportMessage();
  const { data: session } = useSession();
  const user = useAuthStore((state) => state.user);
  const customerImage = user?.avatar || session?.user?.avatar;
  const groupedMessages = groupMessagesByDate(messages);
  const isSending = storeMessage.isPending;

  const handleFilesSelected = (
    fileList: FileList | null,
    imagesOnly = false
  ) => {
    const next = collectSupportAttachments(fileList, {
      imagesOnly,
      currentCount: attachments.length,
    });
    if (next.length) {
      setAttachments((prev) => [...prev, ...next]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = useCallback(async () => {
    if (isComposerDisabled || isSending) return;
    if (!reply.trim() && attachments.length === 0) return;

    try {
      await storeMessage.mutateAsync({
        ticketKey,
        message: reply.trim(),
        attachments,
      });
      setReply("");
      setAttachments([]);
      setStickToBottomKey((key) => key + 1);
      onMessageSent?.();
    } catch {
      // API client already surfaces validation / network toasts
    }
  }, [
    attachments,
    isComposerDisabled,
    isSending,
    onMessageSent,
    reply,
    storeMessage,
    ticketKey,
  ]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSend();
    }
  };

  const canSend =
    !isSending && (Boolean(reply.trim()) || attachments.length > 0);
  const canAddAttachments = attachments.length < MAX_SUPPORT_ATTACHMENTS;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <SupportMessageScroller
        resetKey={ticketKey}
        stickToBottomKey={stickToBottomKey}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        emptyState={
          groupedMessages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages in this conversation yet.
            </p>
          ) : null
        }
      >
        {groupedMessages.map((group) => (
          <div key={group.date} className="space-y-2.5">
            <DateSeparator label={group.date} />

            {group.messages.map((message) => {
              if (message.sender === "system") {
                return (
                  <SystemMessagePill key={message.id} message={message} />
                );
              }

              if (message.sender === "customer") {
                return (
                  <CustomerMessage
                    key={message.id}
                    message={message}
                    customerImage={customerImage}
                  />
                );
              }

              return <AgentMessage key={message.id} message={message} />;
            })}
          </div>
        ))}
      </SupportMessageScroller>

      <div className="shrink-0 border-t border-slate-200 bg-white p-2 sm:p-2.5">
        {isComposerDisabled ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <Lock className="size-4" />
              </div>
              <p>{closedReopenMessage}</p>
            </div>
            {onReopen ? (
              <Button
                type="button"
                variant="event-primary"
                size="sm"
                className="w-full shrink-0 rounded-full px-4 sm:w-auto"
                onClick={onReopen}
              >
                <RotateCcw className="size-4" />
                Reopen ticket
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {showReopenHint ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
                {reopenHintMessage}
              </p>
            ) : null}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Textarea
              placeholder="Type your reply…"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="min-h-[40px] max-h-[120px] resize-none rounded-none border-0 bg-white px-3.5 py-2.5 text-sm shadow-none focus-visible:ring-0 sm:min-h-[48px]"
            />

            {attachments.length > 0 ? (
              <ul className="space-y-2 border-t border-slate-100 px-3 py-3">
                {attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
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
                      disabled={isSending}
                      onClick={() => removeAttachment(index)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-slate-100 px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-0.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORT_ATTACHMENT_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={SUPPORT_IMAGE_ATTACHMENT_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files, true)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:bg-slate-100"
                  aria-label="Attach file"
                  disabled={isSending || !canAddAttachments}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:bg-slate-100"
                  aria-label="Attach image"
                  disabled={isSending || !canAddAttachments}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="size-4" />
                </Button>
              </div>

              <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {getModKeyLabel()} + Enter to send
                </span>
                <Button
                  type="button"
                  variant="event-primary"
                  size="sm"
                  disabled={!canSend}
                  onClick={() => void handleSend()}
                  className="h-8 rounded-full px-5"
                >
                  <Send className="size-4" />
                  {isSending ? "Sending..." : "Send reply"}
                </Button>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
