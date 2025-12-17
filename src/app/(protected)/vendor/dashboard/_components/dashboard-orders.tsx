"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { toSentenceCase } from "@/lib/utils";
import OrderCard from "./dashboard-order-card";
import { Order, OrderProps, Orders, tabType } from "../_lib/types";
export const orderKeys: (keyof Orders)[] = [
  "today",
  "weekly",
  "monthly",
  "yearly",
];

export default function DashboardOrders({ title, orderStatus }: OrderProps) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [active, setActive] = React.useState<keyof Orders>("today");
  React.useEffect(() => {
    if (orderStatus) {
      setOrders(orderStatus[active]);
    }
  }, [orderStatus, active]);
  const handleTabChange = (tab: tabType) => {
    setActive(tab);
    setOrders(orderStatus[tab] || []);
  };
  return (
    <>
      <section className="w-full flex items-center justify-between relative text-black">
        <section className="w-full relative bg-background dark:border p-6 rounded-md">
          <header className="w-full mb-6">
            <h2 className="text-2xl title-header font-bold">
              {title || "Orders"}
            </h2>
          </header>
          <main className="w-full">
            <section className="bg-background rounded sm">
              <Tabs defaultValue="today">
                <TabsList>
                  {orderKeys.map((key, idx) => {
                    return (
                      <TabsTrigger
                        key={idx}
                        onClick={() => {
                          handleTabChange(key);
                        }}
                        value={key}
                      >
                        {toSentenceCase(key)}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value="today">
                  <OrderCard orders={orders} />
                </TabsContent>
                <TabsContent value="weekly">
                  <OrderCard orders={orders} />
                </TabsContent>
                <TabsContent value="monthly">
                  <OrderCard orders={orders} />
                </TabsContent>
                <TabsContent value="yearly">
                  <OrderCard orders={orders} />
                </TabsContent>
              </Tabs>
            </section>
          </main>
        </section>
      </section>
    </>
  );
}
