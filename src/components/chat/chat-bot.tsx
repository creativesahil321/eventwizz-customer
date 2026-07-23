"use client";

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  X,
  Minus,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { useDomainContext } from "@/hooks/useDomainContext";
import { useAuthStore } from "@/store/auth.store";
import { appConfig } from "@/config/app";
import { addCacheBusting } from "@/lib/image-utils";
import { useCreateCustomerSupportTicket } from "@/services/customer/support";
import type { SupportCategory } from "@/app/(protected)/customer/support/_lib/types";
import { CATEGORY_LABELS } from "@/app/(protected)/customer/support/_lib/utils";
import { resolveChatNavLink } from "@/lib/chat-nav-links";
import { pickReadableForeground } from "@/lib/color-contrast";

type QuickAction = {
  id: string;
  label: string;
  /** If set, tapping navigates here (e.g. Register / Log in) */
  href?: string;
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

const CATEGORY_ACTIONS: QuickAction[] = [
  {
    id: "general_support",
    label: CATEGORY_LABELS.general_support,
  },
  {
    id: "technical_support",
    label: CATEGORY_LABELS.technical_support,
  },
];

/** Guest auth options — register / login from chat */
const GUEST_AUTH_ACTIONS: QuickAction[] = [
  {
    id: "register",
    label: "Create account",
    href: "/auth/register/customer",
  },
  {
    id: "login",
    label: "Log in",
    href: "/auth/login",
  },
];

const SUPPORT_INTENT_RE =
  /\b(support|help desk|customer service|enquiry|inquiry|ticket|contact (us|team|support)|speak to|talk to|get in touch|connect with|raise (a |an )?(query|issue|ticket|enquiry|inquiry)|not able to book|can'?t book|cannot book|booking (issue|problem|error)|technical issue|fix (my |the )?issue|having (a |an )?(issue|problem))\b/i;

const AUTH_INTENT_RE =
  /\b(register|sign\s*up|create (an? )?account|log\s*in|sign\s*in|need (an? )?account|asked?( me)? to register|ask(s|ed)? for register|registration|make an account)\b/i;

/** Customer wants to add/change a room on an existing booking — not possible in product. */
const ADD_ROOM_AFTER_BOOKING_RE =
  /\b((add|book|update|change|swap|get|include).{0,40}\broom|new room|another room|extra room|additional room|different room).{0,40}\b(booking|booked|existing)|room.{0,30}(existing|current|my) booking\b/i;

function isSupportIntent(text: string): boolean {
  return SUPPORT_INTENT_RE.test(text);
}

function isAuthIntent(text: string): boolean {
  return AUTH_INTENT_RE.test(text);
}

function isAddRoomAfterBookingIntent(text: string): boolean {
  return ADD_ROOM_AFTER_BOOKING_RE.test(text);
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function buildSubject(issueSummary: string, description: string): string {
  const seed = (issueSummary || description).replace(/\s+/g, " ").trim();
  if (!seed) return "Support enquiry from chat";
  return seed.length > 80 ? `${seed.slice(0, 77)}…` : seed;
}

/** Render markdown links + safe relative paths as clickable anchors. */
function renderMessageContent(content: string, isUser: boolean): ReactNode[] {
  const linkClass = isUser
    ? "underline underline-offset-2 font-medium opacity-95"
    : "underline underline-offset-2 font-medium text-[var(--color-primary)]";

  const nodes: ReactNode[] = [];
  // Allow any relative app path in markdown, plus common bare paths
  const pattern =
    /\[([^\]]+)\]\((\/[^)\s]*|https?:\/\/[^)\s]+)\)|(\/(?:vendor|customer|admin|auth|contact|welcome|on-boarding|preview)[^\s]*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }

    const label = match[1];
    const markdownHref = match[2];
    const bareHref = match[3];
    const href = markdownHref || bareHref || "";
    const text = label || href;

    if (href.startsWith("/")) {
      nodes.push(
        <Link key={`link-${key++}`} href={href} className={linkClass}>
          {text}
        </Link>,
      );
    } else {
      nodes.push(
        <a
          key={`link-${key++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {text}
        </a>,
      );
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
}: {
  src: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const sizeClass =
    size === "lg"
      ? "h-14 w-14"
      : size === "sm"
        ? "h-7 w-7"
        : "h-8 w-8";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary)] ring-1 ring-black/5",
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
        <MessageCircle className="h-3.5 w-3.5 text-white" strokeWidth={2} />
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
  const { website_role: domainWebsiteRole } = useDomainContext();
  const createTicket = useCreateCustomerSupportTicket();

  const websiteRole =
    domainWebsiteRole ||
    (theme?.website_role as string | undefined) ||
    null;
  /** User bubbles sit on primary; pick black/white so light themes stay readable. */
  const userBubbleTextColor = pickReadableForeground(
    theme?.colors?.primary ?? "#0F172A",
  );
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

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello — how can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [supportFlow, setSupportFlow] =
    useState<SupportFlowState>(INITIAL_FLOW);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const motionSafe = !prefersReducedMotion;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

      // Keep greetings short and professional — never mention “signed in / venue account”
      if (isVendorStorefront && accountType === "customer") {
        return [
          {
            role: "assistant",
            content: `Hello${nameBit} — how can I help you today?`,
          },
        ];
      }

      return [
        {
          role: "assistant",
          content: `Hello${nameBit} — how can I help you today?`,
        },
      ];
    });
  }, [sessionStatus, accountType, userName, isVendorStorefront]);

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
          "I can raise a support enquiry for you. Please choose a category:",
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
  function offerGuestAuthOptions() {
    setMessages((prev) => [
      ...clearQuickActions(prev),
      {
        role: "assistant",
        content:
          "To book an event, you’ll need a customer account. Please choose an option below — it only takes a moment:",
        quickActions: GUEST_AUTH_ACTIONS,
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
        subject: buildSubject(flow.issueSummary, flow.description),
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
        content:
          "Thank you. What’s the best telephone number to reach you on?",
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
        content:
          "Ready to send this enquiry to our support team?",
        quickActions: [
          { id: "confirm_submit", label: "Send enquiry" },
          { id: "cancel_flow", label: "Cancel" },
        ],
      },
    ]);
  }

  async function handleQuickAction(action: QuickAction) {
    if (isLoading || supportFlow.step === "submitting") return;

    // Navigation actions (Register / Log in / Contact, etc.)
    if (action.href) {
      const href = action.href;
      setMessages((prev) => [
        ...clearQuickActions(prev),
        { role: "user", content: action.label },
        {
          role: "assistant",
          content:
            action.id === "register"
              ? "Taking you to registration now. Complete the form to create your account, then you can book events."
              : action.id === "login"
                ? "Taking you to log in. Once you’re signed in, you can continue with your booking."
                : "Taking you there now.",
          supportCta: {
            href,
            label: action.label,
          },
        },
      ]);
      router.push(href);
      return;
    }

    if (action.id === "cancel_flow") {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: action.label },
      ]);
      cancelGuidedSupport();
      return;
    }

    if (action.id === "general_support" || action.id === "technical_support") {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: action.label },
      ]);
      askForPhone(action.id as SupportCategory);
      return;
    }

    if (action.id === "confirm_submit" || action.id === "retry_submit") {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: action.label },
      ]);
      await submitGuidedSupport(supportFlow);
      return;
    }
  }

  async function handleGuidedFlowText(userText: string) {
    const lower = userText.toLowerCase();
    if (lower === "cancel" || lower === "stop") {
      cancelGuidedSupport();
      return;
    }

    if (supportFlow.step === "category") {
      if (
        /\b(technical|account|login|password)\b/i.test(userText)
      ) {
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
          content: "Please choose a category using one of the buttons below:",
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
              "Please enter a valid UK telephone number (at least 7 digits) so our team can contact you.",
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
              "Could you add a little more detail so we can help you properly?",
          },
        ]);
        return;
      }
      askForConfirm(userText.trim());
      return;
    }

    if (supportFlow.step === "confirm") {
      if (/\b(yes|submit|confirm|ok|okay|sure)\b/i.test(userText)) {
        await submitGuidedSupport(supportFlow);
        return;
      }
      if (/\b(no|cancel|stop)\b/i.test(userText)) {
        cancelGuidedSupport();
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

  async function handleSendMessage() {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: Message = { role: "user", content: userText };
    setMessages((prev) => [...clearQuickActions(prev), userMessage]);
    setInput("");

    // Active guided support flow — handle without calling the AI
    if (supportFlow.step !== "idle" && supportFlow.step !== "submitting") {
      await handleGuidedFlowText(userText);
      return;
    }

    // Logged-in customer on vendor site: start professional enquiry wizard
    if (
      isVendorStorefront &&
      isLoggedInCustomer &&
      isSupportIntent(userText)
    ) {
      startGuidedSupport(userText);
      return;
    }

    // Guest on vendor site: offer Register / Log in buttons
    if (
      isVendorStorefront &&
      !isLoggedInCustomer &&
      isAuthIntent(userText)
    ) {
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

    // Guests (or non-support): AI chat + navigation / contact CTAs
    setIsLoading(true);
    const wantsSupport = isSupportIntent(userText);
    const navLink = resolveChatNavLink(userText, {
      accountType,
      isAuthenticated,
      isVendorStorefront,
    });

    // Prefer specific nav CTA; fall back to Contact for guest support on storefront
    const supportCta =
      navLink ??
      (isVendorStorefront && wantsSupport && !isLoggedInCustomer
        ? {
            href: "/contact",
            label: "Go to Contact page",
          }
        : undefined);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content,
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
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          supportCta,
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again in a moment.",
          supportCta,
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
        : "Type a message…";

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            key="chat-launcher"
            onClick={() => setIsOpen(true)}
            aria-label="Open chat"
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
            whileHover={motionSafe ? { scale: 1.06 } : undefined}
            whileTap={motionSafe ? { scale: 0.96 } : undefined}
            className={cn(
              "fixed bottom-20 right-4 z-50 sm:bottom-8 sm:right-6",
              "h-14 w-14 rounded-full p-0",
              "shadow-[0_8px_28px_rgba(15,23,42,0.18)]",
              "ring-2 ring-white/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
            )}
          >
            {/* Attention rings — draw the eye to the support bot */}
            {motionSafe && (
              <>
                <span
                  aria-hidden
                  data-chat-bot-motion
                  className="pointer-events-none absolute inset-0 rounded-full bg-[var(--color-primary)]/30"
                  style={{
                    animation:
                      "chat-bot-ping 2.4s cubic-bezier(0,0,0.2,1) infinite",
                  }}
                />
                <span
                  aria-hidden
                  data-chat-bot-motion
                  className="pointer-events-none absolute -inset-1 rounded-full border-2 border-[var(--color-primary)]/40"
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
                className="h-full w-full ring-0"
              />
            </span>
            {/* Soft unread-style badge to catch attention */}
            <motion.span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 z-20 h-3.5 w-3.5 rounded-full bg-[var(--color-primary)] ring-2 ring-white"
              animate={
                motionSafe
                  ? { scale: [1, 1.25, 1], opacity: [1, 0.85, 1] }
                  : undefined
              }
              transition={
                motionSafe
                  ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
            />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={
              motionSafe
                ? { opacity: 0, y: 28, scale: 0.94 }
                : { opacity: 1 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              motionSafe
                ? { opacity: 0, y: 20, scale: 0.96 }
                : { opacity: 0 }
            }
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "fixed bottom-10 right-4 z-50 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden sm:right-6 md:w-96",
              "rounded-2xl border border-black/8 bg-[var(--color-surface,#fff)]",
              "shadow-[0_16px_48px_rgba(15,23,42,0.16)]",
              "origin-bottom-right",
              isMinimized ? "h-14" : "h-[min(530px,70vh)]",
            )}
            style={{
              transition: "height 300ms ease-out",
            }}
          >
            <div
              className="flex h-14 shrink-0 items-center justify-between gap-2 px-3.5 text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <motion.div
                  animate={
                    motionSafe && !isMinimized
                      ? { rotate: [0, -6, 6, -4, 0] }
                      : undefined
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
                    className="ring-1 ring-white/25"
                  />
                </motion.div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {siteName}
                  </p>
                  <p className="truncate text-[11px] font-normal text-white/75">
                    Chat assistant
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
                  onClick={() => setIsMinimized(!isMinimized)}
                  aria-label={isMinimized ? "Expand chat" : "Minimise chat"}
                >
                  <Minus className="h-4 w-4" strokeWidth={2} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <ScrollArea className="min-h-0 flex-1 bg-[var(--color-secondary,#f8fafc)] px-3.5 py-4">
                  <div className="space-y-4 pb-1">
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => {
                        const isUser = message.role === "user";
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
                              />
                            )}
                            <div className="flex max-w-[85%] min-w-0 flex-col gap-2">
                              <div
                                className={cn(
                                  "min-w-0 px-3.5 py-2.5 text-sm leading-relaxed",
                                  isUser
                                    ? "rounded-2xl rounded-br-md bg-[var(--color-primary)]"
                                    : // Always dark text on white — never inherit theme --color-text (invisible on dark themes)
                                      "rounded-2xl rounded-bl-md border border-black/6 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                                )}
                                style={
                                  isUser
                                    ? { color: userBubbleTextColor }
                                    : { color: "#0F172A" }
                                }
                              >
                                <p
                                  className="whitespace-pre-wrap break-words"
                                  style={{
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                    color: "inherit",
                                  }}
                                >
                                  {renderMessageContent(
                                    message.content,
                                    isUser,
                                  )}
                                </p>
                              </div>
                              {!isUser &&
                                message.quickActions &&
                                message.quickActions.length > 0 && (
                                  <div className="flex flex-col gap-1.5">
                                    {message.quickActions.map((action, actionIndex) => (
                                      <motion.button
                                        key={action.id}
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() =>
                                          void handleQuickAction(action)
                                        }
                                        initial={
                                          motionSafe
                                            ? { opacity: 0, y: 8, scale: 0.96 }
                                            : false
                                        }
                                        animate={
                                          motionSafe
                                            ? {
                                                opacity: 1,
                                                y: 0,
                                                scale: [1, 1.03, 1],
                                              }
                                            : { opacity: 1 }
                                        }
                                        transition={{
                                          opacity: {
                                            delay: 0.12 + actionIndex * 0.08,
                                          },
                                          y: {
                                            delay: 0.12 + actionIndex * 0.08,
                                          },
                                          scale: {
                                            delay: 0.45 + actionIndex * 0.12,
                                            duration: 1.6,
                                            repeat: 2,
                                            ease: "easeInOut",
                                          },
                                        }}
                                        whileHover={
                                          motionSafe
                                            ? { scale: 1.04 }
                                            : undefined
                                        }
                                        whileTap={
                                          motionSafe
                                            ? { scale: 0.97 }
                                            : undefined
                                        }
                                        className={cn(
                                          "w-fit max-w-full rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors",
                                          "border-[var(--color-primary)]/25 bg-white text-[var(--color-primary)]",
                                          "hover:bg-[var(--color-primary)] hover:text-white",
                                          "disabled:pointer-events-none disabled:opacity-50",
                                          "shadow-[0_0_0_0_rgba(0,0,0,0)]",
                                        )}
                                      >
                                        {action.label}
                                      </motion.button>
                                    ))}
                                  </div>
                                )}
                              {!isUser && message.supportCta && (
                                <motion.div
                                  initial={
                                    motionSafe
                                      ? { opacity: 0, y: 6 }
                                      : false
                                  }
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.15 }}
                                >
                                  <Link
                                    href={message.supportCta.href}
                                    className={cn(
                                      "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                                      "bg-[var(--color-primary)] text-white shadow-sm transition hover:opacity-90",
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
                        <ChatAvatar src={avatarSrc} alt={siteName} size="sm" />
                        <div className="rounded-2xl rounded-bl-md border border-black/6 bg-white px-3.5 py-3 text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="shrink-0 border-t border-black/6 bg-white p-3 text-slate-900">
                  <div className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={inputPlaceholder}
                      disabled={isLoading || supportFlow.step === "submitting"}
                      className="h-10 flex-1 rounded-full border-black/10 bg-white px-4 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-0"
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
                          ? "bg-[var(--color-primary)] hover:opacity-90 hover:scale-105"
                          : "bg-black/5 text-black/35",
                      )}
                      style={
                        input.trim()
                          ? { color: userBubbleTextColor }
                          : undefined
                      }
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
}
