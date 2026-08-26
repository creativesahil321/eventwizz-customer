import { NextResponse } from "next/server";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import {
  AI_PLAIN_TEXT,
  looksLikeAiInstructionLeak,
  toUserFacingMarketingCopy,
} from "../lib/extract-json";
import {
  aiRuntimeFailureMeta,
  aiUnconfiguredPayload,
  resolveAiRuntimeConfig,
} from "../lib/provider-config";
import { clipFooterBrandDescription } from "@/lib/footer-brand-description";
import { toPlainText } from "@/lib/plain-text-length";

type ContentType = "about" | "policy" | "contact" | "page" | "footer";

/**
 * Single source of truth for the HTML shape every CMS page produces. Keeping the
 * tag whitelist identical to what the public `CMS_PROSE_CLASS` styles guarantees
 * generated content is always cleanly aligned on the live page — no rogue <h1>,
 * inline styles, <div>/<br> soup, or unstyled tags breaking the layout.
 */
const HTML_FORMAT_RULES = `

Formatting rules (STRICT — output must be clean, consistent, well-aligned HTML):
- Use ONLY these tags: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <a>.
- Structure: a short intro <p>, then <h2> section headings, each followed by <p> paragraphs and, where useful, a <ul> or <ol> list.
- Use <h2> for main sections and <h3> only for sub-sections. NEVER use <h1> (the page already renders its own title).
- No inline styles, no class/id/style attributes, no <div>, <span>, <br>, <font>, <table>, or <img>.
- No markdown, no code fences (\`\`\`), no placeholder brackets, no lorem ipsum.
- Write in clear, professional UK English for a public-facing website.
- Respond with ONLY the HTML body content — no preamble, no explanation, no wrapping element.`;

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

  userPrompt +=
    `\n\nCover the key points customers expect on a ${policySection} page, grouped into clearly titled sections.` +
    HTML_FORMAT_RULES;

  return {
    system:
      "You are a professional legal and policy content writer for UK event venues. Output only valid HTML fragments suitable for a rich text editor.",
    user: userPrompt,
    maxTokens: 1200,
  };
}

function buildPagePrompt({
  venueName,
  pageName,
  currentDescription,
}: {
  venueName: string;
  pageName: string;
  currentDescription?: string;
}): { system: string; user: string; maxTokens: number } {
  let userPrompt = `Write professional, engaging content for the "${pageName}" page of "${venueName}", a UK events and hospitality business.`;

  if (currentDescription && currentDescription !== "undefined") {
    const plainDescription = currentDescription.replace(/<[^>]*>/g, "");
    if (plainDescription.trim()) {
      userPrompt += `\n\nExisting draft to improve or expand:\n"${plainDescription}"`;
    }
  }

  userPrompt +=
    `\n\nInclude:
- A warm, concise introduction paragraph.
- 2 to 4 clearly titled <h2> sections covering what a visitor expects on a "${pageName}" page.
- Where it adds value, a short <ul> bullet list of key points or benefits.` +
    HTML_FORMAT_RULES;

  return {
    system:
      "You are a professional web content writer for UK event businesses. Output only valid HTML fragments suitable for a rich text editor.",
    user: userPrompt,
    maxTokens: 1400,
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

function guestFacingDraft(value?: string): string | undefined {
  if (!value || value === "undefined") return undefined;
  const plain = toPlainText(value);
  if (!plain || looksLikeAiInstructionLeak(plain)) return undefined;
  return plain;
}

function buildFooterPrompt({
  venueName,
  city,
  venueSummary,
  currentDescription,
}: {
  venueName: string;
  city?: string;
  venueSummary?: string;
  currentDescription?: string;
}): { system: string; user: string; maxTokens: number } {
  const location = typeof city === "string" ? city.trim() : "";
  let userPrompt = `Venue name: ${venueName}`;
  if (location) {
    userPrompt += `\nLocation: ${location}`;
  }
  const summary = guestFacingDraft(venueSummary);
  if (summary) {
    userPrompt += `\nVenue summary (facts only — do not copy or discuss):\n${summary}`;
  }
  const draft = guestFacingDraft(currentDescription);
  if (draft) {
    userPrompt += `\nCurrent footer line to improve (rewrite it, do not quote or analyse it):\n${draft}`;
  }

  userPrompt += `

Write the one-line footer blurb shown under the logo for guests.
- 1–2 warm sentences about this venue
- At most 35 words and 180 characters
- Plain text only
- Do not mention writing tasks, drafts, UK vs India, or these rules
- Reply with the blurb only`;

  return {
    system:
      "You write short guest-facing venue footer lines. Reply with the finished blurb only — never planning, analysis, or restated instructions.",
    user: userPrompt,
    maxTokens: 120,
  };
}

function finalisePlainCopy(raw: string, contentType: ContentType): string {
  const summary = toUserFacingMarketingCopy(raw);
  if (!summary || summary === "REGENERATE") return "";

  if (contentType !== "about" && contentType !== "footer") {
    return summary
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  const clean = summary
    .replace(/^["']|["']$/g, "")
    .replace(
      /^(Here( is|'s)|This is|I suggest|Below is|Following is|We wrote|The following is|Let me give you|I have created)\s*.*?:?\s*/i,
      "",
    )
    .replace(/^(Revised|Updated)?\s*description\s*:\s*/i, "")
    .replace(/^As a\b.*?,\s*/i, "")
    .replace(/\b(?:therefore|moreover|furthermore|consequently)\b/gi, "")
    .trim();

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
    "we need",
  ];

  if (
    bannedPrefixes.some((prefix) => clean.toLowerCase().startsWith(prefix)) ||
    looksLikeAiInstructionLeak(clean)
  ) {
    return "";
  }

  return clean;
}

function finaliseFooterBlurb(raw: string): string {
  let clean = finalisePlainCopy(raw, "footer");
  if (!clean) {
    clean = toUserFacingMarketingCopy(raw);
  }
  if (!clean || looksLikeAiInstructionLeak(clean)) return "";
  const clipped = clipFooterBrandDescription(clean);
  if (!clipped || looksLikeAiInstructionLeak(clipped)) return "";
  return clipped;
}

export async function POST(req: Request) {
  try {
    const {
      title,
      currentDescription,
      ctaText,
      ctaUrl,
      description,
      city,
      event_name,
      sub_title,
      event_category_name,
      banner_heading,
      banner_sub_heading,
      contentType = "about",
      policySection,
    } = await req.json();

    const aiConfig = await resolveAiRuntimeConfig();
    if (!aiConfig.isConfigured) {
      return NextResponse.json(aiUnconfiguredPayload(), { status: 500 });
    }

    const venueName =
      typeof title === "string" && title.trim() ? title.trim() : "Our venue";

    let systemContent: string;
    let userPrompt: string;
    let maxTokens = 300;
    let temperature = 0.7;

    if (contentType === "policy") {
      const policy = buildPolicyPrompt({
        venueName,
        policySection: policySection || "Terms & Conditions",
        currentDescription,
      });
      systemContent = policy.system;
      userPrompt = policy.user;
      maxTokens = policy.maxTokens;
    } else if (contentType === "page") {
      const page = buildPagePrompt({
        venueName,
        pageName:
          typeof policySection === "string" && policySection.trim()
            ? policySection.trim()
            : "About Us",
        currentDescription,
      });
      systemContent = page.system;
      userPrompt = page.user;
      maxTokens = page.maxTokens;
    } else if (contentType === "contact") {
      const contact = buildContactPrompt({
        venueName,
        currentDescription,
      });
      systemContent = contact.system;
      userPrompt = contact.user;
      maxTokens = contact.maxTokens;
    } else if (contentType === "footer") {
      const footer = buildFooterPrompt({
        venueName,
        city: typeof city === "string" ? city : undefined,
        venueSummary: typeof description === "string" ? description : undefined,
        currentDescription,
      });
      systemContent = footer.system;
      userPrompt = footer.user;
      maxTokens = footer.maxTokens;
      temperature = 0.35;
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
        "You are a professional business content writer. Output ONLY the final customer-facing description — never thinking, analysis, role, task, constraints, or drafting notes." +
        "\n\nRULES:\n" +
        "1. Write 2-3 full sentences.\n" +
        "2. Max 50 words / 340 characters.\n" +
        "3. DO NOT include any phrases like 'Here is', 'This is', 'The following', etc.\n" +
        "4. DO NOT explain anything or add labels.\n" +
        "5. Respond ONLY with the final description text. No extra output.\n" +
        "If you break any rule, respond with 'REGENERATE'.";
    }

    let result: FallbackResult = await tryModelsWithFallback(
      aiConfig,
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
        temperature,
        max_tokens: maxTokens,
        ...AI_PLAIN_TEXT,
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
          ...aiRuntimeFailureMeta(aiConfig),
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

    const rawContent = result.data.choices?.[0]?.message?.content ?? "";
    let cleanSummary =
      contentType === "footer"
        ? finaliseFooterBlurb(rawContent)
        : finalisePlainCopy(rawContent, contentType);

    // Footer blurbs are short and easy to over-run; one focused retry when the
    // first pass leaked instructions or clipped to empty.
    if (contentType === "footer" && !cleanSummary) {
      const retryPrompt = buildFooterPrompt({
        venueName,
        city: typeof city === "string" ? city : undefined,
        venueSummary: typeof description === "string" ? description : undefined,
        currentDescription: undefined,
      });
      const retry = await tryModelsWithFallback(aiConfig, {
        messages: [
          { role: "system", content: retryPrompt.system },
          { role: "user", content: retryPrompt.user },
        ],
        temperature: 0.2,
        max_tokens: retryPrompt.maxTokens,
        ...AI_PLAIN_TEXT,
      });
      if (retry.success && retry.data) {
        result = retry;
        cleanSummary = finaliseFooterBlurb(
          retry.data.choices?.[0]?.message?.content ?? "",
        );
      }
    }

    if (!cleanSummary) {
      return NextResponse.json(
        {
          error:
            "Failed to generate a valid description within limits. Please try again.",
        },
        { status: 500 }
      );
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
