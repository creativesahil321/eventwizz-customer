"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  HelpCircle,
  LogOut,
  Search,
  User as UserIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { addCacheBusting } from "@/lib/image-utils";
import { logout } from "@/lib/auth/logout";
import { getModKeyLabel } from "@/app/(protected)/_shared/support/mod-key";
import { useAuthStore } from "@/store/auth.store";
import { useDomainStore } from "@/store/domain.store";
import { MenuItemProps } from "@/config/menus/types";
import MobileSidebar from "./_components/mobile-sidebar";
import LayoutToggle from "./_components/layout-toggle";
import { notificationService } from "@/services/common/notification";
import {
  mapCustomerSupportTicketToConversation,
  useCustomerSupportTickets,
} from "@/services/customer/support";
import { useDebounce } from "@/hooks/data-table/use-debounce";

const CUSTOMER_QUICK_LINKS = [
  {
    title: "Dashboard",
    href: "/customer/dashboard",
    keywords: ["dashboard", "home", "overview"],
  },
  {
    title: "My Bookings",
    href: "/customer/bookings",
    keywords: ["bookings", "booking", "events", "tickets"],
  },
  {
    title: "Support",
    href: "/customer/support/inbox",
    keywords: ["support", "help", "enquiry", "ticket"],
  },
  {
    title: "Notifications",
    href: "/customer/notifications",
    keywords: ["notifications", "alerts", "updates"],
  },
  {
    title: "Transactions",
    href: "/customer/transactions",
    keywords: ["transactions", "payments", "receipts"],
  },
  {
    title: "Profile",
    href: "/customer/profile",
    keywords: ["profile", "account", "settings"],
  },
] as const;

function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function CustomerHeaderSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isSupportWorkspace = pathname.startsWith("/customer/support");
  const debouncedQuery = useDebounce(query, 400);
  const { data: supportTicketsResponse } = useCustomerSupportTickets(
    { sort: "newest", search: debouncedQuery.trim() || undefined },
    { enabled: isSupportWorkspace && debouncedQuery.trim().length > 0 },
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    if (isSupportWorkspace) {
      return (supportTicketsResponse?.data ?? [])
        .map(mapCustomerSupportTicketToConversation)
        .slice(0, 6)
        .map((conversation) => ({
          title: conversation.subject,
          subtitle: conversation.ref,
          href: `/customer/support/inbox/${conversation.id}`,
        }));
    }

    return CUSTOMER_QUICK_LINKS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.some((keyword) => keyword.includes(q)),
    )
      .slice(0, 6)
      .map((item) => ({
        title: item.title,
        subtitle: "Go to page",
        href: item.href,
      }));
  }, [isSupportWorkspace, query, supportTicketsResponse?.data]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  const placeholder = isSupportWorkspace
    ? "Search conversations or bookings…"
    : "Search bookings, events, or pages…";

  const dialogPlaceholder = isSupportWorkspace
    ? "Search conversations or bookings…"
    : "Search bookings, events, or pages…";

  const modKey = getModKeyLabel();

  return (
    <>
      <div className="relative min-w-0 flex-1 sm:flex-none sm:w-auto sm:max-w-[360px] lg:max-w-[420px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <button
          type="button"
          onClick={openSearch}
          className="flex h-9 w-full items-center rounded-full border border-slate-200 bg-white pl-9 pr-3 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-slate-300 sm:pr-12"
          aria-label="Search"
        >
          <span className="truncate text-[13px] sm:hidden">Search…</span>
          <span className="hidden truncate text-[13px] sm:inline">
            {placeholder}
          </span>
        </button>
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          {modKey === "Cmd" ? "⌘K" : "Ctrl+K"}
        </kbd>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[560px] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={dialogPlaceholder}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </DialogHeader>
          <div className="max-h-[360px] overflow-y-auto py-2">
            {query.trim() === "" ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {isSupportWorkspace
                  ? "Search tickets, bookings, or message content"
                  : "Search bookings, events, or jump to a page"}
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </p>
            ) : (
              results.map((result) => (
                <button
                  key={`${result.href}-${result.title}`}
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-muted/50"
                  onClick={() => {
                    router.push(result.href);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="text-sm font-medium text-foreground">
                    {result.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {result.subtitle}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CustomerUserPill() {
  const { data: session } = useSession();
  const user = useAuthStore((state) => state.user);

  if (!user && !session?.user) return null;

  const userImage = user?.avatar || session?.user?.avatar;
  const userName = user?.first_name || session?.user?.first_name || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white pl-1 pr-2.5 transition-colors hover:bg-slate-50"
        >
          {isValidUrl(userImage) ? (
            <img
              src={addCacheBusting(userImage as string)}
              alt={userName}
              className="size-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-semibold text-[var(--color-primary)]">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {userName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/customer/profile" className="cursor-pointer">
            <UserIcon className="mr-2 size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => logout()}>
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CustomerNotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await notificationService.getNotificationStats();
        setUnreadCount(data.unread ?? 0);
      } catch (error) {
        console.error("Failed to fetch notification stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative size-9 rounded-full text-muted-foreground hover:bg-slate-100 hover:text-foreground"
      aria-label={`Notifications (${unreadCount} unread)`}
      onClick={() => router.push("/customer/notifications")}
    >
      <Bell className="size-5" />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold",
            "bg-[var(--color-primary)] text-white",
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}

interface CustomerHeaderProps {
  menus?: MenuItemProps[];
}

export default function CustomerHeader({ menus = [] }: CustomerHeaderProps) {
  const { sidebarCollapsed: collapsed } = useDomainStore();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex-none border-b border-slate-200 bg-white px-2 py-2.5 shadow-sm transition-all duration-300 sm:px-4 md:px-6",
        collapsed ? "lg:ml-[60px]" : "lg:ml-[264px]",
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 lg:flex-none">
          <div className="shrink-0 lg:hidden">
            <MobileSidebar menus={menus} />
          </div>
          <div className="hidden shrink-0 lg:block">
            <LayoutToggle />
          </div>
          <CustomerHeaderSearch />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                aria-label="Help"
              >
                <HelpCircle className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/customer/support/new">Start an enquiry</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/faq">FAQs</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <CustomerNotificationBell />
          <CustomerUserPill />
        </div>
      </div>
    </header>
  );
}
