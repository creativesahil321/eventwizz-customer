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
    "underline underline-offset-2 hover:text-black transition-colors";

  return (
    <p className="text-center text-xs text-black/50 leading-relaxed pt-1">
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
