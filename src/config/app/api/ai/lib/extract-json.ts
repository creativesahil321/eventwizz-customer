/**
 * Qwen and other reasoning models often wrap output in `<think>…</think>`,
 * echo the prompt JSON, then (sometimes) emit the real payload. A greedy
 * `{[\s\S]*}` match feeds JSON.parse two objects. Stripping think first can
 * also delete the only JSON if the model never closed the think block.
 */

export function stripAiReasoning(text: string): string {
  return text
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<think\b[^>]*>[\s\S]*$/gi, "")
    .replace(/<\/?think\b[^>]*>/gi, "")
    .trim();
}

const CHAT_META_PARAGRAPH =
  /^(user (asks|wants|repeats|said)|we need to (respond|interpret)|this is disallowed|must refuse|according to (the )?policy|the user(:|\s+wants|\s+asks)|we must (not|respond)|check against constraints|draft response|ready\.?\s*✅)/i;

/**
 * Chat bubbles must never include model scratchpad / policy notes after the reply.
 */
export function toUserFacingChatReply(text: string): string {
  const cleaned = stripAiReasoning(text);
  if (!cleaned) return "";

  const parts = cleaned.split(/\n\s*\n/);
  const kept: string[] = [];
  for (const part of parts) {
    const line = part.trim();
    if (!line) continue;
    if (
      CHAT_META_PARAGRAPH.test(line) ||
      /\b(must refuse|this is disallowed|scratchpad|system prompt|constraint checklists?)\b/i.test(
        line,
      )
    ) {
      break;
    }
    kept.push(part);
  }
  return kept.join("\n\n").trim();
}

const MARKETING_META_LINE =
  /^(thinking process|analyze the request|drafting|attempt\s+\d|role\s*:|task\s*:|input data|constraints|output\s*:|only final text|system prompt|user (asks|wants)|we need (a|to)|write a short footer|check against)/i;

function looksLikeScratchpad(text: string): boolean {
  return /thinking process|\*\*role:\*\*|\*\*task:\*\*|analyze the request|drafting\s*[-–]\s*attempt|constraint checklists?/i.test(
    text,
  );
}

/**
 * Prompt echo / chain-of-thought that must never land in a public field.
 * Example: "We need a short footer brand description for 'X'… existing draft mentions Mohali…"
 */
export function looksLikeAiInstructionLeak(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (MARKETING_META_LINE.test(t)) return true;
  if (looksLikeScratchpad(t)) return true;
  if (
    /^(we need (a|to)|write a (short |professional )?(footer|description)|requirements?:|the existing draft)/i.test(
      t,
    )
  ) {
    return true;
  }
  // Model echoed labeled prompt fields into the footer blurb.
  if (
    /\b(we have )?venue name\b/i.test(t) ||
    /\b(the )?summary\s*:/i.test(t) ||
    /\bvenue summary\b/i.test(t) ||
    /\blocation\s*:/i.test(t) ||
    /\w+_location\b/i.test(t)
  ) {
    return true;
  }
  return (
    /\b(existing draft|footer brand description for|must be warm|plain text only|respond only with|not the about section|which is india|,\s*not uk|max \d+ (words|characters))\b/i.test(
      t,
    ) || /'[^']{2,80}',\s*a\s+(uk\s+)?events and hospitality/i.test(t)
  );
}

function looksLikeCustomerCopy(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) return false;
  if (looksLikeScratchpad(t)) return false;
  if (looksLikeAiInstructionLeak(t)) return false;
  if (MARKETING_META_LINE.test(t)) return false;
  if (/\*\*(Role|Task|Input Data|Constraints|Output)\*\*/i.test(t)) return false;
  return /[.!?]/.test(t);
}

/**
 * TipTap "Suggest with AI" / CMS copy — never show chain-of-thought.
 */
export function toUserFacingMarketingCopy(text: string): string {
  let cleaned = stripAiReasoning(text)
    .replace(/^```(?:html|markdown|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  cleaned = cleaned.replace(
    /^#{1,3}\s*(thinking process|analysis|constraints|drafting).*$/gim,
    "",
  );

  const parts = cleaned.split(/\n\s*\n/);
  const kept: string[] = [];
  for (const part of parts) {
    const line = part.trim();
    if (!line) continue;
    if (MARKETING_META_LINE.test(line)) continue;
    if (looksLikeAiInstructionLeak(line)) continue;
    if (/\*\*(Role|Task|Input Data|Constraints|Output)\*\*/i.test(line)) continue;
    if (/^\d+\.\s+\*\*Analyze/i.test(line)) continue;
    kept.push(part.trim());
  }

  let out = kept.join("\n\n").trim();
  if (!out || looksLikeScratchpad(out) || looksLikeAiInstructionLeak(out)) {
    const prose = [...parts.map((p) => p.trim()).filter(Boolean)]
      .reverse()
      .find((p) => looksLikeCustomerCopy(p));
    out = prose ?? "";
  }
  if (out && looksLikeAiInstructionLeak(out)) return "";
  return out.trim();
}

function extractFencedBlocks(text: string): string[] {
  const out: string[] = [];
  const re = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    const block = match[1]?.trim();
    if (block) out.push(block);
    match = re.exec(text);
  }
  return out;
}

function extractThinkBlocks(text: string): string[] {
  const out: string[] = [];
  const closed = /<think\b[^>]*>([\s\S]*?)<\/think>/gi;
  let match: RegExpExecArray | null = closed.exec(text);
  while (match) {
    const block = match[1]?.trim();
    if (block) out.push(block);
    match = closed.exec(text);
  }
  if (!/<\/think>/i.test(text)) {
    const unclosed = text.match(/<think\b[^>]*>([\s\S]*)$/i);
    const block = unclosed?.[1]?.trim();
    if (block) out.push(block);
  }
  return out;
}

function extractBalancedObjects(text: string): string[] {
  const out: string[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    if (text[i] !== "{") {
      i += 1;
      continue;
    }
    let depth = 0;
    let inString = false;
    let escape = false;
    const start = i;
    for (; i < n; i += 1) {
      const c = text[i];
      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (c === "\\") {
          escape = true;
          continue;
        }
        if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === "{") depth += 1;
      else if (c === "}") {
        depth -= 1;
        if (depth === 0) {
          out.push(text.slice(start, i + 1));
          i += 1;
          break;
        }
      }
    }
  }
  return out;
}

function tryParseObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function stackAfter(text: string): {
  inString: boolean;
  stack: Array<"{" | "[">;
} {
  let inString = false;
  let escape = false;
  const stack: Array<"{" | "["> = [];
  for (const c of text) {
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") stack.push("{");
    else if (c === "[") stack.push("[");
    else if (c === "}" || c === "]") stack.pop();
  }
  return { inString, stack };
}

/** Close JSON cut off at max_tokens (hanging comma, half string, missing `}`). */
function repairTruncatedJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let candidate = text.slice(start).trim();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    let next = candidate;
    if (stackAfter(next).inString) next += '"';
    next = next.replace(/,\s*$/, "");
    next = next.replace(/:\s*$/, "");
    next = next.replace(/,\s*"[^"]*"\s*$/, "");
    next = next.replace(/,\s*$/, "");

    const { stack } = stackAfter(next);
    let suffix = "";
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      suffix += stack[i] === "{" ? "}" : "]";
    }
    const parsed = tryParseObject(next + suffix);
    if (parsed) return parsed;

    const cut = Math.max(next.lastIndexOf(","), next.lastIndexOf(":"));
    if (cut < 1) break;
    candidate = next.slice(0, cut);
  }
  return null;
}

function collectObjects(text: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const trimmed = text.trim();
  const direct = tryParseObject(trimmed);
  if (direct) found.push(direct);
  for (const raw of extractBalancedObjects(trimmed)) {
    const parsed = tryParseObject(raw);
    if (parsed) found.push(parsed);
  }
  const repaired = repairTruncatedJson(trimmed);
  if (repaired) found.push(repaired);
  return found;
}

/**
 * Parse the first usable JSON object from an AI chat completion.
 * When `preferKeys` is set, picks the object that contains those keys
 * (e.g. `stepOne` for event generate) over an echoed copy of the input.
 */
export function extractJsonObject<T>(
  raw: string,
  preferKeys: string[] = [],
): T {
  const sources = [
    raw,
    stripAiReasoning(raw),
    ...extractThinkBlocks(raw),
    ...extractFencedBlocks(raw),
  ].filter((s) => s.trim().length > 0);

  const candidates: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    for (const obj of collectObjects(src)) {
      const key = JSON.stringify(obj);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(obj);
    }
  }

  if (candidates.length === 0) {
    throw new Error("No valid JSON found in response");
  }

  if (preferKeys.length > 0) {
    const preferred = candidates.find((obj) =>
      preferKeys.every((k) => k in obj),
    );
    if (preferred) return preferred as T;
  }

  candidates.sort(
    (a, b) => JSON.stringify(b).length - JSON.stringify(a).length,
  );
  return candidates[0] as T;
}

/** Groq Qwen/GPT-OSS: skip chain-of-thought so the user never sees `<think>`. */
export const AI_HIDE_REASONING = {
  reasoning_format: "hidden" as const,
  reasoning_effort: "none" as const,
};

/** Structured JSON routes. Do not use reasoning_format hidden — Qwen then returns empty content. */
export const AI_JSON_COMPLETION = {
  response_format: { type: "json_object" as const },
  reasoning_effort: "none" as const,
};

/** Plain-text CMS copy. Do not use reasoning_format hidden — Qwen then returns empty content. */
export const AI_PLAIN_TEXT = {
  reasoning_effort: "none" as const,
};
