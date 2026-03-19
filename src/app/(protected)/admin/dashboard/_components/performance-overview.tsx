"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { DollarSign, PieChart, UserPlus, Wallet } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";

const PERIODS = ["daily", "weekly", "monthly"] as const;

interface PerformanceData {
  totalRevenue: string;
  commissionEarned: string;
  commissionPending: string;
  newVendors: number;
}

interface PerformanceOverviewProps {
  title: string;
  data: PerformanceData;
  period?: string;
}

export default function PerformanceOverview({
  title,
  data,
  period,
}: PerformanceOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyPeriod = useCallback(
    (p: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("period", p);
      params.set("sales_period", p);
      params.set("vendor_page", "1");
      params.set("newly_added_page", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const metrics = [
    {
      id: "total_revenue",
      label: "Total Revenue",
      displayLabel: "Total Revenue",
      value: data.totalRevenue,
      icon: <DollarSign className="size-6 text-white" />,
      bgColor: "bg-blue-900",
    },
    {
      id: "commission_earned",
      label: "Admin Commission",
      displayLabel: "Admin Commission",
      value: data.commissionEarned,
      icon: <PieChart className="size-6 text-white" />,
      bgColor: "bg-green-800",
    },
    {
      id: "commission_pending",
      label: "Commission Pending",
      displayLabel: "Commission Pending",
      value: data.commissionPending,
      icon: <Wallet className="size-6 text-white" />,
      bgColor: "bg-teal-600",
    },
    {
      id: "new_vendors",
      label: "New Vendors",
      displayLabel: "New Vendors",
      value: data.newVendors,
      icon: <UserPlus className="size-6 text-white" />,
      bgColor: "bg-orange-500",
    },
  ];

  return (
    <div className="w-full bg-white p-6 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <CardTitle className="text-2xl mb-0 title-header font-medium">
          {title}
        </CardTitle>

        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                period === p
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)] hover:bg-[var(--color-primary-hover)] shadow-sm"
                  : "border border-[var(--color-primary)] bg-white text-[var(--color-primary)] hover:bg-[#f0fafa] hover:border-[var(--color-primary-hover)]"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card
            key={metric.id}
            className={`border-none shadow-sm ${metric.bgColor} rounded-lg p-4`}
          >
            <div className="flex items-center justify-between">
              <div className="bg-white/20 rounded-full p-3">{metric.icon}</div>
              <div className="text-right">
                <p className="text-white text-sm mb-1">{metric.displayLabel}</p>
                <p className="text-white text-3xl font-bold">{metric.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
