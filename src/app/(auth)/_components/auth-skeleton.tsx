import { Loader2 } from "lucide-react";

/**
 * Full-screen loader shown after login/register while redirecting.
 * Vendor (not onboarded): dark theme + "complete your setup" (onboarding).
 * Customer / admin / onboarded vendor: light theme + "your dashboard".
 */
interface AuthSkeletonProps {
  accountType?: string;
  isOnboarded?: boolean;
}

export function AuthSkeleton({ accountType, isOnboarded }: AuthSkeletonProps = {}) {
  const isVendorGoingToOnboarding =
    accountType === "vendor" && !isOnboarded;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={
        isVendorGoingToOnboarding
          ? { background: "linear-gradient(to bottom right, #0f172a 0%, #0f172a 50%, #1e293b 100%)" }
          : { background: "var(--color-background, #f8fafc)" }
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2
          className="h-10 w-10 animate-spin"
          style={{ color: isVendorGoingToOnboarding ? "#94a3b8" : "var(--color-primary, #3b82f6)" }}
          aria-hidden
        />
        <p
          className="text-sm"
          style={{ color: isVendorGoingToOnboarding ? "#94a3b8" : "var(--color-text-dimmed, #64748b)" }}
        >
          {isVendorGoingToOnboarding
            ? "Taking you to complete your setup…"
            : "Taking you to your dashboard…"}
        </p>
      </div>
    </div>
  );
}
