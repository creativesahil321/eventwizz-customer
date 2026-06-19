"use client";

import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useCurrencySymbol } from "@/hooks/use-currency-format";

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
  isFetching?: boolean;
}

export default function SalesHistory({
  sales,
  period,
  isFetching = false,
}: SalesHistoryProps) {
  const currencySymbol = useCurrencySymbol();
  const chartData = sales.length ? sales : [{ month: "—", sales: 0 }];
  const periodLabel = period === "monthly" ? "Monthly" : "Yearly";

  return (
    <Card className="shadow-none border-none bg-white">
      <CardHeader className="relative">
        <CardTitle className="text-2xl mb-0 title-header font-bold">
          Sales History ({periodLabel})
        </CardTitle>
      </CardHeader>
      <CardContent className="relative min-h-[200px]">
        {isFetching && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-2">
              <Loader2
                className="h-8 w-8 animate-spin text-[var(--color-primary)]"
                aria-hidden
              />
              <span className="text-sm font-medium text-muted-foreground">
                Updating chart...
              </span>
            </div>
          </div>
        )}
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                value ? String(value).slice(0, 3) : ""
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${currencySymbol}${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar
              dataKey="sales"
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
