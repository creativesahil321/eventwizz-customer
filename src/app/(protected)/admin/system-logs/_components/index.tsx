import { SystemLogsTable } from "./system-logs-table";

export default function SystemLogs() {
  const title = "System Logs";
  const description =
    "Track and analyze system logs and user interactions.";
  return (
    <div className="flex flex-col gap-4 min-w-0 max-w-full">
      <header className="flex w-full items-center justify-between gap-2 overflow-auto bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6">
        <nav className="flex flex-col justify-start items-start gap-2 relative">
          <h1 className="text-xl sm:text-2xl mb-0 title-header font-bold text-black">
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </nav>
      </header>
      <div className="relative min-w-0">
        <SystemLogsTable />
      </div>
    </div>
  );
}
