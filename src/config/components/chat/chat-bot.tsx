"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  Loader2,
  X,
  ChevronsLeft,
  Minus,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isCustomerCheckoutPath } from "@/lib/customer-checkout-path";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { useDomainContext } from "@/hooks/useDomainContext";
import { useAuthStore } from "@/store/auth.store";
import { appConfig } from "@/config/app";
import { addCacheBusting } from "@/lib/image-utils";
import { useCreateCustomerSupportTicket } from "@/services/customer/support";
import type { SupportCategory } from "@/app/(protected)/customer/support/_lib/types";
import { CATEGORY_LABELS } from "@/app/(protected)/customer/support/_lib/utils";
import { resolveChatNavLink } from "@/lib/chat-nav-links";
import { previewReviewChromeLiftStyle } from "@/hooks/use-preview-review-chrome-height";
import type {
  VendorChatLiveStats,
  VendorChatDashboardSnapshot,
} from "@/lib/chat-vendor-live-stats";
import {
  resolveChatDateRange,
  isVendorStatsIntent,
  isVendorEarningsIntent,
  isVendorCommissionIntent,
  buildVendorStatsDirectReply,
} from "@/lib/chat-vendor-live-stats";
import {
  isVendorEventOverviewIntent,
  fetchVendorEventOverviewChatReply,
} from "@/lib/chat-vendor-event-overview";
import {
  isLiveEventBookingIntent,
  matchLiveEvents,
  matchLiveEventsFromConversation,
  isLiveEventLocationChoiceText,
  needsLiveEventLocationChoice,
  buildLiveEventsDirectReply,
  buildLiveEventsNoMatchReply,
  filterLiveEventsToPublishedLocations,
  listGuestBookableLinks,
  extractLiveEventTheme,
  liveEventMatchesRequestedTheme,
  isBroadEventListIntent,
  isLiveEventAvailabilityQuestion,
  asWeakMatches,
  type LiveEventChatMatch,
} from "@/lib/chat-live-events";
import type { LiveEvent, LocationData } from "@/types/theme.types";
import {
  extractBookingQuickActions,
  asksRoomDifference,
  asksToChangeOrPickRoom,
  buildBookingKickoffCopy,
  buildBookingRecoveryCopy,
  buildExistingCartBookingGateActions,
  buildExistingCartBookingGateCopy,
  buildGuestBookingGateActions,
  buildGuestBookingGateCopy,
  buildEventInfoTurn,
  buildRecoveryQuickActions,
  buildRoomDifferenceCopy,
  CHAT_PAY_DEPOSIT_ID,
  CHAT_PAY_FULL_ID,
  dedupeChatQuickActions,
  isBareEventPageHref,
  isBookingConciergeFollowUp,
  isCasualChatText,
  isChatEmailAddress,
  isChatEmailUpdatesText,
  isEventInfoQuestion,
  isBrochureQuestion,
  isUnsafeChatProviderError,
  shouldOfferChatBookingUi,
  stripUnsolicitedBookingOfferCopy,
  mergeChatBriefInventory,
  parseMarkdownLinkTarget,
  parsePublicEventPath,
  parseBookEventInCitySendText,
  shouldSendBrochureForEventPick,
  stripInChatChoiceMarkdown,
  summarizeEventDetailForChat,
  withDateChoiceQuickActions,
  withGuaranteedDateChoiceCopy,
  withGuaranteedRoomChoiceCopy, 
  withRoomChoiceQuickActions,
  withVisitEventQuickAction,
  type ChatEventBookingBrief,
  type ChatQuickActionDraft,
} from "@/lib/chat-event-booking";
import {
  buildHostBookingTurn,
  chatChoicesHaveLineItems,
  isChatCheckoutHandoffIntent,
  isChatExistingCartBookingIntent,
  isGuestBookingConciergeText,
  isHostBookingUserText,
  parseChatBookingChoices,
  parseChatPayMode,
  parseChatPaymentGatewaySlug,
  toChatQuickActions,
} from "@/lib/chat-booking-choices";
import {
  bookingChoicesReadyForPay,
  chatCartConflictsWithEvent,
  hydrateChatBriefCatalogs,
  listChatPaymentGateways,
  runChatCheckout,
  syncChatBookingToCart,
  type ChatPaymentGatewayOption,
} from "@/lib/chat-checkout";
import {
  buildChatSafetyReply,
  classifyChatSafetyIntent,
} from "@/lib/chat-safety";
import type { CheckoutStripePaymentSession } from "@/services/customer/checkout";

const CheckoutStripePaymentModal = dynamic(
  () =>
    import(
      "@/app/(public)/vendor/checkout/_components/checkout-stripe-payment-modal"
    ),
  { ssr: false },
);
import { saveAuthCallbackUrl } from "@/lib/auth/safe-callback-url";
import { isCustomerFacingChatSurface } from "@/lib/chat-page-context";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { useLocationStore } from "@/store/location.store";
import {
  newsletterApiMessage,
  usePublicSubscribe,
} from "@/services/common/newsletter";
import {
  CHECKOUT_PATH,
  checkoutHandoffNavCopy,
  isCheckoutHandoffHref,
  persistCheckoutHandoffFromHref,
} from "@/lib/checkout-chat-handoff";
import { apiCartHasBillableSelections } from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { cartService } from "@/services/customer/cart/cart.service";
import { useGetCartData } from "@/services/customer/cart/query";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useCheckoutPaymentUiStore } from "@/store/checkout-payment-ui.store";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useEventDetail } from "@/app/(public)/[locationSlug]/events/[eventSlug]/_lib/hooks";
import { eventsService } from "@/services/common/events/events.service";
import {
  isVendorBookingListIntent,
  fetchVendorBookingListChatReply,
} from "@/lib/chat-vendor-booking-list";
import {
  useVendorDashboardBookings,
  vendorDashboardService,
} from "@/services/vendor/dashboard";
import { vendorBookingsService } from "@/services/vendor/bookings/bookings.service";
import { useQuery } from "@tanstack/react-query";

type QuickAction = {
  id: string;
  label: string;
  hint?: string;
  /** If set, tapping navigates here (e.g. Register / Log in) */
  href?: string;
  /** If set, tapping sends this as the next user message (in-chat choice). */
  sendText?: string;
};

function isChatGridAction(action: QuickAction): boolean {
  return (
    action.id.startsWith("date-") ||
    action.id.startsWith("table-") ||
    action.id.startsWith("drink-qty-") ||
    action.id.startsWith("ticket-")
  );
}

function isEventPickAction(action: QuickAction): boolean {
  return (
    action.id.startsWith("event-pick-") ||
    Boolean(
      action.sendText && /^book .+\s+in\s+.+/i.test(action.sendText.trim()),
    )
  );
}

type Message = {
  role: "user" | "assistant";
  content: string;
  /** Optional CTA shown under assistant replies for support handoff */
  supportCta?: {
    href: string;
    label: string;
  };
  /** Interactive buttons under an assistant message (guided support) */
  quickActions?: QuickAction[];
};

type SupportFlowStep =
  | "idle"
  | "category"
  | "phone"
  | "description"
  | "confirm"
  | "submitting";

type SupportFlowState = {
  step: SupportFlowStep;
  category: SupportCategory | null;
  phone: string;
  description: string;
  /** Original customer issue used as subject seed */
  issueSummary: string;
};

const INITIAL_FLOW: SupportFlowState = {
  step: "idle",
  category: null,
  phone: "",
  description: "",
  issueSummary: "",
};

function vendorGreetingActions(options?: {
  showBookings?: boolean;
}): QuickAction[] {
  const actions: QuickAction[] = [
    {
      id: "start-book",
      label: "Book an event",
      sendText: "I want to book an event",
    },
    {
      id: "start-whats-on",
      label: "What’s on",
      sendText: "What events are on?",
    },
    {
      id: "ask-question",
      label: "Ask a question",
    },
  ];
  if (options?.showBookings) {
    actions.push({
      id: "my-bookings",
      label: "My bookings",
      href: "/customer/bookings",
    });
  }
  return actions;
}

function isPaymentSuccessPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return (
    path === "/vendor/payment/success" ||
    path.startsWith("/vendor/payment/success") ||
    path === "/payment/success" ||
    path.startsWith("/payment/success")
  );
}

const CHAT_CHROME_BRANDED =
  "bg-[color:var(--color-header,#1e293b)] text-[color:var(--color-on-header,#fff)]";
const CHAT_CHROME_BRANDED_HOVER =
  "hover:bg-[color:color-mix(in_srgb,var(--color-header,#1e293b)_88%,black)]";
const CHAT_CHROME_STATIC = "bg-slate-800 text-white";
const CHAT_CHROME_STATIC_HOVER = "hover:bg-slate-900";

const CATEGORY_ACTIONS: QuickAction[] = [
  {
    id: "general_support",
    label: CATEGORY_LABELS.general_support,
  },
  {
    id: "technical_support",
    label: CATEGORY_LABELS.technical_support,
  },
  {
    id: "cancel_flow",
    label: "No thanks",
  },
];

/** Guest auth options — register / login from chat */
const SUPPORT_INTENT_RE =
  /\b(support|help desk|customer service|contact (us|support|the team)|speak to (support|a person|someone|the team|an? agent)|talk to (support|a person|someone|the team|an? agent)|get in touch|connect with (support|the team)|raise (a |an )?(support )?(query|issue|ticket|enquiry|inquiry)|technical issue)\b/i;

const AUTH_INTENT_RE =
  /\b(register|sign\s*up|create (an? )?account|log\s*in|sign\s*in|need (an? )?account|asked?( me)? to register|ask(s|ed)? for register|registration|make an account)\b/i;

/** Customer wants to add/change a room on an existing booking — not possible in product. */
const ADD_ROOM_AFTER_BOOKING_RE =
  /\b((add|book|update|change|swap|get|include).{0,40}\broom|new room|another room|extra room|additional room|different room).{0,40}\b(booking|booked|existing)|room.{0,30}(existing|current|my) booking\b/i;

/** User declining guided support / enquiry wizard. */
const DECLINE_INTENT_RE =
  /\b(no|nope|nah|cancel|stop|never\s*mind|nevermind|don'?t want|do not want|not now|no thanks|no thank you|forget (it|that)|leave it)\b/i;

function isSupportIntent(text: string): boolean {
  const t = text.trim();
  if (/i'?ll type the ticket quantity/i.test(t)) return false;
  if (/^\d{1,3}\s*[x×]\s+/i.test(t)) return false;
  return SUPPORT_INTENT_RE.test(t);
}

function isAuthIntent(text: string): boolean {
  return AUTH_INTENT_RE.test(text);
}

function isAddRoomAfterBookingIntent(text: string): boolean {
  return ADD_ROOM_AFTER_BOOKING_RE.test(text);
}

function isDeclineIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  // Short declines like "no" / "nope"
  if (/^(no|nope|nah|cancel|stop)([!.]?)$/i.test(t)) return true;
  return DECLINE_INTENT_RE.test(t);
}

function publishedLocationsFromTheme(
  themeLocations: LocationData[] | undefined,
  settings: unknown,
): LocationData[] {
  if (themeLocations && themeLocations.length > 0) return themeLocations;
  if (!settings || typeof settings !== "object") return [];
  const locations = (settings as { locations?: unknown }).locations;
  return Array.isArray(locations) ? (locations as LocationData[]) : [];
}

function inChatChoiceMessage(content: string): {
  content: string;
  quickActions?: QuickAction[];
} {
  const quickActions = extractBookingQuickActions(content)
    .filter((action) => Boolean(action.sendText) && !action.href)
    .map((action) => ({
      id: action.id,
      label: action.label,
      hint: action.hint,
      sendText: action.sendText,
    }));
  return {
    content: stripInChatChoiceMarkdown(content),
    quickActions: quickActions.length > 0 ? quickActions : undefined,
  };
}

function toUiQuickActions(actions: ChatQuickActionDraft[]): QuickAction[] {
  return actions.map((action) => ({
    id: action.id,
    label: action.label,
    hint: action.hint,
    href: action.href,
    sendText: action.sendText,
  }));
}

function publicBookingQuickActions(options: {
  content: string;
  brief: ChatEventBookingBrief | null;
  conversation: Array<{ role: string; content: string }>;
  hostActions?: ChatQuickActionDraft[];
  recovery?: boolean;
  offerBookingUi?: boolean;
}): QuickAction[] {
  const brief = options.brief;
  if (options.recovery && brief) {
    const choices = parseChatBookingChoices(options.conversation, brief);
    return toUiQuickActions(
      buildRecoveryQuickActions(brief, {
        roomId: choices.roomId,
        dates: choices.dates.map((date) => date.date.slice(0, 10)),
      }),
    );
  }
  if (options.hostActions !== undefined) {
    const choices = brief
      ? parseChatBookingChoices(options.conversation, brief)
      : null;
    return toUiQuickActions(
      toChatQuickActions(
        dedupeChatQuickActions(
          withVisitEventQuickAction(options.hostActions, brief, {
            roomId: choices?.roomId,
            dates: choices?.dates.map((date) => date.date.slice(0, 10)),
          }),
        ),
      ),
    );
  }
  const extracted = extractBookingQuickActions(options.content).filter(
    (action) => {
      if (action.id === CHAT_PAY_FULL_ID || action.id === CHAT_PAY_DEPOSIT_ID) {
        return true;
      }
      if (action.id.startsWith("pay-gateway-")) return true;
      if (action.href && /^https?:\/\//i.test(action.href)) return true;
      if (!action.sendText || action.href) return false;
      if (
        action.label.replace(/\s+/g, " ").toLowerCase().startsWith("visit ")
      ) {
        return false;
      }
      return true;
    },
  );
  if (!brief) return toUiQuickActions(dedupeChatQuickActions(extracted));
  const choices = parseChatBookingChoices(options.conversation, brief);
  const lastUser =
    [...options.conversation].reverse().find((m) => m.role === "user")
      ?.content ?? "";
  const offerBookingUi =
    options.offerBookingUi ?? shouldOfferChatBookingUi(lastUser, choices);
  if (!offerBookingUi) {
    return toUiQuickActions(
      dedupeChatQuickActions(
        extracted.filter(
          (action) =>
            action.id !== "visit-event" &&
            !action.id.startsWith("date-") &&
            !action.id.startsWith("room-"),
        ),
      ),
    );
  }
  const infoQuestion =
    isEventInfoQuestion(lastUser) && !asksRoomDifference(lastUser);
  const merged = infoQuestion
    ? extracted
    : withDateChoiceQuickActions(
        withRoomChoiceQuickActions(extracted, {
          brief,
          roomChosen: choices.roomId != null,
          hasDates: choices.dates.length > 0,
          userText: lastUser,
          reply: options.content,
          isBookingTurn: true,
        }),
        {
          brief,
          roomId: choices.roomId,
          roomChosen: choices.roomId != null,
          hasDates: choices.dates.length > 0,
          isBookingTurn: true,
        },
      );
  return toUiQuickActions(
    dedupeChatQuickActions(
      withVisitEventQuickAction(merged, brief, {
        roomId: choices.roomId,
        dates: choices.dates.map((date) => date.date.slice(0, 10)),
      }),
    ),
  );
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/** True when text is only a support/help trigger, not a real issue title. */
function isGenericSupportSeed(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (t.length > 80) return false;
  if (!isSupportIntent(t)) return false;

  // Strip common support phrasing — if almost nothing remains, it's not a subject
  const stripped = t
    .replace(SUPPORT_INTENT_RE, " ")
    .replace(
      /\b(i|i'?m|want|wanna|to|with|the|a|an|please|help|me|you|our|team|connect|contact|speak|talk|get|in|touch|raise|open|start|need|like|would|can|could|hi|hello|hey)\b/gi,
      " ",
    )
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped.length < 4;
}

/**
 * Prefer the customer's issue description for the ticket subject.
 * Ignore generic triggers like "support" / "I want to connect with support".
 */
function buildSubject(
  issueSummary: string,
  description: string,
  categoryLabel?: string,
): string {
  const desc = description.replace(/\s+/g, " ").trim();
  const summary = issueSummary.replace(/\s+/g, " ").trim();

  let seed = "";
  if (desc && !isGenericSupportSeed(desc)) {
    seed = desc;
  } else if (summary && !isGenericSupportSeed(summary)) {
    seed = summary;
  } else if (categoryLabel?.trim()) {
    seed = categoryLabel.trim();
  } else {
    seed = "Support enquiry from chat";
  }

  // Capitalise first letter for a cleaner inbox title
  seed = seed.charAt(0).toUpperCase() + seed.slice(1);
  return seed.length > 80 ? `${seed.slice(0, 77)}…` : seed;
}

/** Render markdown links, bold (**text**), and safe relative paths. */
function renderMessageContent(content: string, isUser: boolean): ReactNode[] {
  const linkClass = isUser
    ? "underline underline-offset-2 font-medium opacity-95"
    : "underline underline-offset-2 font-medium text-slate-700";
  const boldClass = isUser
    ? "font-bold opacity-100"
    : "font-bold text-slate-950";

  const pattern =
    /(\*\*([^*]+)\*\*)|\[([^\]]+)\]\((\/?chat(?::[^)]*)?|https?:\/\/[^)\s]+|\/[^)\s]+)\)|(\/(?:vendor|customer|admin|auth|contact|welcome|on-boarding|preview)[^\s]*)/g;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }

    if (match[1] && match[2] != null) {
      nodes.push(
        <strong key={`bold-${key++}`} className={boldClass}>
          {match[2]}
        </strong>,
      );
    } else {
      const label = match[3];
      const markdownHref = match[4];
      const bareHref = match[5];
      const parsed = markdownHref
        ? parseMarkdownLinkTarget(markdownHref)
        : bareHref
          ? parseMarkdownLinkTarget(bareHref)
          : null;

      if (parsed?.kind === "chat") {
        nodes.push(
          <span key={`choice-${key++}`} className={boldClass}>
            {label || parsed.sendText}
          </span>,
        );
      } else if (parsed?.kind === "href" && parsed.href.startsWith("/")) {
        nodes.push(
          <Link key={`link-${key++}`} href={parsed.href} className={linkClass}>
            {label || parsed.href}
          </Link>,
        );
      } else if (parsed?.kind === "href") {
        nodes.push(
          <a
            key={`link-${key++}`}
            href={parsed.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {label || parsed.href}
          </a>,
        );
      } else if (markdownHref || bareHref) {
        nodes.push(label || markdownHref || bareHref);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [content];
}

function resolveSiteImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (
    url.startsWith("/") ||
    url.startsWith("data:") ||
    url.startsWith("http") ||
    url.startsWith("blob")
  ) {
    return url;
  }
  return null;
}

function ChatAvatar({
  src,
  alt,
  size = "md",
  className,
  branded = false,
}: {
  src: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  branded?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const sizeClass =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/5",
        branded
          ? "bg-[color:var(--color-header,#1e293b)]"
          : "bg-slate-800",
        sizeClass,
        className,
      )}
      aria-hidden={!showImage}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote tenant favicons
        <img
          src={addCacheBusting(src!)}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <MessageCircle
          className={cn(
            "h-3.5 w-3.5",
            branded
              ? "text-[color:var(--color-on-header,#fff)]"
              : "text-white",
          )}
          strokeWidth={2}
        />
      )}
    </span>
  );
}

function clearQuickActions(messages: Message[]): Message[] {
  return messages.map((m) =>
    m.quickActions ? { ...m, quickActions: undefined } : m,
  );
}

/**
 * Vendor-only stats loader. Rendered exclusively for logged-in vendors after the
 * chat is opened, so the vendor query keys never register in the shared cache on
 * customer/public tenants. Reports the computed stats up via `onStats`.
 */
function VendorChatStatsLoader({
  dateRange,
  onStats,
}: {
  dateRange: Parameters<typeof useVendorDashboardBookings>[0];
  onStats: (stats: VendorChatLiveStats | null) => void;
}) {
  const { data: vendorDashboardResponse } = useVendorDashboardBookings(
    dateRange,
    { enabled: true },
  );

  const { data: vendorBookingsSummaryResponse } = useQuery({
    queryKey: ["vendor", "bookings", "chat-summary", "per_page_1000"],
    queryFn: () =>
      vendorBookingsService.getBookings({
        page: 1,
        // Backend `summary` is derived from returned rows — per_page=1 yields wrong totals
        per_page: 1000,
      }),
    enabled: true,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const stats = useMemo((): VendorChatLiveStats | null => {
    const raw = vendorDashboardResponse?.data;
    const bookingSummary = vendorBookingsSummaryResponse?.summary;
    const metaTotal = vendorBookingsSummaryResponse?.meta?.total;

    if (!raw && !bookingSummary && metaTotal == null) return null;

    const dashboard: VendorChatDashboardSnapshot | null = raw
      ? {
          current_location_id: raw.current_location_id,
          booking_period: raw.booking_period ?? raw.period ?? null,
          booking_period_start:
            raw.booking_period_start ?? raw.period_start ?? null,
          booking_period_end: raw.booking_period_end ?? raw.period_end ?? null,
          summary: raw.summary ?? null,
          bookings_stats: raw.bookings_stats ?? null,
          commissions_stats: raw.commissions_stats ?? null,
          recent_bookings: (raw.recent_bookings ?? []).slice(0, 5),
        }
      : null;

    return {
      fetchedAt: new Date().toISOString(),
      dashboard,
      bookingSummary: {
        booking_count: metaTotal ?? 0,
        total_amount: bookingSummary?.total_amount ?? "0.00",
        deposit_amount: bookingSummary?.deposit_amount ?? "0.00",
        pending_amount: bookingSummary?.pending_amount ?? "0.00",
        refunded_amount: bookingSummary?.refunded_amount ?? "0.00",
        total_platform_fee: bookingSummary?.total_platform_fee ?? "0.00",
        platform_fee_settled: bookingSummary?.platform_fee_settled ?? "0.00",
        platform_fee_due: bookingSummary?.platform_fee_due ?? "0.00",
      },
    };
  }, [
    vendorDashboardResponse?.data,
    vendorBookingsSummaryResponse?.summary,
    vendorBookingsSummaryResponse?.meta?.total,
  ]);

  useEffect(() => {
    onStats(stats);
  }, [stats, onStats]);

  return null;
}

export function ChatBot() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { data: session, status: sessionStatus } = useSession();
  const authUser = useAuthStore((s) => s.user);
  const vendorLocationId = useAuthStore((s) => s.vendor_location_id);
  const {
    website_role: domainWebsiteRole,
    domain,
    settings,
  } = useDomainContext();
  const tenantHost = typeof domain === "string" ? domain : "";
  const createTicket = useCreateCustomerSupportTicket();
  const currencySymbol = useCurrencySymbol();
  const subscribeNewsletter = usePublicSubscribe();
  const chatLocationId = useLocationStore((s) => s.getLocationId());

  const websiteRole =
    domainWebsiteRole || (theme?.website_role as string | undefined) || null;
  const isLoggedInCustomer =
    sessionStatus === "authenticated" &&
    session?.user?.account_type === "customer";
  const isAuthenticated = sessionStatus === "authenticated";
  const accountType = session?.user?.account_type ?? null;
  const userName = useMemo(() => {
    // Same sources as the header user dropdown (first_name is the reliable field)
    const raw =
      authUser?.first_name?.trim() ||
      session?.user?.first_name?.trim() ||
      authUser?.last_name?.trim() ||
      session?.user?.name?.trim() ||
      "";
    if (!raw) return null;
    return raw.split(/\s+/)[0] || null;
  }, [
    authUser?.first_name,
    authUser?.last_name,
    session?.user?.first_name,
    session?.user?.name,
  ]);
  const isVendorStorefront = websiteRole === "vendor";
  const brandedChatChrome = isCustomerFacingChatSurface(
    pathname,
    typeof websiteRole === "string" ? websiteRole : null,
  );
  const chatChrome = brandedChatChrome
    ? CHAT_CHROME_BRANDED
    : CHAT_CHROME_STATIC;
  const chatChromeHover = brandedChatChrome
    ? CHAT_CHROME_BRANDED_HOVER
    : CHAT_CHROME_STATIC_HOVER;
  const isLoggedInVendor =
    sessionStatus === "authenticated" && accountType === "vendor";
  const { refetch: refetchCustomerCart } = useGetCartData(
    isVendorStorefront && isLoggedInCustomer,
  );

  const todayYmd = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const chatDashboardRange = useMemo(
    () => ({ from_date: todayYmd, to_date: todayYmd }),
    [todayYmd],
  );

  // Latch: only fetch vendor chat stats once the user actually opens the chat.
  // ChatBot is mounted globally on every tenant, so gating on this avoids
  // eager vendor API calls on customer/public pages (server-load bug).
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  const shouldLoadVendorChatStats = isLoggedInVendor && hasOpenedChat;

  // Held in parent state, but the vendor queries live in a child that only
  // mounts for vendors — so customer/public tenants never register the keys.
  const [vendorLiveStats, setVendorLiveStats] =
    useState<VendorChatLiveStats | null>(null);

  const contactPhone =
    theme?.contactDetails?.phone?.trim() ||
    theme?.contactDetails?.phoneNumber?.trim() ||
    "";
  const contactEmail = theme?.contactDetails?.email?.trim() || "";
  const contactAddress = theme?.contactDetails?.address?.trim() || "";

  const avatarSrc = useMemo(() => {
    return (
      resolveSiteImageUrl(theme?.favicon) ??
      resolveSiteImageUrl(theme?.logo) ??
      resolveSiteImageUrl(appConfig.mini_logo) ??
      null
    );
  }, [theme?.favicon, theme?.logo]);
  const siteName = theme?.name?.trim() || appConfig.name;
  const liveEvents = useMemo(
    (): LiveEvent[] =>
      filterLiveEventsToPublishedLocations(
        theme?.live_events,
        publishedLocationsFromTheme(theme?.locations, settings),
      ),
    [theme?.live_events, theme?.locations, settings],
  );

  const eventPath = useMemo(() => parsePublicEventPath(pathname), [pathname]);
  const { data: pageEventResponse } = useEventDetail(
    eventPath?.eventSlug ?? "",
    tenantHost,
  );
  const pageBookingBrief = useMemo((): ChatEventBookingBrief | null => {
    const event = pageEventResponse?.data;
    if (!eventPath || !event) return null;
    const live = liveEvents.find(
      (item) =>
        item.slug === eventPath.eventSlug &&
        item.location_slug === eventPath.locationSlug,
    );
    return summarizeEventDetailForChat(event, {
      href: `/${eventPath.locationSlug}/events/${eventPath.eventSlug}`,
      locationCity: live?.location_city,
      locationSlug: eventPath.locationSlug,
      eventSlug: eventPath.eventSlug,
      currencySymbol,
    });
  }, [eventPath, pageEventResponse?.data, liveEvents, currencySymbol]);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello — how can I help you today? Book an event, ask what’s on, or type any other question.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingGuestEmail, setAwaitingGuestEmail] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  /** Session-only hide; remounts on refresh so the launcher returns. */
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [supportFlow, setSupportFlow] =
    useState<SupportFlowState>(INITIAL_FLOW);
  const [stripePaymentSession, setStripePaymentSession] =
    useState<CheckoutStripePaymentSession | null>(null);
  const [isStripePaymentOpen, setIsStripePaymentOpen] = useState(false);
  const eventBookingBriefRef = useRef<ChatEventBookingBrief | null>(null);
  const chatPayGatewaysRef = useRef<ChatPaymentGatewayOption[]>([]);
  const checkoutInProgressRef = useRef(false);
  const paymentCompletedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const keepComposerFocusRef = useRef(false);
  const prevPathnameRef = useRef(pathname);
  const prefersReducedMotion = useReducedMotion();
  const motionSafe = !prefersReducedMotion;

  function focusComposer() {
    const el = composerInputRef.current;
    if (!el || el.disabled) return;
    el.focus({ preventScroll: true });
  }

  useEffect(() => {
    const end = messagesEndRef.current;
    if (!end) return;
    const viewport = end.closest("[data-slot='scroll-area-viewport']");
    if (viewport instanceof HTMLElement) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen || isMinimized || isLoading) return;
    if (supportFlow.step === "submitting") return;
    if (!keepComposerFocusRef.current) return;
    focusComposer();
  }, [isLoading, isOpen, isMinimized, supportFlow.step]);

  useEffect(() => {
    if (!pageBookingBrief) return;
    eventBookingBriefRef.current = mergeChatBriefInventory(
      pageBookingBrief,
      eventBookingBriefRef.current,
    );
  }, [pageBookingBrief]);

  // Personalise opening greeting once we know the signed-in user (customer / vendor / admin)
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !accountType) return;

    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.role !== "assistant") return prev;
      const current = prev[0].content;
      const isDefaultGreeting =
        current === "Hello — how can I help you today?" ||
        current.startsWith("Hello — how can I help you today?") ||
        current.startsWith("Hello, ") ||
        (current.startsWith("Hello") && current.includes("signed in"));

      if (!isDefaultGreeting) return prev;

      const nameBit = userName ? `, ${userName}` : "";
      const greetingActions =
        isVendorStorefront && !isLoggedInVendor
          ? vendorGreetingActions({ showBookings: isLoggedInCustomer })
          : undefined;

      // Keep greetings short and professional — never mention “signed in / venue account”
      if (isVendorStorefront && accountType === "customer") {
        return [
          {
            role: "assistant",
            content: `Hello${nameBit} — how can I help you today? Book an event, ask what’s on, or type any other question.`,
            quickActions: greetingActions,
          },
        ];
      }

      return [
        {
          role: "assistant",
          content: `Hello${nameBit} — how can I help you today? Book an event, ask what’s on, or type any other question.`,
          quickActions: greetingActions,
        },
      ];
    });
  }, [
    sessionStatus,
    accountType,
    userName,
    isVendorStorefront,
    isLoggedInVendor,
    isLoggedInCustomer,
  ]);

  useEffect(() => {
    if (!isVendorStorefront || isLoggedInVendor) return;
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.role !== "assistant") return prev;
      if (prev[0].quickActions?.length) return prev;
      return [
        {
          ...prev[0],
          quickActions: vendorGreetingActions({
            showBookings: isLoggedInCustomer,
          }),
        },
      ];
    });
  }, [isVendorStorefront, isLoggedInVendor, isLoggedInCustomer]);

  useEffect(() => {
    const wasCheckout = isCustomerCheckoutPath(prevPathnameRef.current);
    const nowCheckout = isCustomerCheckoutPath(pathname);
    prevPathnameRef.current = pathname;
    if (isOpen && nowCheckout && !wasCheckout) {
      keepComposerFocusRef.current = false;
      setIsMinimized(true);
    }
  }, [pathname, isOpen]);

  function postPaymentGreetingActions(): QuickAction[] {
    return vendorGreetingActions({ showBookings: isLoggedInCustomer });
  }

  function resetChatAfterPaidBooking(bookingNumber?: string | null) {
    paymentCompletedRef.current = true;
    checkoutInProgressRef.current = false;
    eventBookingBriefRef.current = null;
    chatPayGatewaysRef.current = [];
    keepComposerFocusRef.current = false;
    setIsOpen(false);
    setIsMinimized(false);
    setIsStripePaymentOpen(false);
    setStripePaymentSession(null);
    const store = useCheckoutPaymentUiStore.getState();
    if (bookingNumber) {
      store.completePaymentSession(bookingNumber);
    } else {
      store.clearPaymentSession();
    }
    useCartEditStore.getState().clearAllCarts();
    useDrinkSelectionStore.getState().clearDrinksForNewEvent();
    void refetchCustomerCart();
    const nameBit = userName ? `, ${userName}` : "";
    const bookingBit = bookingNumber?.trim()
      ? ` Booking **${bookingNumber.trim()}** is confirmed.`
      : " Your payment went through.";
    setMessages([
      {
        role: "assistant",
        content: `Thanks${nameBit} — you’re all set.${bookingBit} I can help with another booking, what’s on, or any other question.`,
        quickActions: postPaymentGreetingActions(),
      },
    ]);
  }

  useEffect(() => {
    if (!isPaymentSuccessPath(pathname)) return;
    keepComposerFocusRef.current = false;
    setIsOpen(false);
    setIsMinimized(false);
    const params =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search);
    const bookingNumber =
      params?.get("booking_number") ??
      stripePaymentSession?.bookingNumber ??
      null;
    if (
      !isStripePaymentOpen &&
      !stripePaymentSession &&
      !checkoutInProgressRef.current &&
      paymentCompletedRef.current
    ) {
      return;
    }
    resetChatAfterPaidBooking(bookingNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset once when landing on success
  }, [pathname]);

  function startGuidedSupport(issueText: string) {
    setSupportFlow({
      ...INITIAL_FLOW,
      step: "category",
      issueSummary: issueText,
    });
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content:
          "I can raise a support enquiry for you. Please choose a category (or No thanks to cancel):",
        quickActions: CATEGORY_ACTIONS,
      },
    ]);
  }

  function cancelGuidedSupport() {
    setSupportFlow(INITIAL_FLOW);
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content:
          "No problem — I’ve cancelled that enquiry. Is there anything else I can help with?",
      },
    ]);
  }

  /** Guest: offer Create account / Log in buttons (no account creation inside chat). */
  function guestAuthHrefs() {
    const callback = pathname || "/";
    saveAuthCallbackUrl(callback);
    return {
      registerHref: `/auth/register/customer?callbackUrl=${encodeURIComponent(callback)}`,
      loginHref: `/auth/login?callbackUrl=${encodeURIComponent(callback)}`,
    };
  }

  function offerGuestAuthOptions() {
    const hrefs = guestAuthHrefs();
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content:
          "You’re not signed in, so I can’t take a booking in chat yet. Create an account or log in — it only takes a moment.",
        quickActions: [
          { id: "register", label: "Create account", href: hrefs.registerHref },
          { id: "login", label: "Log in", href: hrefs.loginHref },
        ],
      },
    ]);
  }

  async function submitGuidedSupport(flow: SupportFlowState) {
    if (!flow.category || !flow.phone.trim() || !flow.description.trim()) {
      return;
    }

    setSupportFlow((prev) => ({ ...prev, step: "submitting" }));
    setIsLoading(true);
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: "Sending your enquiry…",
      },
    ]);

    try {
      const response = await createTicket.mutateAsync({
        subject: buildSubject(
          flow.issueSummary,
          flow.description,
          flow.category ? CATEGORY_LABELS[flow.category] : undefined,
        ),
        category: flow.category,
        contact_number: flow.phone.trim(),
        priority: "medium",
        message: flow.description.trim(),
      });

      const ticketKey = response.data?.ticket_key;
      const inboxHref =
        typeof ticketKey === "string" && ticketKey
          ? `/customer/support/inbox/${ticketKey}`
          : "/customer/support/inbox";

      setSupportFlow(INITIAL_FLOW);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Thank you — your support enquiry has been sent. Our team will get back to you shortly. You can follow progress under Support → Inbox.",
          supportCta: {
            href: inboxHref,
            label: "View enquiry",
          },
        },
      ]);
    } catch {
      setSupportFlow((prev) => ({ ...prev, step: "confirm" }));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — we couldn’t send that enquiry just now. You can try again, or open the New enquiry form.",
          quickActions: [
            { id: "retry_submit", label: "Try again" },
            { id: "cancel_flow", label: "Cancel" },
          ],
          supportCta: {
            href: "/customer/support/new",
            label: "Open New enquiry",
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function askForPhone(category: SupportCategory) {
    setSupportFlow((prev) => ({
      ...prev,
      step: "phone",
      category,
      phone: "",
    }));

    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: "Thank you. What’s the best telephone number to reach you on?",
      },
    ]);
  }

  function askForDescription(phone: string) {
    setSupportFlow((prev) => ({
      ...prev,
      step: "description",
      phone,
    }));
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content:
          "Thank you. Please briefly describe the issue — what happened, and how we can help.",
      },
    ]);
  }

  function askForConfirm(description: string) {
    setSupportFlow((prev) => ({
      ...prev,
      step: "confirm",
      description,
    }));
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: "Ready to send this enquiry to our support team?",
        quickActions: [
          { id: "confirm_submit", label: "Send enquiry" },
          { id: "cancel_flow", label: "Cancel" },
        ],
      },
    ]);
  }

  async function customerCartHasDates(): Promise<boolean> {
    if (!isLoggedInCustomer) return false;
    try {
      const data = await cartService.getCartData();
      return apiCartHasBillableSelections(data);
    } catch {
      return false;
    }
  }

  async function briefWithHydratedCatalogs(
    brief: ChatEventBookingBrief,
    conversation: Array<{ role: string; content: string }>,
  ): Promise<ChatEventBookingBrief> {
    const choices = parseChatBookingChoices(conversation, brief);
    if (choices.slots.length === 0) return brief;
    const next = await hydrateChatBriefCatalogs(brief, choices.slots);
    eventBookingBriefRef.current = next;
    return next;
  }

  function sendExistingCartBookingGate() {
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: buildExistingCartBookingGateCopy({ userName }),
        quickActions: toUiQuickActions(buildExistingCartBookingGateActions()),
      },
    ]);
  }

  async function persistChatBookingCart(
    brief: ChatEventBookingBrief,
    choices: ReturnType<typeof parseChatBookingChoices>,
  ) {
    if (!chatChoicesHaveLineItems(choices)) return { ok: true as const };
    try {
      const result = await syncChatBookingToCart({ brief, choices });
      if (result.ok && "event" in result) {
        chatPayGatewaysRef.current = listChatPaymentGateways(result.event);
        try {
          await refetchCustomerCart();
        } catch {
          // Checkout GET can still pick up the POST.
        }
      }
      return result;
    } catch {
      return {
        ok: false as const,
        reason: "unknown" as const,
        message:
          "I couldn’t save this booking just now. You can finish on the event page instead.",
      };
    }
  }

  async function openVendorCheckout(options?: {
    href?: string;
    extraMessages?: Array<{ role: string; content: string }>;
  }) {
    const href = options?.href || CHECKOUT_PATH;
    const brief = eventBookingBriefRef.current ?? pageBookingBrief;
    const conversation = [
      ...messages.map(({ role, content }) => ({
        role,
        content,
      })),
      ...(options?.extraMessages ?? []),
    ];
    const choices = brief ? parseChatBookingChoices(conversation, brief) : null;

    if (brief && choices && chatChoicesHaveLineItems(choices)) {
      setIsLoading(true);
      const sync = await persistChatBookingCart(brief, choices);
      setIsLoading(false);
      if (!sync.ok) {
        if (sync.reason === "conflict") {
          sendExistingCartBookingGate();
          return;
        }
        if (sync.reason === "login") {
          const callback = pathname || "/";
          saveAuthCallbackUrl(callback);
          setMessages((prev) => [
            ...clearQuickActions(prev),
            {
              role: "assistant",
              content:
                "Please log in with a customer account so I can take this booking to Checkout.",
              quickActions: [
                {
                  id: "login",
                  label: "Log in",
                  href: `/auth/login?callbackUrl=${encodeURIComponent(callback)}`,
                },
              ],
            },
          ]);
          return;
        }
        if (sync.reason === "capacity") {
          setMessages((prev) => [
            ...clearQuickActions(prev),
            {
              role: "assistant",
              content: sync.message,
            },
          ]);
          return;
        }
      }
    }

    persistCheckoutHandoffFromHref(href);
    const checkoutCopy = checkoutHandoffNavCopy(href, isLoggedInCustomer);
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: checkoutCopy ?? "Opening Checkout so you can review and pay.",
      },
    ]);
    keepComposerFocusRef.current = false;
    setIsMinimized(true);
    router.push(href);
  }

  async function startChatPayment(
    payMode: "full" | "deposit",
    extraMessages: Array<{ role: string; content: string }> = [],
  ) {
    const lastUserText = extraMessages[extraMessages.length - 1]?.content ?? "";
    const gatewaySlug = parseChatPaymentGatewaySlug(lastUserText);

    if (isPaymentSuccessPath(pathname)) {
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content:
            "This booking is already paid. I can help with another booking, what’s on, or any other question.",
          quickActions: postPaymentGreetingActions(),
        },
      ]);
      return;
    }

    if (isStripePaymentOpen || checkoutInProgressRef.current) {
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content:
            "The payment form is already open — finish there. I won’t start another payment for the same booking.",
        },
      ]);
      return;
    }

    const brief = eventBookingBriefRef.current ?? pageBookingBrief;
    const conversation = [
      ...messages.map(({ role, content }) => ({ role, content })),
      ...extraMessages,
    ];
    const choices = parseChatBookingChoices(conversation, brief);

    if (!brief || !bookingChoicesReadyForPay(brief, choices)) {
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content:
            "I still need the room, date, guest count and seating before I can take payment here.",
        },
      ]);
      return;
    }

    if (!isLoggedInCustomer) {
      const callback = pathname || "/";
      saveAuthCallbackUrl(callback);
      const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(callback)}`;
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content:
            "Please log in with a customer account so I can take payment here.",
          quickActions: [
            { id: "login", label: "Log in", href: loginHref },
            {
              id: "register",
              label: "Create account",
              href: `/auth/register/customer?callbackUrl=${encodeURIComponent(callback)}`,
            },
          ],
        },
      ]);
      return;
    }

    try {
      const result = await refetchCustomerCart();
      if (chatCartConflictsWithEvent(result.data, brief.eventSlug)) {
        sendExistingCartBookingGate();
        return;
      }
    } catch {
      // Checkout still tries to prepare the cart.
    }

    checkoutInProgressRef.current = true;
    setIsLoading(true);

    let result: Awaited<ReturnType<typeof runChatCheckout>>;
    try {
      result = await runChatCheckout({
        brief,
        choices,
        payMode,
        gatewaySlug,
      });
    } catch {
      result = {
        ok: false,
        reason: "unknown",
        message: "Payment couldn’t be started. Visit the event page to finish.",
      };
    }
    setIsLoading(false);

    if (!result.ok) {
      checkoutInProgressRef.current = false;
      if (result.reason === "conflict") {
        sendExistingCartBookingGate();
        return;
      }
      if (result.reason === "need-gateway") {
        const gateways = result.gateways ?? [];
        chatPayGatewaysRef.current = gateways;
        setMessages((prev) => [
          ...clearQuickActions(prev),
          {
            role: "assistant",
            content:
              result.message.trim() ||
              "How would you like to pay? Choose a payment method to continue.",
            quickActions: toUiQuickActions(
              gateways.map((gateway) => ({
                id: `pay-gateway-${gateway.slug}`,
                label: gateway.label,
                sendText: gateway.label,
              })),
            ),
          },
        ]);
        return;
      }
      const recovery =
        result.reason === "capacity" || result.reason === "incomplete"
          ? null
          : brief
            ? buildRecoveryQuickActions(brief, {
                roomId: choices.roomId,
                dates: choices.dates.map((date) => date.date.slice(0, 10)),
              })
            : null;
      const loginActions =
        result.reason === "login"
          ? [
              {
                id: "login",
                label: "Log in",
                href: `/auth/login?callbackUrl=${encodeURIComponent(pathname || "/")}`,
              },
            ]
          : [];
      const content =
        result.message.trim() ||
        "Payment couldn’t be started. Visit the event page to finish.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content,
          quickActions:
            loginActions.length > 0
              ? loginActions
              : recovery
                ? toUiQuickActions(recovery)
                : undefined,
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content:
          payMode === "deposit"
            ? "Opening payment so you can pay a table deposit…"
            : "Opening payment…",
      },
    ]);

    if (result.action.type === "stripe") {
      if (!result.action.session) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Payment couldn’t be started. Visit the event page to finish.",
          },
        ]);
        return;
      }
      const payStore = useCheckoutPaymentUiStore.getState();
      payStore.setStripePaymentSession(result.action.session);
      payStore.setAwaitingStripePayment(true);
      setStripePaymentSession(result.action.session);
      setIsStripePaymentOpen(true);
      const couponBit =
        choices.couponApplied && brief.coupon?.code
          ? ` Coupon **${brief.coupon.code}** is applied to tables and tickets.`
          : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `The payment form is open — enter your card details to finish.${couponBit}`,
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Opening your payment page now.",
      },
    ]);
    window.location.assign(result.action.url);
  }

  async function handleQuickAction(action: QuickAction) {
    if (isLoading || supportFlow.step === "submitting") return;

    if (action.id === "ask-question") {
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content:
            "Of course — type whatever you’d like to ask. Bookings, events, the venue, or anything else.",
        },
      ]);
      keepComposerFocusRef.current = true;
      focusComposer();
      return;
    }

    if (action.id === CHAT_PAY_FULL_ID || action.id === CHAT_PAY_DEPOSIT_ID) {
      setMessages((prev) => [...prev, { role: "user", content: action.label }]);
      await startChatPayment(
        action.id === CHAT_PAY_DEPOSIT_ID ? "deposit" : "full",
        [{ role: "user", content: action.label }],
      );
      return;
    }

    if (action.sendText) {
      await handleSendMessage(action.sendText);
      return;
    }

    // Navigation actions (Register / Log in / Contact, etc.)
    if (action.href) {
      const href = action.href;
      if (
        action.id.startsWith("brochure-") ||
        /^https?:\/\//i.test(href) ||
        /\.pdf(\?|#|$)/i.test(href)
      ) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      if (isCheckoutHandoffHref(href) || action.id === "open-checkout") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: action.label },
        ]);
        await openVendorCheckout({
          href,
          extraMessages: [{ role: "user", content: action.label }],
        });
        return;
      }
      persistCheckoutHandoffFromHref(href);
      const checkoutCopy = checkoutHandoffNavCopy(href, isLoggedInCustomer);
      setMessages((prev) => [
        ...clearQuickActions(prev),
        { role: "user", content: action.label },
        {
          role: "assistant",
          content:
            checkoutCopy ??
            (action.id === "register"
              ? "Taking you to registration now. Complete the form to create your account, then you can book events."
              : action.id === "login"
                ? "Taking you to log in. Once you’re signed in, you can continue with your booking."
                : "Taking you there now."),
          supportCta: isCheckoutHandoffHref(href)
            ? undefined
            : {
                href,
                label: action.label,
              },
        },
      ]);
      router.push(href);
      return;
    }

    if (action.id === "cancel_flow") {
      setMessages((prev) => [...prev, { role: "user", content: action.label }]);
      cancelGuidedSupport();
      return;
    }

    if (action.id === "general_support" || action.id === "technical_support") {
      setMessages((prev) => [...prev, { role: "user", content: action.label }]);
      askForPhone(action.id as SupportCategory);
      return;
    }

    if (action.id === "confirm_submit" || action.id === "retry_submit") {
      setMessages((prev) => [...prev, { role: "user", content: action.label }]);
      await submitGuidedSupport(supportFlow);
      return;
    }
  }

  async function handleGuidedFlowText(userText: string) {
    if (isDeclineIntent(userText) || userText.toLowerCase() === "cancel") {
      cancelGuidedSupport();
      return;
    }

    if (supportFlow.step === "category") {
      if (/\b(technical|account|login|password)\b/i.test(userText)) {
        askForPhone("technical_support");
        return;
      }
      if (/\b(booking|event|general|ticket|table)\b/i.test(userText)) {
        askForPhone("general_support");
        return;
      }
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content:
            "Please choose a category using one of the buttons below — or tap No thanks to cancel:",
          quickActions: CATEGORY_ACTIONS,
        },
      ]);
      return;
    }

    if (supportFlow.step === "phone") {
      if (!isValidPhone(userText)) {
        setMessages((prev) => [
          ...clearQuickActions(prev),
          {
            role: "assistant",
            content:
              "Please enter a valid UK telephone number (at least 7 digits) so our team can contact you. Or type cancel to stop.",
            quickActions: [{ id: "cancel_flow", label: "Cancel" }],
          },
        ]);
        return;
      }
      askForDescription(userText.trim());
      return;
    }

    if (supportFlow.step === "description") {
      if (userText.trim().length < 8) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Could you add a little more detail so we can help you properly? Or type cancel to stop.",
            quickActions: [{ id: "cancel_flow", label: "Cancel" }],
          },
        ]);
        return;
      }
      askForConfirm(userText.trim());
      return;
    }

    if (supportFlow.step === "confirm") {
      if (/\b(yes|submit|confirm|ok|okay|sure|send)\b/i.test(userText)) {
        await submitGuidedSupport(supportFlow);
        return;
      }
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content: "Please choose Send enquiry to send it, or Cancel to stop.",
          quickActions: [
            { id: "confirm_submit", label: "Send enquiry" },
            { id: "cancel_flow", label: "Cancel" },
          ],
        },
      ]);
    }
  }

  async function handleSendMessage(overrideText?: string) {
    const userText = (overrideText ?? input).trim();
    if (!userText || isLoading) return;

    const userMessage: Message = { role: "user", content: userText };
    if (!overrideText) {
      setInput("");
      keepComposerFocusRef.current = true;
      focusComposer();
      requestAnimationFrame(() => focusComposer());
    }

    // Active guided support flow — handle without calling the AI
    if (supportFlow.step !== "idle" && supportFlow.step !== "submitting") {
      // Single update: keep user bubble + response together so category
      // buttons are never cleared without being re-attached.
      setMessages((prev) => [...clearQuickActions(prev), userMessage]);
      await handleGuidedFlowText(userText);
      return;
    }

    setMessages((prev) => [...clearQuickActions(prev), userMessage]);

    const safetyKind = classifyChatSafetyIntent(userText, {
      allowFinancial: isLoggedInVendor,
    });
    if (safetyKind) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: buildChatSafetyReply(safetyKind, { userName }),
        },
      ]);
      return;
    }

    const isGuestCustomer =
      isVendorStorefront && !isLoggedInVendor && !isLoggedInCustomer;

    if (isGuestCustomer && isChatEmailUpdatesText(userText)) {
      setAwaitingGuestEmail(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Type the email address you’d like us to use. We’ll send a confirmation — event updates only, no spam.",
        },
      ]);
      return;
    }

    if (isGuestCustomer && awaitingGuestEmail) {
      if (isDeclineIntent(userText)) {
        setAwaitingGuestEmail(false);
        offerGuestAuthOptions();
        return;
      }
      if (isChatEmailAddress(userText)) {
        setIsLoading(true);
        try {
          const result = await subscribeNewsletter.mutateAsync({
            email: userText.trim(),
            name: userName ?? undefined,
            source: "landing",
            ...(chatLocationId ? { location_id: chatLocationId } : {}),
          });
          setAwaitingGuestEmail(false);
          const hrefs = guestAuthHrefs();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `${result.message}\n\nWhen you’re ready to book, create an account or log in.`,
              quickActions: [
                {
                  id: "register",
                  label: "Create account",
                  href: hrefs.registerHref,
                },
                { id: "login", label: "Log in", href: hrefs.loginHref },
              ],
            },
          ]);
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: newsletterApiMessage(
                error,
                "We couldn’t add that email just now. Please check it and try again.",
              ),
            },
          ]);
        } finally {
          setIsLoading(false);
        }
        return;
      }
      if (
        !isGuestBookingConciergeText(userText, eventBookingBriefRef.current)
      ) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Please type an email address, or tap **Create account** to book.",
            quickActions: toUiQuickActions(
              buildGuestBookingGateActions(
                eventBookingBriefRef.current ?? pageBookingBrief,
                {
                  ...guestAuthHrefs(),
                  events: listGuestBookableLinks(liveEvents),
                },
              ),
            ),
          },
        ]);
        return;
      }
      setAwaitingGuestEmail(false);
    }

    // Logged-in customer on vendor site: start professional enquiry wizard
    if (isVendorStorefront && isLoggedInCustomer && isSupportIntent(userText)) {
      const brief = eventBookingBriefRef.current ?? pageBookingBrief;
      const bookingInProgress = Boolean(
        brief && parseChatBookingChoices(messages, brief).slots.length > 0,
      );
      if (!bookingInProgress) {
        startGuidedSupport(userText);
        return;
      }
    }

    // Guest on vendor site: offer Register / Log in buttons
    if (isVendorStorefront && !isLoggedInCustomer && isAuthIntent(userText)) {
      offerGuestAuthOptions();
      return;
    }

    // Hard guard: rooms cannot be added/changed after booking (never invent UI)
    if (isAddRoomAfterBookingIntent(userText)) {
      const nameBit = userName ? `, ${userName}` : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry${nameBit} — once a booking is made, you **cannot add or change rooms** (event spaces). There is no “Add room” or “Additional Rooms” option on an existing booking.

What you *can* do on your booking:
1. Open **Bookings** → tap **View** on the booking.
2. Use **Add extras for this date** to add more **tickets**, **tables/guests**, or **drink packages** for the room and date you already booked.
3. Then pay any outstanding amount with **Pay … Now** if needed.

If you need a **different room/hall**, please start a **new booking** on the venue site: open the event → **Choose Your Room** → select a date → **Checkout**.

Is there anything else I can help you with?`,
          supportCta: isAuthenticated
            ? { href: "/customer/bookings", label: "Open Bookings" }
            : { href: "/auth/login", label: "Log in to view bookings" },
        },
      ]);
      return;
    }

    if (
      isVendorStorefront &&
      isLoggedInCustomer &&
      isChatExistingCartBookingIntent(
        userText,
        eventBookingBriefRef.current ?? pageBookingBrief,
      ) &&
      !shouldSendBrochureForEventPick(userText, messages)
    ) {
      const brief = eventBookingBriefRef.current ?? pageBookingBrief;
      const bookingInProgress = Boolean(
        brief && parseChatBookingChoices(messages, brief).slots.length > 0,
      );
      if (!bookingInProgress) {
        setIsLoading(true);
        const hasCartDates = await customerCartHasDates();
        setIsLoading(false);
        if (hasCartDates) {
          sendExistingCartBookingGate();
          return;
        }
      }
    }

    const catalogueBrief = eventBookingBriefRef.current ?? pageBookingBrief;
    if (
      isVendorStorefront &&
      !isLoggedInVendor &&
      liveEvents.length > 0 &&
      !parseBookEventInCitySendText(userText) &&
      (isBroadEventListIntent(userText) ||
        isLiveEventAvailabilityQuestion(userText) ||
        (isBrochureQuestion(userText) && !catalogueBrief))
    ) {
      const matched = matchLiveEvents(userText, liveEvents);
      const matches = matched.length > 0 ? matched : asWeakMatches(liveEvents);
      const pickerText =
        isBrochureQuestion(userText) ||
        messages.some(
          (message) =>
            message.role === "user" && isBrochureQuestion(message.content),
        )
          ? `${userText} brochure`
          : userText;
      const direct = buildLiveEventsDirectReply({
        userText: pickerText,
        matches,
        allLiveEvents: liveEvents,
        siteName,
        userName,
      });
      if (direct) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            ...inChatChoiceMessage(direct.content),
          },
        ]);
        return;
      }
    }

    // Public venue site: first-turn location picker only. Follow-ups and the
    // open event page go to the concierge with real dates/rooms/drinks.
    if (
      isVendorStorefront &&
      !isLoggedInVendor &&
      isLiveEventBookingIntent(userText) &&
      !pageBookingBrief &&
      !isBookingConciergeFollowUp(userText) &&
      !messages.some((m) => m.role === "user")
    ) {
      const replyFromDirect = (content: string) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            ...inChatChoiceMessage(content),
          },
        ]);
      };

      if (liveEvents.length === 0) {
        replyFromDirect(
          buildLiveEventsNoMatchReply({
            allLiveEvents: liveEvents,
            siteName,
            userName,
            userText,
          }).content,
        );
        return;
      }

      const matches = matchLiveEvents(userText, liveEvents);
      if (
        matches.length > 0 &&
        needsLiveEventLocationChoice(userText, matches, liveEvents)
      ) {
        const direct = buildLiveEventsDirectReply({
          userText,
          matches,
          allLiveEvents: liveEvents,
          siteName,
          userName,
        });
        if (direct) {
          replyFromDirect(direct.content);
          return;
        }
      }
      if (matches.length === 0) {
        replyFromDirect(
          buildLiveEventsNoMatchReply({
            allLiveEvents: liveEvents,
            siteName,
            userName,
            userText,
          }).content,
        );
        return;
      }
    }

    // Guests (or non-support): AI chat + navigation / contact CTAs
    setIsLoading(true);
    const wantsSupport = isSupportIntent(userText);

    // Follow-ups like “not this month / overall” keep the prior stats question
    // (e.g. refunds) so we still fetch the right metric all-time.
    let statsQueryText = userText;
    const isPeriodFollowUp =
      /^(not\s+this\s+month|overall|all\s*-?\s*time|altogether|in\s+total)\b/i.test(
        userText.trim(),
      ) ||
      (/\b(overall|all\s*-?\s*time|not\s+this\s+month)\b/i.test(userText) &&
        !isVendorStatsIntent(userText));
    if (isPeriodFollowUp) {
      const priorUser = [...messages]
        .reverse()
        .find((m) => m.role === "user" && m.content.trim() !== userText.trim());
      if (priorUser && isVendorStatsIntent(priorUser.content)) {
        statsQueryText = `${priorUser.content} ${userText}`;
      }
    }

    const asksEventOverview =
      isLoggedInVendor && isVendorEventOverviewIntent(statsQueryText);
    const asksBookingList =
      isLoggedInVendor &&
      !asksEventOverview &&
      isVendorBookingListIntent(userText);
    const asksVendorStats =
      isLoggedInVendor &&
      !asksEventOverview &&
      !asksBookingList &&
      isVendorStatsIntent(statsQueryText);

    // List pending bookings + customer phone/email (direct API — no LLM)
    if (asksBookingList) {
      try {
        const priorUserTexts = messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .slice(-4);
        const result = await fetchVendorBookingListChatReply({
          userText,
          userName,
          priorUserTexts,
        });
        if (result?.reply) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: result.reply,
              supportCta: result.bookingsHref
                ? {
                    href: result.bookingsHref,
                    label: "Open Bookings",
                  }
                : undefined,
            },
          ]);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Chat booking list reply failed:", error);
      }
    }

    // Named event (e.g. Christmas) → overview API, not today's dashboard totals
    if (asksEventOverview) {
      try {
        const result = await fetchVendorEventOverviewChatReply({
          userText: statsQueryText,
          userName,
          vendorLocationId:
            vendorLocationId ?? session?.user?.vendor_location_id ?? null,
        });
        if (result?.reply) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: result.reply,
              supportCta: result.overviewHref
                ? {
                    href: result.overviewHref,
                    label: "Open Event overview",
                  }
                : undefined,
            },
          ]);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Chat event overview reply failed:", error);
      }
    }

    // Never push Dashboard/Transactions CTAs for stats questions — answer with numbers.
    const navLink = asksVendorStats
      ? undefined
      : resolveChatNavLink(userText, {
          accountType,
          isAuthenticated,
          isVendorStorefront,
        });

    const supportCta =
      navLink ??
      (isVendorStorefront && wantsSupport && !isLoggedInCustomer
        ? {
            href: "/contact",
            label: "Go to Contact page",
          }
        : undefined);

    // Fetch the period they asked about (last month / all time / etc.)
    let statsForChat = vendorLiveStats;
    if (asksVendorStats) {
      try {
        const range = resolveChatDateRange(statsQueryText);
        const bookingDateParams = range.allTime
          ? {}
          : {
              from_date: range.from_date ?? undefined,
              to_date: range.to_date ?? undefined,
            };

        // Dashboard API requires dates — use a wide range for all-time
        const dashFrom = range.allTime
          ? "2000-01-01"
          : (range.from_date as string);
        const dashTo = range.allTime
          ? format(new Date(), "yyyy-MM-dd")
          : (range.to_date as string);

        const [bookingsResult, commissionsResult, listResult] =
          await Promise.allSettled([
            vendorDashboardService.getBookingsStatistics({
              dateRange: {
                from_date: dashFrom,
                to_date: dashTo,
              },
            }),
            isVendorEarningsIntent(statsQueryText) ||
            isVendorCommissionIntent(statsQueryText)
              ? vendorDashboardService.getCommissionsStatistics({
                  from_date: dashFrom,
                  to_date: dashTo,
                })
              : Promise.resolve(null),
            vendorBookingsService.getBookings({
              page: 1,
              // Must load enough rows — API summary matches the returned page set
              per_page: 1000,
              ...bookingDateParams,
            }),
          ]);

        const bookingsDash =
          bookingsResult.status === "fulfilled" ? bookingsResult.value : null;
        const commissionsDash =
          commissionsResult.status === "fulfilled"
            ? commissionsResult.value
            : null;
        const bookingsList =
          listResult.status === "fulfilled" ? listResult.value : null;

        if (bookingsResult.status === "rejected") {
          console.error("Chat bookings stats failed:", bookingsResult.reason);
        }
        if (commissionsResult.status === "rejected") {
          console.error(
            "Chat commissions stats failed:",
            commissionsResult.reason,
          );
        }
        if (listResult.status === "rejected") {
          console.error("Chat bookings list failed:", listResult.reason);
        }

        const raw = bookingsDash?.data;
        const commissionStats =
          commissionsDash?.data?.commissions_stats ?? raw?.commissions_stats;
        const bookingSummary = bookingsList?.summary;
        const metaTotal = bookingsList?.meta?.total;

        if (raw || bookingSummary || metaTotal != null) {
          const dashboard: VendorChatDashboardSnapshot | null = raw
            ? {
                current_location_id: raw.current_location_id,
                booking_period: range.label,
                booking_period_start: range.allTime ? null : range.from_date,
                booking_period_end: range.allTime ? null : range.to_date,
                summary: raw.summary ?? null,
                bookings_stats: raw.bookings_stats ?? null,
                commissions_stats: commissionStats ?? null,
                recent_bookings: (raw.recent_bookings ?? []).slice(0, 5),
              }
            : null;

          statsForChat = {
            fetchedAt: new Date().toISOString(),
            periodLabel: range.label,
            dashboard,
            bookingSummary: {
              booking_count: metaTotal ?? 0,
              total_amount: bookingSummary?.total_amount ?? "0.00",
              deposit_amount: bookingSummary?.deposit_amount ?? "0.00",
              pending_amount: bookingSummary?.pending_amount ?? "0.00",
              refunded_amount: bookingSummary?.refunded_amount ?? "0.00",
              total_platform_fee: bookingSummary?.total_platform_fee ?? "0.00",
              platform_fee_settled:
                bookingSummary?.platform_fee_settled ?? "0.00",
              platform_fee_due: bookingSummary?.platform_fee_due ?? "0.00",
            },
          };
        }
      } catch (error) {
        console.error("Failed to load period vendor stats for chat:", error);
      }
    }

    // Answer stats/earnings from API numbers directly — do not rely on the LLM
    // to invent “visit Dashboard / change date filter” redirects.
    // Only when we successfully loaded the requested period (periodLabel set).
    if (asksVendorStats && statsForChat?.periodLabel) {
      const direct = buildVendorStatsDirectReply({
        userText: statsQueryText,
        stats: statsForChat,
        userName,
      });
      if (direct) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: direct },
        ]);
        setIsLoading(false);
        return;
      }
    }

    try {
      // Keep AI payload small (413 if we send huge booking dumps / long history)
      const slimStats: VendorChatLiveStats | null = statsForChat
        ? {
            fetchedAt: statsForChat.fetchedAt,
            periodLabel: statsForChat.periodLabel,
            bookingSummary: statsForChat.bookingSummary ?? null,
            dashboard: statsForChat.dashboard
              ? {
                  current_location_id:
                    statsForChat.dashboard.current_location_id,
                  booking_period: statsForChat.dashboard.booking_period,
                  booking_period_start:
                    statsForChat.dashboard.booking_period_start,
                  booking_period_end: statsForChat.dashboard.booking_period_end,
                  summary: statsForChat.dashboard.summary ?? null,
                  bookings_stats: statsForChat.dashboard.bookings_stats ?? null,
                  commissions_stats:
                    statsForChat.dashboard.commissions_stats ?? null,
                  recent_bookings: (
                    statsForChat.dashboard.recent_bookings ?? []
                  ).slice(0, 3),
                }
              : null,
          }
        : null;

      let eventBookingBrief: ChatEventBookingBrief | null = pageBookingBrief;
      const pinnedBrief = eventBookingBriefRef.current;
      const askedTheme = extractLiveEventTheme(userText);
      const pinnedWrongTheme = Boolean(
        pinnedBrief &&
        askedTheme &&
        !liveEvents.some(
          (event) =>
            event.slug === pinnedBrief.eventSlug &&
            event.location_slug === pinnedBrief.locationSlug &&
            liveEventMatchesRequestedTheme(event, userText),
        ),
      );
      const namedOtherEvent = matchLiveEvents(userText, liveEvents).some(
        (item) => {
          const title = item.event.title.trim().toLowerCase();
          return (
            Boolean(pinnedBrief) &&
            title.length >= 4 &&
            userText.toLowerCase().includes(title) &&
            item.event.slug !== pinnedBrief?.eventSlug
          );
        },
      );
      if (
        !eventBookingBrief &&
        pinnedBrief &&
        !namedOtherEvent &&
        !pinnedWrongTheme &&
        !isBroadEventListIntent(userText) &&
        !isLiveEventAvailabilityQuestion(userText)
      ) {
        eventBookingBrief = pinnedBrief;
      }
      const locationPick = isLiveEventLocationChoiceText(userText, liveEvents);
      let pickedLiveEvent: LiveEventChatMatch | undefined;
      if (isVendorStorefront && !eventBookingBrief && tenantHost) {
        const matches = matchLiveEventsFromConversation(
          userText,
          messages,
          liveEvents,
        );
        const needsEventChoice = needsLiveEventLocationChoice(
          userText,
          matches,
          liveEvents,
        );
        if (matches.length > 1 && needsEventChoice) {
          const direct = buildLiveEventsDirectReply({
            userText,
            matches,
            allLiveEvents: liveEvents,
            siteName,
            userName,
          });
          if (direct) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                ...inChatChoiceMessage(direct.content),
              },
            ]);
            return;
          }
        }
        const pick =
          matches.length === 1
            ? matches[0]
            : needsEventChoice
              ? undefined
              : matches[0];
        pickedLiveEvent = pick;
        if (pick) {
          try {
            const detail = await eventsService.getEventDetail(
              pick.event.slug,
              tenantHost,
              { suppressErrorToast: true },
            );
            if (detail?.data) {
              eventBookingBrief = mergeChatBriefInventory(
                summarizeEventDetailForChat(detail.data, {
                  href: pick.href,
                  locationCity: pick.event.location_city,
                  locationSlug: pick.event.location_slug,
                  eventSlug: pick.event.slug,
                  currencySymbol,
                }),
                eventBookingBriefRef.current,
              );
              eventBookingBriefRef.current = eventBookingBrief;
            }
          } catch (error) {
            console.error("Chat event detail fetch failed:", error);
          }
        }
      }

      if (
        isVendorStorefront &&
        !isLoggedInVendor &&
        locationPick &&
        !eventBookingBrief
      ) {
        if (pickedLiveEvent) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `I found **${pickedLiveEvent.event.title}** in **${pickedLiveEvent.event.location_city}**, but I couldn’t load the booking details just now. Please try again in a moment, or pick that city from the locations directory.`,
            },
          ]);
          return;
        }
        const priorMatches = matchLiveEvents(
          messages.map((m) => m.content).join("\n"),
          liveEvents,
        );
        const direct =
          priorMatches.length > 0
            ? buildLiveEventsDirectReply({
                userText,
                matches: priorMatches,
                allLiveEvents: liveEvents,
                siteName,
                userName,
              })
            : buildLiveEventsNoMatchReply({
                allLiveEvents: liveEvents,
                siteName,
                userName,
                userText,
              });
        if (direct) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              ...inChatChoiceMessage(direct.content),
            },
          ]);
          return;
        }
      }

      if (
        isVendorStorefront &&
        !isLoggedInVendor &&
        eventBookingBrief &&
        shouldSendBrochureForEventPick(userText, messages)
      ) {
        const brochureTurn = buildEventInfoTurn({
          brief: eventBookingBrief,
          userText: "brochure",
        });
        if (brochureTurn) {
          const brochureActions = publicBookingQuickActions({
            content: brochureTurn.content,
            brief: eventBookingBrief,
            conversation: [...messages, userMessage],
            hostActions: brochureTurn.actions,
          });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: brochureTurn.content,
              quickActions:
                brochureActions.length > 0 ? brochureActions : undefined,
            },
          ]);
          return;
        }
      }

      if (
        isGuestCustomer &&
        isGuestBookingConciergeText(userText, eventBookingBrief)
      ) {
        const hrefs = guestAuthHrefs();
        const compare =
          asksRoomDifference(userText) && eventBookingBrief
            ? `${buildRoomDifferenceCopy(eventBookingBrief)}\n\n`
            : "";
        const matches = matchLiveEvents(userText, liveEvents);
        const guestEvents = eventBookingBrief
          ? undefined
          : listGuestBookableLinks(
              matches.length > 0
                ? matches.map((item) => item.event)
                : liveEvents,
            );
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              compare +
              buildGuestBookingGateCopy({
                brief: eventBookingBrief,
                events: guestEvents,
                userName,
                includeEventLead: !compare,
                registerHref: hrefs.registerHref,
                loginHref: hrefs.loginHref,
              }),
            quickActions: toUiQuickActions(
              buildGuestBookingGateActions(eventBookingBrief, {
                ...hrefs,
                events: guestEvents,
              }),
            ),
          },
        ]);
        return;
      }

      if (
        isVendorStorefront &&
        isLoggedInCustomer &&
        eventBookingBrief &&
        !isLiveEventAvailabilityQuestion(userText) &&
        (isLiveEventBookingIntent(userText) || locationPick)
      ) {
        const conversation = [...messages, userMessage];
        eventBookingBrief = await briefWithHydratedCatalogs(
          eventBookingBrief,
          conversation,
        );
        const kickoffTurn = buildHostBookingTurn({
          brief: eventBookingBrief,
          userText,
          choices: parseChatBookingChoices(conversation, eventBookingBrief),
          userName,
        });
        const kickoff =
          kickoffTurn?.content ??
          buildBookingKickoffCopy({
            brief: eventBookingBrief,
            userName,
          });
        const kickoffActions = publicBookingQuickActions({
          content: kickoff,
          brief: eventBookingBrief,
          conversation,
          hostActions: kickoffTurn?.actions,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: kickoff,
            quickActions:
              kickoffActions.length > 0 ? kickoffActions : undefined,
          },
        ]);
        return;
      }

      const conversationForHost = [...messages, userMessage];
      if (isVendorStorefront && isLoggedInCustomer && eventBookingBrief) {
        eventBookingBrief = await briefWithHydratedCatalogs(
          eventBookingBrief,
          conversationForHost,
        );
        const hostChoices = parseChatBookingChoices(
          conversationForHost,
          eventBookingBrief,
        );
        const payMode = parseChatPayMode(userText);
        if (
          isChatCheckoutHandoffIntent(userText) &&
          (chatChoicesHaveLineItems(hostChoices) ||
            (await customerCartHasDates()))
        ) {
          await openVendorCheckout({ extraMessages: [userMessage] });
          return;
        }
        if (
          payMode &&
          bookingChoicesReadyForPay(eventBookingBrief, hostChoices)
        ) {
          await startChatPayment(payMode, [userMessage]);
          return;
        }
        const bookingInProgress = hostChoices.slots.length > 0;
        if (
          bookingInProgress ||
          isHostBookingUserText(userText, eventBookingBrief)
        ) {
          if (chatChoicesHaveLineItems(hostChoices)) {
            setIsLoading(true);
            try {
              await persistChatBookingCart(eventBookingBrief, hostChoices);
            } finally {
              setIsLoading(false);
            }
          }
          const hostTurn = buildHostBookingTurn({
            brief: eventBookingBrief,
            userText,
            choices: hostChoices,
            userName,
            paymentGateways: chatPayGatewaysRef.current,
          });
          if (hostTurn) {
            const hostActions = publicBookingQuickActions({
              content: hostTurn.content,
              brief: eventBookingBrief,
              conversation: conversationForHost,
              hostActions: hostTurn.actions,
            });
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: hostTurn.content,
                quickActions: hostActions.length > 0 ? hostActions : undefined,
              },
            ]);
            return;
          }
        }
      }

      const casualBrief = eventBookingBrief ?? pageBookingBrief;
      const casualChoices = casualBrief
        ? parseChatBookingChoices(conversationForHost, casualBrief)
        : null;
      if (
        isVendorStorefront &&
        !isLoggedInVendor &&
        isCasualChatText(userText) &&
        !shouldOfferChatBookingUi(userText, casualChoices)
      ) {
        const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
        const venue = siteName?.trim() ? ` with ${siteName.trim()}` : "";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Hello${nameBit} — how can I help you${venue} today?`,
          },
        ]);
        return;
      }

      if (
        isVendorStorefront &&
        eventBookingBrief &&
        isEventInfoQuestion(userText) &&
        !asksRoomDifference(userText)
      ) {
        const infoChoices = parseChatBookingChoices(
          conversationForHost,
          eventBookingBrief,
        );
        const infoTurn = buildEventInfoTurn({
          brief: eventBookingBrief,
          userText,
          roomId: infoChoices.pendingRoomId ?? infoChoices.roomId,
        });
        if (infoTurn) {
          const infoActions = publicBookingQuickActions({
            content: infoTurn.content,
            brief: eventBookingBrief,
            conversation: conversationForHost,
            hostActions: infoTurn.actions,
          });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: infoTurn.content,
              quickActions: infoActions.length > 0 ? infoActions : undefined,
            },
          ]);
          return;
        }
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage]
            .slice(-8)
            .map(({ role, content }) => ({
              role,
              content:
                typeof content === "string" && content.length > 1200
                  ? `${content.slice(0, 1200)}…`
                  : content,
            })),
          context: {
            websiteRole,
            siteName,
            isLoggedInCustomer,
            isAuthenticated,
            accountType,
            userName,
            pathname,
            contactPhone,
            contactEmail,
            contactAddress,
            vendorLiveStats: isLoggedInVendor ? slimStats : null,
            liveEvents: isVendorStorefront
              ? eventBookingBrief
                ? liveEvents.slice(0, 8)
                : liveEvents
              : null,
            eventBookingBrief: isVendorStorefront ? eventBookingBrief : null,
          },
        }),
      });

      const briefForHandoff = eventBookingBrief ?? pageBookingBrief;
      const conversation = [...messages, userMessage];

      if (!response.ok) {
        const errBody = (await response.json().catch(() => null)) as {
          retryAfter?: unknown;
          details?: unknown;
          code?: unknown;
        } | null;
        const wait =
          typeof errBody?.retryAfter === "string" ? errBody.retryAfter : null;
        const details =
          typeof errBody?.details === "string" ? errBody.details : null;
        const providerNoise =
          errBody?.code === "context_too_long" ||
          isUnsafeChatProviderError(details);
        const recovery =
          briefForHandoff && !wait
            ? buildBookingRecoveryCopy({
                brief: briefForHandoff,
                userName,
              })
            : null;
        const content = wait
          ? `I'm a bit busy right now. Please try again in ${wait}.`
          : recovery ||
            (providerNoise
              ? "Sorry, I couldn’t complete that in chat. Visit the event page to book, or try a shorter question."
              : "Sorry, something went wrong. Please try again in a moment.");
        const errorActions =
          isVendorStorefront && !isLoggedInVendor && briefForHandoff
            ? publicBookingQuickActions({
                content,
                brief: briefForHandoff,
                conversation,
                recovery: Boolean(recovery || providerNoise),
              })
            : [];
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content,
            supportCta,
            quickActions: errorActions.length > 0 ? errorActions : undefined,
          },
        ]);
        return;
      }

      const data = await response.json();
      const rawReply = typeof data.message === "string" ? data.message : "";
      const choices = parseChatBookingChoices(
        [...conversation, { role: "assistant", content: rawReply }],
        briefForHandoff,
      );
      const hasDates = choices.dates.length > 0;
      const infoQuestion = isEventInfoQuestion(userText);
      const offerBookingUi =
        isLoggedInCustomer && shouldOfferChatBookingUi(userText, choices);
      const shouldOfferRooms =
        offerBookingUi &&
        !infoQuestion &&
        (asksRoomDifference(userText) ||
          asksToChangeOrPickRoom(userText) ||
          isLiveEventBookingIntent(userText) ||
          isBookingConciergeFollowUp(userText) ||
          choices.guestCount != null ||
          /\b(book|booking|guests?|tables?|tickets?|which room|choose.{0,12}room)\b/i.test(
            userText,
          ));
      const replyWithRooms =
        isVendorStorefront && !isLoggedInVendor
          ? withGuaranteedRoomChoiceCopy(rawReply, {
              brief: briefForHandoff,
              roomChosen: choices.roomId != null,
              userText,
              shouldOfferRooms,
              guestCount: choices.guestCount,
            })
          : rawReply;
      const replyWithDates =
        isVendorStorefront && !isLoggedInVendor && !infoQuestion
          ? withGuaranteedDateChoiceCopy(replyWithRooms, {
              brief: briefForHandoff,
              roomId: choices.roomId,
              roomChosen: choices.roomId != null,
              hasDates,
              userText,
              shouldOfferDates: offerBookingUi,
            })
          : replyWithRooms;
      const reply =
        isVendorStorefront &&
        !isLoggedInVendor &&
        isCasualChatText(userText) &&
        !offerBookingUi
          ? stripUnsolicitedBookingOfferCopy(replyWithDates)
          : replyWithDates;
      const quickActions =
        isVendorStorefront && !isLoggedInVendor
          ? publicBookingQuickActions({
              content: reply,
              brief: briefForHandoff,
              conversation: [
                ...conversation,
                { role: "assistant", content: reply },
              ],
              offerBookingUi,
            })
          : extractBookingQuickActions(reply)
              .filter((action) => Boolean(action.sendText) && !action.href)
              .map((action) => ({
                id: action.id,
                label: action.label,
                hint: action.hint,
                sendText: action.sendText,
              }));
      const eventPageCta = isBareEventPageHref(
        supportCta?.href,
        briefForHandoff,
      );
      const replySupportCta = eventPageCta ? undefined : supportCta;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: stripInChatChoiceMarkdown(reply),
          supportCta: replySupportCta,
          quickActions: quickActions.length > 0 ? quickActions : undefined,
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      const briefForHandoff = pageBookingBrief;
      const recovery =
        isVendorStorefront && !isLoggedInVendor && briefForHandoff
          ? buildBookingRecoveryCopy({
              brief: briefForHandoff,
              userName,
            })
          : "Sorry, something went wrong. Please try again in a moment.";
      const errorActions =
        isVendorStorefront && !isLoggedInVendor && briefForHandoff
          ? publicBookingQuickActions({
              content: recovery,
              brief: briefForHandoff,
              conversation: [...messages, userMessage],
              recovery: true,
            })
          : [];
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: recovery,
          supportCta,
          quickActions: errorActions.length > 0 ? errorActions : undefined,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  }

  const inputPlaceholder =
    supportFlow.step === "phone"
      ? "Enter your telephone number…"
      : supportFlow.step === "description"
        ? "Describe your issue…"
        : awaitingGuestEmail
          ? "Your email address…"
          : "Type a message…";

  // Onboarding is a full-screen editor + preview — the floating launcher
  // (site logo avatar) overlaps the right-hand preview panel.
  if (pathname?.startsWith("/on-boarding")) {
    return null;
  }

  const isVendorCheckout = isCustomerCheckoutPath(pathname);

  // User dismissed the launcher for this page load only (comes back on refresh).
  if (isDismissed) {
    return null;
  }

  const chatOverlay = (
    <>
      {shouldLoadVendorChatStats && (
        <VendorChatStatsLoader
          dateRange={chatDashboardRange}
          onStats={setVendorLiveStats}
        />
      )}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="chat-launcher"
            initial={motionSafe ? { opacity: 0, scale: 0.7, y: 16 } : false}
            animate={
              motionSafe
                ? {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }
                : { opacity: 1 }
            }
            exit={motionSafe ? { opacity: 0, scale: 0.85, y: 12 } : undefined}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className={cn(
              "fixed right-4 z-[80] sm:right-6",
              isVendorCheckout
                ? "bottom-[calc(var(--checkout-mobile-chrome-height,9rem)+0.75rem)] lg:bottom-8"
                : "bottom-20 sm:bottom-8",
            )}
            style={isVendorCheckout ? undefined : previewReviewChromeLiftStyle}
          >
            <motion.button
              type="button"
              onClick={() => {
                setHasOpenedChat(true);
                setIsMinimized(false);
                setIsOpen(true);
              }}
              aria-label="Open chat"
              whileHover={motionSafe ? { scale: 1.06 } : undefined}
              whileTap={motionSafe ? { scale: 0.96 } : undefined}
              className={cn(
                "relative h-14 w-14 rounded-full p-0",
                "shadow-[0_8px_28px_rgba(15,23,42,0.18)]",
                "ring-2 ring-white/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
              )}
            >
              {/* Attention rings — draw the eye to the support bot */}
              {motionSafe && (
                <>
                  <span
                    aria-hidden
                    data-chat-bot-motion
                    className="pointer-events-none absolute inset-0 rounded-full bg-slate-400/30"
                    style={{
                      animation:
                        "chat-bot-ping 2.4s cubic-bezier(0,0,0.2,1) infinite",
                    }}
                  />
                  <span
                    aria-hidden
                    data-chat-bot-motion
                    className="pointer-events-none absolute -inset-1 rounded-full border-2 border-slate-400/40"
                    style={{
                      animation:
                        "chat-bot-pulse 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
                    }}
                  />
                </>
              )}
              <span className="relative z-10 block h-full w-full">
                <ChatAvatar
                  src={avatarSrc}
                  alt={siteName}
                  size="lg"
                  branded={brandedChatChrome}
                  className="h-full w-full ring-0"
                />
              </span>
            </motion.button>
            <button
              type="button"
              aria-label="Hide chat"
              title="Hide chat"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className={cn(
                "absolute -right-1.5 -top-1.5 z-30",
                "flex h-5 w-5 items-center justify-center rounded-full shadow-sm",
                chatChrome,
                "ring-2 ring-white",
                brandedChatChrome ? "hover:bg-slate-950" : "hover:bg-slate-900",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
              )}
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.button
            key="chat-scrim"
            type="button"
            aria-label="Minimise chat"
            initial={motionSafe ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={motionSafe ? { opacity: 0 } : undefined}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/25 sm:hidden"
            onClick={() => {
              keepComposerFocusRef.current = false;
              setIsMinimized(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && isMinimized && (
          <motion.button
            key="chat-dock"
            type="button"
            aria-label="Open chat assistant"
            initial={motionSafe ? { x: 72, opacity: 0 } : { opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={motionSafe ? { x: 72, opacity: 0 } : undefined}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={() => setIsMinimized(false)}
            className={cn(
              "fixed right-0 z-[80] flex items-center gap-2 rounded-l-2xl rounded-r-none",
              chatChrome,
              "py-2.5 pl-2 pr-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.22)]",
              "ring-1 ring-white/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
              isVendorCheckout
                ? "bottom-[calc(var(--checkout-mobile-chrome-height,9rem)+0.75rem)] lg:bottom-24"
                : "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-24",
            )}
            style={isVendorCheckout ? undefined : previewReviewChromeLiftStyle}
          >
            <ChatAvatar
              src={avatarSrc}
              alt={siteName}
              size="sm"
              branded={brandedChatChrome}
              className="ring-1 ring-white/25"
            />
            <ChevronsLeft className="h-4 w-4 text-current/80" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            key="chat-panel"
            initial={motionSafe ? { opacity: 0.6, x: "110%" } : { opacity: 1 }}
            animate={{ opacity: 1, x: 0 }}
            exit={motionSafe ? { opacity: 0, x: "110%" } : { opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "fixed z-[80] flex flex-col overflow-hidden bg-white",
              "shadow-[0_16px_48px_rgba(15,23,42,0.16)]",
              "border border-slate-200",
              "right-0 w-[min(100vw-2.25rem,24rem)] rounded-l-2xl rounded-r-none",
              "top-0 h-[100dvh] pb-[env(safe-area-inset-bottom)]",
              "sm:right-6 sm:top-auto sm:h-[min(560px,calc(100dvh-5.5rem))] sm:w-96 sm:rounded-2xl sm:pb-0",
              isVendorCheckout
                ? "max-sm:top-auto max-sm:h-[min(530px,calc(100dvh-var(--checkout-mobile-chrome-height,9rem)-1rem))] max-sm:bottom-[calc(var(--checkout-mobile-chrome-height,9rem)+0.5rem)] lg:bottom-10"
                : "sm:bottom-10",
            )}
            style={isVendorCheckout ? undefined : previewReviewChromeLiftStyle}
          >
            <div
              className={cn(
                "flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-end justify-between gap-2 px-3.5 pb-1.5 sm:h-14 sm:items-center sm:pb-0",
                chatChrome,
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <motion.div
                  animate={
                    motionSafe ? { rotate: [0, -6, 6, -4, 0] } : undefined
                  }
                  transition={
                    motionSafe
                      ? {
                          duration: 0.7,
                          delay: 0.15,
                          ease: "easeInOut",
                        }
                      : undefined
                  }
                >
                  <ChatAvatar
                    src={avatarSrc}
                    alt={siteName}
                    size="sm"
                    branded={brandedChatChrome}
                    className="ring-1 ring-white/25"
                  />
                </motion.div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {siteName}
                  </p>
                  <p className="truncate text-[11px] font-normal text-current/75">
                    Chat assistant
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-current hover:bg-[color:color-mix(in_srgb,currentColor_16%,transparent)] hover:!text-current sm:h-8 sm:w-8"
                  onClick={() => {
                    keepComposerFocusRef.current = false;
                    setIsMinimized(true);
                  }}
                  aria-label="Hide chat to the side"
                  title="Hide chat"
                >
                  <Minus className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={2} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-current hover:bg-[color:color-mix(in_srgb,currentColor_16%,transparent)] hover:!text-current sm:h-8 sm:w-8"
                  onClick={() => {
                    keepComposerFocusRef.current = false;
                    setIsOpen(false);
                    setIsMinimized(false);
                  }}
                  aria-label="Close chat"
                  title="Close chat"
                >
                  <X className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={2} />
                </Button>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 bg-slate-50 px-3.5 py-4">
              <div className="space-y-4 pb-1">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => {
                    const isUser = message.role === "user";
                    const hasBody = message.content.trim().length > 0;
                    const hasActions =
                      !isUser &&
                      Boolean(
                        message.quickActions && message.quickActions.length > 0,
                      );
                    const hasCta = !isUser && Boolean(message.supportCta);
                    if (!hasBody && !hasActions && !hasCta) return null;
                    const dateActionCount =
                      message.quickActions?.filter(isChatGridAction).length ??
                      0;
                    const eventPickCount =
                      message.quickActions?.filter(isEventPickAction).length ??
                      0;
                    const useDateGrid = dateActionCount >= 2;
                    const useEventList = !useDateGrid && eventPickCount >= 2;
                    return (
                      <motion.div
                        key={`msg-${index}-${message.role}-${message.content.slice(0, 24)}`}
                        initial={
                          motionSafe
                            ? {
                                opacity: 0,
                                y: 12,
                                x: isUser ? 10 : -10,
                              }
                            : false
                        }
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 26,
                          delay: motionSafe ? 0.03 : 0,
                        }}
                        className={cn(
                          "flex items-end gap-2 min-w-0",
                          isUser ? "justify-end" : "justify-start",
                        )}
                      >
                        {!isUser && (
                          <ChatAvatar
                            src={avatarSrc}
                            alt={siteName}
                            size="sm"
                            branded={brandedChatChrome}
                          />
                        )}
                        <div
                          className={cn(
                            "flex min-w-0 flex-col gap-2",
                            useDateGrid || useEventList
                              ? "w-full"
                              : "max-w-[85%]",
                          )}
                        >
                          {hasBody && (
                            <div
                              className={cn(
                                "min-w-0 px-3.5 py-2.5 text-sm leading-relaxed",
                                useDateGrid || useEventList
                                  ? "max-w-[85%]"
                                  : null,
                                isUser
                                  ? cn(
                                      "rounded-2xl rounded-br-md",
                                      chatChrome,
                                    )
                                  : "rounded-2xl rounded-bl-md border border-black/6 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                              )}
                            >
                              <p
                                className="whitespace-pre-wrap break-words"
                                style={{
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  color: "inherit",
                                }}
                              >
                                {renderMessageContent(message.content, isUser)}
                              </p>
                            </div>
                          )}
                          {!isUser &&
                            message.quickActions &&
                            message.quickActions.length > 0 && (
                              <div
                                className={
                                  useDateGrid
                                    ? "grid w-full grid-cols-2 gap-1.5"
                                    : useEventList
                                      ? "flex w-full flex-col gap-1.5"
                                      : "flex flex-col gap-1.5"
                                }
                              >
                                {message.quickActions.map(
                                  (action, actionIndex) => {
                                    const isDateChip = isChatGridAction(action);
                                    const isEventChip =
                                      isEventPickAction(action);
                                    return (
                                      <motion.button
                                        key={action.id}
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() =>
                                          void handleQuickAction(action)
                                        }
                                        initial={false}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                          delay: motionSafe
                                            ? 0.05 + actionIndex * 0.04
                                            : 0,
                                        }}
                                        whileHover={
                                          motionSafe
                                            ? { scale: 1.02 }
                                            : undefined
                                        }
                                        whileTap={
                                          motionSafe
                                            ? { scale: 0.98 }
                                            : undefined
                                        }
                                        className={cn(
                                          "group rounded-2xl border px-3 py-1.5 text-left transition-colors",
                                          (isDateChip && useDateGrid) ||
                                            (isEventChip && useEventList)
                                            ? "min-w-0 w-full"
                                            : "w-fit max-w-full",
                                          useDateGrid && !isDateChip
                                            ? "col-span-2"
                                            : null,
                                          action.id === "cancel_flow"
                                            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                            : action.id === "open-checkout"
                                              ? cn(
                                                  "border-transparent",
                                                  chatChrome,
                                                  chatChromeHover,
                                                )
                                              : brandedChatChrome
                                                ? "border-slate-300 bg-white text-slate-700 hover:bg-[color:var(--color-header,#1e293b)] hover:text-[color:var(--color-on-header,#fff)] hover:border-[color:var(--color-header,#1e293b)]"
                                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-800 hover:text-white hover:border-slate-800",
                                          "disabled:pointer-events-none disabled:opacity-50",
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "block text-xs font-semibold leading-snug",
                                            isEventChip || isDateChip
                                              ? "whitespace-normal"
                                              : "truncate leading-tight",
                                          )}
                                        >
                                          {action.label}
                                        </span>
                                        {action.hint ? (
                                          <span
                                            className={cn(
                                              "mt-0.5 block text-[10px] font-medium leading-tight text-slate-500 group-hover:text-white/80",
                                              isDateChip
                                                ? "whitespace-normal"
                                                : "truncate",
                                            )}
                                          >
                                            {action.hint}
                                          </span>
                                        ) : null}
                                      </motion.button>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          {!isUser && message.supportCta && (
                            <motion.div
                              initial={
                                motionSafe ? { opacity: 0, y: 6 } : false
                              }
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.15 }}
                            >
                              <Link
                                href={message.supportCta.href}
                                className={cn(
                                  "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition",
                                  chatChrome,
                                  chatChromeHover,
                                )}
                              >
                                {message.supportCta.label}
                                <ExternalLink
                                  className="h-3 w-3"
                                  strokeWidth={2.5}
                                />
                              </Link>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {isLoading && (
                  <motion.div
                    initial={motionSafe ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-end gap-2"
                  >
                    <ChatAvatar
                      src={avatarSrc}
                      alt={siteName}
                      size="sm"
                      branded={brandedChatChrome}
                    />
                    <div className="w-[min(100%,16rem)] space-y-1.5 rounded-2xl rounded-bl-md border border-black/6 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <Skeleton className="h-3.5 w-[85%] rounded-md" />
                      <Skeleton className="h-3.5 w-[62%] rounded-md" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-black/6 bg-white text-slate-900">
              <div className="flex items-center gap-2 p-3">
                <Input
                  ref={composerInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  disabled={supportFlow.step === "submitting"}
                  enterKeyHint="send"
                  autoComplete="off"
                  className="h-10 flex-1 rounded-full border-black/10 bg-white px-4 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:ring-offset-0"
                />
                <Button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={
                    !input.trim() ||
                    isLoading ||
                    supportFlow.step === "submitting"
                  }
                  size="icon"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full transition-transform",
                    input.trim()
                      ? cn(chatChrome, chatChromeHover, "hover:scale-105")
                      : "bg-black/5 text-black/35",
                  )}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isStripePaymentOpen && stripePaymentSession ? (
        <CheckoutStripePaymentModal
          open={isStripePaymentOpen}
          onOpenChange={(open) => {
            setIsStripePaymentOpen(open);
            if (open) return;
            checkoutInProgressRef.current = false;
            setStripePaymentSession(null);
            useCheckoutPaymentUiStore.getState().setAwaitingStripePayment(false);
          }}
          session={stripePaymentSession}
          onPaymentComplete={() => {
            resetChatAfterPaidBooking(stripePaymentSession?.bookingNumber);
          }}
        />
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes chat-bot-ping {
              0% { transform: scale(1); opacity: 0.55; }
              75%, 100% { transform: scale(1.55); opacity: 0; }
            }
            @keyframes chat-bot-pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.12); opacity: 0.15; }
            }
            @media (prefers-reduced-motion: reduce) {
              [data-chat-bot-motion] { animation: none !important; }
            }
          `,
        }}
      />
    </>
  );

  if (typeof document === "undefined") return chatOverlay;
  return createPortal(chatOverlay, document.body);
}
