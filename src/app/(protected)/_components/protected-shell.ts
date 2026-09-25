/** Desktop sidebar from 1280px (`xl`). Phones and tablets use the hamburger. */
export const PROTECTED_SIDEBAR_CLASS = "hidden xl:block";
export const PROTECTED_HAMBURGER_CLASS =
  "inline-flex size-10 shrink-0 text-foreground xl:hidden";
export const PROTECTED_DESKTOP_TOGGLE_CLASS = "hidden shrink-0 xl:block";

export function protectedSidebarOffsetClass(collapsed: boolean) {
  return collapsed ? "xl:ml-[60px]" : "xl:ml-[264px]";
}
