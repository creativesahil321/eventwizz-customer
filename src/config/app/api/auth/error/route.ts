import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  getOAuthTenantInfo,
  getOAuthErrorMessage,
  clearOAuthData,
  buildOAuthErrorRedirectUrl,
} from "@/lib/auth/oauth-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");

  // Check if we have stored tenant info and error message
  const tenantInfo = getOAuthTenantInfo();
  if (tenantInfo) {
    const storedError = getOAuthErrorMessage();

    // Use stored error message if available, otherwise use the error param
    const errorMessage = storedError || error || "Authentication failed";

    // Clear the stored data
    clearOAuthData();

    // Redirect to the original domain with the error
    const originalDomain = tenantInfo.domain;
    const protocol = request.nextUrl.protocol;
    const port = request.nextUrl.port ? `:${request.nextUrl.port}` : "";

    const redirectUrl = buildOAuthErrorRedirectUrl(
      originalDomain,
      protocol,
      port,
      errorMessage
    );

    return NextResponse.redirect(redirectUrl);
  }
  // Fallback: redirect to main domain login page
  const baseUrl = env.NEXTAUTH_URL;
  const fallbackUrl = `${baseUrl}/auth/login?error=${encodeURIComponent(
    error || "Authentication failed"
  )}`;

  return NextResponse.redirect(fallbackUrl);
}
