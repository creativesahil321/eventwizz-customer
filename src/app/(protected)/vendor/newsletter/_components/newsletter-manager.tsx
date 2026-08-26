"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Clock,
  Download,
  FileDown,
  Loader2,
  Mail,
  MailX,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AllLocationsBadge } from "@/components/location-indicator";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { cn } from "@/lib/utils";
import { useQueryState, parseAsInteger } from "nuqs";
import {
  useExportNewsletterCsv,
  useNewsletterCounts,
  useNewsletterSubscribers,
  type NewsletterCounts,
  type SubscriberStatusFilter,
} from "@/services/common/newsletter";
import SubscriberDataTable from "./subscriber-table";
import { NewsletterManagerSkeleton } from "./skeleton";
import { MailchimpImportGuide } from "./mailchimp-import-guide";

const STAT_CARDS: {
  key: keyof NewsletterCounts;
  label: string;
  icon: typeof Mail;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}[] = [
  {
    key: "subscribed",
    label: "Subscribed",
    icon: Mail,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-600",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    valueColor: "text-amber-600",
  },
  {
    key: "unsubscribed",
    label: "Unsubscribed",
    icon: MailX,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600",
    valueColor: "text-rose-600",
  },
  {
    key: "not_exported",
    label: "Not yet exported",
    icon: FileDown,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    valueColor: "text-blue-600",
  },
  {
    key: "unsynced_unsubscribes",
    label: "Awaiting Mailchimp sync",
    icon: TriangleAlert,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600",
    valueColor: "text-orange-600",
  },
];

export default function NewsletterManager() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriberStatusFilter>("all");
  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, setPage]);

  const searchParams = {
    page: 1,
    per_page: 30,
    search: debouncedSearch,
    status,
  };

  const { data, isLoading, isFetching } = useNewsletterSubscribers(searchParams);
  const { data: counts } = useNewsletterCounts();
  const exportMutation = useExportNewsletterCsv();
  const stats = counts ?? data?.stats;
  const needsSync = (stats?.unsynced_unsubscribes ?? 0) > 0;
  const hasActiveFilters = !!debouncedSearch || status !== "all";

  const handleResetAllFilters = () => {
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  if (isLoading && !data) {
    return <NewsletterManagerSkeleton />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="mb-4 min-w-0 rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-md">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col flex-wrap items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="title-header flex items-center gap-2 text-2xl font-bold text-black">
                  Newsletter
                  {isFetching && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </h1>
                <AllLocationsBadge />
              </div>
              <p className="text-muted-foreground">
                Collect verified opt-ins, then export CSVs for Mailchimp.
                Unsubscribes are kept on the list so they are not emailed again.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subscribers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8"
                    disabled={isFetching}
                  />
                </div>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as SubscriberStatusFilter)}
                  disabled={isFetching}
                >
                  <SelectTrigger className="w-[180px] shrink-0">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subscribers</SelectItem>
                    <SelectItem value="subscribed">Subscribed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetAllFilters}
                    disabled={isFetching}
                    className="shrink-0 gap-2"
                    aria-label="Reset all filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset all
                  </Button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <PermissionGuard permissionKey="update-newsletter">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="event-primary"
                        size="sm"
                        className="gap-2"
                        disabled={exportMutation.isPending}
                      >
                        {exportMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                        Export CSV
                        <ChevronDown className="h-4 w-4 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Export for Mailchimp</DropdownMenuLabel>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          exportMutation.mutate({ status: "subscribed" })
                        }
                      >
                        <Download className="mr-2 h-4 w-4 text-emerald-600" />
                        <div className="flex flex-col">
                          <span>subscribers.csv</span>
                          <span className="text-xs text-muted-foreground">
                            Import as Subscribed
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          exportMutation.mutate({ status: "unsubscribed" })
                        }
                      >
                        <Download className="mr-2 h-4 w-4 text-rose-600" />
                        <div className="flex flex-col">
                          <span>unsubscribes.csv</span>
                          <span className="text-xs text-muted-foreground">
                            Import as Unsubscribed
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </PermissionGuard>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4 transition-opacity duration-200 sm:gap-4 lg:grid-cols-5",
              isFetching && "opacity-50",
            )}
          >
            {STAT_CARDS.map((stat) => (
              <div
                key={stat.key}
                className="flex min-h-[72px] items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    stat.iconBg,
                    stat.iconColor,
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  {!stats ? (
                    <Skeleton className="mt-1 h-6 w-10" />
                  ) : (
                    <p
                      className={cn(
                        "truncate text-base font-semibold tabular-nums sm:text-lg",
                        stat.valueColor,
                      )}
                    >
                      {stats[stat.key]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <MailchimpImportGuide />

          {needsSync && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">
                  <span className="font-medium">
                    {stats?.unsynced_unsubscribes} unsubscribe
                    {stats?.unsynced_unsubscribes === 1 ? "" : "s"} not yet
                    exported.
                  </span>{" "}
                  Export unsubscribes.csv and import as Unsubscribed before your
                  next campaign.
                </p>
              </div>
              <PermissionGuard permissionKey="update-newsletter">
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  disabled={exportMutation.isPending}
                  onClick={() =>
                    exportMutation.mutate({ status: "unsubscribed" })
                  }
                >
                  {exportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export unsubscribes
                </Button>
              </PermissionGuard>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </div>
          </div>
        )}
        <SubscriberDataTable search={searchParams} />
      </div>
    </div>
  );
}
