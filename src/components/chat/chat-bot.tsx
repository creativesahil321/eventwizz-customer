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
import {
  isChatGridAction,
  isLongChatActionLabel,
  shouldStackChatQuickAction,
} from "@/lib/chat-quick-action-ui";
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
  extractAskedPlace,
  extractRequestedEventWindow,
  liveEventMatchesRequestedTheme,
  isBroadEventListIntent,
  isBookEventInCityTap,
  isSwitchLiveEventIntent,
  isNearMeEventsIntent,
  isBudgetEventsIntent,
  buildNearMeEventsReply,
  buildBudgetEventsReply,
  isEventWindowFollowUp,
  isLiveEventAvailabilityQuestion,
  isVendorEventQrSetupIntent,
  asWeakMatches,
  canonicalizeLiveEventHref,
  rewriteAssistantEventHrefs,
  preferredLiveEventFromConversation,
  normalizeLiveEventSlug,
  type LiveEventChatMatch,
} from "@/lib/chat-live-events";
import {
  buildNearMeSearchReply,
  fetchNearMeEventsForChat,
} from "@/lib/chat-near-me";
import type { LiveEvent, LocationData } from "@/types/theme.types";
import {
  extractBookingQuickActions,
  asksRoomDifference,
  asksToChangeOrPickRoom,
  buildBookingKickoffCopy,
  buildBookingRecoveryCopy,
  buildPinnedEventWindowReply,
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
  buildBookingVenueEnquiryDraft,
  buildChatPaymentClosedTurn,
  buildHostBookingTurn,
  chatChoicesHaveLineItems,
  isChatBookingVenueEnquiryIntent,
  isChatCheckoutHandoffIntent,
  isChatExistingCartBookingIntent,
  isGuestBookingConciergeText,
  isHostBookingUserText,
  parseChatBookingChoices,
  parseChatPayMode,
  parseChatPaymentGatewaySlug,
  toChatQuickActions,
  type ChatBookingChoices,
  type ChatBookingSummaryCard,
} from "@/lib/chat-booking-choices";
import { ChatBookingSummaryCardView } from "@/components/chat/chat-booking-summary";
import {
  bookingChoicesReadyForPay,
  chatCartConflictsWithEvent,
  chatTableDepositAvailable,
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
    import("@/app/(public)/vendor/checkout/_components/checkout-stripe-payment-modal"),
  { ssr: false },
);
import { saveAuthCallbackUrl } from "@/lib/auth/safe-callback-url";
import {
  isChatBotHiddenOnPath,
  isCustomerFacingChatSurface,
} from "@/lib/chat-page-context";
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
import { vendorDashboardService } from "@/services/vendor/dashboard";
import { vendorBookingsService } from "@/services/vendor/bookings/bookings.service";
import {
  isAdminDashboardStatsIntent,
  isAdminVenueDetailIntent,
  fetchAdminDashboardChatReply,
  fetchAdminVenueDetailChatReply,
} from "@/lib/chat-admin-live-stats";
import {
  type VendorQueryType,
  detectVendorOnDemandQueryType,
  fetchVendorOnDemandChatReply,
  isVendorFollowUpQuery,
  resolveVendorTopicFromHistory,
} from "@/lib/chat-vendor-on-demand";
import {
  detectCustomerOnDemandQueryType,
  fetchCustomerOnDemandChatReply,
  isCustomerEnquirySendIntent,
  isCustomerFollowUpQuery,
  isCustomerRaiseEnquiryIntent,
  isInactiveAccountAccessIntent,
  resolveCustomerTopicFromHistory,
  buildCustomerForbiddenReply,
  buildCustomerLoginReply,
} from "@/lib/chat-customer-on-demand";
import { usePermissionStore } from "@/store/permission.store";
import {
  hasPermissionForDomain,
  detectRestrictedResourceIntent,
  buildAccessRestrictedReply,
  RESOURCE_PERMISSION_RULES,
  type RestrictedResourceDomain,
} from "@/lib/chat-permissions-guard";

type QuickAction = {
  id: string;
  label: string;
  hint?: string;
  /** If set, tapping navigates here (e.g. Register / Log in) */
  href?: string;
  /** If set, tapping sends this as the next user message (in-chat choice). */
  sendText?: string;
};

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
  bookingSummary?: ChatBookingSummaryCard;
};

type SupportFlowStep =
  | "idle"
  | "category"
  | "review_draft"
  | "edit_draft"
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
  /** True when we drafted the enquiry from the booking — skip category. */
  prefilledDraft: boolean;
};

const INITIAL_FLOW: SupportFlowState = {
  step: "idle",
  category: null,
  phone: "",
  description: "",
  issueSummary: "",
  prefilledDraft: false,
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
      id: "start-near-me",
      label: "Near Me",
      sendText: "events near me",
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

function platformGuestGreetingActions(): QuickAction[] {
  return [
    {
      id: "register-vendor",
      label: "Register venue",
      href: "/auth/register",
    },
    {
      id: "book-demo",
      label: "Book a demo",
      sendText: "I'd like to book a demo or call",
    },
    {
      id: "platform-features",
      label: "Platform features",
      sendText: "What features does EventWizz offer for venues?",
    },
    {
      id: "vendor-onboarding",
      label: "Vendor onboarding",
      sendText: "How does venue onboarding work?",
    },
  ];
}

function platformVendorGreetingActions(
  userPermissions?: string[] | null,
): QuickAction[] {
  const actions: QuickAction[] = [
    {
      id: "vendor-dashboard",
      label: "Dashboard",
      href: "/vendor/dashboard",
    },
    {
      id: "vendor-events",
      label: "Events",
      href: "/vendor/events",
    },
    {
      id: "vendor-bookings",
      label: "Bookings",
      href: "/vendor/booking-history",
    },
    {
      id: "vendor-sites-essentials",
      label: "Sites Essentials",
      href: "/vendor/sites-essentials",
    },
  ];

  if (
    !userPermissions ||
    !Array.isArray(userPermissions) ||
    userPermissions.length >= 80
  ) {
    return actions;
  }

  return actions.filter((act) => {
    if (act.id === "vendor-dashboard") {
      return hasPermissionForDomain("dashboard", userPermissions);
    }
    if (act.id === "vendor-events") {
      return hasPermissionForDomain("events", userPermissions);
    }
    if (act.id === "vendor-bookings") {
      return userPermissions.includes("read-booking");
    }
    if (act.id === "vendor-sites-essentials") {
      return hasPermissionForDomain("site_essentials", userPermissions);
    }
    return true;
  });
}

function platformAdminGreetingActions(
  userPermissions?: string[] | null,
): QuickAction[] {
  const actions: QuickAction[] = [
    {
      id: "admin-venues",
      label: "All Venues",
      href: "/admin/vendors",
    },
    {
      id: "admin-commissions",
      label: "Commission Overview",
      href: "/admin/commission-overview",
    },
    {
      id: "admin-disputes",
      label: "Dispute Resolution",
      href: "/admin/disputes",
    },
    {
      id: "admin-sites-essentials",
      label: "Site Essentials",
      href: "/admin/sites-essentials",
    },
  ];

  if (
    !userPermissions ||
    !Array.isArray(userPermissions) ||
    userPermissions.length >= 80
  ) {
    return actions;
  }

  return actions.filter((act) => {
    if (act.id === "admin-venues") {
      return hasPermissionForDomain("vendors", userPermissions);
    }
    if (act.id === "admin-commissions") {
      return hasPermissionForDomain("commissions", userPermissions);
    }
    if (act.id === "admin-disputes") {
      return hasPermissionForDomain("disputes", userPermissions);
    }
    if (act.id === "admin-sites-essentials") {
      return hasPermissionForDomain("site_essentials", userPermissions);
    }
    return true;
  });
}

function getInitialChatGreeting(options: {
  isVendorStorefront: boolean;
  accountType?: string | null;
  userName?: string | null;
  userPermissions?: string[] | null;
}): { content: string; quickActions?: QuickAction[] } {
  const { isVendorStorefront, accountType, userName, userPermissions } =
    options;
  const nameBit = userName ? `, ${userName}` : "";

  if (isVendorStorefront) {
    if (accountType === "vendor") {
      return {
        content: `Hello${nameBit} — how can I help you with your venue today?`,
      };
    }
    return {
      content: `Hello${nameBit} — how can I help you today? Book an event, ask what’s on, or type any other question.`,
      quickActions: vendorGreetingActions({
        showBookings: accountType === "customer",
      }),
    };
  }

  // Platform / Admin site (eventwizz.com / eventwizz.vercel.app)
  if (accountType === "vendor") {
    const actions = platformVendorGreetingActions(userPermissions);
    return {
      content: `Hello${nameBit} — how can I help you with your venue today? Manage your dashboard, events, bookings, locations, or onboarding.`,
      quickActions: actions.length > 0 ? actions : undefined,
    };
  }
  if (accountType === "admin") {
    const actions = platformAdminGreetingActions(userPermissions);
    return {
      content: `Hello${nameBit} — how can I help you with platform administration today? Manage venues, commissions, disputes, or system settings.`,
      quickActions: actions.length > 0 ? actions : undefined,
    };
  }

  // Guest on platform site (venue owner / organiser / visitor)
  return {
    content: `Hello — welcome to EventWizz, the event management platform for venues. How can I help you today? Ask about vendor registration, onboarding, platform features, or booking a demo.`,
    quickActions: platformGuestGreetingActions(),
  };
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
  return (
    SUPPORT_INTENT_RE.test(t) ||
    isCustomerRaiseEnquiryIntent(t) ||
    isCustomerEnquirySendIntent(t)
  );
}

function isBareSupportAsk(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[?.!]+$/g, "");
  return /^(i have (a |an )?(issue|problem|query|enquiry)|i need (help|support)|i'?ve got (a |an )?(issue|problem|query|enquiry)|help)$/i.test(
    t,
  );
}

function isSubstantialSupportDescription(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (isBareSupportAsk(t)) return false;
  if (isCustomerEnquirySendIntent(t) && t.length < 40) return false;
  if (
    /\b(make|made|write|create|prepare).{0,28}\b(draft|enquiry|inquiry|ticket)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  return t.length >= 24 || /\bmy (issue|problem|query|enquiry) is\b/i.test(t);
}

function extractEnquiryDraftFromAssistant(content: string): string | null {
  const dashed = content.match(/---\s*([\s\S]*?)\s*---/);
  if (dashed?.[1] && dashed[1].trim().length >= 20) {
    return dashed[1].trim();
  }
  const desc = content.match(
    /Description:\s*([\s\S]+?)(?:\n---|\n\nYou can copy|$)/i,
  );
  if (desc?.[1]?.trim().length >= 20) {
    const subject = content.match(/Subject:\s*([^\n]+)/i)?.[1]?.trim();
    const body = desc[1].trim();
    return subject ? `Subject: ${subject}\n\n${body}` : body;
  }
  if (/here'?s a draft/i.test(content) && content.length > 120) {
    const clipped = content
      .replace(/^[\s\S]*?(?=Subject:|Hello[, ])/i, "")
      .replace(/\n+You can copy[\s\S]*$/i, "")
      .trim();
    return clipped.length >= 20 ? clipped : null;
  }
  return null;
}

function isAuthIntent(text: string): boolean {
  if (isInactiveAccountAccessIntent(text)) return false;
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

/** Render markdown inline formatting (bold, inline code, links, choices) */
function renderInlineSpans(
  content: string,
  isUser: boolean,
  keyPrefix = "span",
): ReactNode[] {
  const linkClass = isUser
    ? "underline underline-offset-2 font-medium opacity-95"
    : "underline underline-offset-2 font-medium text-slate-700 hover:text-slate-950";
  const wrapLinkClass = (label?: string) =>
    cn(
      linkClass,
      "max-w-full [overflow-wrap:break-word] [word-break:normal] [box-decoration-break:clone]",
      isLongChatActionLabel(label) ? "inline-block align-top" : "inline",
    );
  const pillLinkClass =
    "inline-flex max-w-full min-w-0 flex-wrap items-center gap-1 my-0.5 mr-1.5 rounded-md border border-slate-200/90 bg-slate-50/90 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-white hover:border-slate-300 hover:text-slate-950 transition-all cursor-pointer";
  const boldClass = isUser
    ? "font-bold opacity-100"
    : "font-bold text-slate-950";

  const pattern =
    /(\*\*([^*]+)\*\*)|(`([^`]+)`)|\[([^\]]+)\]\((\/?chat(?::[^)]*)?|https?:\/\/[^)\s]+|\/[^)\s]+)\)|(\/(?:vendor|customer|admin|auth|contact|welcome|on-boarding|preview)[^\s]*)/g;

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
        <strong key={`${keyPrefix}-bold-${key++}`} className={boldClass}>
          {match[2]}
        </strong>,
      );
    } else if (match[3] && match[4] != null) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${key++}`}
          className={
            isUser
              ? "rounded bg-black/20 px-1 py-0.5 font-mono text-[11px] font-semibold text-inherit"
              : "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-800 border border-slate-200/80"
          }
        >
          {match[4]}
        </code>,
      );
    } else {
      const label = match[5];
      const markdownHref = match[6];
      const bareHref = match[7];
      const parsed = markdownHref
        ? parseMarkdownLinkTarget(markdownHref)
        : bareHref
          ? parseMarkdownLinkTarget(bareHref)
          : null;

      const isPill =
        !isUser &&
        Boolean(
          label &&
          /^(open|manage|view|go to|take me to|check|book)\b/i.test(
            label.trim(),
          ),
        );

      if (parsed?.kind === "chat") {
        nodes.push(
          <span key={`${keyPrefix}-choice-${key++}`} className={boldClass}>
            {label || parsed.sendText}
          </span>,
        );
      } else if (parsed?.kind === "href" && parsed.href.startsWith("/")) {
        nodes.push(
          isPill ? (
            <Link
              key={`${keyPrefix}-link-${key++}`}
              href={parsed.href}
              className={pillLinkClass}
            >
              <span className="min-w-0 [overflow-wrap:break-word] [word-break:normal]">
                {label || parsed.href}
              </span>
              <ExternalLink className="h-2.5 w-2.5 shrink-0 text-slate-400" />
            </Link>
          ) : (
            <Link
              key={`${keyPrefix}-link-${key++}`}
              href={parsed.href}
              className={wrapLinkClass(label)}
            >
              {label || parsed.href}
            </Link>
          ),
        );
      } else if (parsed?.kind === "href") {
        nodes.push(
          isPill ? (
            <a
              key={`${keyPrefix}-link-${key++}`}
              href={parsed.href}
              target="_blank"
              rel="noopener noreferrer"
              className={pillLinkClass}
            >
              <span className="min-w-0 [overflow-wrap:break-word] [word-break:normal]">
                {label || parsed.href}
              </span>
              <ExternalLink className="h-2.5 w-2.5 shrink-0 text-slate-400" />
            </a>
          ) : (
            <a
              key={`${keyPrefix}-link-${key++}`}
              href={parsed.href}
              target="_blank"
              rel="noopener noreferrer"
              className={wrapLinkClass(label)}
            >
              {label || parsed.href}
            </a>
          ),
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

/** Render markdown links, bold (**text**), safe relative paths, and responsive tables. */
function renderMessageContent(content: string, isUser: boolean): ReactNode[] {
  if (!content.includes("|")) {
    return renderInlineSpans(content, isUser, "msg");
  }

  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let currentTextLines: string[] = [];
  let tableLines: string[] = [];
  let key = 0;

  function flushText() {
    if (currentTextLines.length > 0) {
      const text = currentTextLines.join("\n");
      nodes.push(...renderInlineSpans(text, isUser, `t-${key++}`));
      currentTextLines = [];
    }
  }

  function flushTable() {
    if (tableLines.length >= 2) {
      const headerLine = tableLines[0];
      const bodyLines = tableLines.slice(2);
      const parseCells = (line: string) =>
        line
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());

      const headers = parseCells(headerLine);
      const rows = bodyLines.map(parseCells);

      nodes.push(
        <div
          key={`tbl-${key++}`}
          className="my-2.5 max-w-full overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-800">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 font-semibold"
                  >
                    {renderInlineSpans(h, isUser, `th-${key}-${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-2 text-slate-700 break-words"
                    >
                      {renderInlineSpans(
                        cell,
                        isUser,
                        `td-${key}-${rIdx}-${cIdx}`,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      tableLines = [];
    } else if (tableLines.length > 0) {
      currentTextLines.push(...tableLines);
      tableLines = [];
      flushText();
    }
  }

  for (const line of lines) {
    const isTableRow = /^\s*\|.+\|\s*$/.test(line);
    if (isTableRow) {
      flushText();
      tableLines.push(line.trim());
    } else {
      if (tableLines.length > 0) {
        flushTable();
      }
      currentTextLines.push(line);
    }
  }

  if (tableLines.length > 0) {
    flushTable();
  }
  flushText();

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
        branded ? "bg-[color:var(--color-header,#1e293b)]" : "bg-slate-800",
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
            branded ? "text-[color:var(--color-on-header,#fff)]" : "text-white",
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

export function ChatBot() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { data: session, status: sessionStatus } = useSession();
  const authUser = useAuthStore((s) => s.user);
  const authActiveRole = useAuthStore((s) => s.active_role);
  const vendorLocationId = useAuthStore((s) => s.vendor_location_id);
  const storePermissions = usePermissionStore((s) => s.permissions);
  const sessionPermissions = (session?.user as any)?.permissions;

  const effectivePermissions = useMemo((): string[] => {
    if (Array.isArray(storePermissions) && storePermissions.length > 0) {
      return storePermissions;
    }
    if (Array.isArray(sessionPermissions) && sessionPermissions.length > 0) {
      return sessionPermissions;
    }
    return storePermissions || [];
  }, [storePermissions, sessionPermissions]);

  const activeRole = useMemo(() => {
    return (
      (session?.user as any)?.active_role ||
      authActiveRole ||
      (authUser as any)?.active_role ||
      null
    );
  }, [session?.user, authActiveRole, authUser]);

  const isStaffUser = useMemo(() => {
    if (activeRole && activeRole !== "admin" && activeRole !== "vendor") {
      return true;
    }
    if (effectivePermissions.length > 0 && effectivePermissions.length < 80) {
      return true;
    }
    return false;
  }, [activeRole, effectivePermissions]);

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
  const effectiveRole = useMemo(() => {
    const fromSession =
      (session?.user as any)?.account_type ||
      (session?.user as any)?.active_role ||
      (session?.user as any)?.user_type ||
      (authUser as any)?.account_type ||
      (authUser as any)?.active_role;
    if (
      fromSession === "admin" ||
      fromSession === "vendor" ||
      fromSession === "customer"
    ) {
      return fromSession as "admin" | "vendor" | "customer";
    }
    // Path-based fallback for protected portals
    if (pathname?.startsWith("/admin")) return "admin";
    if (pathname?.startsWith("/vendor")) return "vendor";
    if (pathname?.startsWith("/customer")) return "customer";
    return null;
  }, [session?.user, authUser, pathname]);

  const accountType = effectiveRole;
  const isAuthenticated =
    sessionStatus === "authenticated" || Boolean(effectiveRole);
  const isLoggedInCustomer = accountType === "customer";
  const isLoggedInVendor = accountType === "vendor";
  const isLoggedInAdmin = accountType === "admin";
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
  const { refetch: refetchCustomerCart } = useGetCartData(
    isVendorStorefront && isLoggedInCustomer,
  );

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

  const [messages, setMessages] = useState<Message[]>(() => {
    const greeting = getInitialChatGreeting({
      isVendorStorefront,
      accountType,
      userName,
      userPermissions: usePermissionStore.getState().permissions,
    });
    return [
      {
        role: "assistant",
        content: greeting.content,
        quickActions: greeting.quickActions,
      },
    ];
  });
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
  const chatPayModeRef = useRef<"full" | "deposit">("full");
  const chatDepositAvailableRef = useRef<boolean | null>(null);
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

  // Personalise opening greeting once session, tenant role, or RBAC permissions resolve
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.role !== "assistant") return prev;

      const greeting = getInitialChatGreeting({
        isVendorStorefront,
        accountType,
        userName,
        userPermissions: effectivePermissions,
      });

      if (
        prev[0].content === greeting.content &&
        JSON.stringify(prev[0].quickActions) ===
          JSON.stringify(greeting.quickActions)
      ) {
        return prev;
      }

      return [
        {
          role: "assistant",
          content: greeting.content,
          quickActions: greeting.quickActions,
        },
      ];
    });
  }, [
    sessionStatus,
    accountType,
    userName,
    isVendorStorefront,
    effectivePermissions,
  ]);

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
    chatPayModeRef.current = "full";
    chatDepositAvailableRef.current = null;
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

  function resumeBookingAfterPaymentClosed() {
    if (paymentCompletedRef.current) return;
    const brief = eventBookingBriefRef.current ?? pageBookingBrief;
    setIsOpen(true);
    setIsMinimized(false);
    setMessages((prev) => {
      if (!brief) {
        return [
          ...clearQuickActions(prev),
          {
            role: "assistant",
            content:
              "Payment is closed — nothing was charged. Tell me what you’d like to change, or pay when you’re ready.",
          },
        ];
      }
      const choices = parseChatBookingChoices(
        prev.map(({ role, content }) => ({ role, content })),
        brief,
      );
      const turn = buildChatPaymentClosedTurn({
        brief,
        choices,
        userName,
        depositAvailable:
          chatDepositAvailableRef.current === true ||
          choices.slots.some((slot) => slot.seating !== "tickets"),
      });
      const hostActions = publicBookingQuickActions({
        content: turn.content,
        brief,
        conversation: prev,
        hostActions: turn.actions,
      });
      return [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content: turn.content,
          quickActions: hostActions.length > 0 ? hostActions : undefined,
          bookingSummary: turn.summary,
        },
      ];
    });
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
    const priorIssue = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "user" &&
          isSubstantialSupportDescription(message.content),
      )?.content;
    const seed = isSubstantialSupportDescription(issueText)
      ? issueText.trim()
      : priorIssue?.trim();
    if (seed) {
      showEnquiryDraftFromIssue(seed);
      return;
    }
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

  function showEnquiryDraftFromIssue(issue: string) {
    setSupportFlow({
      ...INITIAL_FLOW,
      step: "review_draft",
      category: "general_support",
      description: issue,
      issueSummary: issue.slice(0, 160),
      prefilledDraft: true,
    });
    const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: `I’ve drafted this enquiry${nameBit}. Check it — send this, or type a change and I’ll update it.\n\n${issue}`,
        quickActions: [
          { id: "confirm_draft", label: "Looks good" },
          { id: "edit_draft", label: "I’ll edit this" },
          { id: "cancel_flow", label: "Cancel" },
        ],
      },
    ]);
  }

  function startBookingVenueEnquiry(
    brief: ChatEventBookingBrief,
    choices: ChatBookingChoices,
    issueText: string,
  ) {
    const draft = buildBookingVenueEnquiryDraft({
      brief,
      choices,
      userName,
    });
    const slot = choices.slots[choices.slots.length - 1];
    const guests = slot?.guestCount ?? choices.guestCount;
    const when = slot
      ? [slot.date.label, slot.roomName || slot.date.roomName]
          .filter(Boolean)
          .join(" · ")
      : "";
    const issueSummary =
      guests != null
        ? `Group of ${guests} for ${brief.title}${when ? ` — ${when}` : ""}`
        : issueText;
    const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
    setSupportFlow({
      ...INITIAL_FLOW,
      step: "review_draft",
      category: "general_support",
      description: draft,
      issueSummary,
      prefilledDraft: true,
    });
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: `I’ve drafted an **Event & booking** enquiry for the venue${nameBit}. Check it — send this, or type a change and I’ll update it.\n\n${draft}`,
        quickActions: [
          { id: "confirm_draft", label: "Looks good" },
          { id: "edit_draft", label: "I’ll edit this" },
          { id: "cancel_flow", label: "Cancel" },
        ],
      },
    ]);
  }

  function showEnquiryDraft(draft: string) {
    setSupportFlow((prev) => ({
      ...prev,
      step: "review_draft",
      description: draft,
      category: prev.category ?? "general_support",
      prefilledDraft: true,
    }));
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: `Updated. Does this look right to send to the venue?\n\n${draft}`,
        quickActions: [
          { id: "confirm_draft", label: "Looks good" },
          { id: "edit_draft", label: "I’ll edit this" },
          { id: "cancel_flow", label: "Cancel" },
        ],
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

  function askForPhone(category: SupportCategory, prefilled?: boolean) {
    const drafted = prefilled === true || supportFlow.prefilledDraft;
    setSupportFlow((prev) => ({
      ...prev,
      step: "phone",
      category,
      phone: "",
      prefilledDraft: drafted || prev.prefilledDraft,
    }));

    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content: drafted
          ? "Thank you. What’s the best telephone number to reach you on? I’ll send this enquiry to the venue as soon as I have it."
          : "Thank you. What’s the best telephone number to reach you on?",
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
        chatDepositAvailableRef.current = chatTableDepositAvailable(
          result.event,
          choices,
        );
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
    chatPayModeRef.current = payMode;

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
              payMode === "deposit"
                ? "Table deposit is available for this booking. How would you like to pay the deposit?"
                : result.message.trim() ||
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

    if (action.id === "confirm_draft") {
      setMessages((prev) => [...prev, { role: "user", content: action.label }]);
      askForPhone(supportFlow.category ?? "general_support");
      return;
    }

    if (action.id === "edit_draft") {
      setMessages((prev) => [...prev, { role: "user", content: action.label }]);
      setSupportFlow((prev) => ({ ...prev, step: "edit_draft" }));
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content:
            "Type the enquiry you’d like us to send — I’ll replace the draft with your words.",
          quickActions: [{ id: "cancel_flow", label: "Cancel" }],
        },
      ]);
      keepComposerFocusRef.current = true;
      focusComposer();
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
      if (isSubstantialSupportDescription(userText)) {
        showEnquiryDraft(userText.trim());
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

    if (supportFlow.step === "review_draft") {
      if (/\b(looks good|yes|ok|okay|sure|send|confirm|continue)\b/i.test(userText)) {
        askForPhone(supportFlow.category ?? "general_support");
        return;
      }
      if (/\b(edit|change|update|rewrite)\b/i.test(userText) && userText.trim().length < 40) {
        setSupportFlow((prev) => ({ ...prev, step: "edit_draft" }));
        setMessages((prev) => [
          ...clearQuickActions(prev),
          {
            role: "assistant",
            content:
              "Type the enquiry you’d like us to send — I’ll replace the draft with your words.",
            quickActions: [{ id: "cancel_flow", label: "Cancel" }],
          },
        ]);
        return;
      }
      if (userText.trim().length >= 8) {
        showEnquiryDraft(userText.trim());
        return;
      }
      setMessages((prev) => [
        ...clearQuickActions(prev),
        {
          role: "assistant",
          content:
            "Tap **Looks good** to send this, **I’ll edit this**, or type the message you want the venue to receive.",
          quickActions: [
            { id: "confirm_draft", label: "Looks good" },
            { id: "edit_draft", label: "I’ll edit this" },
            { id: "cancel_flow", label: "Cancel" },
          ],
        },
      ]);
      return;
    }

    if (supportFlow.step === "edit_draft") {
      if (userText.trim().length < 8) {
        setMessages((prev) => [
          ...clearQuickActions(prev),
          {
            role: "assistant",
            content:
              "Please type the full enquiry so the venue knows what you need. Or tap Cancel.",
            quickActions: [{ id: "cancel_flow", label: "Cancel" }],
          },
        ]);
        return;
      }
      showEnquiryDraft(userText.trim());
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
      const phone = userText.trim();
      if (supportFlow.prefilledDraft && supportFlow.description.trim().length >= 8) {
        await submitGuidedSupport({
          ...supportFlow,
          phone,
          category: supportFlow.category ?? "general_support",
        });
        return;
      }
      askForDescription(phone);
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

    // ── RBAC Pre-Check for authenticated staff / restricted users ──
    if (isAuthenticated && isStaffUser && effectivePermissions.length > 0) {
      const restrictedIntent = detectRestrictedResourceIntent(userText);
      if (
        restrictedIntent &&
        !hasPermissionForDomain(restrictedIntent.domain, effectivePermissions)
      ) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: buildAccessRestrictedReply(restrictedIntent, { userName }),
          },
        ]);
        return;
      }
    }

    // ── Admin on-demand live data queries ──
    if (isLoggedInAdmin && !isVendorStorefront) {
      const isAdminStats = isAdminDashboardStatsIntent(userText);
      const isAdminVenueQ = isAdminVenueDetailIntent(userText);

      if (isAdminStats || isAdminVenueQ) {
        // RBAC enforcement for admin staff
        if (isStaffUser && effectivePermissions.length > 0) {
          if (
            isAdminStats &&
            !hasPermissionForDomain("dashboard", effectivePermissions)
          ) {
            const rule = RESOURCE_PERMISSION_RULES.find(
              (r) => r.domain === "dashboard",
            )!;
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: buildAccessRestrictedReply(rule, { userName }),
              },
            ]);
            return;
          }
          if (
            isAdminVenueQ &&
            !hasPermissionForDomain("vendors", effectivePermissions)
          ) {
            const rule = RESOURCE_PERMISSION_RULES.find(
              (r) => r.domain === "vendors",
            )!;
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: buildAccessRestrictedReply(rule, { userName }),
              },
            ]);
            return;
          }
        }

        setIsLoading(true);
        try {
          const result = isAdminVenueQ
            ? await fetchAdminVenueDetailChatReply({ userText, userName })
            : await fetchAdminDashboardChatReply({ userText, userName });
          if (result?.reply) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: result.reply },
            ]);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Admin on-demand chat failed:", error);
        }
        setIsLoading(false);
      }
    }

    if (isLoggedInVendor && isVendorEventQrSetupIntent(userText)) {
      const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
      const named = userText
        .replace(/[–—]/g, "-")
        .match(/\bfor\s+(?:the\s+)?(.+?)\s*$/i)?.[1]
        ?.replace(/\s+event$/i, "")
        .trim();
      const looksLikeEventName =
        named &&
        named.length >= 3 &&
        named.length <= 80 &&
        !/\b(qr|invoice|door)\b/i.test(named);
      const eventBit = looksLikeEventName ? `**${named}**` : "the event";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I can’t flip that switch from chat${nameBit} — QR is turned on in the event form, on the booking invoice.\n\n1. Open **Events**.\n2. Open ${eventBit}.\n3. Go to the **Finalise** tab.\n4. Under **Door entry QR**, choose **Yes — show the door-entry QR**.\n5. Save / finalise the event.\n\nGuests then get a unique QR on their invoice. Staff scan it from **Door Scan** — that screen does not turn QR on.\n\n[Open Events](/vendor/events) · [Open Door Scan](/vendor/door-scan)`,
          quickActions: [
            {
              id: "open-events",
              label: "Open Events",
              href: "/vendor/events",
            },
            {
              id: "open-door-scan",
              label: "Open Door Scan",
              href: "/vendor/door-scan",
            },
          ],
        },
      ]);
      return;
    }

    // ── Vendor on-demand live data queries ──
    if (isLoggedInVendor && !isVendorStorefront) {
      let vendorQueryType = detectVendorOnDemandQueryType(userText);
      let effectiveOnDemandText = userText;

      // Conversational follow-ups (e.g. "show me all", "why you only give 5 ?", "show more")
      if (!vendorQueryType && isVendorFollowUpQuery(userText)) {
        const resolvedTopic = resolveVendorTopicFromHistory(messages);
        if (resolvedTopic && resolvedTopic !== "booking_list") {
          vendorQueryType = resolvedTopic;
          effectiveOnDemandText = `${resolvedTopic} ${userText}`;
        }
      }

      if (vendorQueryType) {
        // RBAC enforcement for vendor staff
        if (isStaffUser && effectivePermissions.length > 0) {
          const DOMAIN_MAP: Record<VendorQueryType, RestrictedResourceDomain> =
            {
              booking_lookup: "events",
              payment_lookup: "transactions",
              customers: "customers",
              menu_choices: "menus",
              coupons: "coupons",
              locations: "locations",
              staff_roles: "staff",
              transactions: "transactions",
              rooms: "events",
            };
          const targetDomain = DOMAIN_MAP[vendorQueryType];
          const hasAccess =
            vendorQueryType === "booking_lookup"
              ? effectivePermissions.includes("read-booking") ||
                hasPermissionForDomain("events", effectivePermissions)
              : targetDomain
                ? hasPermissionForDomain(targetDomain, effectivePermissions)
                : true;

          if (!hasAccess) {
            const rule =
              RESOURCE_PERMISSION_RULES.find(
                (r) => r.domain === targetDomain,
              ) ||
              RESOURCE_PERMISSION_RULES.find((r) => r.domain === "events")!;
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: buildAccessRestrictedReply(rule, { userName }),
              },
            ]);
            return;
          }
        }

        setIsLoading(true);
        try {
          const result = await fetchVendorOnDemandChatReply({
            userText: effectiveOnDemandText,
            userName,
            queryType: vendorQueryType,
          });
          if (result?.reply) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: result.reply },
            ]);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Vendor on-demand chat failed:", error);
        }
        setIsLoading(false);
      }
    }

    if (!isLoggedInVendor) {
      let customerQueryType = detectCustomerOnDemandQueryType(userText);
      if (
        !customerQueryType &&
        isLoggedInCustomer &&
        isCustomerFollowUpQuery(userText)
      ) {
        customerQueryType = resolveCustomerTopicFromHistory(messages, userText);
      }
      if (isLoggedInCustomer) {
        const pendingAction = resolveCustomerTopicFromHistory(
          messages,
          userText,
        );
        if (
          pendingAction &&
          (pendingAction === "change_request" ||
            pendingAction === "cancel_request" ||
            pendingAction === "refund_request")
        ) {
          customerQueryType = pendingAction;
        }
      }
      const isCatalogueBrowse =
        isBroadEventListIntent(userText) ||
        isLiveEventBookingIntent(userText) ||
        isLiveEventAvailabilityQuestion(userText);
      if (
        customerQueryType === "my_bookings" &&
        isCatalogueBrowse &&
        !/\bmy\b/i.test(userText)
      ) {
        customerQueryType = null;
      }
      if (customerQueryType === "forbidden") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: buildCustomerForbiddenReply(userName),
          },
        ]);
        return;
      }
      if (customerQueryType && !isLoggedInCustomer) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: buildCustomerLoginReply(userName),
          },
        ]);
        return;
      }
      const skipForOpenBooking =
        Boolean(eventBookingBriefRef.current) &&
        customerQueryType === "change_request" &&
        !/\b(my\s+booking|reschedule|my\s+event|VE-|EV-|BK-)\b/i.test(userText);
      if (customerQueryType && isLoggedInCustomer && !skipForOpenBooking) {
        setIsLoading(true);
        try {
          const result = await fetchCustomerOnDemandChatReply({
            userText,
            userName,
            queryType: customerQueryType,
            currencySymbol,
          });
          if (result?.reply) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: result.reply },
            ]);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Customer on-demand chat failed:", error);
        }
        setIsLoading(false);
      }
    }

    const isPlatformEventBookingQuestion =
      !isVendorStorefront &&
      !isLoggedInVendor &&
      !isLoggedInAdmin &&
      (isLiveEventBookingIntent(userText) ||
        isBroadEventListIntent(userText) ||
        isLiveEventAvailabilityQuestion(userText));

    if (isPlatformEventBookingQuestion) {
      const nameBit = userName ? `, ${userName}` : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Hello${nameBit} — you are currently on the **EventWizz platform website** (${siteName || "EventWizz"}), which is an event management software platform for venue owners, event organisers, and administrators.

**Public events cannot be booked directly on this platform website.** There are no events or tickets for sale here.

- To **book an event or purchase tickets**, please visit the specific venue’s own website powered by EventWizz.
- If you are a **venue owner or event organiser** looking to host and sell events online, you can [Register as a Vendor](/auth/register) or [Book a demo](#book-a-call) to get started!`,
          quickActions: [
            {
              id: "register-vendor",
              label: "Register as a vendor",
              href: "/auth/register",
            },
            {
              id: "book-demo",
              label: "Book a demo",
              sendText: "I'd like to book a demo or call",
            },
            {
              id: "platform-features",
              label: "Platform features",
              sendText: "What features does EventWizz offer for venues?",
            },
          ],
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

    // Logged-in customer: group/venue ask from a booking skips category and drafts the ticket
    if (
      isVendorStorefront &&
      isLoggedInCustomer &&
      isChatBookingVenueEnquiryIntent(userText)
    ) {
      const brief = eventBookingBriefRef.current ?? pageBookingBrief;
      if (brief) {
        const conversation = [...messages, userMessage];
        const choices = parseChatBookingChoices(conversation, brief);
        if (choices.slots.length > 0) {
          startBookingVenueEnquiry(brief, choices, userText);
          return;
        }
      }
    }

    // Logged-in customer on vendor site: send an already-drafted enquiry, or start the wizard
    if (isVendorStorefront && isLoggedInCustomer) {
      if (isCustomerEnquirySendIntent(userText)) {
        const lastAssistant = [...messages]
          .reverse()
          .find((message) => message.role === "assistant")?.content;
        const drafted =
          (lastAssistant
            ? extractEnquiryDraftFromAssistant(lastAssistant)
            : null) ||
          [...messages]
            .reverse()
            .find(
              (message) =>
                message.role === "user" &&
                isSubstantialSupportDescription(message.content),
            )?.content;
        if (drafted) {
          setSupportFlow({
            ...INITIAL_FLOW,
            step: "review_draft",
            category: "general_support",
            description: drafted,
            issueSummary: drafted.slice(0, 160),
            prefilledDraft: true,
          });
          askForPhone("general_support", true);
          return;
        }
      }
      if (isSupportIntent(userText)) {
        startGuidedSupport(userText);
        return;
      }
    }

    // Guest on vendor site: offer Register / Log in buttons
    if (
      isVendorStorefront &&
      isInactiveAccountAccessIntent(userText)
    ) {
      const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
      const contactLines = [
        contactPhone ? `Phone: **${contactPhone}**` : "",
        contactEmail ? `Email: **${contactEmail}**` : "",
      ].filter(Boolean);
      const contactBit =
        contactLines.length > 0 ? `\n\n${contactLines.join("\n")}` : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `That login message means this venue has marked the account as **inactive**${nameBit}. I can’t turn it back on from chat, and creating a new account won’t fix it.\n\nPlease contact the venue and ask them to check the account and reactivate it if that’s right.${contactBit}`,
          quickActions: [
            {
              id: "contact-venue",
              label: "Contact the venue",
              href: "/contact",
            },
          ],
          supportCta: isLoggedInCustomer
            ? { href: "/customer/support/new", label: "Open New enquiry" }
            : { href: "/contact", label: "Contact the venue" },
        },
      ]);
      return;
    }

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
      !isSwitchLiveEventIntent(userText) &&
      !/\breschedule\b/i.test(userText) &&
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

    if (isVendorStorefront && isSwitchLiveEventIntent(userText)) {
      eventBookingBriefRef.current = null;
    }

    if (
      isVendorStorefront &&
      !isLoggedInVendor &&
      isNearMeEventsIntent(userText)
    ) {
      setIsLoading(true);
      let reply = buildNearMeEventsReply({
        allLiveEvents: liveEvents,
        siteName,
        userName,
        reason: "error",
        detail:
          "I couldn’t load events near you just now. Please try again, or tell me a city.",
      });
      try {
        const nearMe = await fetchNearMeEventsForChat(tenantHost);
        if (nearMe.status === "ok") {
          reply = buildNearMeSearchReply({
            events: nearMe.events,
            radiusKm: nearMe.radiusKm,
            userName,
            siteName,
            allLiveEvents: liveEvents,
          });
        } else if (nearMe.status === "empty") {
          reply = buildNearMeEventsReply({
            allLiveEvents: liveEvents,
            siteName,
            userName,
            reason: "empty",
            radiusKm: nearMe.radiusKm,
          });
        } else if (nearMe.status === "no_location") {
          reply = buildNearMeEventsReply({
            allLiveEvents: liveEvents,
            siteName,
            userName,
            reason: "no_location",
            detail: nearMe.message,
          });
        } else {
          reply = buildNearMeEventsReply({
            allLiveEvents: liveEvents,
            siteName,
            userName,
            reason: "error",
            detail: nearMe.message,
          });
        }
      } finally {
        setIsLoading(false);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", ...inChatChoiceMessage(reply.content) },
      ]);
      return;
    }

    if (
      isVendorStorefront &&
      !isLoggedInVendor &&
      liveEvents.length > 0 &&
      isBudgetEventsIntent(userText)
    ) {
      const budget = buildBudgetEventsReply({
        allLiveEvents: liveEvents,
        siteName,
        userName,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", ...inChatChoiceMessage(budget.content) },
      ]);
      return;
    }

    const catalogueBrief = eventBookingBriefRef.current ?? pageBookingBrief;
    if (
      isVendorStorefront &&
      !isLoggedInVendor &&
      liveEvents.length > 0 &&
      !parseBookEventInCitySendText(userText) &&
      !isBookEventInCityTap(userText) &&
      !(catalogueBrief && isEventWindowFollowUp(userText)) &&
      (isBroadEventListIntent(userText) ||
        isSwitchLiveEventIntent(userText) ||
        isLiveEventAvailabilityQuestion(userText) ||
        (isBrochureQuestion(userText) && !catalogueBrief))
    ) {
      const matched = matchLiveEvents(userText, liveEvents);
      const namedType =
        Boolean(extractLiveEventTheme(userText)) ||
        Boolean(extractAskedPlace(userText, liveEvents)) ||
        Boolean(extractRequestedEventWindow(userText)) ||
        isLiveEventAvailabilityQuestion(userText);
      const matches =
        matched.length > 0
          ? matched
          : namedType
            ? []
            : asWeakMatches(liveEvents);
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
      const uniqueCatalogEvent =
        matches.length === 1 ||
        (matches.length > 0 &&
          !needsLiveEventLocationChoice(userText, matches, liveEvents) &&
          new Set(
            matches.map(
              (item) => `${item.event.location_slug}/${item.event.slug}`,
            ),
          ).size === 1);
      if (direct && !uniqueCatalogEvent) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            ...inChatChoiceMessage(direct.content),
          },
        ]);
        return;
      }
      if (namedType && matched.length === 0) {
        const none = buildLiveEventsNoMatchReply({
          allLiveEvents: liveEvents,
          siteName,
          userName,
          userText,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            ...inChatChoiceMessage(none.content),
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

    const isBookingListFollowUp =
      isLoggedInVendor &&
      isVendorFollowUpQuery(userText) &&
      resolveVendorTopicFromHistory(messages) === "booking_list";

    const asksBookingList =
      isLoggedInVendor &&
      (isVendorBookingListIntent(userText) || isBookingListFollowUp);
    const asksEventOverview =
      isLoggedInVendor &&
      !asksBookingList &&
      isVendorEventOverviewIntent(statsQueryText);
    const asksVendorStats =
      isLoggedInVendor &&
      !asksBookingList &&
      !asksEventOverview &&
      isVendorStatsIntent(statsQueryText);

    // List pending bookings + customer phone/email (direct API — no LLM)
    if (asksBookingList) {
      if (
        isStaffUser &&
        effectivePermissions.length > 0 &&
        !effectivePermissions.includes("read-booking")
      ) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `**Access Restricted**\n\nI am sorry, but your account does not have permission to access **Bookings** (requires \`read-booking\`).\n\nPlease speak with your venue administrator to request access.`,
          },
        ]);
        setIsLoading(false);
        return;
      }
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
      if (
        isStaffUser &&
        effectivePermissions.length > 0 &&
        !hasPermissionForDomain("events", effectivePermissions)
      ) {
        const rule = RESOURCE_PERMISSION_RULES.find(
          (r) => r.domain === "events",
        )!;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: buildAccessRestrictedReply(rule, { userName }),
          },
        ]);
        setIsLoading(false);
        return;
      }
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
          userPermissions: effectivePermissions,
        });

    const supportCta =
      navLink ??
      (isVendorStorefront && wantsSupport && !isLoggedInCustomer
        ? {
            href: "/contact",
            label: "Go to Contact page",
          }
        : undefined);

    // Fetch the period they asked about (last month / all time / etc.) on demand
    let statsForChat: VendorChatLiveStats | null = null;
    if (asksVendorStats) {
      if (isStaffUser && effectivePermissions.length > 0) {
        const asksEarningsOrComm =
          isVendorEarningsIntent(statsQueryText) ||
          isVendorCommissionIntent(statsQueryText);
        if (
          asksEarningsOrComm &&
          !hasPermissionForDomain("commissions", effectivePermissions) &&
          !hasPermissionForDomain("transactions", effectivePermissions)
        ) {
          const rule = RESOURCE_PERMISSION_RULES.find(
            (r) => r.domain === "commissions",
          )!;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: buildAccessRestrictedReply(rule, { userName }),
            },
          ]);
          setIsLoading(false);
          return;
        }
        if (
          !hasPermissionForDomain("dashboard", effectivePermissions) &&
          !hasPermissionForDomain("transactions", effectivePermissions)
        ) {
          const rule = RESOURCE_PERMISSION_RULES.find(
            (r) => r.domain === "dashboard",
          )!;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: buildAccessRestrictedReply(rule, { userName }),
            },
          ]);
          setIsLoading(false);
          return;
        }
      }
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
        !(
          (isBroadEventListIntent(userText) ||
            isLiveEventAvailabilityQuestion(userText) ||
            Boolean(extractRequestedEventWindow(userText))) &&
          !isEventWindowFollowUp(userText)
        )
      ) {
        eventBookingBrief = pinnedBrief;
      }
      const locationPick = isLiveEventLocationChoiceText(userText, liveEvents);
      let pickedLiveEvent: LiveEventChatMatch | undefined;
      if (
        isVendorStorefront &&
        !eventBookingBrief &&
        tenantHost &&
        !isSupportIntent(userText)
      ) {
        const conversationMatches = matchLiveEventsFromConversation(
          userText,
          messages,
          liveEvents,
        );
        const matches = askedTheme
          ? conversationMatches.filter((item) =>
              liveEventMatchesRequestedTheme(item.event, userText),
            )
          : conversationMatches;
        const askedPlace = extractAskedPlace(userText, liveEvents);
        if (
          matches.length === 0 &&
          (askedTheme || (askedPlace && !askedPlace.catalogCity))
        ) {
          const none = buildLiveEventsNoMatchReply({
            allLiveEvents: liveEvents,
            siteName,
            userName,
            userText,
          });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              ...inChatChoiceMessage(none.content),
            },
          ]);
          return;
        }
        const needsEventChoice = needsLiveEventLocationChoice(
          userText,
          matches,
          liveEvents,
        );
        if (matches.length > 0 && needsEventChoice) {
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
        pickedLiveEvent =
          pick &&
          (!askedTheme || liveEventMatchesRequestedTheme(pick.event, userText))
            ? pick
            : undefined;
        if (pickedLiveEvent) {
          try {
            const detail = await eventsService.getEventDetail(
              normalizeLiveEventSlug(pickedLiveEvent.event.slug),
              tenantHost,
              { suppressErrorToast: true },
            );
            if (detail?.data) {
              eventBookingBrief = mergeChatBriefInventory(
                summarizeEventDetailForChat(detail.data, {
                  href: pickedLiveEvent.href,
                  locationCity: pickedLiveEvent.event.location_city,
                  locationSlug: normalizeLiveEventSlug(
                    pickedLiveEvent.event.location_slug,
                  ),
                  eventSlug: normalizeLiveEventSlug(pickedLiveEvent.event.slug),
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
        isEventWindowFollowUp(userText)
      ) {
        const windowTurn = buildPinnedEventWindowReply({
          brief: eventBookingBrief,
          userText,
          userName,
        });
        if (windowTurn) {
          const windowActions = publicBookingQuickActions({
            content: windowTurn.content,
            brief: eventBookingBrief,
            conversation: [...messages, userMessage],
          });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              ...inChatChoiceMessage(windowTurn.content),
              quickActions:
                windowActions.length > 0 ? windowActions : undefined,
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
        const preferredEvent = preferredLiveEventFromConversation(
          userText,
          [...messages, userMessage],
          liveEvents,
        );
        const gateContent = rewriteAssistantEventHrefs(
          compare +
            buildGuestBookingGateCopy({
              brief: eventBookingBrief,
              events: guestEvents,
              userName,
              includeEventLead: !compare,
              registerHref: hrefs.registerHref,
              loginHref: hrefs.loginHref,
            }),
          liveEvents,
          preferredEvent,
        );
        const gateActions = toUiQuickActions(
          buildGuestBookingGateActions(eventBookingBrief, {
            ...hrefs,
            events: guestEvents,
          }),
        ).map((action) =>
          action.href
            ? {
                ...action,
                href: canonicalizeLiveEventHref(
                  action.href,
                  liveEvents,
                  preferredEvent,
                ),
              }
            : action,
        );
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: gateContent,
            quickActions: gateActions,
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
          venueContact: {
            phone: contactPhone,
            email: contactEmail,
          },
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
        const payMode =
          parseChatPayMode(userText) ??
          (parseChatPaymentGatewaySlug(userText)
            ? chatPayModeRef.current
            : null);
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
            depositAvailable:
              chatDepositAvailableRef.current === false
                ? false
                : chatDepositAvailableRef.current === true ||
                  hostChoices.slots.some((slot) => slot.seating !== "tickets"),
            venueContact: {
              phone: contactPhone,
              email: contactEmail,
            },
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
                bookingSummary: hostTurn.summary,
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
            permissions: effectivePermissions,
            activeRole,
            isStaff: isStaffUser,
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
        if (isLoggedInVendor) {
          const nameGreeting = userName ? `Hello, ${userName}! ` : "";
          const content =
            `${nameGreeting}I am connected in direct venue mode. How can I assist you with your venue today?\n\n` +
            `- [Open Dashboard](/vendor/dashboard) — overview & metrics\n` +
            `- [Manage Events](/vendor/events) — event listings & dates\n` +
            `- [Booking History](/vendor/booking-history) — view all bookings\n` +
            `- [Transactions](/vendor/transactions) — payments & ledger\n` +
            `- [Customer Directory](/vendor/customers) — customer records`;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content,
              quickActions: [
                { id: "v-dash", label: "Dashboard", href: "/vendor/dashboard" },
                { id: "v-events", label: "Events", href: "/vendor/events" },
                {
                  id: "v-bookings",
                  label: "Bookings",
                  href: "/vendor/booking-history",
                },
                {
                  id: "v-txns",
                  label: "Transactions",
                  href: "/vendor/transactions",
                },
                {
                  id: "v-custs",
                  label: "Customers",
                  href: "/vendor/customers",
                },
              ],
            },
          ]);
          setIsLoading(false);
          return;
        }

        if (isLoggedInAdmin) {
          const nameGreeting = userName ? `Hello, ${userName}! ` : "";
          const content =
            `${nameGreeting}I am connected in direct platform mode. You can manage platform administration directly:\n\n` +
            `- [All Venues](/admin/vendors)\n` +
            `- [Commission Overview](/admin/commission-overview)\n` +
            `- [Transaction History](/admin/transactions)\n` +
            `- [Dispute Resolution](/admin/disputes)\n` +
            `- [Site Essentials](/admin/sites-essentials)`;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content,
              quickActions: [
                { id: "a-venues", label: "All Venues", href: "/admin/vendors" },
                {
                  id: "a-comm",
                  label: "Commissions",
                  href: "/admin/commission-overview",
                },
                {
                  id: "a-txns",
                  label: "Transactions",
                  href: "/admin/transactions",
                },
                {
                  id: "a-disputes",
                  label: "Disputes",
                  href: "/admin/disputes",
                },
              ],
            },
          ]);
          setIsLoading(false);
          return;
        }

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
      const preferredEvent = preferredLiveEventFromConversation(
        userText,
        [...messages, userMessage],
        liveEvents,
      );
      const rawReply = rewriteAssistantEventHrefs(
        typeof data.message === "string" ? data.message : "",
        liveEvents,
        preferredEvent,
      );
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
          : extractBookingQuickActions(reply).map((action) => ({
              id: action.id,
              label: action.label,
              hint: action.hint,
              sendText: action.sendText,
              href: action.href,
            }));
      const eventPageCta = isBareEventPageHref(
        supportCta?.href,
        briefForHandoff,
      );
      if (quickActions.length > 0) {
        for (const action of quickActions) {
          if (action.href) {
            action.href = canonicalizeLiveEventHref(
              action.href,
              liveEvents,
              preferredEvent,
            );
          }
        }
      }
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
      : supportFlow.step === "description" || supportFlow.step === "edit_draft"
        ? "Type or edit your enquiry…"
        : supportFlow.step === "review_draft"
          ? "Edit this enquiry or tap Looks good…"
          : awaitingGuestEmail
            ? "Your email address…"
            : "Type a message…";

  // Onboarding editor and `/preview/*` review — the floating launcher
  // overlaps the device frame and review chrome.
  if (isChatBotHiddenOnPath(pathname)) {
    return null;
  }

  const isVendorCheckout = isCustomerCheckoutPath(pathname);

  // User dismissed the launcher for this page load only (comes back on refresh).
  if (isDismissed) {
    return null;
  }

  const chatOverlay = (
    <>
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
              "fixed z-[80]",
              // Checkout phones: a slim edge tab in the page gutter — the round
              // 56px bubble sat over the "Add" / "Confirm seating" buttons.
              isVendorCheckout
                ? "right-0 bottom-[calc(var(--checkout-mobile-chrome-height,9rem)+0.75rem)] lg:right-6 lg:bottom-8"
                : "right-4 bottom-20 sm:right-6 sm:bottom-8",
            )}
            style={isVendorCheckout ? undefined : previewReviewChromeLiftStyle}
          >
            <motion.button
              type="button"
              onClick={() => {
                setIsMinimized(false);
                setIsOpen(true);
              }}
              aria-label="Open chat"
              whileHover={motionSafe ? { scale: 1.06 } : undefined}
              whileTap={motionSafe ? { scale: 0.96 } : undefined}
              className={cn(
                "relative p-0",
                isVendorCheckout
                  ? "h-10 w-10 rounded-l-2xl rounded-r-none lg:h-14 lg:w-14 lg:rounded-full"
                  : "h-14 w-14 rounded-full",
                "shadow-[0_8px_28px_rgba(15,23,42,0.18)]",
                "ring-2 ring-white/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
              )}
            >
              {/* Attention rings — draw the eye to the support bot (not during
                  checkout, where it competes with the payment flow). */}
              {motionSafe && !isVendorCheckout && (
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
                "absolute -top-1.5 z-30",
                isVendorCheckout ? "-left-1.5 lg:left-auto lg:-right-1.5" : "-right-1.5",
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

            <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden bg-slate-50 px-3.5 py-4 [&>[data-slot=scroll-area-viewport]]:max-w-full [&>[data-slot=scroll-area-viewport]]:min-w-0">
              <div className="w-full min-w-0 max-w-full space-y-4 pb-1">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => {
                    const isUser = message.role === "user";
                    const hasBody =
                      message.content.trim().length > 0 ||
                      Boolean(message.bookingSummary);
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
                    const stackActionCount =
                      message.quickActions?.filter(shouldStackChatQuickAction)
                        .length ?? 0;
                    const useDateGrid = dateActionCount >= 2;
                    const useEventList = !useDateGrid && stackActionCount >= 1;
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
                          "flex w-full min-w-0 items-end gap-2",
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
                            isUser
                              ? "max-w-[85%]"
                              : "min-w-0 flex-1",
                          )}
                        >
                          {hasBody && (
                            <div
                              className={cn(
                                "min-w-0 max-w-full text-sm leading-relaxed",
                                message.bookingSummary && !isUser
                                  ? "p-0"
                                  : "px-3.5 py-2.5",
                                isUser || useDateGrid || useEventList
                                  ? null
                                  : "w-fit",
                                isUser
                                  ? cn("rounded-2xl rounded-br-md", chatChrome)
                                  : "rounded-2xl rounded-bl-md border border-black/6 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                              )}
                            >
                              {message.bookingSummary && !isUser ? (
                                <ChatBookingSummaryCardView
                                  summary={message.bookingSummary}
                                />
                              ) : (
                                <p className="max-w-full whitespace-pre-wrap break-words [overflow-wrap:break-word] [word-break:normal]">
                                  {renderMessageContent(
                                    message.content,
                                    isUser,
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                          {!isUser &&
                            message.quickActions &&
                            message.quickActions.length > 0 && (
                              <div
                                className={
                                  useDateGrid
                                    ? "grid w-full min-w-0 grid-cols-2 gap-1.5"
                                    : "flex w-full min-w-0 flex-col gap-1.5"
                                }
                              >
                                {message.quickActions.map(
                                  (action, actionIndex) => {
                                    const isDateChip = isChatGridAction(action);
                                    const stackChip =
                                      shouldStackChatQuickAction(action);
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
                                          "group min-w-0 rounded-2xl border px-3 py-1.5 text-left transition-colors",
                                          (isDateChip && useDateGrid) ||
                                            stackChip
                                            ? "w-full"
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
                                            "block min-w-0 text-xs font-semibold leading-snug",
                                            isDateChip || stackChip
                                              ? "whitespace-normal break-words [overflow-wrap:break-word] [word-break:normal] line-clamp-2"
                                              : "truncate leading-tight",
                                          )}
                                        >
                                          {action.label}
                                        </span>
                                        {action.hint ? (
                                          <span
                                            className={cn(
                                              "mt-0.5 block min-w-0 text-[10px] font-medium leading-tight text-slate-500 group-hover:text-white/80",
                                              isDateChip
                                                ? "whitespace-normal break-words [overflow-wrap:break-word] [word-break:normal]"
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
            useCheckoutPaymentUiStore
              .getState()
              .setAwaitingStripePayment(false);
            resumeBookingAfterPaymentClosed();
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
