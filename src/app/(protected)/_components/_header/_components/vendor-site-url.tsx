"use client";

import { useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useProfileData } from "@/app/(protected)/_shared/profile/_lib";

interface VendorSiteUrlProps {
  className?: string;
}

/**
 * Shows the vendor’s public site URL from profile (`site_url`) so they can
 * copy/open the live storefront.
 */
const VendorSiteUrl: React.FC<VendorSiteUrlProps> = ({ className }) => {
  const { data: session } = useSession();
  const accountType = session?.user?.account_type;
  const profileUserType =
    accountType === "admin"
      ? "admin"
      : accountType === "vendor"
        ? "vendor"
        : undefined;
  const { data: profileResponse } = useProfileData(
    {},
    profileUserType,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const siteUrl = useMemo(() => {
    const raw = profileResponse?.data?.site_url?.trim();
    return raw || "";
  }, [profileResponse?.data?.site_url]);

  const copySiteUrl = () => {
    if (!siteUrl) return;
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
    if (!accountType) return false;
    return ["vendor", "admin"].includes(accountType) && Boolean(siteUrl);
  }, [accountType, siteUrl]);

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
