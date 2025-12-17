"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StripeConnectButtonProps {
  isConnected: boolean;
  status?: "pending" | "active" | "under_review" | "restricted";
  accountId?: string;
  onConnect: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function StripeConnectButton({
  isConnected,
  status,
  accountId,
  onConnect,
  disabled = false,
  className,
}: StripeConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } catch (error) {
      console.error("Stripe connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Show "Under Review" state when status is under_review (read-only)
  if (status === "under_review" && accountId) {
    return (
      <div className={cn("space-y-2", className)}>
        <div
          className={cn(
            "flex items-center justify-between p-4 border-2 border-amber-200 bg-amber-50 rounded-lg"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                Stripe - Under Review
              </p>
              <p className="text-sm text-amber-700">
                Account: {accountId.substring(0, 20)}...
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Review typically takes 1-2 business days
              </p>
            </div>
          </div>
          <Badge className="bg-amber-600 hover:bg-amber-700">
            Under Review
          </Badge>
        </div>
        {/* No button for under_review - it's read-only */}
      </div>
    );
  }

  // Show "Pending" state when status is pending (actionable)
  if (status === "pending" && accountId) {
    return (
      <div className={cn("space-y-2", className)}>
        <div
          className={cn(
            "flex items-center justify-between p-4 border-2 border-amber-200 bg-amber-50 rounded-lg"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                Stripe - Pending Setup
              </p>
              <p className="text-sm text-amber-700">
                Account: {accountId.substring(0, 20)}...
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Setup was interrupted - click to continue
              </p>
            </div>
          </div>
          <Badge className="bg-amber-600 hover:bg-amber-700">Pending</Badge>
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
  if (status === "active" && isConnected && accountId) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 border-2 border-green-200 bg-green-50 rounded-lg",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-900">Stripe Connected</p>
            <p className="text-sm text-green-700">Account: {accountId}</p>
          </div>
        </div>
        <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
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
        className="w-full h-auto py-6 px-6 border-2 border-[#635BFF] hover:bg-[#635BFF]/5 hover:border-[#635BFF] transition-all group"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#635BFF]/10 group-hover:bg-[#635BFF]/20 transition-colors">
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="#635BFF"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-base text-gray-900 mb-1">
                {isConnecting ? "Connecting..." : "Connect with Stripe"}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  5-minute setup
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Automatic payouts
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  99.9% uptime
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#635BFF]" />
            ) : (
              <ExternalLink className="w-5 h-5 text-[#635BFF]" />
            )}
          </div>
        </div>
      </Button>
    </div>
  );
}

// Stripe Connect Status Badge
export function StripeStatusBadge({
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
    <Badge className={cn("bg-green-600 hover:bg-green-700", className)}>
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Connected
    </Badge>
  );
}
