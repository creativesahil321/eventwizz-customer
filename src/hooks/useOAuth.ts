import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  OAUTH_PROVIDERS,
  OAUTH_ERRORS,
  ACCOUNT_TYPE_MAP,
  TENANT_ROLES,
  DOMAINS,
  type OAuthProvider,
  type TenantRole,
} from "@/constants/oauth.constants";

interface OAuthOptions {
  callbackUrl?: string;
  tenant?: string;
  website_role?: TenantRole;
  account_type?: string;
  parentDomain?: string;
}

interface UseOAuthReturn {
  signInWithGoogle: (options?: OAuthOptions) => Promise<void>;
  signInWithFacebook: (options?: OAuthOptions) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useOAuth = (): UseOAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const getAccountType = (websiteRole?: TenantRole): string => {
    if (!websiteRole) return ACCOUNT_TYPE_MAP[TENANT_ROLES.CUSTOMER];
    return (
      ACCOUNT_TYPE_MAP[websiteRole] || ACCOUNT_TYPE_MAP[TENANT_ROLES.CUSTOMER]
    );
  };

  const handleOAuthSignIn = async (
    provider: OAuthProvider,
    options?: OAuthOptions
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Detect current domain
      const currentDomain =
        typeof window !== "undefined"
          ? window.location.hostname
          : DOMAINS.MAIN_DOMAIN;

      // Get account type using the mapping
      const accountType = getAccountType(options?.website_role);

      // Create tenant information for OAuth
      const tenantInfo = {
        domain: currentDomain,
        website_role: options?.website_role || TENANT_ROLES.ADMIN,
        account_type: accountType,
        parentDomain: options?.parentDomain || DOMAINS.MAIN_DOMAIN,
      };

      // Encode tenant info in callbackUrl (NextAuth overwrites custom state)
      // IMPORTANT: Always use the main domain for OAuth callback (Google/Facebook are configured for main domain only)
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      const mainDomainUrl = `${protocol}//${DOMAINS.MAIN_DOMAIN}${port}`;
      const callbackUrl = `${mainDomainUrl}/api/auth/callback/${provider}?tenant=${encodeURIComponent(
        JSON.stringify(tenantInfo)
      )}`;

      await signIn(provider, {
        callbackUrl,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : OAUTH_ERRORS.SOCIAL_AUTH_FAILED;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = (options?: OAuthOptions) =>
    handleOAuthSignIn(OAUTH_PROVIDERS.GOOGLE, options);

  const signInWithFacebook = (options?: OAuthOptions) =>
    handleOAuthSignIn(OAUTH_PROVIDERS.FACEBOOK, options);

  return {
    signInWithGoogle,
    signInWithFacebook,
    isLoading,
    error,
    clearError,
  };
};
