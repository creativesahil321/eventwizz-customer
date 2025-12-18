import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

// Main domain for redirects
const MAIN_DOMAIN = "eventwizz.vercel.app";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and assets
  if (
    pathname === "/" ||
    pathname === "/theme-test" ||
    pathname.startsWith("/theme-test/") ||
    // Allow location pages
    pathname.match(/^\/[^\/]+\/?$/) || // Matches /{locationSlug}
    // Allow event detail pages
    pathname.match(/^\/[^\/]+\/events\/[^\/]+\/?$/) || // Matches /{locationSlug}/events/{eventSlug}
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets")
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

  // ⚡ KEY FIX: When subdomain routing is disabled, use simplified logic
  // This prevents redirect loops by allowing routes through
  const subdomainRoutingEnabled = env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING;

  if (!subdomainRoutingEnabled) {
    // Simplified logic - same as vendor project fix

    // Allow all auth routes
    if (pathname.startsWith("/auth")) {
      return NextResponse.next();
    }

    // Allow onboarding routes (redirect to main domain if needed)
    if (
      pathname.startsWith("/on-boarding") ||
      pathname.startsWith("/welcome")
    ) {
      // Redirect vendor onboarding to main domain
      return NextResponse.redirect(
        new URL(`https://${MAIN_DOMAIN}${pathname}`, req.url)
      );
    }

    // Allow location pages (customer-facing public pages)
    if (
      pathname.match(/^\/[^\/]+\/?$/) || // Matches /{locationSlug}
      pathname.match(/^\/[^\/]+\/events\/[^\/]+\/?$/) // Matches /{locationSlug}/events/{eventSlug}
    ) {
      return NextResponse.next();
    }

    // ⚡ Allow /vendor/checkout on customer site (it's actually customer checkout)
    if (
      pathname === "/vendor/checkout" ||
      pathname.startsWith("/vendor/checkout/")
    ) {
      return NextResponse.next();
    }

    // Redirect vendor/admin routes to main domain
    if (pathname.startsWith("/vendor") || pathname.startsWith("/admin")) {
      return NextResponse.redirect(
        new URL(`https://${MAIN_DOMAIN}${pathname}`, req.url)
      );
    }

    // ⚡ KEY: Allow customer routes through - NextAuth handles security
    if (pathname.startsWith("/customer")) {
      return NextResponse.next();
    }

    // Allow everything else
    return NextResponse.next();
  }

  // If subdomain routing is enabled, use complex logic (not needed for customer project)
  // But keep it for consistency
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
