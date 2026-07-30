import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DiscountStatus } from "../_lib/types";
import { DISCOUNT_STATUS_LABELS } from "../_lib/types";

const STATUS_CLASS: Record<DiscountStatus, string> = {
  active:
    "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  inactive:
    "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-100",
  expired:
    "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100",
};

export function DiscountStatusBadge({ status }: { status: DiscountStatus }) {
  return (
    <Badge className={cn("capitalize", STATUS_CLASS[status])}>
      {DISCOUNT_STATUS_LABELS[status]}
    </Badge>
  );
}
