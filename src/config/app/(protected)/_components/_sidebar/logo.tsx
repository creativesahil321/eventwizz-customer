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
  const faviconPath =
    typeof theme?.favicon === "string" && theme.favicon.trim()
      ? theme.favicon
      : appConfig.mini_logo;

  return (
    <nav
      className={cn(`w-full py-4`, {
        "flex justify-between pl-4": !collapsed,
        "flex justify-center": collapsed,
      })}
    >
      <span className="transition-all duration-300 ease-linear">
        {collapsed ? (
          <Link
            href="/"
            aria-label={`Go to ${brandName} home`}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5 p-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.2)] transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_14px_rgba(0,0,0,0.3)]"
          >
            <BrandLogoImage
              src={addCacheBusting(faviconPath, theme?.media_updated_at)}
              alt={brandName}
              width={32}
              height={32}
              className="h-8 w-8 scale-[1.15] rounded-md object-contain"
            />
          </Link>
        ) : (
          <Link href="/">
            <BrandLogoImage
              src={addCacheBusting(logoPath)}
              alt={brandName}
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
