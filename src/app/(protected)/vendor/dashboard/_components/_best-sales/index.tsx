import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export type BestSale = {
  icon: string;
  venue_name: string;
  price: string;
};

interface BestSalesProps {
  sales: BestSale[];
}

export default function BestSales({ sales }: BestSalesProps) {
  return (
    <Card className="shadow-none border-none">
      <CardHeader className="relative">
        <CardTitle className="text-2xl mb-0 title-header font-bold">
          Best Sales
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 lg:px-6">
        <div className="space-y-2">
          {sales.map((item, index) => (
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
                {item.price}
              </span>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
