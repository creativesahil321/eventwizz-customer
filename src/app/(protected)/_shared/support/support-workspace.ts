/** Shared support inbox / thread layout tokens. */

export function isSupportWorkspacePath(
  pathname: string | null | undefined,
): boolean {
  const path = (pathname || "/").split("?")[0] || "/";
  return (
    path.startsWith("/customer/support") ||
    path.startsWith("/vendor/support") ||
    path.startsWith("/admin/support")
  );
}

export function isSupportConversationPath(
  pathname: string | null | undefined,
): boolean {
  const path = (pathname || "/").split("?")[0] || "/";
  return /\/support\/inbox\/[^/]+\/?$/.test(path);
}

export const SUPPORT_INBOX_FRAME_CLASS =
  "flex min-h-0 min-w-0 flex-col overflow-hidden xl:flex-row xl:divide-x xl:divide-slate-200";

/** Inbox list still has the page title + nav above it. */
export const SUPPORT_INBOX_HEIGHT_LIST_CLASS =
  "h-[calc(100dvh-15.5rem)] min-h-[18rem] sm:h-[calc(100dvh-14.5rem)] xl:h-[calc(100dvh-11rem)]";

/** Thread is full-bleed under the app header on <xl. */
export const SUPPORT_INBOX_HEIGHT_THREAD_CLASS =
  "h-[calc(100dvh-4rem)] xl:h-[calc(100dvh-11rem)]";

export const SUPPORT_COMPOSER_BAR_CLASS =
  "shrink-0 border-t border-slate-200 bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-2.5";

export const SUPPORT_SEND_BUTTON_CLASS =
  "h-11 min-h-11 w-full rounded-full px-5 sm:h-8 sm:min-h-8 sm:w-auto";
