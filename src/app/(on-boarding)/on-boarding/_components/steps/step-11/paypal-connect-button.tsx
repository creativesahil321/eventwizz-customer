"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PayPalConnectButtonProps {
  isConnected: boolean;
  status?: "pending" | "active" | "under_review" | "restricted";
  merchantId?: string;
  onConnect: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function PayPalConnectButton({
  isConnected,
  status,
  merchantId,
  onConnect,
  disabled = false,
  className,
}: PayPalConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } catch (error) {
      console.error("PayPal connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Show "Under Review" state when status is under_review (read-only)
  if (status === "under_review" && merchantId) {
    return (
      <div className={cn("space-y-2", className)}>
        <div
          className={cn(
            "flex items-center justify-between p-4 border-2 border-amber-300 bg-amber-100 text-amber-900 rounded-lg dark:bg-amber-100 dark:text-amber-900 dark:border-amber-400 [color-scheme:light]"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-200/80">
              <AlertCircle className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                PayPal - Under Review
              </p>
              <p className="text-sm text-amber-800">
                Merchant: {merchantId.substring(0, 20)}...
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Review typically takes 1-2 business days
              </p>
            </div>
          </div>
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white">
            Under Review
          </Badge>
        </div>
        {/* No button for under_review - it's read-only */}
      </div>
    );
  }

  // Show "Pending" state when status is pending (actionable)
  if (status === "pending" && merchantId) {
    return (
      <div className={cn("space-y-2", className)}>
        <div
          className={cn(
            "flex items-center justify-between p-4 border-2 border-amber-300 bg-amber-100 text-amber-900 rounded-lg dark:bg-amber-100 dark:text-amber-900 dark:border-amber-400 [color-scheme:light]"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-200/80">
              <AlertCircle className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                PayPal - Pending Setup
              </p>
              <p className="text-sm text-amber-800">
                Merchant: {merchantId.substring(0, 20)}...
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Setup was interrupted - click to continue
              </p>
            </div>
          </div>
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white">Pending</Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleConnect}
          disabled={disabled || isConnecting}
          className="w-full text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Reconnecting...
            </>
          ) : (
            "Continue Setup"
          )}
        </Button>
      </div>
    );
  }

  // Show "Connected" state when status is active
  if (status === "active" && isConnected && merchantId) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 border-2 border-blue-300 bg-blue-100 text-blue-900 rounded-lg dark:bg-blue-100 dark:text-blue-900 dark:border-blue-400 [color-scheme:light]",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-200/80">
            <CheckCircle2 className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">PayPal Connected</p>
            <p className="text-sm text-blue-800">Merchant: {merchantId}</p>
          </div>
        </div>
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Active</Badge>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleConnect}
        disabled={disabled || isConnecting}
        className="w-full h-auto py-6 px-6 border-2 border-[#0070BA] hover:bg-[#0070BA]/10 hover:border-[#0070BA] !bg-white dark:!bg-white !text-gray-900 dark:!text-gray-900 transition-all group"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#0070BA]/10 group-hover:bg-[#0070BA]/20 transition-colors shrink-0">
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="#0070BA"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852a.932.932 0 0 1 .922-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.815-4.467z" />
              </svg>
            </div>
            <div className="text-left min-w-0">
              <p className="font-semibold text-base text-gray-900 dark:!text-gray-900 mb-1">
                {isConnecting ? "Connecting..." : "Connect with PayPal"}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-800 dark:!text-gray-800">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                  5-minute setup
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                  Instant payouts
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                  400M+ users
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#0070BA]" />
            ) : (
              <ExternalLink className="w-5 h-5 text-[#0070BA]" />
            )}
          </div>
        </div>
      </Button>
    </div>
  );
}

// PayPal Connect Status Badge
export function PayPalStatusBadge({
  isConnected,
  className,
}: {
  isConnected: boolean;
  className?: string;
}) {
  if (!isConnected) {
    return (
      <Badge
        variant="outline"
        className={cn("border-amber-300 text-amber-700", className)}
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Not Connected
      </Badge>
    );
  }

  return (
    <Badge className={cn("bg-blue-600 hover:bg-blue-700", className)}>
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Connected
    </Badge>
  );
}
