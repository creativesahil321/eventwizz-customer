"use client";

import { DollarSign, PieChart, UserPlus, Users, Wallet } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";

interface PerformanceData {
  totalRevenue: string;
  commissionEarned: string;
  commissionPending: string;
  newCustomers: number;
  visitors?: number;
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
  const visitors = data.visitors ?? 0;
  // Mapping metric IDs to icons and colors
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
      id: "new_customers",
      label: "New Customers",
      displayLabel: "New Customers",
      value: data.newCustomers,
      icon: <UserPlus className="size-6 text-white" />,
      bgColor: "bg-orange-500",
    },
    {
      id: "visitors",
      label: "Visitors",
      displayLabel: "Visitors",
      value: data.visitors,
      icon: <Users className="size-6 text-white" />,
      bgColor: "bg-purple-700",
    },
  ];

  return (
    <div className="w-full bg-white p-6 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <CardTitle className="text-2xl mb-0 title-header font-medium">
          {title}
        </CardTitle>

        {period && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground capitalize">
              Period: {period}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
