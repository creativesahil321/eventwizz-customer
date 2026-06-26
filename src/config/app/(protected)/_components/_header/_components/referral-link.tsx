"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useRef, memo, useCallback } from "react";
import { toast } from "sonner";

type ReferralLinkProps = {
  referralLink?: string;
};

const ReferralLink: React.FC<ReferralLinkProps> = memo(
  ({ referralLink = "" }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCopyToClipboard = useCallback(() => {
      if (inputRef.current) {
        inputRef.current.select();
        inputRef.current.setSelectionRange(0, inputRef.current.value.length);
        navigator.clipboard.writeText(referralLink);
        toast.success("Link copied to clipboard!");
      }
    }, [referralLink]);

    return (
      <div className="w-full max-w-sm min-w-[200px]">
        <div className="relative flex full space-x-2 items-center">
          <label>Referral</label>
          <Input
            ref={inputRef}
            className="w-full bg-transparent text-sm border pl-3 pr-28 py-2 shadow-none"
            value={referralLink}
            readOnly
          />
          <Button
            variant="ghost"
            className="absolute top-0 right-2 flex items-center rounded h-full py-1 pl-2.5 pr-4 border border-transparent text-center text-sm transition-all shadow-none disabled:opacity-50"
            type="button"
            onClick={handleCopyToClipboard}
          >
            <Copy size={16} className="text-black" />
            <label>Copy</label>
          </Button>
        </div>
      </div>
    );
  }
);

ReferralLink.displayName = "ReferralLink";
export default ReferralLink;
