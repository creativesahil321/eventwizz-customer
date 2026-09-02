"use client";

import { CheckCircle2, Loader2, MailX, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import {
  newsletterApiMessage,
  useUnsubscribeByToken,
  useUnsubscribeInfo,
} from "@/services/common/newsletter";

const MIN_TOKEN_LENGTH = 20;

interface UnsubscribeViewProps {
  token: string;
}

export default function UnsubscribeView({ token }: UnsubscribeViewProps) {
  const { settings } = useDomain();
  const tokenOk = token.length >= MIN_TOKEN_LENGTH;
  const { data, isLoading, isError, error } = useUnsubscribeInfo(token);
  const unsubscribe = useUnsubscribeByToken();

  const brandName = settings?.name ?? data?.vendor_name ?? "this newsletter";
  const alreadyDone =
    data?.status === "unsubscribed" || unsubscribe.isSuccess;
  const invalid =
    !tokenOk || isError || unsubscribe.isError;

  const invalidMessage = unsubscribe.isError
    ? newsletterApiMessage(unsubscribe.error, "This unsubscribe link is invalid.")
    : isError
      ? newsletterApiMessage(error, "This unsubscribe link is invalid.")
      : "This unsubscribe link is invalid.";

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-background)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-8 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]">
        {invalid ? (
          <InvalidLink message={invalidMessage} />
        ) : isLoading ? (
          <LoadingState />
        ) : alreadyDone ? (
          <DoneState
            brandName={brandName}
            email={data?.email ?? null}
            message={
              unsubscribe.data?.message ?? "You have been unsubscribed."
            }
          />
        ) : (
          <ConfirmState
            brandName={brandName}
            email={data?.email ?? null}
            isPending={unsubscribe.isPending}
            onConfirm={() => unsubscribe.mutate(token)}
          />
        )}
      </div>
    </div>
  );
}

function IconBadge({
  tone,
  children,
}: {
  tone: "primary" | "success" | "danger";
  children: React.ReactNode;
}) {
  const bg =
    tone === "success"
      ? "bg-emerald-100 text-emerald-600"
      : tone === "danger"
        ? "bg-rose-100 text-rose-600"
        : "bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[color:var(--color-primary)]";
  return (
    <div
      className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${bg}`}
    >
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="mb-5 h-16 w-16 rounded-full" />
      <Skeleton className="mb-3 h-6 w-48" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-6 h-4 w-3/4" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

function ConfirmState({
  brandName,
  email,
  isPending,
  onConfirm,
}: {
  brandName: string;
  email: string | null;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <>
      <IconBadge tone="primary">
        <MailX className="h-8 w-8" />
      </IconBadge>
      <h1 className="text-2xl font-semibold text-[var(--color-on-surface)]">
        Unsubscribe from {brandName}?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-dimmed)]">
        {email ? (
          <>
            <span className="font-medium text-[var(--color-on-surface)]">
              {email}
            </span>{" "}
            will no longer receive event updates from {brandName}.
          </>
        ) : (
          <>You will no longer receive event updates from {brandName}.</>
        )}
      </p>
      <Button
        variant="event-primary"
        className="mt-6 h-11 w-full rounded-xl font-semibold"
        disabled={isPending}
        onClick={onConfirm}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Unsubscribing...
          </>
        ) : (
          "Yes, unsubscribe me"
        )}
      </Button>
      <p className="mt-4 text-xs text-[var(--color-text-dimmed)]">
        Changed your mind? Close this page — nothing happens until you confirm.
      </p>
    </>
  );
}

function DoneState({
  brandName,
  email,
  message,
}: {
  brandName: string;
  email: string | null;
  message: string;
}) {
  return (
    <>
      <IconBadge tone="success">
        <CheckCircle2 className="h-8 w-8" />
      </IconBadge>
      <h1 className="text-2xl font-semibold text-[var(--color-on-surface)]">
        You&apos;re unsubscribed
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-dimmed)]">
        {message}
      </p>
      {email ? (
        <p className="mt-2 text-xs text-[var(--color-text-dimmed)]">
          {email} will no longer receive updates from {brandName}.
        </p>
      ) : null}
    </>
  );
}

function InvalidLink({ message }: { message: string }) {
  return (
    <>
      <IconBadge tone="danger">
        <TriangleAlert className="h-8 w-8" />
      </IconBadge>
      <h1 className="text-2xl font-semibold text-[var(--color-on-surface)]">
        Link not valid
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-dimmed)]">
        {message}
      </p>
    </>
  );
}
