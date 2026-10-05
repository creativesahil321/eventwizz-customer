import { NextRequest, NextResponse } from "next/server";
import type { AiProviderType } from "@/lib/ai/providers";
import { normalizeListedModels } from "@/lib/ai/model-catalog";
import { enforceSameOrigin } from "@/lib/security/api-guard";
import { getSessionJwtFromRequest } from "@/lib/auth/server-token";

/**
 * Lists chat models from a provider using the admin-pasted API key.
 * POST { provider_type, base_url, api_key }
 *
 * Admin-only: this route fetches an arbitrary base_url server-side, so it must
 * never be reachable unauthenticated (prevents SSRF/credential-relay abuse).
 */
export async function POST(req: NextRequest) {
  const crossOrigin = enforceSameOrigin(req);
  if (crossOrigin) return crossOrigin;

  const sessionJwt = await getSessionJwtFromRequest(req);
  if (!sessionJwt?.token || sessionJwt.account_type !== "admin") {
    return NextResponse.json(
      { error: "Not authorized.", models: [] },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json()) as {
      provider_type?: AiProviderType;
      base_url?: string;
      api_key?: string;
    };

    const providerType =
      body.provider_type === "anthropic" ? "anthropic" : "openai_compatible";
    const baseUrl = (body.base_url ?? "").trim().replace(/\/+$/, "");
    const apiKey = (body.api_key ?? "").trim();

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: "Base URL and API key are required to list models." },
        { status: 400 },
      );
    }

    const models =
      providerType === "anthropic"
        ? await listAnthropicModels(baseUrl, apiKey)
        : await listOpenAiCompatibleModels(baseUrl, apiKey);

    if (models.length === 0) {
      return NextResponse.json(
        { error: "This key returned no chat models.", models: [] },
        { status: 422 },
      );
    }

    return NextResponse.json({ models, source: "provider" });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.slice(0, 280)
        : "Could not load models from this provider.";
    return NextResponse.json({ error: message, models: [] }, { status: 502 });
  }
}

function extractModelItems(json: unknown): Array<{
  id?: string;
  display_name?: string;
  name?: string;
}> {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== "object") return [];
  const record = json as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.models)) return record.models;
  return [];
}

function providerErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
    if (
      parsed.error &&
      typeof parsed.error === "object" &&
      parsed.error.message
    ) {
      return parsed.error.message;
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    // ignore non-JSON
  }
  if (status === 401 || status === 403) {
    return "This API key was rejected. Check the key and try again.";
  }
  return `Provider returned ${status}`;
}

async function listOpenAiCompatibleModels(baseUrl: string, apiKey: string) {
  const res = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(providerErrorMessage(res.status, raw));
  }
  const json: unknown = raw ? JSON.parse(raw) : {};
  return normalizeListedModels(extractModelItems(json), "openai_compatible");
}

async function listAnthropicModels(baseUrl: string, apiKey: string) {
  const res = await fetch(`${baseUrl}/models`, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(providerErrorMessage(res.status, raw));
  }
  const json: unknown = raw ? JSON.parse(raw) : {};
  return normalizeListedModels(extractModelItems(json), "anthropic");
}
