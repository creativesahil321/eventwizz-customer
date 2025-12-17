/**
 * Customer Site Middleware
 *
 * This middleware is for the CUSTOMER PROJECT ONLY
 * It handles customer-facing routes and redirects vendor/admin routes to main domain
 *
 * Replace your existing middleware.ts with this in the customer project
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/env";

// Main domain for vendor/admin (redirect target)
const MAIN_DOMAIN = "eventwizz.vercel.app";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and assets
  if (
    pathname === "/" ||
    pathname === "/theme-test" ||
    pathname.startsWith("/theme-test/") ||
    // Allow location pages (customer-facing public pages)
    pathname.match(/^\/[^\/]+\/?$/) || // Matches /{locationSlug}
    pathname.match(/^\/[^\/]+\/events\/[^\/]+\/?$/) || // Matches /{locationSlug}/events/{eventSlug}
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // Allow auth routes (customer login/register)
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Redirect vendor/admin routes to main domain
  if (pathname.startsWith("/vendor") || pathname.startsWith("/admin")) {
    return NextResponse.redirect(
      new URL(`https://${MAIN_DOMAIN}${pathname}`, req.url)
    );
  }

  // Redirect onboarding/welcome routes to main domain (vendor-specific)
  if (pathname.startsWith("/on-boarding") || pathname.startsWith("/welcome")) {
    return NextResponse.redirect(
      new URL(`https://${MAIN_DOMAIN}${pathname}`, req.url)
    );
  }

  // Protect customer routes
  if (pathname.startsWith("/customer")) {
    const token = await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
    });

    // If not authenticated, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // If authenticated but not a customer, redirect to main domain
    if (token.account_type !== "customer") {
      return NextResponse.redirect(
        new URL(
          `https://${MAIN_DOMAIN}/${token.account_type}/dashboard`,
          req.url
        )
      );
    }

    // Customer is authenticated, allow access
    return NextResponse.next();
  }

  // Allow everything else (public pages, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
