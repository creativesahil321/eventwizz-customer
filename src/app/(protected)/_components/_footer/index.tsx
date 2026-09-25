"use client";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useDomainStore } from "@/store/domain.store";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import React, { memo } from "react";
import { isSupportWorkspacePath } from "@/app/(protected)/_shared/support/support-workspace";
import { protectedSidebarOffsetClass } from "../protected-shell";

interface FooterProps {
  copyrightYear: number;
  companyName: string;
  companyWebsite: string;
}
const Footer: React.FC<FooterProps> = memo(
  ({ copyrightYear, companyName, companyWebsite }) => {
    const { sidebarCollapsed: collapsed } = useDomainStore();
    const { theme } = useTheme();
    const pathname = usePathname();
    const copyrightBrandName = theme?.name?.trim() || companyName;

    if (isSupportWorkspacePath(pathname)) return null;

    return (
      <footer
        className={cn(
          "flex-none border-t bg-[var(--color-footer)] text-[var(--color-on-footer)] dark:border-t-1 py-4 px-4 sm:px-6 bottom-0 z-50 shadow-base",
          protectedSidebarOffsetClass(collapsed),
          "hidden md:block"
        )}
      >
        <div className="flex flex-col sm:flex-row justify-between text-[var(--color-on-footer)]/85 text-center sm:text-left">
          <div className="text-sm">
            COPYRIGHT © {copyrightYear} {copyrightBrandName}, All rights Reserved
          </div>
          <div className="text-sm mt-2 sm:mt-0">
            Hand-crafted & Made by{" "}
            <a
              href={companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] font-semibold"
            >
              {companyName}
            </a>
          </div>
        </div>
      </footer>
    );
  }
);
Footer.displayName = "Footer";
export default Footer;
