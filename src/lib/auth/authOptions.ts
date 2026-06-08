import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { authService } from "@/services/common/auth/auth.service";
import { env } from "@/env";
import { UserType } from "@/types/auth.types";
import {
  OAuthTenantInfo,
  storeOAuthTenantInfo,
  storeOAuthErrorMessage,
  getOAuthTenantInfo,
  getOAuthErrorMessage,
  buildOAuthErrorRedirectUrl,
  extractErrorMessage,
} from "./oauth-utils";
import { VenueLocation } from "@/types/api.types";
import {
  resolveDefaultVenueLocation,
  SessionVenueLocation,
  slimVenueLocationForSession,
  slimVenueLocationsForSession,
} from "./session-location";

// Extend global to include our OAuth tenant info
declare global {
  var __OAUTH_TENANT_INFO: OAuthTenantInfo | undefined;
  var __OAUTH_ERROR_MESSAGE: string | undefined;
}

// Define Custom User Interface
interface CustomUser {
  id?: string; // Keep id for internal use but don't store in session
  email: string;
  name?: string;
  image?: string;
  first_name?: string;
  last_name?: string;
  account_type: UserType;
  active_role?: string;
  vendor_id?: string;
  admin_id?: string;
  customer_id?: string;
  avatar?: string;
  token?: string;
  uuid?: string;
  isOnboarded?: boolean;
  on_boarding_step?: number;
  vendor_location_id?: string | null;
  event_id?: string | number | null;
  status?: string;
  permissions?: string[];
  has_payment_provider?: boolean;
}

// Define the API user type with all required fields
interface ApiUser {
  id?: number;
  uuid?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  name?: string;
  avatar?: string;
  status?: string;
}

// Cast response to include standardized field names
interface LoginResponse {
  user: ApiUser;
  token: string;
  active_role?: string;
  role?: string;
  account_type?: string;
  user_type?: string;
  on_boarding_step?: number;
  vendor_location_id?: number;
  isOnboarded?: boolean;
  event_id?: number;
  permissions?: string[];
  has_payment_provider?: boolean;
}

// Extend the credentials type to include our custom fields
declare module "next-auth/providers/credentials" {
  interface CredentialsInput {
    email: string;
    password?: string;
    token?: string;
    active_role?: string; // Current standardized field
    account_type?: string; // Current standardized field
    userId?: string;
    domain_name?: string;
    remember?: string;
    uuid?: string;
    registration?: string;
    isOnboarded?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar?: string;
    on_boarding_step?: string;
    vendor_location_id?: string;
    event_id?: string;
    status?: string;
    created_at?: string;
    permissions?: string[];
  }
}

// Extend the JWT and Session types
declare module "next-auth" {
  interface JWT {
    account_type: string;
    active_role?: string;
    user_id?: string;
    isOnboarded?: boolean;
    token?: string;
    uuid?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    on_boarding_step?: number;
    vendor_location_id?: string | null;
    event_id?: string | number | null;
    status?: string;
    permissions?: string[];
  }

  interface Session {
    user: {
      last_completed_step: any;
      venue_locations?: SessionVenueLocation[];
      default_venue_location?: SessionVenueLocation;
      name: string | null;
      email: string | null;
      account_type: string;
      active_role?: string;
      user_id?: string;
      isOnboarded: boolean;
      token: string | undefined;
      uuid: string | undefined;
      first_name?: string;
      last_name?: string;
      avatar?: string;
      on_boarding_step?: number;
      vendor_location_id?: string | null;
      event_id?: string | number | null;
      status?: string;
      permissions?: string[];
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    FacebookProvider({
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
        registration: { label: "Registration", type: "text" },
        active_role: { label: "Active Role", type: "text" },
        account_type: { label: "Account Type", type: "text" },
        userId: { label: "UserId", type: "text" },
        domain_name: { label: "Domain Name", type: "text" },
        remember: { label: "Remember", type: "boolean" },
        uuid: { label: "UUID", type: "text" },
        isOnboarded: { label: "Is Onboarded", type: "text" },
        first_name: { label: "First Name", type: "text" },
        last_name: { label: "Last Name", type: "text" },
        avatar: { label: "Avatar URL", type: "text" },
        on_boarding_step: { label: "Onboarding Step", type: "text" },
        vendor_location_id: { label: "Vendor Location ID", type: "text" },
        event_id: { label: "Event ID", type: "text" },
        status: { label: "Status", type: "text" },
        permissions: { label: "Permissions", type: "text" },
        has_payment_provider: { label: "Has Payment Provider", type: "text" },
      },
      // NextAuth types with our custom fields
      async authorize(credentials) {
        // Cast credentials to include our custom fields
        const typedCredentials = credentials as {
          email: string;
          password?: string;
          token?: string;
          active_role?: string;
          account_type?: string;
          userId?: string;
          uuid?: string;
          isOnboarded?: string;
          domain_name?: string;
          remember?: string;
          registration?: string;
          first_name?: string;
          last_name?: string;
          avatar?: string;
          on_boarding_step?: string;
          vendor_location_id?: string;
          event_id?: string;
          status?: string;
          permissions?: string;
          has_payment_provider?: string;
        };

        // Handle direct token-based login (from registration or manual API login)
        if (typedCredentials?.token && typedCredentials?.email) {
          const isOnboarded = typedCredentials.isOnboarded === "true";
          const has_payment_provider =
            typedCredentials.has_payment_provider === "true";

          const active_role = typedCredentials.active_role;
          const account_type = typedCredentials.account_type;

          const eventId = typedCredentials.event_id
            ? isNaN(Number(typedCredentials.event_id))
              ? typedCredentials.event_id
              : Number(typedCredentials.event_id)
            : undefined;

          return {
            id: typedCredentials.userId || String(Date.now()),
            email: typedCredentials.email,
            account_type: account_type as UserType,
            active_role: active_role,
            token: typedCredentials.token,
            isOnboarded,
            uuid: typedCredentials.uuid,
            first_name: typedCredentials.first_name,
            last_name: typedCredentials.last_name,
            avatar: typedCredentials.avatar,
            on_boarding_step: typedCredentials.on_boarding_step
              ? parseInt(typedCredentials.on_boarding_step)
              : undefined,
            vendor_location_id: typedCredentials.vendor_location_id,
            event_id: eventId,
            status: typedCredentials.status,
            permissions: typedCredentials.permissions
              ? JSON.parse(typedCredentials.permissions)
              : [],
            has_payment_provider,
          } as unknown as import("next-auth").User;
        }

        // Regular login flow using the real API
        if (!typedCredentials?.email || !typedCredentials?.password) {
          throw new Error("Email and password are required.");
        }

        try {
          const response = await authService.login({
            email: typedCredentials.email,
            password: typedCredentials.password,
            user_agent: "NextAuth",
            os:
              typeof window !== "undefined"
                ? window.navigator.platform
                : "Unknown",
            ip_address: "127.0.0.1", // This will be overridden by the server
            domain_name: typedCredentials.domain_name,
          });

          if (!response.status) {
            throw new Error(response.message || "Invalid email or password.");
          }

          // Cast response to include user_type
          const data = response.data as LoginResponse;

          const { user, token, active_role } = data;
          const account_type = data.account_type;

          // Extract event_id and vendor_location_id
          const { event_id, vendor_location_id } = data;

          // Extract isOnboarded with consistent handling
          // Default to false if not present for safety
          const isOnboarded =
            "isOnboarded" in data ? !!data.isOnboarded : false;

          return {
            id: user.id?.toString() || String(Date.now()),
            email: user.email,
            name: user.name,
            account_type: account_type as UserType,
            active_role: active_role,
            token: token,
            avatar: user.avatar,
            isOnboarded,
            uuid: user.uuid || undefined, // Use undefined instead of null
            first_name: user.first_name,
            last_name: user.last_name,
            on_boarding_step: data.on_boarding_step,
            vendor_location_id: vendor_location_id || data.vendor_location_id,
            event_id: event_id || data.event_id, // Use the extracted value or fallback
            status: user.status,
            permissions: data.permissions || [],
            has_payment_provider: data.has_payment_provider ?? false,
          } as unknown as import("next-auth").User;
        } catch {
          throw new Error("Invalid email or password.");
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const customUser = user as CustomUser;

        // Save basic user information using standardized field names
        token.account_type = customUser.account_type;
        token.active_role = customUser.active_role;

        token.user_id =
          customUser.account_type === "vendor"
            ? customUser.vendor_id
            : customUser.account_type === "admin"
            ? customUser.admin_id
            : customUser.customer_id;
        token.id = customUser.id;

        // Handle isOnboarded flag
        token.isOnboarded = customUser.isOnboarded;

        // Store token
        if (customUser.token) {
          token.token = customUser.token;
        }

        // Save UUID if available
        if (customUser.uuid) {
          token.uuid = customUser.uuid;
        }

        // Save additional user information
        token.first_name = customUser.first_name;
        token.last_name = customUser.last_name;
        token.avatar = customUser.avatar;
        token.on_boarding_step = customUser.on_boarding_step;
        token.vendor_location_id = customUser.vendor_location_id;
        token.event_id = customUser.event_id;
        token.status = customUser.status;

        // Store permissions if available from login
        if (customUser.permissions) {
          token.permissions = customUser.permissions;
        }

        // Payment gateway setup state (vendor)
        token.has_payment_provider = customUser.has_payment_provider ?? false;
      }

      // Handle session updates
      if (trigger === "update") {
        // Update user profile information if provided
        if (session?.first_name !== undefined) {
          token.first_name = session.first_name;
        }

        if (session?.last_name !== undefined) {
          token.last_name = session.last_name;
        }

        if (session?.avatar !== undefined) {
          token.avatar = session.avatar;
        }

        // Update standardized fields if provided
        if (session?.account_type !== undefined) {
          token.account_type = session.account_type;
        }

        if (session?.active_role !== undefined) {
          token.active_role = session.active_role;
        }

        // Existing fields
        if (session?.isOnboarded !== undefined) {
          token.isOnboarded = session.isOnboarded;
        }

        if (session?.vendor_location_id !== undefined) {
          token.vendor_location_id = session.vendor_location_id;
        }

        if (session?.event_id !== undefined) {
          token.event_id = session.event_id;
        }

        if (session?.on_boarding_step !== undefined) {
          token.on_boarding_step = session.on_boarding_step;
        }

        if (session?.permissions) {
          token.permissions = session.permissions;
        }

        if (session?.has_payment_provider !== undefined) {
          token.has_payment_provider = session.has_payment_provider;
        }

        // Persist slim vendor locations so the cookie stays under 4096 bytes
        if (session?.venue_locations !== undefined) {
          token.venue_locations = slimVenueLocationsForSession(
            session.venue_locations,
          );
          token.default_venue_location = resolveDefaultVenueLocation(
            token.venue_locations as SessionVenueLocation[] | undefined,
            slimVenueLocationForSession(session.default_venue_location),
          );
        } else if (session?.default_venue_location !== undefined) {
          token.default_venue_location = slimVenueLocationForSession(
            session.default_venue_location,
          );
        }
      }

      return token;
    },
    async session({ session, token }) {
      const isCustomer = token.account_type === "customer";

      // Customer session is minimal – no vendor/onboarding/permission fields
      if (isCustomer) {
        return {
          ...session,
          user: {
            email: session.user?.email ?? null,
            name: session.user?.name ?? null,
            account_type: token.account_type as string,
            active_role: token.active_role as string,
            user_id: token.user_id as string,
            token: token.token as string,
            uuid: token.uuid as string | undefined,
            first_name: token.first_name,
            last_name: token.last_name,
            avatar: token.avatar,
            status: token.status,
            permissions: [],
          },
        };
      }

      return {
        ...session,
        user: {
          email: session.user?.email ?? null,
          name: session.user?.name ?? null,
          account_type: token.account_type as string,
          active_role: token.active_role as string,
          user_id: token.user_id as string,
          isOnboarded: Boolean(token.isOnboarded),
          token: token.token as string,
          uuid: token.uuid as string | undefined,
          first_name: token.first_name,
          last_name: token.last_name,
          avatar: token.avatar,
          on_boarding_step: token.on_boarding_step,
          vendor_location_id: token.vendor_location_id,
          event_id: token.event_id,
          status: token.status,
          permissions: token.permissions || [],
          has_payment_provider: Boolean(token.has_payment_provider),
          venue_locations: token.venue_locations as SessionVenueLocation[] | undefined,
          default_venue_location: resolveDefaultVenueLocation(
            token.venue_locations as SessionVenueLocation[] | undefined,
            token.default_venue_location as SessionVenueLocation | undefined,
          ),
        },
      };
    },
    async signIn({ user, account }) {
      // Handle OAuth providers (Google, Facebook, Azure AD)
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          // Extract tenant info from global storage
          const tenantInfo = getOAuthTenantInfo() || {
            domain: env.NEXT_PUBLIC_WHITE_LABEL_URL,
            website_role: "admin",
            account_type: "vendor",
            parentDomain: env.NEXT_PUBLIC_WHITE_LABEL_URL,
          };

          // Log tenant info and API call parameters
          console.log("🏢 OAuth Tenant Info:", {
            domain: tenantInfo.domain,
            website_role: tenantInfo.website_role,
            account_type: tenantInfo.account_type,
            parentDomain: tenantInfo.parentDomain,
          });

          console.log("📡 Social Auth API Call:", {
            provider: account.provider,
            email: user.email,
            name: user.name,
            provider_id: account.providerAccountId,
            domain: tenantInfo.domain,
            account_type: tenantInfo.account_type,
            parent_domain: tenantInfo.parentDomain,
          });

          // Call the social auth API endpoint
          const response = await authService.socialAuth({
            provider: account.provider,
            email: user.email!,
            name: user.name!,
            provider_id: account.providerAccountId,
            // Use domain detection data from tenant info
            domain: tenantInfo.domain,
            account_type: tenantInfo.account_type,
            parent_domain: tenantInfo.parentDomain,
          });

          if (response.status) {
            // Log the complete API response for debugging
            console.log("🔍 Social Auth API Response:", {
              status: response.status,
              message: response.message,
              data: response.data,
              user: response.data?.user,
              token: response.data?.token ? "***TOKEN***" : "No token",
              active_role: response.data?.active_role,
              isOnboarded: response.data?.isOnboarded,
              vendor_location_id: response.data?.vendor_location_id,
              permissions: response.data?.permissions,
            });

            // Map the response data to user object (same as credentials flow)
            const {
              user: userData,
              token,
              active_role,
              isOnboarded,
              vendor_location_id,
              permissions,
            } = response.data;

            // Apply your existing user data structure
            Object.assign(user, {
              account_type: active_role || tenantInfo.account_type || "vendor", // ✅ Prioritize backend response over frontend tenant info
              active_role: active_role,
              token: token,
              isOnboarded: isOnboarded || false,
              uuid: userData.uuid,
              first_name: userData.first_name,
              last_name: userData.last_name,
              avatar: userData.avatar,
              vendor_location_id: vendor_location_id
                ? String(vendor_location_id)
                : undefined,
              permissions: permissions || [],
              status: userData.status,
            });

            // Log the final user object after assignment
            const finalUser = user as CustomUser;
            console.log("👤 Final User Object:", {
              email: finalUser.email,
              account_type: finalUser.account_type,
              active_role: finalUser.active_role,
              isOnboarded: finalUser.isOnboarded,
              vendor_location_id: finalUser.vendor_location_id,
              permissions: finalUser.permissions,
              hasToken: !!finalUser.token,
              hasUuid: !!finalUser.uuid,
            });

            // Note: Zustand store sync is handled by SessionValidator component in providers.tsx

            return true;
          }
          console.log(response, "This is social login response");

          console.error(
            "❌ Social Auth Failed - Response Status:",
            response.status,
            "Message:",
            response.message
          );

          // Store the error message globally so we can access it in the redirect
          storeOAuthErrorMessage(
            (response as { message?: string }).message ||
              "Social authentication failed"
          );

          // Return false to let NextAuth handle the error, but store the message for later use
          return false;
        } catch (error) {
          console.error("❌ Social auth error:", error);

          // Extract error message using utility function
          const errorMessage = extractErrorMessage(error);

          // Store the error message globally so we can access it in the redirect
          storeOAuthErrorMessage(errorMessage);

          return false;
        }
      }

      // Handle credentials provider (existing logic)
      const customUser = user as CustomUser;
      // Allow sign in as long as we have at least a user type or a token
      if (!customUser.account_type && !customUser.token) {
        return false;
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Extract and store tenant info from callback URL if present
      try {
        const urlObj = new URL(url, baseUrl);
        const tenantParam = urlObj.searchParams.get("tenant");

        if (tenantParam) {
          const tenantInfo = JSON.parse(decodeURIComponent(tenantParam));

          // Store globally for the signIn callback to access
          storeOAuthTenantInfo(tenantInfo);

          // Check if this is an error URL (contains error parameter)
          const errorParam = urlObj.searchParams.get("error");

          if (errorParam) {
            // If there's an error, redirect back to the original domain's login page with the error
            const originalDomain = tenantInfo.domain;
            const protocol = urlObj.protocol;
            const port = urlObj.port ? `:${urlObj.port}` : "";

            // Check if we have a stored error message from the API
            let errorMessage = errorParam;
            const storedError = getOAuthErrorMessage();
            if (storedError) {
              errorMessage = storedError;
            }

            // Redirect to login page on the original domain with error parameter
            const errorRedirectUrl = buildOAuthErrorRedirectUrl(
              originalDomain,
              protocol,
              port,
              errorMessage
            );
            return errorRedirectUrl;
          }

          // Redirect back to the original subdomain with correct dashboard path
          const originalDomain = tenantInfo.domain;
          const protocol = urlObj.protocol;
          const port = urlObj.port ? `:${urlObj.port}` : "";

          // Determine correct redirect path based on account_type (same logic as normal login)
          // For OAuth, we'll redirect to a safe page and let middleware handle proper routing
          // based on actual user data from the session
          let redirectPath = "/";
          if (tenantInfo.account_type === "customer") {
            redirectPath = "/customer/dashboard";
          } else if (tenantInfo.account_type === "vendor") {
            // For vendors, redirect to welcome page - middleware will handle proper routing
            // based on actual user data (onboarding status, location selection, etc.)
            redirectPath = "/welcome/select-location";
          } else {
            redirectPath = `/${tenantInfo.account_type}/dashboard`;
          }

          const redirectBackUrl = `${protocol}//${originalDomain}${port}${redirectPath}`;

          // Log redirect information
          console.log("🔄 OAuth Redirect:", {
            originalDomain,
            protocol,
            port,
            tenantAccountType: tenantInfo.account_type,
            redirectPath,
            finalRedirectUrl: redirectBackUrl,
          });

          return redirectBackUrl;
        }
      } catch (error) {
        console.error("Error processing tenant info in redirect:", error);
      }

      // If URL is relative, prepend baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // If URL is absolute and matches our domain pattern, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Handle subdomain redirects within our domain
      const urlObj = new URL(url);

      // Check if it's a subdomain of our main domain
      if (
        urlObj.hostname.endsWith(`.${env.NEXT_PUBLIC_WHITE_LABEL_URL}`) ||
        urlObj.hostname === env.NEXT_PUBLIC_WHITE_LABEL_URL
      ) {
        return url;
      }

      // For any other external URLs, redirect to baseUrl

      return baseUrl;
    },
  },
  debug: env.NODE_ENV === "development",
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // Only set domain for subdomain routing, otherwise use default (current domain)
        ...(env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING && {
          domain: `.${env.NEXT_PUBLIC_WHITE_LABEL_URL}`,
        }),
        secure: env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        ...(env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING && {
          domain: `.${env.NEXT_PUBLIC_WHITE_LABEL_URL}`,
        }),
        secure: env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        ...(env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING && {
          domain: `.${env.NEXT_PUBLIC_WHITE_LABEL_URL}`,
        }),
        secure: env.NODE_ENV === "production",
      },
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        ...(env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING && {
          domain: `.${env.NEXT_PUBLIC_WHITE_LABEL_URL}`,
        }),
        secure: env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 minutes
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        ...(env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING && {
          domain: `.${env.NEXT_PUBLIC_WHITE_LABEL_URL}`,
        }),
        secure: env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 minutes
      },
    },
  },
};
