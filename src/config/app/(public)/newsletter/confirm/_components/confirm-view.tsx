"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";
import {
  newsletterConfirmResult,
  newsletterApiMessage,
  useConfirmNewsletterSubscription,
  type ConfirmResult,
} from "@/services/common/newsletter";

const MIN_TOKEN_LENGTH = 20;

const COPY: Record<ConfirmResult, { title: string; fallback: string }> = {
  confirmed: {
    title: "You're subscribed",
    fallback: "Your newsletter subscription has been confirmed.",
  },
  already_confirmed: {
    title: "Already confirmed",
    fallback: "Your newsletter subscription has been confirmed.",
  },
  expired: {
    title: "Link expired",
    fallback:
      "This confirmation link has expired. Please subscribe again to receive a new email.",
  },
  invalid: {
    title: "Link not valid",
    fallback: "This confirmation link is invalid.",
  },
  unsubscribed: {
    title: "Link no longer valid",
    fallback: "This confirmation link is no longer valid.",
  },
};

interface ConfirmViewProps {
  token: string;
}

export default function ConfirmView({ token }: ConfirmViewProps) {
  const confirm = useConfirmNewsletterSubscription();
  const started = useRef(false);
  const tokenOk = token.length >= MIN_TOKEN_LENGTH;

  useEffect(() => {
    if (!tokenOk || started.current) return;
    started.current = true;
    confirm.mutate(token);
    // mutate identity is not stable; run once per token
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confirm once
  }, [token, tokenOk]);

  const failedResult = confirm.isError
    ? newsletterConfirmResult(confirm.error)
    : null;
  const result: ConfirmResult | null = !tokenOk
    ? "invalid"
    : confirm.data?.result ?? failedResult;
  const message =
    confirm.data?.message ??
    (confirm.isError
      ? newsletterApiMessage(
          confirm.error,
          result ? COPY[result].fallback : COPY.invalid.fallback,
        )
      : null);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-background)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-8 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]">
        {!tokenOk ? (
          <ResultState result="invalid" message={COPY.invalid.fallback} />
        ) : confirm.isPending || (!confirm.isSuccess && !confirm.isError) ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[color:var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text-dimmed)]">
              Confirming your subscription…
            </p>
          </div>
        ) : result ? (
          <ResultState
            result={result}
            message={message ?? COPY[result].fallback}
          />
        ) : (
          <ResultState result="invalid" message={COPY.invalid.fallback} />
        )}
      </div>
    </div>
  );
}

function ResultState({
  result,
  message,
}: {
  result: ConfirmResult;
  message: string;
}) {
  const ok = result === "confirmed" || result === "already_confirmed";
  const isInfo = result === "already_confirmed";
  return (
    <>
      <div
        className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
          isInfo
            ? "bg-sky-100 text-sky-700"
            : ok
              ? "bg-emerald-100 text-emerald-600"
              : "bg-rose-100 text-rose-600"
        }`}
      >
        {ok ? (
          isInfo ? (
            <Info className="h-8 w-8" />
          ) : (
            <CheckCircle2 className="h-8 w-8" />
          )
        ) : (
          <TriangleAlert className="h-8 w-8" />
        )}
      </div>
      <h1 className="text-2xl font-semibold text-[var(--color-on-surface)]">
        {COPY[result].title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-dimmed)]">
        {message}
      </p>
    </>
  );
}
