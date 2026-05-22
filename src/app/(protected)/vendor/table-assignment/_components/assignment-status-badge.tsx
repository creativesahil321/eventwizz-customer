"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import type { AssignmentStatus } from "../_lib/types";

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  switch (status) {
    case "assigned":
      return <StatusBadge status="Success" label="Assigned" />;
    case "pending":
      return <StatusBadge status="Pending" label="Pending" />;
  }
}
