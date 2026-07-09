"use client";

import { useCallback, useMemo, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Lock,
  Paperclip,
  Send,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AdminSupportMessage, SupportAttachment } from "../_lib/types";
import {
  formatSupportMessageTimestamp,
  groupMessagesByDate,
} from "../_lib/utils";

type ComposerMode = "reply" | "internal_note";

function MessageAvatar({
  name,
  variant,
}: {
  name: string;
  variant: "external" | "agent" | "internal";
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ring-2 ring-white",
        variant === "external" && "bg-slate-200 text-slate-700",
        variant === "agent" && "bg-[var(--color-primary)] text-white",
        variant === "internal" && "bg-amber-200 text-amber-900"
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

function SystemMessagePill({ message }: { message: AdminSupportMessage }) {
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

function ExternalMessage({ message }: { message: AdminSupportMessage }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex max-w-full items-center gap-2.5">
        <MessageAvatar name={message.senderName} variant="external" />
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
      {message.attachments?.length ? (
        <AttachmentCards attachments={message.attachments} align="left" />
      ) : null}
    </div>
  );
}

function AgentMessage({ message }: { message: AdminSupportMessage }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex max-w-full flex-row-reverse items-center gap-2.5">
        <MessageAvatar name={message.senderName} variant="agent" />
        <div className="min-w-0 text-right">
          <p className="text-sm font-semibold text-foreground">
            {message.senderName}
          </p>
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
      {message.attachments?.length ? (
        <AttachmentCards attachments={message.attachments} align="right" />
      ) : null}
    </div>
  );
}

function InternalNoteMessage({ message }: { message: AdminSupportMessage }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex max-w-full flex-row-reverse items-center gap-2.5">
        <MessageAvatar name={message.senderName} variant="internal" />
        <div className="min-w-0 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              <StickyNote className="size-3" />
              Internal note
            </span>
            <p className="text-sm font-semibold text-foreground">
              {message.senderName}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatSupportMessageTimestamp(message.createdAt)}
          </p>
        </div>
      </div>
      <div className="max-w-[min(100%,42rem)] rounded-3xl rounded-tr-md border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-950 shadow-sm">
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </div>
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

interface AdminConversationThreadProps {
  messages: AdminSupportMessage[];
  isComposerDisabled?: boolean;
}

export default function AdminConversationThread({
  messages,
  isComposerDisabled = false,
}: AdminConversationThreadProps) {
  const [composerMode, setComposerMode] = useState<ComposerMode>("reply");
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<AdminSupportMessage[]>([]);

  const allMessages = useMemo(
    () => [...messages, ...localMessages],
    [messages, localMessages]
  );
  const groupedMessages = groupMessagesByDate(allMessages);
  const isInternal = composerMode === "internal_note";

  const handleSend = useCallback(() => {
    if (isComposerDisabled || !draft.trim()) return;

    const newMessage: AdminSupportMessage = {
      id: `local-${Date.now()}`,
      sender: "agent",
      senderName: "You",
      content: draft.trim(),
      createdAt: new Date().toISOString(),
      isInternal,
    };

    setLocalMessages((prev) => [...prev, newMessage]);
    setDraft("");
  }, [draft, isComposerDisabled, isInternal]);

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
              const adminMessage = message as AdminSupportMessage;

              if (adminMessage.sender === "system") {
                return (
                  <SystemMessagePill key={adminMessage.id} message={adminMessage} />
                );
              }
              if (adminMessage.isInternal) {
                return (
                  <InternalNoteMessage
                    key={adminMessage.id}
                    message={adminMessage}
                  />
                );
              }
              if (
                adminMessage.sender === "customer" ||
                adminMessage.sender === "vendor"
              ) {
                return (
                  <ExternalMessage key={adminMessage.id} message={adminMessage} />
                );
              }
              return (
                <AgentMessage key={adminMessage.id} message={adminMessage} />
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 bg-white p-3 pb-4 sm:p-5 sm:pb-5">
        {isComposerDisabled ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-muted-foreground sm:px-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <Lock className="size-4" />
            </div>
            <p>This ticket is closed.</p>
          </div>
        ) : (
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
                className={cn(
                  "flex-1 px-3 py-2.5 text-sm font-medium transition-colors sm:flex-none sm:px-4",
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
                className={cn(
                  "flex-1 px-3 py-2.5 text-sm font-medium transition-colors sm:flex-none sm:px-4",
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
              className={cn(
                "min-h-[108px] resize-none rounded-none border-0 px-4 py-4 text-sm shadow-none focus-visible:ring-0",
                isInternal ? "bg-amber-50" : "bg-white"
              )}
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
                  variant={isInternal ? "default" : "event-primary"}
                  disabled={!draft.trim()}
                  onClick={handleSend}
                  className={cn(
                    "w-full rounded-full px-5 sm:w-auto",
                    isInternal &&
                      "bg-amber-600 text-white hover:bg-amber-700"
                  )}
                >
                  {isInternal ? (
                    <StickyNote className="size-4" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {isInternal ? "Add note" : "Send reply"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
