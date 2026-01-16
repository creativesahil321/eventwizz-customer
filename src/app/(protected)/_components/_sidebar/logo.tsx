"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { appConfig } from "@/config/app";

interface LogoProps {
  collapsed: boolean;
}

const Logo: React.FC<LogoProps> = ({ collapsed }) => {
  const { theme } = useContext(ServerContext);

  // Determine logo path based on theme, with fallback
  // Use the same logo in both expanded and collapsed states for brand consistency
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https") ||
    theme?.logo?.startsWith("blob")
      ? theme.logo
      : appConfig.logo;

  return (
    <nav
      className={cn(`w-full py-4`, {
        "flex justify-between pl-4": !collapsed,
        "flex justify-center": collapsed,
      })}
    >
      <span className="transition-all duration-300 ease-linear">
        <Link href="/">
          {collapsed ? (
            <Image
              className="h-8 w-auto"
              src={appConfig.mini_logo}
              alt={theme?.name || "EventWizz"}
              width={32}
              height={32}
              priority
            />
          ) : (
            <Image
              className="h-8 w-auto object-contain drop-shadow-[2px_4px_6px_black]"
              src={logoPath}
              alt={theme?.name || "EventWizz"}
              width={110}
              height={30}
              priority
            />
          )}
        </Link>
        <span className="sr-only text-sm font-semibold">
          {theme?.name || "EventWizz"}
        </span>
      </span>
    </nav>
  );
};

export default Logo;
