import { NextResponse } from "next/server";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";

type ContentType = "about" | "policy" | "contact";

function buildPolicyPrompt({
  venueName,
  policySection,
  currentDescription,
}: {
  venueName: string;
  policySection: string;
  currentDescription?: string;
}): { system: string; user: string; maxTokens: number } {
  let userPrompt = `Write professional ${policySection} content for "${venueName}", a UK events and hospitality venue.`;

  if (currentDescription && currentDescription !== "undefined") {
    const plainDescription = currentDescription.replace(/<[^>]*>/g, "");
    if (plainDescription.trim()) {
      userPrompt += `\n\nExisting draft to improve or expand:\n"${plainDescription}"`;
    }
  }

  userPrompt += `
\n\nRequirements:
- Use clear HTML with <p>, <strong>, and <h2> headings where appropriate.
- Write in plain UK English suitable for a public-facing website.
- Cover the key points customers expect for a ${policySection} page.
- Do not include placeholder brackets or lorem ipsum.
- Respond ONLY with the HTML body content. No preamble or explanation.`;

  return {
    system:
      "You are a professional legal and policy content writer for UK event venues. Output only valid HTML fragments suitable for a rich text editor.",
    user: userPrompt,
    maxTokens: 1200,
  };
}

function buildContactPrompt({
  venueName,
  currentDescription,
}: {
  venueName: string;
  currentDescription?: string;
}): { system: string; user: string; maxTokens: number } {
  let userPrompt = `Write a short, welcoming Contact Us intro for "${venueName}", a UK events and hospitality venue.`;

  if (currentDescription && currentDescription !== "undefined") {
    const plainDescription = currentDescription.replace(/<[^>]*>/g, "");
    if (plainDescription.trim()) {
      userPrompt += `\n\nExisting draft:\n"${plainDescription}"`;
    }
  }

  userPrompt += `
\n\nRequirements:
- 2-4 sentences in HTML using <p> tags.
- Invite customers to get in touch for bookings and enquiries.
- Friendly and professional tone.
- Max 300 words.
- Respond ONLY with the HTML. No preamble.`;

  return {
    system:
      "You are a professional business content writer. Output only HTML suitable for a contact page intro.",
    user: userPrompt,
    maxTokens: 400,
  };
}

export async function POST(req: Request) {
  try {
    const {
      title,
      currentDescription,
      ctaText,
      ctaUrl,
      description,
      event_name,
      sub_title,
      event_category_name,
      banner_heading,
      banner_sub_heading,
      contentType = "about",
      policySection,
    } = await req.json();

    if (!env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service is not properly configured" },
        { status: 500 }
      );
    }

    const venueName =
      typeof title === "string" && title.trim() ? title.trim() : "Our venue";

    let systemContent: string;
    let userPrompt: string;
    let maxTokens = 300;

    if (contentType === "policy") {
      const policy = buildPolicyPrompt({
        venueName,
        policySection: policySection || "Terms & Conditions",
        currentDescription,
      });
      systemContent = policy.system;
      userPrompt = policy.user;
      maxTokens = policy.maxTokens;
    } else if (contentType === "contact") {
      const contact = buildContactPrompt({
        venueName,
        currentDescription,
      });
      systemContent = contact.system;
      userPrompt = contact.user;
      maxTokens = contact.maxTokens;
    } else {
      if (!title?.trim()) {
        return NextResponse.json(
          { error: "Title is required for content generation" },
          { status: 400 }
        );
      }

      userPrompt = `Write a professional and engaging description for the About section titled "${title.trim()}"`;

      if (currentDescription && currentDescription !== "undefined") {
        const plainDescription = currentDescription.replace(/<[^>]*>/g, "");
        userPrompt += `\n\nCurrent description: "${plainDescription}"`;
      }
      if (ctaText) {
        userPrompt += `\n\nCall to Action text: "${ctaText}"`;
      }
      if (ctaUrl) {
        userPrompt += `\n\nCall to Action URL: ${ctaUrl}`;
      }
      if (description) {
        userPrompt += `\n\nDescription: "${description}"`;
      }
      if (event_name) {
        userPrompt += `\n\nEvent Name: "${event_name}"`;
      }
      if (sub_title) {
        userPrompt += `\n\nSub Title: "${sub_title}"`;
      }
      if (event_category_name) {
        userPrompt += `\n\nEvent Category Name: "${event_category_name}"`;
      }
      if (banner_heading) {
        userPrompt += `\n\nBanner Heading: "${banner_heading}"`;
      }
      if (banner_sub_heading) {
        userPrompt += `\n\nBanner Sub Heading: "${banner_sub_heading}"`;
      }

      userPrompt += `
    \n\nWrite a professional business description that aligns with the title and maintains consistency with any existing content. 
    The description MUST be under 50 words and 340 characters.
    Focus on being concise while maintaining impact.
    `;

      systemContent =
        "You are a professional business content writer who ONLY outputs final About section text." +
        "\n\nRULES:\n" +
        "1. Write 2-3 full sentences.\n" +
        "2. Max 50 words / 340 characters.\n" +
        "3. DO NOT include any phrases like 'Here is', 'This is', 'The following', etc.\n" +
        "4. DO NOT explain anything or add labels.\n" +
        "5. Respond ONLY with the final description text. No extra output.\n" +
        "If you break any rule, respond with 'REGENERATE'.";
    }

    const result: FallbackResult = await tryModelsWithFallback(
      env.GROQ_API_KEY,
      {
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to generate description. API error.",
          details: result.error,
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

    const summary = result.data.choices?.[0]?.message?.content?.trim();

    if (!summary || summary === "REGENERATE") {
      return NextResponse.json(
        {
          error:
            "Failed to generate a valid description within limits. Please try again.",
        },
        { status: 500 }
      );
    }

    const cleanSummary =
      contentType === "about"
        ? summary
            .replace(/^["']|["']$/g, "")
            .replace(
              /^(Here( is|'s)|This is|I suggest|Below is|Following is|We wrote|The following is|Let me give you|I have created)\s*.*?:?\s*/i,
              ""
            )
            .replace(/^(Revised|Updated)?\s*description\s*:\s*/i, "")
            .replace(/^As a\b.*?,\s*/i, "")
            .replace(/\b(?:therefore|moreover|furthermore|consequently)\b/gi, "")
            .trim()
        : summary
            .replace(/^```html\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

    if (contentType === "about") {
      const bannedPrefixes = [
        "here is",
        "here's",
        "this is",
        "i suggest",
        "below is",
        "following is",
        "we wrote",
        "let me give you",
        "i have created",
      ];

      if (
        bannedPrefixes.some((prefix) =>
          cleanSummary.toLowerCase().startsWith(prefix)
        )
      ) {
        return NextResponse.json(
          { error: "AI returned invalid meta content. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      summary: cleanSummary,
      model: result.model,
      modelUsed: result.modelUsed,
    });
  } catch (error) {
    console.error("Error in description generation:", error);
    return NextResponse.json(
      { error: "Failed to generate description. Please try again later." },
      { status: 500 }
    );
  }
}
