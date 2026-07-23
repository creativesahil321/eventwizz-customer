"use client";

import { useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { env } from "@/env";

interface VendorSiteUrlProps {
  className?: string;
}

/** Local hosts-file vendor storefront */
const LOCAL_VENDOR_SITE_URL = "http://vendor.eventwizz.com:3000/";

/** Vercel / cloud customer (vendor) public site */
const VERCEL_VENDOR_SITE_URL = "https://eventwizz-customer.vercel.app/";

function getStaticVendorSiteUrl(): string {
  // Prefer browser host for local :3000 so Site URL updates without rebuild quirks
  if (typeof window !== "undefined") {
    const port = window.location.port;
    const host = window.location.hostname;
    if (
      port === "3000" ||
      port === "3001" ||
      host === "eventwizz.com" ||
      host.endsWith(".eventwizz.com") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return LOCAL_VENDOR_SITE_URL;
    }
  }

  if (
    env.NEXT_PUBLIC_DEV_MODE ||
    env.NEXT_PUBLIC_NODE_ENV === "development"
  ) {
    return LOCAL_VENDOR_SITE_URL;
  }

  return VERCEL_VENDOR_SITE_URL;
}

/**
 * Shows the vendor’s public site URL so they can copy/open the live preview.
 */
const VendorSiteUrl: React.FC<VendorSiteUrlProps> = ({ className }) => {
  const { data: session } = useSession();
  const user = useMemo(() => session?.user, [session]);
  const inputRef = useRef<HTMLInputElement>(null);

  const siteUrl = useMemo(() => getStaticVendorSiteUrl(), []);

  const copySiteUrl = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(siteUrl)
          .then(() => {
            toast.success("Site URL copied to clipboard");
          })
          .catch(() => {
            fallbackCopyToClipboard();
          });
      } else {
        fallbackCopyToClipboard();
      }
    } catch {
      toast.error("Failed to copy URL. Please select and copy manually.");
    }
  };

  const fallbackCopyToClipboard = () => {
    if (!inputRef.current) return;
    inputRef.current.select();
    try {
      document.execCommand("copy");
      toast.success("Site URL copied to clipboard");
    } catch {
      toast.error("Please select and copy the URL manually");
    }
  };

  const shouldShow = useMemo(() => {
    if (!user?.account_type) return false;
    return ["vendor", "admin"].includes(user.account_type);
  }, [user]);

  if (!shouldShow) return null;

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <span className="whitespace-nowrap text-sm">Site URL</span>
      <div className="relative flex max-w-[300px] items-center">
        <Input
          ref={inputRef}
          value={siteUrl}
          readOnly
          className="h-9 truncate border-gray-200 bg-gray-50 pr-20 text-sm"
          onClick={(e) => (e.target as HTMLInputElement).select()}
          aria-label="Vendor site URL for preview"
        />
        <div className="absolute right-0 flex h-9 items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            onClick={copySiteUrl}
            aria-label="Copy site URL"
          >
            <Copy className="h-4 w-4 text-black" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            asChild
          >
            <Link
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open site preview"
            >
              <ExternalLink className="h-4 w-4 text-black" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VendorSiteUrl;
