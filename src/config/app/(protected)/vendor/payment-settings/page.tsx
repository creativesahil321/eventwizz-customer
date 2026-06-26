"use client";

import React from "react";
import { CreditCard } from "lucide-react";
import { PaymentGatewayManager } from "./_components/payment-gateways";
import { Shell } from "@/components/shell";
import { PermissionRoute } from "@/components/permission";

export default function SettingsPage() {
  return (
    <PermissionRoute
      permissionKey="read-account"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0 pb-20 sm:pb-24">
        <Shell className="gap-2">
          <div className="flex flex-col gap-4 min-w-0">
            {/* Header card */}
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 mb-4 min-w-0">
              <div className="title-header flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-black">Payment Settings</h1>
              </div>
              <p className="text-muted-foreground mt-2">
                Connect payment providers and manage your payment methods.
              </p>
            </div>

            <PaymentGatewayManager />
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
