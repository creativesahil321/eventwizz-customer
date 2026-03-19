"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export interface SalesHistoryItem {
  month: string;
  sales: number;
}

interface SalesHistoryProps {
  sales: SalesHistoryItem[];
  period: string;
}

const PERIODS = ["daily", "weekly", "monthly"] as const;

function buildDashboardUrl(period: string) {
  const params = new URLSearchParams();
  params.set("period", period);
  params.set("sales_period", period);
  return `/admin/dashboard?${params.toString()}`;
}

export default function SalesHistory({ sales, period }: SalesHistoryProps) {
  const chartData = sales.length ? sales : [{ month: "—", sales: 0 }];

  return (
    <Card className="shadow-none border-none bg-white">
      <CardHeader className="relative">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-2xl mb-0 title-header font-bold">
            Sales History
          </CardTitle>
          <div className="flex space-x-2">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={buildDashboardUrl(p)}
                className={`px-3 py-1 text-sm rounded-md ${
                  period === p ? "bg-red-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => (value ? String(value).slice(0, 3) : "")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `£${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="sales" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
