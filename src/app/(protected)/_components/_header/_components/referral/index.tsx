"use client";

import { useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface ReferralProps {
  className?: string;
}

const ReferralUrl: React.FC<ReferralProps> = ({ className }) => {
  const { data: session } = useSession();
  const user = useMemo(() => session?.user, [session]);
  const referralInputRef = useRef<HTMLInputElement>(null);

  // Generate a referral URL based on the user
  const referralUrl = useMemo(() => {
    if (typeof window === "undefined") return "";

    return `https://${window.location.host}/register?invite=${
      user?.name?.replace(/\s+/g, "") || "user"
    }${Math.floor(Math.random() * 10000).toString(36)}`;
  }, [user]);

  const copyReferralUrl = () => {
    try {
      // Check if Clipboard API is available
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(referralUrl)
          .then(() => {
            toast.success("Referral URL copied to clipboard!");
          })
          .catch((err) => {
            console.error("Failed to copy: ", err);
            // Fall back to the selection method
            fallbackCopyToClipboard();
          });
      } else {
        // Use fallback method for browsers without clipboard API
        fallbackCopyToClipboard();
      }
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy URL. Please select and copy manually.");
    }
  };

  // Fallback copy method using selection
  const fallbackCopyToClipboard = () => {
    if (referralInputRef.current) {
      referralInputRef.current.select();
      try {
        document.execCommand("copy");
        toast.success("Referral URL copied to clipboard!");
      } catch (error) {
        console.error("Fallback copy failed:", error);
        toast.error("Please select and copy the URL manually");
      }
    }
  };

  // Check if user type is vendor or admin - only these roles should see referrals
  const shouldShowReferral = useMemo(() => {
    if (!user || !user.account_type) return false;
    return ["vendor", "admin"].includes(user.account_type);
  }, [user]);

  if (!shouldShowReferral) return null;

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <span className="text-sm  whitespace-nowrap">Referral URL</span>
      <div className="relative flex items-center max-w-[300px]">
        <Input
          ref={referralInputRef}
          value={referralUrl}
          readOnly
          className="pr-10 h-9 text-sm bg-gray-50 border-gray-200 truncate"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 h-9"
          onClick={copyReferralUrl}
        >
          <Copy className="h-4 w-4 text-black" />
        </Button>
      </div>
    </div>
  );
};

export default ReferralUrl;
