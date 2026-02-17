"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Power, Trash2, Plus, RefreshCw } from "lucide-react";
import type { PaymentGatewayAccount } from "@/services/vendor/payment-gateway/payment-gateway.service";

interface MultiAccountGatewayCardProps {
  name: string;
  description: string;
  logo: React.ReactNode;
  accounts: PaymentGatewayAccount[];
  isConnecting: boolean;
  onConnect: () => void;
  onEnable: (accountId: number) => void;
  onDisable: (accountId: number) => void;
  onRemove: (accountId: number) => void;
  /** Called when user wants to complete/reconnect a pending account */
  onReconnect?: (accountId: number) => void;
  disabled?: boolean;
  features?: string[];
  bankDetails?: {
    bank_name?: string;
    account_masked?: string;
  };
}

export function MultiAccountGatewayCard({
  name,
  description,
  logo,
  accounts,
  isConnecting,
  onConnect,
  onEnable,
  onDisable,
  onRemove,
  onReconnect,
  disabled = false,
  features = [],
  bankDetails,
}: MultiAccountGatewayCardProps) {
  const activeAccount = accounts.find((a) => a.is_enabled === true);
  const inactiveAccounts = accounts.filter((a) => a.is_enabled !== true);

  // No accounts connected - show connect button
  if (accounts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">{logo}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-lg text-gray-900 mb-1">{name}</h4>
            <p className="text-sm text-gray-600 mb-3">{description}</p>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button
          onClick={onConnect}
          disabled={disabled || isConnecting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Connect {name}
            </>
          )}
        </Button>
      </div>
    );
  }

  // Has accounts - show them in a professional layout
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">{logo}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-lg text-gray-900">{name}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          {accounts.length > 1 && (
            <Badge className="bg-white text-gray-900">
              {accounts.length} Accounts
            </Badge>
          )}
        </div>
      </div>

      {/* Active Account */}
      {activeAccount && (
        <div className="px-6 py-4 bg-green-50 border-b border-green-100">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-green-600 hover:bg-green-700">
                  <Power className="w-3 h-3 mr-1" />
                  Active
                </Badge>
                {bankDetails && (
                  <span className="text-xs text-gray-600">
                    {bankDetails.bank_name} • {bankDetails.account_masked}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 font-mono">
                Account: {activeAccount.account_id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisable(activeAccount.id)}
                disabled={disabled}
                className="border-gray-300 hover:bg-gray-50"
              >
                Disable
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(activeAccount.id)}
                disabled={disabled}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inactive / Pending Accounts */}
      {inactiveAccounts.length > 0 && (
        <div className="px-6 py-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            {inactiveAccounts.some((a) => a.account_status === "pending")
              ? "Pending & Inactive Accounts"
              : "Inactive Accounts"}
          </p>
          <div className="space-y-2">
            {inactiveAccounts.map((account) => {
              const isPending = account.account_status === "pending";
              const canReconnect = isPending && onReconnect;

              return (
                <div
                  key={account.id}
                  className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${
                    isPending
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isPending ? (
                        <Badge className="bg-amber-600 hover:bg-amber-700 text-white">
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-900">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 font-mono truncate">
                      {account.account_id}
                    </p>
                    {isPending && (
                      <p className="text-xs text-amber-700 mt-1">
                        Setup was interrupted — complete to start accepting payments
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canReconnect ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReconnect(account.id)}
                        disabled={disabled || isConnecting}
                        className="border-amber-400 text-amber-700 hover:bg-amber-100"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Reconnecting...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Complete Setup
                          </>
                        )}
                      </Button>
                    ) : (
                      !isPending && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEnable(account.id)}
                          disabled={disabled}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Power className="w-3 h-3 mr-1" />
                          Enable
                        </Button>
                      )
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(account.id)}
                      disabled={disabled}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Another Account - only show when fewer than 2 accounts */}
      {accounts.length > 0 && accounts.length < 2 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={onConnect}
            disabled={disabled || isConnecting}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Another {name} Account
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
