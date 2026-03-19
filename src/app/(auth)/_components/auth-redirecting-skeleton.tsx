import { Loader2 } from "lucide-react";

/**
 * Full-screen loader shown during login/register redirect.
 * Matches the dark onboarding theme to avoid a visible color jump.
 */
export function AuthRedirectingSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" aria-hidden />
        <p className="text-sm text-slate-500">Taking you to your dashboard…</p>
      </div>
    </div>
  );
}
