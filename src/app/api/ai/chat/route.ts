import { NextRequest, NextResponse } from "next/server";
import {
  KNOWLEDGE_BASE,
  CHAT_INSTRUCTIONS,
} from "@/services/common/ai/knowledge-base";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";

/**
 * Get condensed knowledge base to reduce token count
 * Removes verbose sections while keeping essential information
 */
function getCondensedKnowledgeBase(): string {
  // Extract key sections only
  const sections = KNOWLEDGE_BASE.split("## ");
  const essentialSections = [
    "About EventWizz",
    "System Overview",
    "Partner White-Label Deployments",
    "User Types & Access",
    "Checkout & Booking System",
    "Common User Questions & Solutions",
  ];

  let condensed = "";
  for (const section of sections) {
    const title = section.split("\n")[0];
    if (
      essentialSections.some((essential) =>
        title.toLowerCase().includes(essential.toLowerCase())
      )
    ) {
      condensed += `## ${section}\n\n`;
    }
  }

  // Add condensed versions of other important info
  condensed += `
## Quick Reference
- Roles: admin (platform management), vendor (venue/event management), customer (booking)
- Partner: White-label deployment (same code, custom branding via 4 env vars)
- Onboarding: 11-step vendor setup process
- Booking: Multi-date, table/ticket selection, guest allocation, payment options
- Site Essentials: Branding, colors, typography, SEO customization
`;

  return condensed.length < KNOWLEDGE_BASE.length ? condensed : KNOWLEDGE_BASE; // Fallback to full if condensed is larger
}

// Define the message type
type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    // Get API key from environment variable
    const apiKey = env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ API key is not configured" },
        { status: 500 }
      );
    }

    // Get the messages from the request
    const { messages } = await req.json();

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Optimize: Only include recent conversation context (last 5 messages)
    // This reduces token count while maintaining context
    const recentMessages = messages.slice(-5);

    // Use condensed knowledge base to reduce token count
    const condensedKB = getCondensedKnowledgeBase();

    // Use the knowledge base and chat instructions from the imported constants
    const systemMessage = {
      role: "system",
      content: `${CHAT_INSTRUCTIONS}
      
      Use this knowledge base to answer questions:
      ${condensedKB}
      
      If you don't know the answer to a question that is not covered in the knowledge base, 
      politely explain that you don't have that specific information yet.
      
      When giving answers based on the knowledge base, don't explicitly reference the knowledge base itself.
      Just incorporate the information naturally into your responses.
      `,
    };

    // Prepare the messages for the API call
    // Use recent messages only to reduce token count
    const apiMessages: Message[] = [systemMessage, ...recentMessages];

    // Use the fallback system to try models in sequence
    const result: FallbackResult = await tryModelsWithFallback(apiKey, {
      messages: apiMessages,
      max_tokens: 800,
      temperature: 0.7,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Error from GROQ API",
          details: result.error,
          status: result.status || 500,
          modelsTried: result.modelsTried,
        },
        { status: result.status || 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "No response data from AI" },
        { status: 500 }
      );
    }

    const assistantMessage = result.data.choices[0].message.content;

    // Return the AI response with model info
    return NextResponse.json({
      message: assistantMessage,
      model: result.model,
      modelUsed: result.modelUsed,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
