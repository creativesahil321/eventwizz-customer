import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/env";

type UserType = "admin" | "vendor" | "customer";

// Constants for routes
const PROTECTED_ROUTES = ["/admin", "/customer", "/vendor"];
const VALID_USER_TYPES: UserType[] = ["admin", "vendor", "customer"];

// Handle authentication flow protection
function handleAuthFlow(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const authRoutes: Record<
    string,
    { condition: (req: NextRequest) => boolean; redirect: string }
  > = {
    "/auth/register/verify-otp": {
      condition: (req) => !!req.cookies.get("verification_email"),
      redirect: "/auth/register",
    },
    "/auth/register/create-password": {
      condition: (req) => !!req.cookies.get("otp_verified"),
      redirect: "/auth/register",
    },
    "/auth/password-reset": {
      condition: (req) => {
        const token = req.nextUrl.searchParams.get("token");
        const email = req.nextUrl.searchParams.get("email");
        return (
          !!(token && email) || !!req.cookies.get("password_reset_requested")
        );
      },
      redirect: "/auth/forgot-password",
    },
    "/auth/forgot-password": {
      condition: () => true,
      redirect: "",
    },
  };

  const route = authRoutes[pathname];
  if (route) {
    return route.condition(req)
      ? NextResponse.next()
      : NextResponse.redirect(new URL(route.redirect, req.url));
  }
  return null;
}

// Handle subdomain-based routing
async function handleSubdomainRouting(
  req: NextRequest
): Promise<NextResponse | null> {
  // Check if subdomain routing is enabled via environment variable
  const subdomainRoutingEnabled = env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING;

  // If subdomain routing is disabled (e.g., for Vercel deployments), skip this logic
  if (!subdomainRoutingEnabled) {
    return null;
  }

  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const isLocalDevelopment =
    hostname.includes("localhost") || hostname.includes("127.0.0.1");

  // Improved domain detection for Vercel and other cloud platforms
  // Check for common deployment platforms
  const isVercelDomain =
    hostname.includes("vercel.app") || hostname.includes("vercel.dev");
  const isNetlifyDomain = hostname.includes("netlify.app");
  const isCloudPlatform = isVercelDomain || isNetlifyDomain;

  // For cloud platforms, we treat them as main domain unless explicitly configured
  const isMainDomain =
    isLocalDevelopment || isCloudPlatform || hostname.split(".").length <= 2;

  if (isMainDomain || pathname.startsWith("/api")) {
    return null;
  }

  // Allow auth and onboarding paths
  if (
    pathname.startsWith("/auth") ||
    pathname === "/on-boarding" ||
    pathname.startsWith("/on-boarding/") ||
    pathname.startsWith("/welcome/")
  ) {
    return NextResponse.next();
  }

  // Parse subdomain to determine userType
  const subdomain = hostname.split(".")[0];
  const websiteRole: UserType | null = VALID_USER_TYPES.includes(
    subdomain as UserType
  )
    ? (subdomain as UserType)
    : null;

  // Check authentication for protected tenant routes
  if (pathname !== "/") {
    const token = await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
    });

    if (
      !token ||
      !token.account_type ||
      !VALID_USER_TYPES.includes(token.account_type as UserType)
    ) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Apply cross-domain access rules
    if (websiteRole && token.account_type !== websiteRole) {
      const isAllowed =
        (websiteRole === "vendor" && token.account_type === "customer") ||
        (websiteRole === "admin" && token.account_type === "vendor");
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }
    }

    // Rewrite URL based on user type
    if (websiteRole) {
      if (pathname.startsWith(`/${token.account_type}`)) {
        return NextResponse.next();
      }
      return NextResponse.rewrite(
        new URL(`/${token.account_type}${pathname}`, req.url)
      );
    }
  }

  return NextResponse.next();
}

// Handle protected routes on main domain
async function handleProtectedRoutes(
  req: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;

  // Skip redirects for welcome routes but make sure user is authenticated and is a vendor
  if (pathname.startsWith("/welcome/")) {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });

    if (!token || !token.account_type) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Only vendors can access welcome routes
    if (token.account_type !== "vendor") {
      return NextResponse.redirect(
        new URL(`/${token.account_type}/dashboard`, req.url)
      );
    }

    return NextResponse.next();
  }

  if (
    !PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/vendor/auth/") ||
    pathname.startsWith("/customer/auth/")
  ) {
    return null;
  }

  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });

  if (
    !token ||
    !token.account_type ||
    !VALID_USER_TYPES.includes(token.account_type as UserType)
  ) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const accountType = token.account_type as UserType;

  // STRICT ROUTE ACCESS: Ensure users can only access routes that match their role
  // This is the most secure approach since it's enforced server-side
  for (const route of PROTECTED_ROUTES) {
    // If path starts with a protected route prefix that doesn't match the user's role
    if (pathname.startsWith(route) && !route.includes(`/${accountType}`)) {
      console.log(
        `Unauthorized access attempt: ${accountType} tried to access ${pathname}`
      );
      // Log security event for monitoring

      // Redirect to their own dashboard
      return NextResponse.redirect(
        new URL(`/${accountType}/dashboard`, req.url)
      );
    }
  }

  // Vendor onboarding check
  if (accountType === "vendor") {
    // Check if vendor is onboarded
    const isOnboarded =
      Boolean(token.isOnboarded) || req.cookies.has("vendor_onboarded");

    // If not onboarded, redirect to onboarding flow, don't allow welcome paths either
    if (!isOnboarded && !pathname.startsWith("/on-boarding")) {
      return NextResponse.redirect(new URL("/on-boarding", req.url));
    }

    // For vendors that are onboarded, check if they have a location selected
    // Only redirect to welcome/select-location if they are onboarded and don't have a location
    if (
      isOnboarded &&
      !pathname.startsWith("/welcome/") &&
      !pathname.startsWith("/on-boarding") &&
      !token.vendor_location_id &&
      !req.cookies.has("vendor_location_id")
    ) {
      return NextResponse.redirect(
        new URL("/welcome/select-location", req.url)
      );
    }
  }

  if (pathname.startsWith(`/${accountType}`)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(`/${accountType}/dashboard`, req.url));
}

// Main middleware function
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and assets
  if (
    pathname === "/theme-test" ||
    pathname.startsWith("/theme-test/") ||
    // Allow direct access to location pages without authentication
    pathname.match(/^\/[^\/]+\/?$/) || // Matches /{locationSlug} pattern
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/policies" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/contact" ||
    // Allow direct access to event detail pages
    pathname.match(/^\/[^\/]+\/events\/[^\/]+\/?$/) || // Matches /{locationSlug}/events/{eventSlug} pattern
    // Allow checkout and payment page access
    pathname.startsWith("/vendor/checkout") ||
    pathname.startsWith("/vendor/payment")
  ) {
    return NextResponse.next();
  }

  // Allow role-specific auth routes
  if (
    pathname.startsWith("/vendor/auth/") ||
    pathname.startsWith("/customer/auth/")
  ) {
    return NextResponse.next();
  }

  // ⚡ EMERGENCY FIX: When subdomain routing is disabled (Vercel deployment),
  // skip complex middleware logic to prevent redirect loops
  const subdomainRoutingEnabled = env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING;

  if (!subdomainRoutingEnabled) {
    // For single-domain deployments (Vercel), use simplified logic

    // Allow all auth routes
    if (pathname.startsWith("/auth")) {
      return NextResponse.next();
    }

    // Allow onboarding routes
    if (
      pathname.startsWith("/on-boarding") ||
      pathname.startsWith("/welcome")
    ) {
      return NextResponse.next();
    }

    // For protected routes, just allow them through
    // NextAuth and page-level protection will handle security
    if (
      pathname.startsWith("/vendor") ||
      pathname.startsWith("/customer") ||
      pathname.startsWith("/admin")
    ) {
      return NextResponse.next();
    }

    // Allow everything else
    return NextResponse.next();
  }

  // Original complex logic only runs when subdomain routing is enabled
  // Handle auth flowCheck
  const authResponse = handleAuthFlow(req);
  if (authResponse) {
    return authResponse;
  }

  // Handle subdomain routing
  const subdomainResponse = await handleSubdomainRouting(req);
  if (subdomainResponse) {
    return subdomainResponse;
  }

  // Handle protected routes
  const protectedResponse = await handleProtectedRoutes(req);
  if (protectedResponse) {
    return protectedResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
