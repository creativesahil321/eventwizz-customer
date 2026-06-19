"use client";

import { useChatBot as useChatBotContext } from "@/components/chat/chat-bot-provider";

/**
 * Hook to control the chat bot from any component
 *
 * @example
 * ```tsx
 * const ChatBotButton = () => {
 *   const { isEnabled, enableChatBot, disableChatBot } = useChatBot();
 *
 *   return (
 *     <Button onClick={isEnabled ? disableChatBot : enableChatBot}>
 *       {isEnabled ? 'Disable Chat Bot' : 'Enable Chat Bot'}
 *     </Button>
 *   );
 * };
 * ```
 */
export function useChatBot() {
  return useChatBotContext();
}

/**
 * Utility function to check if the chat bot is running on the client side
 */
export function isChatBotAvailable(): boolean {
  return typeof window !== "undefined";
}
