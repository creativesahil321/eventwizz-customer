"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, SquarePen } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import type { DataTableRowAction, EmailTemplate } from "../_lib/types";

type EmailTemplateRowActionsProps = {
  row: Row<EmailTemplate>;
  setRowAction: Dispatch<
    SetStateAction<DataTableRowAction<EmailTemplate> | null>
  >;
};

export function EmailTemplateRowActions({
  row,
  setRowAction,
}: EmailTemplateRowActionsProps) {
  const canUpdate = usePermission("update-email-template");
  const canRead = usePermission("read-email-template");

  if (canUpdate) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRowAction({ row, type: "update" })}
            aria-label="Edit email template"
          >
            <SquarePen className="text-base" strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit template</TooltipContent>
      </Tooltip>
    );
  }

  if (canRead) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRowAction({ row, type: "show" })}
            aria-label="View email template"
          >
            <Eye className="text-base" strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View template</TooltipContent>
      </Tooltip>
    );
  }

  return null;
}
