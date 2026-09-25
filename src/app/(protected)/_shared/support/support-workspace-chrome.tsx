"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  pageCardClassName,
} from "@/app/(protected)/_components/page-header-card";
import { cn } from "@/lib/utils";
import { isSupportConversationPath } from "./support-workspace";

interface SupportWorkspaceChromeProps {
  title: ReactNode;
  nav: ReactNode;
  children: ReactNode;
}

export default function SupportWorkspaceChrome({
  title,
  nav,
  children,
}: SupportWorkspaceChromeProps) {
  const pathname = usePathname();
  const isConversation = isSupportConversationPath(pathname);

  return (
    <section
      className={cn(
        "relative flex w-full min-w-0 max-w-full flex-col",
        isConversation ? "gap-0 xl:gap-6" : "gap-4 sm:gap-6",
      )}
    >
      <div
        className={cn(
          pageCardClassName("min-w-0 max-w-full"),
          isConversation && "hidden xl:block",
        )}
      >
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {title}
          {nav}
        </div>
      </div>

      <div
        className={cn(
          pageCardClassName("min-w-0 max-w-full overflow-x-hidden"),
          isConversation &&
            "max-xl:rounded-none max-xl:border-0 max-xl:p-0 max-xl:shadow-none",
        )}
      >
        {children}
      </div>
    </section>
  );
}
