// Models ordered by token limits (highest first)
// Free tier limits: llama-3.1-8b-instant (6K TPM), gemma2-9b-it (15K TPM)
// Paid tier: llama-3.3-70b (30K+ TPM), mixtral-8x7b (30K+ TPM)
export const MODEL_FALLBACKS = [
  "gemma2-9b-it", // Free tier, 15K TPM limit (better for large context)
  "llama-3.1-8b-instant", // Fast, free, 6K TPM limit (fallback)
  "llama-3.3-70b-versatile", // High quality, higher limits (if on paid tier)
  "mixtral-8x7b-32768", // Long context, higher limits (if on paid tier)
];

// Define the fallback result type
export type FallbackResult = {
  success: boolean;
  data?: {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };
  error?: string;
  status?: number;
  model?: string;
  modelUsed?: string;
  modelsTried?: string[];
  lastError?: unknown;
};

/**
 * Smart model fallback system that tries models in sequence
 * @param apiKey - GROQ API key
 * @param requestBody - Request body for the API call
 * @returns Promise with fallback result
 */
export async function tryModelsWithFallback(
  apiKey: string,
  requestBody: Record<string, unknown>
): Promise<FallbackResult> {
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACKS) {
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...requestBody,
            model: model,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: data,
          model: model,
          modelUsed: model,
        };
      }

      // Check if this is a model decommissioning error
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error?.code === "model_decommissioned") {
        lastError = {
          type: "model_decommissioned",
          message: `Model ${model} has been decommissioned`,
          model: model,
        };
        continue; // Try next model
      }

      // Check if this is a rate limit / token limit error (413 or 429)
      // Try next model with higher limits
      if (response.status === 413 || response.status === 429) {
        const errorMessage = errorData.error?.message || "";
        if (
          errorMessage.includes("Request too large") ||
          errorMessage.includes("tokens per minute") ||
          errorMessage.includes("rate limit")
        ) {
          lastError = {
            type: "rate_limit",
            message: `Model ${model} exceeded token/rate limit, trying next model`,
            model: model,
            details: errorData.error?.message,
          };
          continue; // Try next model with higher limits
        }
      }

      // Other API errors - return immediately
      return {
        success: false,
        error: errorData.error?.message || "API error",
        status: response.status,
        model: model,
        lastError: errorData,
      };
    } catch (error) {
      lastError = {
        type: "network_error",
        message: error instanceof Error ? error.message : "Unknown error",
        model: model,
      };
      continue; // Try next model
    }
  }

  // All models failed
  return {
    success: false,
    error: "All models failed. Please try again later.",
    lastError: lastError,
    modelsTried: MODEL_FALLBACKS,
  };
}
