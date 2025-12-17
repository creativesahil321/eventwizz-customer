"use client";

import { Users, UserCog, UserX, Headphones } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";

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
        { id: "total_customers", label: "Total Customers", value: "0" },
        { id: "active_customers", label: "Active Customers", value: "0" },
        { id: "disabled_customers", label: "Disabled Customers", value: "0" },
        { id: "support_tickets", label: "Support Tickets", value: "0" },
      ];

  // Map icons to item IDs
  const getIconByItemId = (id: string) => {
    switch (id) {
      case "total_customers":
        return <Users className="size-6 text-white" />;
      case "active_customers":
        return <UserCog className="size-6 text-white" />;
      case "disabled_customers":
        return <UserX className="size-6 text-white" />;
      case "support_tickets":
        return <Headphones className="size-6 text-white" />;
      default:
        return <Users className="size-6 text-white" />;
    }
  };

  // Map background colors to item IDs
  const getBgColorByItemId = (id: string) => {
    switch (id) {
      case "total_customers":
        return "bg-pink-500";
      case "active_customers":
        return "bg-purple-500";
      case "disabled_customers":
        return "bg-teal-500";
      case "support_tickets":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // Map labels to cleaner versions
  const getCleanLabel = (id: string) => {
    switch (id) {
      case "total_customers":
        return "Total Customer";
      case "active_customers":
        return "Active Customer";
      case "disabled_customers":
        return "Disabled Customers";
      case "support_tickets":
        return "Support Ticket";
      default:
        return "";
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-lg">
      <div className="mb-4">
        <CardTitle className="text-2xl mb-0 title-header font-medium">
          {title}
        </CardTitle>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
