"use client";

import { cn } from "@/lib/utils";
import { useDomainStore } from "@/store/domain.store";
import React from "react";

export default function HeaderLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed: collapsed } = useDomainStore();
  return (
    <section
      className={cn(
        `flex-none bg-[var(--color-header)] text-[var(--color-on-header)] backdrop-blur-lg p-3 flex items-center justify-between relative theme-light shadow-base`,
        {
          "ml-80": !collapsed,
          "ml-20": collapsed,
        }
      )}
    >
      {children}
    </section>
  );
}
