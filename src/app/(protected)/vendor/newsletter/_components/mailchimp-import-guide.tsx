const MAILCHIMP_STEPS = [
  {
    title: "Download both CSVs",
    body: "Click Export CSV. Save subscribers.csv, then unsubscribes.csv. Pending contacts are never in these files.",
  },
  {
    title: "Import subscribers.csv first",
    body: "In Mailchimp go to Audience → Add contacts → Import contacts. Upload subscribers.csv. Choose status Subscribed.",
  },
  {
    title: "Then import unsubscribes.csv",
    body: "Import contacts again. Upload unsubscribes.csv. Choose status Unsubscribed. Turn on update existing contacts.",
  },
  {
    title: "Do this before every campaign",
    body: "If this page shows new subscribers or Awaiting Mailchimp sync, export and import both files again. Never import subscribers.csv after unsubscribes.csv — that can put people back on the list. Unsubscribes made only in Mailchimp do not appear here.",
  },
] as const;

export function MailchimpImportGuide() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">
        How to import into Mailchimp
      </h2>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
        EventWizz does not send newsletters. Mailchimp does. Always import both
        files, in this order.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {MAILCHIMP_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-md border border-[var(--color-border)] bg-background p-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
