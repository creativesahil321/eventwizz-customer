"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  MessageSquare,
  X,
  MinusCircle,
  ArrowUpCircle,
  Bot,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your EventWizz assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage() {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Set loading state
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      // Add AI response to chat
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          variant="event-primary"
          className="fixed bottom-8 right-6 h-14 w-14 rounded-full shadow-lg z-50 flex items-center justify-center"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Chat container */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-10 right-6 bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-50 w-80 md:w-96 transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700",
            isMinimized ? "h-16" : "h-[530px]"
          )}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)]">
            <div className="flex items-center">
              <div className="bg-white/20 p-1.5 rounded-full mr-2">
                <Bot className="h-4 w-4" />
              </div>
              <h3 className="font-medium">EventWizz Assistant</h3>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/20 hover:text-white"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? (
                  <ArrowUpCircle className="h-4 w-4" />
                ) : (
                  <MinusCircle className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/20 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Chat messages */}
              <ScrollArea className="h-[410px] px-4 py-3 bg-gray-50 dark:bg-gray-800">
                <div className="space-y-6 pb-2">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start space-x-2 min-w-0",
                        message.role === "user"
                          ? "flex-row-reverse space-x-reverse"
                          : "flex-row"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                          message.role === "assistant"
                            ? "bg-[var(--color-primary)]"
                            : "bg-gray-200 dark:bg-gray-700"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "max-w-[75%] min-w-0 rounded-2xl px-4 py-2.5 shadow-sm overflow-hidden",
                          message.role === "user"
                            ? "bg-[var(--color-primary)] rounded-tr-none text-white"
                            : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-600"
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-600">
                        <div className="flex space-x-1">
                          <div
                            className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500 animate-bounce"
                            style={{ animationDelay: "600ms" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Chat input */}
              <div className="border-t dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                <div className="flex items-center space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className="flex-1 h-10 px-4 border border-gray-200 dark:border-gray-700 rounded-full focus:ring-1 focus:ring-[var(--color-primary)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-0"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    variant={input.trim() ? "event-primary" : "ghost"}
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
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
        </div>
      )}
    </>
  );
}
