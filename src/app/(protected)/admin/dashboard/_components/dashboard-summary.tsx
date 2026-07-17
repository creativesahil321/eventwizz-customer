"use client";

import { Users, UserCog, UserX } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface SummaryItem {
  id: string;
  label: string;
  value: number | string;
}

interface DashboardSummaryProps {
  title: string;
  items: SummaryItem[];
}

export default function DashboardSummary({
  title,
  items = [],
}: DashboardSummaryProps) {
  // If no specific items provided, we'll create default structure
  // This allows fallback when data isn't available
  const summaryItems = items.length
    ? items
    : [
        { id: "total_vendors", label: "Total Vendors", value: "0" },
        { id: "active_vendors", label: "Active Vendors", value: "0" },
        { id: "disabled_vendors", label: "Disabled Vendors", value: "0" },
      ];

  const getIconByItemId = (id: string) => {
    switch (id) {
      case "total_vendors":
        return <Users className="size-6 text-white" />;
      case "active_vendors":
        return <UserCog className="size-6 text-white" />;
      case "disabled_vendors":
        return <UserX className="size-6 text-white" />;
      default:
        return <Users className="size-6 text-white" />;
    }
  };

  const getBgColorByItemId = (id: string) => {
    switch (id) {
      case "total_vendors":
        return "bg-pink-500";
      case "active_vendors":
        return "bg-purple-500";
      case "disabled_vendors":
        return "bg-teal-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCleanLabel = (id: string) => {
    switch (id) {
      case "total_vendors":
        return "Total Vendors";
      case "active_vendors":
        return "Active Vendors";
      case "disabled_vendors":
        return "Disabled Vendors";
      default:
        return "";
    }
  };

  return (
    <Card className="w-full border shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex min-h-[40px] items-center">
          <CardTitle className="text-2xl mb-0 title-header font-medium">
            {title}
          </CardTitle>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaryItems.map((item) => (
            <Card
              key={item.id}
              className={`border-none shadow-sm ${getBgColorByItemId(
                item.id
              )} rounded-lg p-4`}
            >
              <div className="flex items-center justify-between">
                <div className="bg-white/20 rounded-full p-3">
                  {getIconByItemId(item.id)}
                </div>
                <div className="text-right">
                  <p className="text-white text-sm mb-1">
                    {getCleanLabel(item.id)}
                  </p>
                  <p className="text-white text-3xl font-bold">{item.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
