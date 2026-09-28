import { toast } from "sonner";
import type { FieldErrors, FieldValues } from "react-hook-form";

function collectMessages(errors: unknown, out: string[]): void {
  if (!errors || typeof errors !== "object") return;
  const record = errors as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    out.push(record.message.trim());
    return;
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === "ref" || key === "type") continue;
    collectMessages(value, out);
  }
}

/**
 * `onInvalid` for `form.handleSubmit(onValid, onInvalid)` on onboarding steps.
 * Without it react-hook-form stops silently when validation fails — the
 * vendor clicks "Save & continue" and nothing happens. Shows the first error
 * and scrolls the first invalid field into view.
 */
export function notifyInvalidOnboardingFields<T extends FieldValues>(
  errors: FieldErrors<T>,
): void {
  const messages: string[] = [];
  collectMessages(errors, messages);
  const first = messages[0] ?? "Please check the highlighted fields.";
  const more = messages.length > 1 ? ` (+${messages.length - 1} more)` : "";
  toast.error(`${first}${more}`);

  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(
      '#onboarding-form-sidebar [aria-invalid="true"], [data-step] [aria-invalid="true"]',
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}
