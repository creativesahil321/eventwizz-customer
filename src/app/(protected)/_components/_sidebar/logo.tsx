"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { appConfig } from "@/config/app";
import { addCacheBusting } from "@/lib/image-utils";
import { BrandLogoImage } from "./brand-logo-image";

interface LogoProps {
  collapsed: boolean;
}

const Logo: React.FC<LogoProps> = ({ collapsed }) => {
  const { theme } = useContext(ServerContext);

  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https") ||
    theme?.logo?.startsWith("blob")
      ? theme.logo
      : appConfig.logo;

  const brandName = theme?.name || "EventWizz";

  return (
    <nav
      className={cn(`w-full py-4`, {
        "flex justify-between pl-4": !collapsed,
        "flex justify-center": collapsed,
      })}
    >
      <span className="transition-all duration-300 ease-linear">
        {collapsed ? (
          /* Mini logo removed per product request - collapsed sidebar shows no logo */
          <span className="h-8 w-8 block" aria-hidden />
        ) : (
          <Link href="/">
            <BrandLogoImage
              src={addCacheBusting(logoPath)}
              alt={brandName}
              headerBackground={theme?.colors?.header}
              className="h-8 w-auto"
            />
          </Link>
        )}
        <span className="sr-only text-sm font-semibold">{brandName}</span>
      </span>
    </nav>
  );
};

export default Logo;
