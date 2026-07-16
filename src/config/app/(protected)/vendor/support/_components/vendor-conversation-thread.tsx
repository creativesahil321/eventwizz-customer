"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Lock,
  Paperclip,
  RotateCcw,
  Send,
  StickyNote,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getModKeyLabel } from "@/app/(protected)/_shared/support/mod-key";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_IMAGE_ATTACHMENT_ACCEPT,
  MAX_SUPPORT_ATTACHMENTS,
  collectSupportAttachments,
  formatSupportFileSize,
} from "@/app/(protected)/_shared/support/message-attachments";
import SupportAttachmentCards from "@/app/(protected)/_shared/support/support-attachment-cards";
import SupportMessageAvatar from "@/app/(protected)/_shared/support/support-message-avatar";
import SupportMessageScroller from "@/app/(protected)/_shared/support/support-message-scroller";
import { useStoreVendorSupportMessage } from "@/services/vendor/support";
import type { VendorSupportMessage } from "../_lib/types";
import {
  formatSupportMessageTimestamp,
  groupMessagesByDate,
} from "../_lib/utils";

type ComposerMode = "reply" | "internal_note";

function SystemMessagePill({ message }: { message: VendorSupportMessage }) {
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

function CustomerMessage({ message }: { message: VendorSupportMessage }) {
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
      {message.content?.trim() ? (
        <div className="max-w-[min(100%,36rem)] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-snug text-foreground shadow-sm">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.content}
          </p>
        </div>
      ) : null}
      {message.attachments?.length ? (
        <SupportAttachmentCards
          attachments={message.attachments}
          align="left"
        />
      ) : null}
    </div>
  );
}

function AgentMessage({ message }: { message: VendorSupportMessage }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex max-w-full flex-row-reverse items-center gap-1.5">
        <SupportMessageAvatar name={message.senderName} variant="self" />
        <div className="min-w-0 text-right">
          <p className="text-xs font-semibold text-foreground">
            {message.senderName}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatSupportMessageTimestamp(message.createdAt)}
          </p>
        </div>
      </div>
      {message.content?.trim() ? (
        <div className="max-w-[min(100%,36rem)] rounded-2xl rounded-tr-md bg-[var(--color-primary)] px-3 py-2 text-[13px] leading-snug text-white shadow-sm">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.content}
          </p>
        </div>
      ) : null}
      {message.attachments?.length ? (
        <SupportAttachmentCards
          attachments={message.attachments}
          align="right"
        />
      ) : null}
    </div>
  );
}

function InternalNoteMessage({ message }: { message: VendorSupportMessage }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex max-w-full flex-row-reverse items-center gap-1.5">
        <SupportMessageAvatar name={message.senderName} variant="internal" />
        <div className="min-w-0 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800">
              <StickyNote className="size-2.5" />
              Internal note
            </span>
            <p className="text-xs font-semibold text-foreground">
              {message.senderName}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {formatSupportMessageTimestamp(message.createdAt)}
          </p>
        </div>
      </div>
      {message.content?.trim() ? (
        <div className="max-w-[min(100%,36rem)] rounded-2xl rounded-tr-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-950 shadow-sm">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.content}
          </p>
        </div>
      ) : null}
      {message.attachments?.length ? (
        <SupportAttachmentCards
          attachments={message.attachments}
          align="right"
        />
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

interface VendorConversationThreadProps {
  ticketKey: string;
  messages: VendorSupportMessage[];
  isComposerDisabled?: boolean;
  disabledMessage?: string;
  onReopen?: () => void;
  closedReopenMessage?: string;
  showReopenHint?: boolean;
  reopenHintMessage?: string;
  onMessageSent?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function VendorConversationThread({
  ticketKey,
  messages,
  isComposerDisabled = false,
  disabledMessage = "This ticket is closed.",
  onReopen,
  closedReopenMessage = "This ticket is closed. Reopen it to continue the conversation with EventWizz Support.",
  showReopenHint = false,
  reopenHintMessage = "Send a message to reopen this ticket.",
  onMessageSent,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: VendorConversationThreadProps) {
  const [composerMode, setComposerMode] = useState<ComposerMode>("reply");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [stickToBottomKey, setStickToBottomKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const storeMessage = useStoreVendorSupportMessage();
  const isSending = storeMessage.isPending;

  useEffect(() => {
    setDraft("");
    setAttachments([]);
    setComposerMode("reply");
  }, [ticketKey]);

  const groupedMessages = groupMessagesByDate(messages);

  const isInternal = composerMode === "internal_note";

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
    const message = draft.trim();
    if (!message && attachments.length === 0) return;

    try {
      await storeMessage.mutateAsync({
        ticketKey,
        message,
        is_internal: isInternal || undefined,
        attachments,
      });
      setDraft("");
      setAttachments([]);
      setStickToBottomKey((key) => key + 1);
      onMessageSent?.();
    } catch {
      // API client already surfaces validation / network toasts
    }
  }, [
    attachments,
    draft,
    isComposerDisabled,
    isInternal,
    isSending,
    onMessageSent,
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
    !isSending && (Boolean(draft.trim()) || attachments.length > 0);
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
          messages.length === 0 ? (
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
              const vendorMessage = message as VendorSupportMessage;

              if (vendorMessage.sender === "system") {
                return (
                  <SystemMessagePill key={vendorMessage.id} message={vendorMessage} />
                );
              }
              if (vendorMessage.isInternal) {
                return (
                  <InternalNoteMessage
                    key={vendorMessage.id}
                    message={vendorMessage}
                  />
                );
              }
              if (vendorMessage.sender === "customer" || vendorMessage.sender === "admin") {
                return (
                  <CustomerMessage key={vendorMessage.id} message={vendorMessage} />
                );
              }
              return (
                <AgentMessage key={vendorMessage.id} message={vendorMessage} />
              );
            })}
          </div>
        ))}
      </SupportMessageScroller>

      <div className="shrink-0 border-t border-slate-200 bg-white p-2 sm:p-2.5">
        {isComposerDisabled ? (
          onReopen ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <Lock className="size-4" />
                </div>
                <p>{closedReopenMessage}</p>
              </div>
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
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-foreground sm:px-5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <Lock className="size-4" />
              </div>
              <p>{disabledMessage}</p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {showReopenHint ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
                {reopenHintMessage}
              </p>
            ) : null}
            <div
            className={cn(
              "overflow-hidden rounded-2xl border shadow-sm",
              isInternal
                ? "border-amber-200 bg-amber-50/80"
                : "border-slate-200 bg-white"
            )}
          >
            <div className="flex border-b border-slate-200/80">
              <button
                type="button"
                onClick={() => setComposerMode("reply")}
                disabled={isSending}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4",
                  composerMode === "reply"
                    ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Reply
              </button>
              <button
                type="button"
                onClick={() => setComposerMode("internal_note")}
                disabled={isSending}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4",
                  composerMode === "internal_note"
                    ? "border-b-2 border-amber-500 text-amber-800"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="sm:hidden">Note</span>
                <span className="hidden sm:inline">Internal note</span>
              </button>
            </div>

            <Textarea
              placeholder={
                isInternal
                  ? "Write an internal note — only your team can see this..."
                  : "Type your reply. Use @ to mention a teammate."
              }
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className={cn(
                "min-h-[40px] max-h-[120px] resize-none rounded-none border-0 px-3.5 py-2.5 text-sm shadow-none focus-visible:ring-0 sm:min-h-[48px]",
                isInternal ? "bg-amber-50" : "bg-white"
              )}
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

            <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
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
                  variant={isInternal ? "default" : "event-primary"}
                  size="sm"
                  disabled={!canSend}
                  onClick={() => void handleSend()}
                  className={cn(
                    "h-8 w-full rounded-full px-5 sm:w-auto",
                    isInternal &&
                      "bg-amber-600 text-white hover:bg-amber-700"
                  )}
                >
                  {isInternal ? (
                    <StickyNote className="size-4" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {isSending
                    ? "Sending..."
                    : isInternal
                      ? "Add note"
                      : "Send reply"}
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
