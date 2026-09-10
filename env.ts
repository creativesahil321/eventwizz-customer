import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side environment variables
   */
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXTAUTH_SECRET: z.string(),
    NEXTAUTH_URL: z.string(),
    /** Optional fallback only. Live AI keys live in admin Settings, not env. */
    GROQ_API_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    FACEBOOK_CLIENT_ID: z.string().min(1),
    FACEBOOK_CLIENT_SECRET: z.string().min(1),
    /** Optional remove.bg API key for AI logo background removal */
    REMOVE_BG_API_KEY: z.string().optional(),
    /**
     * Backend endpoint the Next.js server calls to resolve the active AI
     * provider config (base URL, key, models). Required now that GROQ_API_KEY
     * is no longer in the frontend env.
     */
    AI_RUNTIME_URL: z.string().url().optional(),
    /** Shared secret sent to AI_RUNTIME_URL so only our server can read the key. */
    AI_RUNTIME_SECRET: z.string().optional(),
  },

  /**
   * Client-side environment variables
   */
  client: {
    NEXT_PUBLIC_NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"), // ✅ must be prefixed
    NEXT_PUBLIC_API_URL: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().min(1),
    NEXT_PUBLIC_SOCKET_URL: z.string().min(1),
    NEXT_PUBLIC_DEV_MODE: z.preprocess((val) => val === "true", z.boolean()),
    NEXT_PUBLIC_ENABLE_I18N: z.preprocess((val) => val === "true", z.boolean()),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
    NEXT_PUBLIC_WHITE_LABEL_URL: z.string().min(1),
    NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING: z
      .preprocess((val) => val === "true", z.boolean())
      .default(false),
  },

  /**
   * Runtime Environment Variables
   */
  runtimeEnv: {
    // Server
    NODE_ENV: process.env.NODE_ENV ?? "development",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
    FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID ?? "",
    FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    REMOVE_BG_API_KEY: process.env.REMOVE_BG_API_KEY,
    AI_RUNTIME_URL: process.env.AI_RUNTIME_URL,
    AI_RUNTIME_SECRET: process.env.AI_RUNTIME_SECRET,
    // Client
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV ?? "development", // copy of NODE_ENV
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? "",
    NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE ?? "false",
    NEXT_PUBLIC_ENABLE_I18N: process.env.NEXT_PUBLIC_ENABLE_I18N ?? "false",
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    NEXT_PUBLIC_WHITE_LABEL_URL: process.env.NEXT_PUBLIC_WHITE_LABEL_URL ?? "",
    NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING:
      process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING ?? "false",
  },

  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.npm_lifecycle_event?.startsWith("test")) ||
    process.argv.some((a) => a.includes("test")),
  emptyStringAsUndefined: true,
});
