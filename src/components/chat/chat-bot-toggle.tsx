"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare, Bot } from "lucide-react";
import { useChatBot } from "@/hooks/use-chat-bot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChatBotToggleProps {
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "link"
    | "destructive"
    | "secondary"
    | "event-primary"
    | "event-secondary"
    | "event-outline"
    | "event-ghost"
    | "event-social"
    | "event-primary"
    | "event-secondary"
    | "event-outline"
    | "event-ghost"
    | "event-social";
  size?: "default" | "sm" | "lg" | "icon";
  showTooltip?: boolean;
  className?: string;
}

export function ChatBotToggle({
  variant = "outline",
  size = "icon",
  showTooltip = true,
  className = "",
}: ChatBotToggleProps) {
  const { isEnabled, enableChatBot, disableChatBot } = useChatBot();

  const handleToggle = () => {
    if (isEnabled) {
      disableChatBot();
    } else {
      enableChatBot();
    }
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      className={cn(
        "relative",
        isEnabled &&
          "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]",
        className
      )}
      aria-label={
        isEnabled ? "Disable Chat Assistant" : "Enable Chat Assistant"
      }
    >
      <div className="flex items-center justify-center">
        {isEnabled ? (
          <Bot className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </div>
      {isEnabled && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      )}
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          {isEnabled ? "Disable Chat Assistant" : "Enable Chat Assistant"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
