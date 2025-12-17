"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building2 
} from "lucide-react";

interface TrueLayerConnectButtonProps {
  status?: "pending" | "active" | "under_review" | "restricted";
  accountId?: string;
  bankDetails?: {
    bank_name?: string;
    account_masked?: string;
  };
  isConnecting?: boolean;
  onConnect?: () => void;
}

export function TrueLayerConnectButton({
  status,
  accountId,
  bankDetails,
  isConnecting = false,
  onConnect,
}: TrueLayerConnectButtonProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "under_review":
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case "restricted":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "pending":
      default:
        return <Building2 className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "active":
        return "Connected";
      case "under_review":
        return "Under Review";
      case "restricted":
        return "Restricted";
      case "pending":
      default:
        return "Pending Setup";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "under_review":
        return "text-amber-600";
      case "restricted":
        return "text-red-600";
      case "pending":
      default:
        return "text-gray-600";
    }
  };

  const getButtonText = () => {
    if (isConnecting) {
      return "Connecting...";
    }
    
    switch (status) {
      case "active":
        return "✓ Bank-to-bank";
      case "under_review":
        return ""; // No button for under_review
      case "restricted":
        return "Contact Support";
      case "pending":
      default:
        return "Connect Bank Transfer";
    }
  };

  const shouldShowButton = () => {
    return status !== "under_review" && status !== "active";
  };

  return (
    <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              {getStatusIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">
                  Connect Bank Transfer
                </h3>
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              
              {status === "under_review" && bankDetails ? (
                <div className="mt-1 text-sm text-gray-600">
                  <p className="font-medium">
                    {bankDetails.bank_name} • {bankDetails.account_masked}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Review typically takes 1-2 business days
                  </p>
                </div>
              ) : status === "active" && bankDetails ? (
                <div className="mt-1 text-sm text-gray-600">
                  <p className="font-medium">
                    {bankDetails.bank_name} • {bankDetails.account_masked}
                  </p>
                </div>
              ) : (
                <div className="mt-1 text-sm text-gray-600">
                  <p>Bank-to-bank • 40% lower fees • FCA authorised</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {shouldShowButton() && (
              <Button
                onClick={onConnect}
                disabled={isConnecting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {getButtonText()}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
