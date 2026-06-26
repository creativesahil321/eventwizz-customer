import { NextRequest, NextResponse } from "next/server";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";

// Define the message type
type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

// Define the suggestion type
type DomainSuggestion = {
  domain: string;
  reasoning: string;
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

    // Get the request data
    const { venueName } = await req.json();

    // Validate input
    if (!venueName || typeof venueName !== "string") {
      console.log("API Route: Invalid venue name:", venueName);
      return NextResponse.json(
        { error: "Venue name is required and must be a string" },
        { status: 400 }
      );
    }

    // Create domain suggestions using AI
    const systemMessage: Message = {
      role: "system",
      content: `You are a domain naming expert. Generate exactly 3 best subdomain suggestions for the given venue name.

REQUIREMENTS:
- Return ONLY a JSON array of exactly 3 strings
- Each string should be a clean subdomain (no .com or TLD)
- Use lowercase letters, numbers, and hyphens only
- Keep suggestions 5-15 characters long
- Make them memorable and relevant
- Choose the 3 BEST options only

FORMAT: ["suggestion1", "suggestion2", "suggestion3"]

Examples:
- For "Royal Opera House" → ["royalopera", "opera-house", "royal-venue"]
- For "Lewis Square" → ["lewissquare", "lewis-events", "square-venue"]`,
    };

    const userMessage: Message = {
      role: "user",
      content: `Generate subdomain suggestions for: "${venueName}". Return only a JSON array like ["${venueName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")}", "${venueName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")}events"]`,
    };

    // Prepare the messages for the API call
    const apiMessages: Message[] = [systemMessage, userMessage];

    // Use the fallback system to try models in sequence
    const result: FallbackResult = await tryModelsWithFallback(apiKey, {
      messages: apiMessages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Error from GROQ API",
          details: result.error,
          status: result.status || 500,
          modelsTried: result.modelsTried,
          retryAfter: result.retryAfterHuman,
          retryAfterMs: result.retryAfterMs,
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

    // Check if the AI response contains error/refusal messages
    const errorIndicators = [
      "cannotprovideinformation",
      "cannot provide information",
      "cannot provide",
      "unable to provide",
      "i cannot",
      "i can't",
      "i'm not able",
      "i am not able",
      "refuse to",
      "decline to",
      "inappropriate",
      "explicit content",
      "explicit material",
      "not appropriate",
      "not suitable",
      "against policy",
      "violates policy",
    ];

    const isErrorResponse = errorIndicators.some((indicator) =>
      assistantMessage.toLowerCase().includes(indicator.toLowerCase())
    );

    if (isErrorResponse) {
      return NextResponse.json(
        {
          error:
            "This subdomain name may not be appropriate for a professional event venue. Please try a different name.",
          suggestions: [],
        },
        { status: 400 }
      );
    }

    // Try to parse the JSON response
    let suggestions;
    try {
      // Clean up the response to extract JSON
      const jsonMatch = assistantMessage.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Handle both array of strings and array of objects
        if (Array.isArray(parsed)) {
          suggestions = parsed
            .map((item, index) => {
              if (typeof item === "string") {
                // Additional validation for individual strings
                if (
                  errorIndicators.some((indicator) =>
                    item.toLowerCase().includes(indicator.toLowerCase())
                  )
                ) {
                  return null; // Filter out error messages
                }
                return {
                  domain: item,
                  reasoning: `AI suggestion ${index + 1}`,
                };
              } else if (typeof item === "object" && item.domain) {
                // Additional validation for domain objects
                if (
                  errorIndicators.some((indicator) =>
                    item.domain.toLowerCase().includes(indicator.toLowerCase())
                  )
                ) {
                  return null; // Filter out error messages
                }
                return item;
              } else {
                return {
                  domain: String(item),
                  reasoning: `AI suggestion ${index + 1}`,
                };
              }
            })
            .filter(Boolean); // Remove null entries
        } else {
          suggestions = [];
        }
      } else {
        // Fallback: create suggestions from the text response
        const lines = assistantMessage
          .split("\n")
          .filter((line) => line.trim());
        suggestions = lines
          .slice(0, 5)
          .map((line) => {
            const domain = line.replace(/[^a-z0-9-]/g, "").toLowerCase();

            // Check if the extracted domain contains error indicators
            if (
              errorIndicators.some((indicator) =>
                domain.toLowerCase().includes(indicator.toLowerCase())
              )
            ) {
              return null; // Filter out error messages
            }

            return {
              domain:
                domain ||
                `${venueName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
              reasoning: `Professional subdomain suggestion for ${venueName}`,
            };
          })
          .filter(Boolean); // Remove null entries
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Create fallback suggestions
      suggestions = [
        {
          domain: venueName
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .substring(0, 20),
          reasoning: `Based on venue name: ${venueName}`,
        },
        {
          domain: `${venueName.toLowerCase().replace(/[^a-z0-9-]/g, "")}events`,
          reasoning: `Event-focused subdomain for ${venueName}`,
        },
        {
          domain: `${venueName
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")}bookings`,
          reasoning: `Booking-focused subdomain for ${venueName}`,
        },
      ];
    }

    // Validate and clean suggestions
    let validSuggestions = suggestions
      .filter((suggestion: unknown): suggestion is DomainSuggestion => {
        if (
          suggestion &&
          typeof suggestion === "object" &&
          suggestion !== null &&
          "domain" in suggestion &&
          typeof (suggestion as { domain: unknown }).domain === "string"
        ) {
          return true;
        }
        return false;
      })
      .map((suggestion: DomainSuggestion) => {
        let cleanDomain = suggestion.domain
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "")
          .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
          .substring(0, 63); // AWS limit

        // Final check: ensure the cleaned domain doesn't contain error indicators
        const errorIndicators = [
          "cannotprovideinformation",
          "cannot provide information",
          "cannot provide",
          "unable to provide",
          "i cannot",
          "i can't",
          "i'm not able",
          "i am not able",
          "refuse to",
          "decline to",
          "inappropriate",
          "explicit content",
          "explicit material",
          "not appropriate",
          "not suitable",
          "against policy",
          "violates policy",
        ];

        if (
          errorIndicators.some((indicator) =>
            cleanDomain.toLowerCase().includes(indicator.toLowerCase())
          )
        ) {
          return null; // Filter out error messages
        }

        // Remove any TLDs that might be included (like .com, .net, etc.)
        cleanDomain = cleanDomain.replace(
          /\.(com|net|org|co|uk|us|ca|au|de|fr|it|es|jp|cn|in|br|mx|nl|se|no|fi|dk|pl|ru|be|ch|at|pt|cz|gr|hu|tr|ro|sk|si|hr|ba|me|mk|al|bg|rs|ee|lv|lt|mt|cy|lu|is|ie|gb|nz)$/,
          ""
        );

        return {
          domain: cleanDomain,
          reasoning:
            suggestion.reasoning || `Professional subdomain for ${venueName}`,
        };
      })
      .filter(Boolean) // Remove null entries from error filtering
      .filter(
        (suggestion: { domain: string; reasoning: string } | null) =>
          suggestion && suggestion.domain.length >= 3
      ) // Minimum length
      .slice(0, 3); // Maximum 3 suggestions

    // If no valid suggestions from AI, check if it was due to error filtering
    if (validSuggestions.length === 0) {
      // If the original response contained error indicators, return an error
      if (isErrorResponse) {
        return NextResponse.json(
          {
            error:
              "This subdomain name may not be appropriate for a professional event venue. Please try a different name.",
            suggestions: [],
          },
          { status: 400 }
        );
      }

      // Otherwise, create fallback suggestions
      const baseDomain = venueName.toLowerCase().replace(/[^a-z0-9-]/g, "");
      validSuggestions = [
        {
          domain: baseDomain,
          reasoning: `Direct match to venue name: ${venueName}`,
        },
        {
          domain: `${baseDomain}events`,
          reasoning: `Event-focused subdomain for ${venueName}`,
        },
        {
          domain: `${baseDomain}booking`,
          reasoning: `Booking-focused subdomain for ${venueName}`,
        },
      ].filter((s) => s.domain.length >= 3);
    }

    // Return the domain suggestions
    return NextResponse.json({
      suggestions: validSuggestions,
      model: result.model,
      modelUsed: result.modelUsed,
    });
  } catch (error) {
    console.error("Domain suggestions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
