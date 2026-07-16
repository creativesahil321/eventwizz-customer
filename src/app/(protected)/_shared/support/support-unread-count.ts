export function resolveSupportUnreadCount(
  unreadCount: number | undefined,
  tickets: Array<{ is_unread?: boolean }> | undefined
): number {
  if (typeof unreadCount === "number" && Number.isFinite(unreadCount)) {
    return Math.max(0, unreadCount);
  }

  return (tickets ?? []).filter((ticket) => ticket.is_unread).length;
}
