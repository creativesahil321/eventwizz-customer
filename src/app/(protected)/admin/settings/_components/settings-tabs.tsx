"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import GeneralSetting from "./_general-setting";
import PasswordSetting from "./_password-setting";
import PaymentSettings from "./_payment-setting";
import { ThemeSetting } from "./_theme-setting";

export function SettingsTab() {
  const [loading, setLoading] = useState(false);
  return (
    <section className="w-full relative">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSetting />
        </TabsContent>

        <TabsContent value="password">
          <PasswordSetting />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentSettings />
        </TabsContent>

        <TabsContent value="theme">
          <ThemeSetting />
        </TabsContent>
      </Tabs>
    </section>
  );
}
