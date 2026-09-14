"use client";

import { useState, createContext, useContext, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isChatBotHiddenOnPath } from "@/lib/chat-page-context";

const ChatBot = dynamic(
  () => import("./chat-bot").then((mod) => mod.ChatBot),
  { ssr: false },
);

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

  // Only enable after client-side hydration to avoid SSR issues
  useEffect(() => {
    setIsEnabled(defaultEnabled && !hiddenOnRoute);
  }, [defaultEnabled, hiddenOnRoute]);

  const enableChatBot = () => setIsEnabled(true);
  const disableChatBot = () => setIsEnabled(false);

  return (
    <ChatBotContext.Provider
      value={{ isEnabled, enableChatBot, disableChatBot }}
    >
      {children}
      {isEnabled && !hiddenOnRoute && <ChatBot />}
    </ChatBotContext.Provider>
  );
}
