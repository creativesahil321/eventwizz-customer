"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

export type BestSale = {
  icon: string;
  venue_name: string;
  amount: number;
};

export type SortBy = "name" | "amount";
export type SortOrder = "asc" | "desc";

interface BestSalesProps {
  sales: BestSale[];
  /** Controlled sort (sent to API when parent refetches) */
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  onSortChange?: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

export default function BestSales({
  sales,
  sortBy: controlledSortBy,
  sortOrder: controlledSortOrder,
  onSortChange,
}: BestSalesProps) {
  const { formatLocale: formatMoneyLocale } = useCurrencyFormat();
  const [localSortBy, setLocalSortBy] = useState<SortBy>("amount");
  const [localSortOrder, setLocalSortOrder] = useState<SortOrder>("desc");

  const sortBy = controlledSortBy ?? localSortBy;
  const sortOrder = controlledSortOrder ?? localSortOrder;

  const setSortBy = (v: SortBy) => {
    onSortChange?.(v, sortOrder);
    setLocalSortBy(v);
  };
  const setSortOrder = (v: SortOrder) => {
    onSortChange?.(sortBy, v);
    setLocalSortOrder(v);
  };

  const sortedSales = useMemo(() => {
    const list = [...sales];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.venue_name.localeCompare(b.venue_name);
      } else {
        cmp = a.amount - b.amount;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [sales, sortBy, sortOrder]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-2xl mb-0 title-header font-bold">
            Last Event Performing Overview
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">
                  <span className="flex items-center gap-1.5">
                    <ArrowUp className="h-3.5 w-3.5" />
                    Ascending
                  </span>
                </SelectItem>
                <SelectItem value="desc">
                  <span className="flex items-center gap-1.5">
                    <ArrowDown className="h-3.5 w-3.5" />
                    Descending
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 lg:px-6">
        <div className="space-y-2">
          {sortedSales.map((item, index) => (
            <Card
              key={index}
              className="flex border-0 shadow-none flex-col lg:flex-row items-start lg:items-center justify-between p-2 gap-2 lg_gap-6"
            >
              <div className="flex items-center space-x-2 lg:space-x-4">
                <Avatar>
                  <AvatarImage src={item.icon} alt={item.venue_name} />
                  <AvatarFallback>{item.venue_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-lg font-medium">{item.venue_name}</span>
              </div>
              <span className="text-md text-muted-foreground font-semibold">
                {formatMoneyLocale(item.amount)}
              </span>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
