"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useCurrencySymbol } from "@/hooks/use-currency-format";

type ChartDataItem = {
  month: string;
  earnings: number;
};

const chartConfig = {
  earnings: {
    label: "Earnings",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function SalesHistory({ sales }: { sales: ChartDataItem[] }) {
  const currencySymbol = useCurrencySymbol();
  return (
    <Card className="shadow-none border-none">
      <CardHeader className="relative">
        <CardTitle className="text-2xl mb-0 title-header font-bold">
          Sales History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={sales}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${currencySymbol}${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar
              dataKey="earnings"
              fill="var(--color-earnings)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
