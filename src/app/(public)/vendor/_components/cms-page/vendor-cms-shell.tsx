"use client";

import type { ReactNode } from "react";
import LocationSelectionHeader from "../LocationPage/location-selection-header";
import FooterSection from "../EventListPage/footer";
import { CmsPageLayout } from "@/components/public/cms-page-ui";

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
  return (
    <CmsPageLayout
      header={
        <LocationSelectionHeader logo={logo} name={name} />
      }
      footer={<FooterSection />}
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
