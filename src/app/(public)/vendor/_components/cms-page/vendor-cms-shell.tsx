"use client";

import type { ReactNode } from "react";
import { useContext } from "react";
import LocationSelectionHeader from "../LocationPage/location-selection-header";
import FooterSection from "../EventListPage/footer";
import { CmsPageLayout } from "@/components/public/cms-page-ui";
import { ServerContext } from "@/lib/server-context";
import type { ThemeSchema } from "@/types/theme.types";

interface VendorCmsShellProps {
  logo?: string;
  name?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

export function VendorCmsShell({
  logo,
  name,
  title,
  subtitle,
  children,
  wide = false,
}: VendorCmsShellProps) {
  const { theme } = useContext(ServerContext) || { theme: null };
  const vendorTheme = theme as ThemeSchema | null;

  return (
    <CmsPageLayout
      header={
        <LocationSelectionHeader logo={logo} name={name} />
      }
      footer={
        <FooterSection
          brandDescription={vendorTheme?.footer_brand_description}
        />
      }
      brandName={name || "Our venue"}
      title={title}
      subtitle={subtitle}
      wide={wide}
    >
      {children}
    </CmsPageLayout>
  );
}

export {
  CmsContentPanel as VendorCmsContentPanel,
  CMS_PROSE_CLASS as VENDOR_CMS_PROSE_CLASS,
} from "@/components/public/cms-page-ui";
