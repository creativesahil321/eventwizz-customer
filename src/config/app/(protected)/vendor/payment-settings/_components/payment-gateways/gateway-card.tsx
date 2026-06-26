"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertCircle,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GatewayCardProps {
  name: string;
  description: string;
  logo: React.ReactNode;
  status?: "pending" | "active" | "under_review" | "restricted";
  accountId?: string;
  bankDetails?: {
    bank_name?: string;
    account_masked?: string;
  };
  isConnecting: boolean;
  onConnect: () => void;
  disabled?: boolean;
  features?: string[];
  /** When true, gateway is temporarily disabled (e.g. account issues). Default true. */
  isEnabled?: boolean;
  onEnable?: () => void;
  onDisable?: () => void;
  onRemove?: () => void;
}

export function GatewayCard({
  name,
  description,
  logo,
  status,
  accountId,
  bankDetails,
  isConnecting,
  onConnect,
  disabled = false,
  features = [],
  isEnabled = true,
  onEnable,
  onDisable,
  onRemove,
}: GatewayCardProps) {
  // Show "Under Review" state
  if (status === "under_review" && accountId) {
    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border-2 border-amber-200 bg-amber-50 rounded-lg min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 flex-shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-amber-900 text-sm sm:text-base">
                {name} - Under Review
              </p>
              <p className="text-xs sm:text-sm text-amber-700 truncate">
                Account: {accountId.substring(0, 20)}...
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Review typically takes 1-2 business days
              </p>
            </div>
          </div>
          <Badge className="bg-amber-600 hover:bg-amber-700 w-fit flex-shrink-0">
            Under Review
          </Badge>
        </div>
      </div>
    );
  }

  // Show "Pending" state
  if (status === "pending" && accountId) {
    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border-2 border-amber-200 bg-amber-50 rounded-lg min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 flex-shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-amber-900 text-sm sm:text-base">
                {name} - Pending Setup
              </p>
              <p className="text-xs sm:text-sm text-amber-700 truncate">
                Account: {accountId.substring(0, 20)}...
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Setup was interrupted - click to continue
              </p>
            </div>
          </div>
          <Badge className="bg-amber-600 hover:bg-amber-700 w-fit flex-shrink-0">Pending</Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onConnect}
          disabled={disabled || isConnecting}
          className="w-full text-xs text-amber-700 border-amber-300 hover:bg-amber-50 min-h-10"
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

  // Show "Connected" state (with optional enable/disable and remove)
  if (status === "active" && accountId) {
    const showActions = onDisable || onEnable || onRemove;
    return (
      <div className="space-y-3">
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-lg min-w-0 border-2",
            isEnabled
              ? "border-green-200 bg-green-50"
              : "border-gray-200 bg-gray-50 opacity-90"
          )}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex-shrink-0">{logo}</div>
            <div className="min-w-0">
              <p
                className={cn(
                  "font-semibold text-sm sm:text-base",
                  isEnabled ? "text-green-900" : "text-gray-700"
                )}
              >
                {name} Connected
              </p>
              {bankDetails?.bank_name ? (
                <div
                  className={cn(
                    "text-xs sm:text-sm break-words",
                    isEnabled ? "text-green-700" : "text-gray-600"
                  )}
                >
                  <p>Bank: {bankDetails.bank_name}</p>
                  {bankDetails.account_masked && (
                    <p>Account: {bankDetails.account_masked}</p>
                  )}
                </div>
              ) : (
                <p
                  className={cn(
                    "text-xs sm:text-sm truncate",
                    isEnabled ? "text-green-700" : "text-gray-600"
                  )}
                >
                  Account: {accountId.substring(0, 24)}
                  {accountId.length > 24 ? "..." : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEnabled ? (
              <Badge className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-400 text-gray-700">
                <PowerOff className="w-3 h-3 mr-1" />
                Disabled
              </Badge>
            )}
          </div>
        </div>
        {showActions && (
          <div className="flex flex-wrap items-center gap-2">
            {isEnabled ? (
              onDisable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onDisable}
                  disabled={disabled}
                  className="text-gray-700 border-gray-300 hover:bg-gray-100"
                >
                  <PowerOff className="w-3.5 h-3.5 mr-1.5" />
                  Disable
                </Button>
              )
            ) : (
              onEnable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEnable}
                  disabled={disabled}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  <Power className="w-3.5 h-3.5 mr-1.5" />
                  Enable
                </Button>
              )
            )}
            {onRemove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                disabled={disabled}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default: Not connected state - stack on mobile for better touch targets
  return (
    <div className="space-y-3 min-w-0">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onConnect}
        disabled={disabled || isConnecting}
        className={cn(
          "w-full h-auto py-4 px-4 sm:py-6 sm:px-6 border-2 hover:shadow-md transition-all group",
          "hover:border-primary min-h-[52px] sm:min-h-[72px]"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3 text-left">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="flex-shrink-0 min-w-[2.5rem] sm:min-w-[3rem]">
              {logo}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm sm:text-base text-gray-900 mb-0.5 sm:mb-1">
                {isConnecting ? `Connecting to ${name}...` : `Connect ${name}`}
              </p>
              <p className="text-xs text-gray-600 mb-1.5 sm:mb-2 line-clamp-2 sm:line-clamp-none">{description}</p>
              {features.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-1 sm:gap-x-3 text-xs text-gray-600">
                  {features.map((feature, index) => (
                    <span key={index} className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end sm:justify-center flex-shrink-0 self-end sm:self-auto">
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <ExternalLink className="w-5 h-5 text-primary" />
            )}
          </div>
        </div>
      </Button>
    </div>
  );
}
