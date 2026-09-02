"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type TypeToConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modal title, e.g. "Delete discount". */
  title: string;
  /** Short consequence copy under the title. */
  description: ReactNode;
  /** Name shown in the final warning banner. */
  resourceLabel: string;
  /** Optional custom red-banner warning body (defaults to cannot-be-undone). */
  warning?: ReactNode;
  /** Signed-in account email the user must type. */
  confirmEmail: string;
  /** Exact phrase the user must type (case-insensitive). */
  confirmPhrase: string;
  /** Destructive button label. */
  confirmButtonLabel?: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  className?: string;
};

/**
 * Vercel-style destructive confirm: type account email + a fixed phrase
 * before the delete action enables.
 */
export function TypeToConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  resourceLabel,
  warning,
  confirmEmail,
  confirmPhrase,
  confirmButtonLabel = "Delete permanently",
  isPending = false,
  onConfirm,
  className,
}: TypeToConfirmDeleteDialogProps) {
  const [emailInput, setEmailInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");

  useEffect(() => {
    if (!open) {
      setEmailInput("");
      setPhraseInput("");
    }
  }, [open]);

  const emailReady =
    Boolean(confirmEmail.trim()) &&
    emailInput.trim().toLowerCase() === confirmEmail.trim().toLowerCase();
  const phraseReady =
    phraseInput.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();
  const canDelete = emailReady && phraseReady && !isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("sm:max-w-md", className)}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {description}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/*
          Chrome ignores autocomplete=off on type=email and will also suggest
          saved addresses on the next field. Keep these as plain text with
          non-identity names so confirmation stays manual typing only.
        */}
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label
              htmlFor="ew-delete-confirm-email"
              className="text-xs font-medium text-muted-foreground"
            >
              To confirm, type{" "}
              <span className="font-mono font-semibold text-foreground">
                {confirmEmail || "your account email"}
              </span>
            </Label>
            <Input
              id="ew-delete-confirm-email"
              autoFocus
              type="text"
              name="ew-delete-confirm-email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={confirmEmail || "you@example.com"}
              disabled={isPending || !confirmEmail}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="ew-delete-confirm-phrase"
              className="text-xs font-medium text-muted-foreground"
            >
              To confirm, type{" "}
              <span className="font-mono font-semibold text-foreground">
                {confirmPhrase}
              </span>
            </Label>
            <Input
              id="ew-delete-confirm-phrase"
              type="text"
              name="ew-delete-confirm-phrase"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              placeholder={confirmPhrase}
              disabled={isPending}
            />
          </div>

          <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {warning ?? (
                <>
                  Deleting{" "}
                  <span className="font-semibold">{resourceLabel}</span> cannot
                  be undone.
                </>
              )}
            </span>
          </p>

          {!confirmEmail ? (
            <p className="text-xs text-amber-700">
              Your account email is unavailable. Refresh the page and try again.
            </p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} className="min-w-[96px]">
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!canDelete}
            className="min-w-[140px]"
            onClick={() => {
              if (!canDelete) return;
              void onConfirm();
            }}
          >
            {isPending ? "Deleting..." : confirmButtonLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
