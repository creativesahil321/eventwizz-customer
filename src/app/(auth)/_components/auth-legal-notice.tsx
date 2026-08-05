import Link from "next/link";

type AuthLegalNoticeProps = {
  variant: "login" | "register";
};

export function AuthLegalNotice({ variant }: AuthLegalNoticeProps) {
  const preface =
    variant === "login"
      ? "By signing in, you agree to our"
      : "By creating an account, you agree to our";

  const linkClassName =
    "underline underline-offset-2 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors";

  return (
    <p className="text-center text-xs text-[var(--color-text-dimmed)] leading-relaxed pt-1">
      {preface}{" "}
      <Link href="/terms" className={linkClassName}>
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className={linkClassName}>
        Privacy Policy
      </Link>
    </p>
  );
}
