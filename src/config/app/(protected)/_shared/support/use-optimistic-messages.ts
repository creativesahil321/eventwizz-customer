"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatSupportFileSize } from "./message-attachments";
import type { SupportAttachment } from "@/app/(protected)/customer/support/_lib/types";

/**
 * Minimal shape shared by every tenant's support message model
 * (customer / vendor / admin). The optimistic layer only needs these fields.
 */
export interface OptimisticBaseMessage {
  id: string;
  sender: string;
  senderName: string;
  content: string;
  createdAt: string;
  attachments?: SupportAttachment[];
  isInternal?: boolean;
}

export type OptimisticStatus = "sending";

const OPTIMISTIC_ID_PREFIX = "optimistic-";

/** How far back (ms) a server echo may be dated relative to when we queued it. */
const ECHO_MATCH_TOLERANCE_MS = 120_000;

export function createOptimisticId(): string {
  return `${OPTIMISTIC_ID_PREFIX}${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function isOptimisticId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

/** Build attachment previews (name + size, no URL) for an optimistic bubble. */
export function buildOptimisticAttachments(
  files: File[]
): SupportAttachment[] | undefined {
  if (files.length === 0) return undefined;
  return files.map((file) => ({
    name: file.name,
    size: formatSupportFileSize(file.size),
    mimeType: file.type || undefined,
  }));
}

interface PendingMessage<T> {
  message: T;
  status: OptimisticStatus;
  /** Client epoch (ms) when queued — used to match the server echo. */
  queuedAt: number;
}

export interface UseOptimisticSupportMessagesResult<T> {
  /** Server messages + still-sending optimistic messages (deduped). */
  messages: Array<T & { optimisticStatus?: OptimisticStatus }>;
  /** Queue an optimistic message; returns its temporary id. */
  addPending: (message: T) => string;
  /** Drop an optimistic message (e.g. after a failed send). */
  removePending: (id: string) => void;
}

function normalizeContent(value: string): string {
  return value.trim();
}

/**
 * Overlays locally-sent ("optimistic") messages on top of the server list so a
 * reply appears instantly. Once the server echoes the same message (same sender
 * + content), the optimistic copy is transparently dropped — no duplicate, no
 * flicker. Reconciliation is content-based because the API assigns a new id.
 */
export function useOptimisticSupportMessages<T extends OptimisticBaseMessage>(
  serverMessages: T[],
  /** Clears queued optimistic messages when it changes (e.g. active ticket). */
  resetKey?: string
): UseOptimisticSupportMessagesResult<T> {
  const [pending, setPending] = useState<PendingMessage<T>[]>([]);

  // Drop any in-flight optimistic messages when switching conversations.
  useEffect(() => {
    setPending((prev) => (prev.length === 0 ? prev : []));
  }, [resetKey]);

  const isEchoedByServer = useCallback(
    (item: PendingMessage<T>): boolean => {
      const pendingContent = normalizeContent(item.message.content);
      const pendingAttachmentCount = item.message.attachments?.length ?? 0;

      return serverMessages.some((server) => {
        if (isOptimisticId(server.id)) return false;
        if (server.sender !== item.message.sender) return false;
        if (Boolean(server.isInternal) !== Boolean(item.message.isInternal)) {
          return false;
        }

        const serverTime = new Date(server.createdAt).getTime();
        if (
          Number.isFinite(serverTime) &&
          serverTime < item.queuedAt - ECHO_MATCH_TOLERANCE_MS
        ) {
          return false;
        }

        const serverContent = normalizeContent(server.content);
        if (pendingContent) {
          return serverContent === pendingContent;
        }
        // Attachment-only message (no text): match by presence of attachments.
        return serverContent === "" && (server.attachments?.length ?? 0) > 0
          ? pendingAttachmentCount > 0
          : false;
      });
    },
    [serverMessages]
  );

  // Prune optimistic messages the server has now echoed.
  useEffect(() => {
    setPending((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((item) => !isEchoedByServer(item));
      return next.length === prev.length ? prev : next;
    });
  }, [isEchoedByServer]);

  const messages = useMemo(() => {
    const base = serverMessages as Array<
      T & { optimisticStatus?: OptimisticStatus }
    >;
    const visiblePending = pending
      .filter((item) => !isEchoedByServer(item))
      .map((item) => ({
        ...item.message,
        optimisticStatus: item.status,
      }));
    return [...base, ...visiblePending];
  }, [serverMessages, pending, isEchoedByServer]);

  const addPending = useCallback((message: T) => {
    setPending((prev) => [
      ...prev,
      { message, status: "sending", queuedAt: Date.now() },
    ]);
    return message.id;
  }, []);

  const removePending = useCallback((id: string) => {
    setPending((prev) => prev.filter((item) => item.message.id !== id));
  }, []);

  return { messages, addPending, removePending };
}
