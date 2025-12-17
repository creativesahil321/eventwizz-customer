"use client";
import { memo, useCallback } from "react";
import { useDomainStore } from "@/store/domain.store";
import { AlignLeft, X } from "lucide-react";

const LayoutToggle = () => {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } =
    useDomainStore();

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return (
    <button
      className="relative group disabled:cursor-not-allowed opacity-80"
      onClick={toggleCollapsed}
    >
      <div className="--">
        {collapsed ? (
          <X className="text-[var(--color-primary)] cursor-pointer" />
        ) : (
          <AlignLeft className="text-[var(--color-primary)] cursor-pointer" />
        )}
      </div>
    </button>
  );
};

export default memo(LayoutToggle);
