import LoginForm from "./_components/login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

/**
 * Security error types that can be displayed on the login page
 */
type SecurityError = "security_violation" | "session_expired" | undefined;

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Login page component with security alert handling
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Await searchParams to resolve the Promise
  const resolvedSearchParams = await searchParams;
  // Extract and validate error parameter from searchParams
  const errorParam = resolvedSearchParams?.error;
  const securityError =
    typeof errorParam === "string" ? (errorParam as SecurityError) : undefined;

  return (
    <>
      <div className="flex flex-col space-y-2 text-center mb-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--color-text)]">
          Sign in
        </h1>
        <p className="text-sm text-[var(--color-text-dimmed)]">
          Enter your credentials to access your account
        </p>
      </div>

      {securityError === "security_violation" && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Alert</AlertTitle>
          <AlertDescription>
            Your session was terminated due to a security concern. Please log in
            again.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 w-full max-w-sm mx-auto">
        <LoginForm />
      </div>
    </>
  );
}
