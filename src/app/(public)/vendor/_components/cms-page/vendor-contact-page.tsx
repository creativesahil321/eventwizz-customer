"use client";

import { sanitizeHtml } from "@/lib/security/sanitize-html";

import { useContext, useMemo } from "react";
import { ServerContext } from "@/lib/server-context";
import type { ThemeSchema } from "@/types/theme.types";
import {
  resolveVendorCmsContent,
  type InfoPageContentMap,
} from "@/lib/vendor-cms-content";
import { resolveVenueContact } from "@/lib/resolve-venue-contact";
import { VendorContactCards } from "./vendor-contact-cards";
import {
  VendorCmsContentPanel,
  VendorCmsShell,
  VENDOR_CMS_PROSE_CLASS,
} from "./vendor-cms-shell";

export default function VendorContactPage({
  contentByKey,
}: {
  contentByKey?: InfoPageContentMap;
}) {
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;
  const content = useMemo(
    () => resolveVendorCmsContent("contact", vendorTheme, contentByKey),
    [vendorTheme, contentByKey],
  );

  const contact = useMemo(
    () => resolveVenueContact(vendorTheme),
    [vendorTheme],
  );

  const hasContactDetails =
    Boolean(contact.phone) ||
    Boolean(contact.email) ||
    Boolean(contact.address);

  return (
    <VendorCmsShell
      logo={vendorTheme?.logo}
      name={vendorTheme?.name}
      title={content.title}
      subtitle="Get in touch for bookings, enquiries, or support — we are here to help."
    >
      {hasContactDetails ? (
        <VendorContactCards contact={contact} className="mb-8" />
      ) : null}

      <VendorCmsContentPanel>
        <div
          className={VENDOR_CMS_PROSE_CLASS}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.body) }}
        />
      </VendorCmsContentPanel>
    </VendorCmsShell>
  );
}
