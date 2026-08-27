"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, MailX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { getStatusColorClass } from "@/lib/status-theme";
import { cn, formatDate } from "@/lib/utils";
import {
  subscriberPhone,
  type NewsletterSubscriber,
  type SubscriberStatus,
} from "@/services/common/newsletter";

const STATUS_THEME_KEY: Record<SubscriberStatus, string> = {
  subscribed: "confirmed",
  pending: "pending",
  unsubscribed: "cancelled",
};

const STATUS_LABEL: Record<SubscriberStatus, string> = {
  subscribed: "Subscribed",
  pending: "Pending",
  unsubscribed: "Unsubscribed",
};

export function getSubscriberColumns({
  onUnsubscribe,
  pendingId,
}: {
  onUnsubscribe: (subscriber: NewsletterSubscriber) => void;
  pendingId: number | null;
}): ColumnDef<NewsletterSubscriber>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Name"
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name ?? "—"}</span>
      ),
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Email"
        />
      ),
      cell: ({ row }) => (
        <span className="lowercase text-foreground">{row.original.email}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Phone"
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {subscriberPhone(row.original) ?? "—"}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "source",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Source"
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.source === "landing"
            ? "Landing"
            : row.original.source === "dashboard"
              ? "Dashboard"
              : "—"}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "user_type",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Type"
        />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.user_type ?? "—"}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Status"
        />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-xs border",
              getStatusColorClass(STATUS_THEME_KEY[status]),
            )}
          >
            {STATUS_LABEL[status]}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-foreground"
          column={column}
          title="Joined"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
      enableSorting: true,
      size: 140,
      minSize: 140,
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.created_at).getTime();
        const dateB = new Date(rowB.original.created_at).getTime();
        return dateA - dateB;
      },
    },
    {
      id: "actions",
      header: () => (
        <span className="text-foreground">Actions</span>
      ),
      cell: ({ row }) => {
        const subscriber = row.original;
        const isPending = pendingId === subscriber.id;

        if (subscriber.status === "unsubscribed") {
          return <span className="text-xs text-muted-foreground">—</span>;
        }

        return (
          <nav className="flex items-center justify-end">
            <PermissionGuard permissionKey="update-newsletter">
              <Button
                variant="destructive"
                size="icon"
                title="Unsubscribe"
                disabled={isPending}
                onClick={() => onUnsubscribe(subscriber)}
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MailX size={16} />
                )}
              </Button>
            </PermissionGuard>
          </nav>
        );
      },
      size: 120,
      minSize: 120,
      enableSorting: false,
      enableHiding: false,
      meta: { className: "text-right" },
    },
  ];
}
