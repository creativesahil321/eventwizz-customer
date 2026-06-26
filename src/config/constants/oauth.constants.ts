import { env } from "@/env";

// OAuth Provider Constants
export const OAUTH_PROVIDERS = {
  GOOGLE: "google",
  FACEBOOK: "facebook",
} as const;

export type OAuthProvider =
  (typeof OAUTH_PROVIDERS)[keyof typeof OAUTH_PROVIDERS];

// Tenant Role Constants
export const TENANT_ROLES = {
  ADMIN: "admin",
  VENDOR: "vendor",
  CUSTOMER: "customer",
} as const;

export type TenantRole = (typeof TENANT_ROLES)[keyof typeof TENANT_ROLES];

// Account Type Constants
export const ACCOUNT_TYPES = {
  VENDOR: "vendor",
  CUSTOMER: "customer",
  ADMIN: "admin",
} as const;

export type AccountType = (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];

// Domain Constants
export const DOMAINS = {
  MAIN_DOMAIN:
    env.NEXT_PUBLIC_WHITE_LABEL_URL || "eventwizz.socreativesupport.com",
  LOCALHOST: "localhost",
} as const;

// OAuth State Parameter Names
export const OAUTH_PARAMS = {
  TENANT: "tenant",
  STATE: "state",
  CALLBACK_URL: "callbackUrl",
} as const;

// OAuth Error Messages
export const OAUTH_ERRORS = {
  TENANT_INFO_MISSING: "No tenant info found in OAuth flow",
  TENANT_INFO_PARSE_FAILED: "Failed to parse tenant info",
  SOCIAL_AUTH_FAILED: "Social authentication failed",
  PROVIDER_NOT_SUPPORTED: "OAuth provider not supported",
  MISSING_CREDENTIALS: "Email and password are required",
  INVALID_CREDENTIALS: "Invalid email or password",
} as const;

// OAuth Success Messages
export const OAUTH_SUCCESS = {
  VIDEO_UPLOADED: "Video uploaded successfully",
  EVENT_CREATED: "Event created successfully!",
  EVENT_UPDATED: "Event updated successfully!",
} as const;

// OAuth Debug Log Prefixes
export const OAUTH_LOGS = {
  DEBUG: "🔍",
  SUCCESS: "✅",
  ERROR: "❌",
  WARNING: "⚠️",
  INFO: "ℹ️",
} as const;

// Account Type Mapping
export const ACCOUNT_TYPE_MAP: Record<TenantRole, AccountType> = {
  [TENANT_ROLES.ADMIN]: ACCOUNT_TYPES.VENDOR,
  [TENANT_ROLES.VENDOR]: ACCOUNT_TYPES.CUSTOMER,
  [TENANT_ROLES.CUSTOMER]: ACCOUNT_TYPES.CUSTOMER,
} as const;

// OAuth Configuration
export const OAUTH_CONFIG = {
  GOOGLE: {
    PROMPT: "consent",
    ACCESS_TYPE: "offline",
    RESPONSE_TYPE: "code",
  },
  FACEBOOK: {
    PROMPT: "consent",
  },
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  IMAGE: {
    MAX_SIZE: 2 * 1024 * 1024, // 2MB
    ACCEPTED_TYPES: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
  },
  VIDEO: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ACCEPTED_TYPES: {
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
      "video/ogg": [".ogv"],
      "video/quicktime": [".mov"],
      "video/x-msvideo": [".avi"],
      "video/x-matroska": [".mkv"],
    },
  },
  PDF: {
    MAX_SIZE: 1 * 1024 * 1024, // 1MB
    ACCEPTED_TYPES: {
      "application/pdf": [".pdf"],
    },
  },
} as const;

// Cookie Configuration
export const COOKIE_CONFIG = {
  DOMAIN: `.${
    process.env.NEXT_PUBLIC_WHITE_LABEL_URL || "eventwizz.socreativesupport.com"
  }`,
  PATH: "/",
  SAME_SITE: "lax" as const,
  HTTP_ONLY: true,
  SECURE: process.env.NODE_ENV === "production",
  MAX_AGE: {
    STATE: 15 * 60, // 15 minutes
    SESSION: 7 * 24 * 60 * 60, // 7 days
  },
} as const;
