"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useState, useMemo } from "react";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

// Mock data - would be replaced with real data from API
const mockData = {
  monthly: [
    { month: "January", sales: 100 },
    { month: "February", sales: 150 },
    { month: "March", sales: 200 },
    { month: "April", sales: 180 },
    { month: "May", sales: 240 },
    { month: "June", sales: 220 },
    { month: "July", sales: 180 },
    { month: "August", sales: 190 },
    { month: "September", sales: 220 },
    { month: "October", sales: 240 },
    { month: "November", sales: 270 },
    { month: "December", sales: 290 },
  ],
  weekly: [
    { month: "Monday", sales: 50 },
    { month: "Tuesday", sales: 80 },
    { month: "Wednesday", sales: 120 },
    { month: "Thursday", sales: 90 },
    { month: "Friday", sales: 110 },
    { month: "Saturday", sales: 140 },
    { month: "Sunday", sales: 70 },
  ],
  daily: [
    { month: "Morning", sales: 40 },
    { month: "Noon", sales: 60 },
    { month: "Afternoon", sales: 80 },
    { month: "Evening", sales: 60 },
    { month: "Night", sales: 30 },
  ],
};

export default function SalesHistory() {
  const [period, setPeriod] = useState("monthly");

  // Use the appropriate data based on selected period
  const chartData = useMemo(
    () => mockData[period as keyof typeof mockData],
    [period]
  );

  return (
    <Card className="shadow-none border-none bg-white">
      <CardHeader className="relative">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl mb-0 title-header font-bold">
            Sales History
          </CardTitle>
          <div className="flex space-x-2">
            <button
              onClick={() => setPeriod("daily")}
              className={`px-3 py-1 text-sm rounded-md ${
                period === "daily" ? "bg-red-500 text-white" : "bg-gray-100"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod("weekly")}
              className={`px-3 py-1 text-sm rounded-md ${
                period === "weekly" ? "bg-red-500 text-white" : "bg-gray-100"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-3 py-1 text-sm rounded-md ${
                period === "monthly" ? "bg-red-500 text-white" : "bg-gray-100"
              }`}
            >
              Monthly
            </button>
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
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="sales" fill="#000000" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
