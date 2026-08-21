"use client";

import { memo, useContext } from "react";
import Link from "next/link";
import { ServerContext } from "@/lib/server-context";
import { appConfig } from "@/config/app";
import { addCacheBusting } from "@/lib/image-utils";
import { BrandLogoImage } from "../../../_sidebar/brand-logo-image";

const MobileLogo: React.FC = memo(() => {
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
    <Link href="/" className="flex items-center gap-2">
      <BrandLogoImage
        src={addCacheBusting(logoPath)}
        alt={brandName}
        headerBackground={theme?.colors?.header}
        width={110}
        height={30}
        className="h-8 w-auto"
      />
    </Link>
  );
});

MobileLogo.displayName = "MobileLogo";
export default MobileLogo;
