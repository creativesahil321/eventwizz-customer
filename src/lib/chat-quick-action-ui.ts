export const LONG_CHAT_ACTION_LABEL_CHARS = 32;

type ChatActionLike = {
  id: string;
  label?: string;
  sendText?: string;
};

export function isChatGridAction(action: ChatActionLike): boolean {
  return (
    action.id.startsWith("date-") ||
    action.id.startsWith("table-") ||
    action.id.startsWith("drink-qty-") ||
    action.id.startsWith("ticket-")
  );
}

export function isChatEventPickAction(action: ChatActionLike): boolean {
  return (
    action.id.startsWith("event-") ||
    Boolean(
      action.sendText && /^book .+\s+in\s+.+/i.test(action.sendText.trim()),
    )
  );
}

export function isLongChatActionLabel(label: string | undefined): boolean {
  return (label?.trim().length ?? 0) >= LONG_CHAT_ACTION_LABEL_CHARS;
}

export function shouldStackChatQuickAction(action: ChatActionLike): boolean {
  return isChatEventPickAction(action) || isLongChatActionLabel(action.label);
}
