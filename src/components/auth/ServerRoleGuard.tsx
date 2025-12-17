import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { authOptions } from "@/lib/auth/authOptions";

interface ServerRoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Server component for secure role-based access control
 * More efficient than client-side guards as it:
 * 1. Doesn't require useEffect or client-side state
 * 2. Validates at the server level before sending content
 * 3. Prevents unauthorized content from ever reaching the client
 */
export async function ServerRoleGuard({
  allowedRoles,
  children,
  fallbackPath,
}: ServerRoleGuardProps) {
  // Get session server-side
  const session = await getServerSession(authOptions);

  // Get role from session
  const userRole = session?.user?.account_type;

  // If not authenticated, redirect to login
  if (!session?.user) {
    redirect("/auth/login");
  }

  // If role not in allowed roles, redirect
  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect to role-specific dashboard or fallback
    redirect(fallbackPath || `/${userRole}/dashboard`);
  }

  // If authorized, render children
  return <>{children}</>;
}
