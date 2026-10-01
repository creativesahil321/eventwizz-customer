"use client";

import { useState, createContext, useContext, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isChatBotHiddenOnPath } from "@/lib/chat-page-context";

const ChatBot = dynamic(
  () => import("./chat-bot").then((mod) => mod.ChatBot),
  { ssr: false },
);

/** Delay after window `load` before we start waiting for an idle slot. */
const CHAT_BOT_LOAD_DELAY_MS = 2000;
/** Upper bound for requestIdleCallback so the launcher always appears. */
const CHAT_BOT_IDLE_TIMEOUT_MS = 2000;

/**
 * Resolves once the page has loaded and the main thread is idle, so the
 * (large) chat bot chunk does not compete with LCP / hydration.
 */
function scheduleAfterLoadIdle(callback: () => void): () => void {
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let idleId: number | undefined;

  const run = () => {
    if (!cancelled) callback();
  };

  const scheduleIdle = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(run, {
        timeout: CHAT_BOT_IDLE_TIMEOUT_MS,
      });
    } else {
      run();
    }
  };

  const onLoad = () => {
    timeoutId = setTimeout(scheduleIdle, CHAT_BOT_LOAD_DELAY_MS);
  };

  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad, { once: true });
  }

  return () => {
    cancelled = true;
    window.removeEventListener("load", onLoad);
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleId);
    }
  };
}

// Create context for the chat bot
type ChatBotContextType = {
  isEnabled: boolean;
  enableChatBot: () => void;
  disableChatBot: () => void;
};

const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined);

export function useChatBot() {
  const context = useContext(ChatBotContext);
  if (!context) {
    throw new Error("useChatBot must be used within a ChatBotProvider");
  }
  return context;
}

type ChatBotProviderProps = {
  children: React.ReactNode;
  defaultEnabled?: boolean;
};

export function ChatBotProvider({
  children,
  defaultEnabled = true,
}: ChatBotProviderProps) {
  const pathname = usePathname();
  const hiddenOnRoute = isChatBotHiddenOnPath(pathname);
  const [isEnabled, setIsEnabled] = useState(false);
  // Gate the heavy ChatBot chunk until after load + idle (or an explicit enable).
  const [isDeferredReady, setIsDeferredReady] = useState(false);

  // Only enable after client-side hydration to avoid SSR issues
  useEffect(() => {
    setIsEnabled(defaultEnabled && !hiddenOnRoute);
  }, [defaultEnabled, hiddenOnRoute]);

  useEffect(() => {
    if (isDeferredReady) return;
    return scheduleAfterLoadIdle(() => setIsDeferredReady(true));
  }, [isDeferredReady]);

  const enableChatBot = () => {
    setIsDeferredReady(true);
    setIsEnabled(true);
  };
  const disableChatBot = () => setIsEnabled(false);

  return (
    <ChatBotContext.Provider
      value={{ isEnabled, enableChatBot, disableChatBot }}
    >
      {children}
      {isEnabled && isDeferredReady && !hiddenOnRoute && <ChatBot />}
    </ChatBotContext.Provider>
  );
}
