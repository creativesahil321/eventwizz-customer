"use client";

import { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  Building2,
  Smartphone,
  Clock,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";

// Payment gateway configuration
const PAYMENT_GATEWAYS = {
  stripe: {
    id: "stripe",
    name: "Stripe",
    description: "Credit or debit card",
    icon: CreditCard,
    fees: "2.9% + 30¢",
    processingTime: "Instant",
    color: "blue",
  },
  paypal: {
    id: "paypal",
    name: "PayPal",
    description: "Pay with your PayPal account",
    icon: Smartphone,
    fees: "2.9% + 30¢",
    processingTime: "Instant",
    color: "yellow",
  },
  truelayer: {
    id: "truelayer",
    name: "TrueLayer",
    description: "Pay directly from your bank",
    icon: Building2,
    fees: "No fees",
    processingTime: "1-2 business days",
    color: "green",
  },
  worldpay: {
    id: "worldpay",
    name: "WorldPay",
    description: "Secure card payments",
    icon: CreditCard,
    fees: "2.5% + 25¢",
    processingTime: "Instant",
    color: "purple",
  },
  klarna: {
    id: "klarna",
    name: "Klarna",
    description: "Buy now, pay later",
    icon: Clock,
    fees: "No fees",
    processingTime: "Instant approval",
    color: "pink",
  },
} as const;

interface PaymentGatewaySelectorProps {
  availableGateways: Array<{
    id: number;
    slug: string;
  }>;
  selectedGateway: string | null;
  onGatewaySelect: (gatewayId: string) => void;
  disabled?: boolean;
  showError?: boolean;
}

export default function PaymentGatewaySelector({
  availableGateways,
  selectedGateway,
  onGatewaySelect,
  disabled = false,
  showError = false,
}: PaymentGatewaySelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAutoSelectedRef = useRef(false);

  // Filter available gateways based on what's provided by the API
  const filteredGateways = availableGateways
    .map((gateway) => ({
      ...PAYMENT_GATEWAYS[gateway.slug as keyof typeof PAYMENT_GATEWAYS],
      apiId: gateway.id, // Store the API ID for sending to backend
    }))
    .filter((gateway) => gateway.id); // Filter out undefined gateways

  // Auto-select single gateway in useEffect (not during render)
  useEffect(() => {
    if (
      filteredGateways.length === 1 &&
      !selectedGateway &&
      !hasAutoSelectedRef.current
    ) {
      hasAutoSelectedRef.current = true;
      console.log(
        `🔄 Auto-selecting payment gateway: ${filteredGateways[0].name}`
      );
      // Use setTimeout to ensure this happens after render
      setTimeout(() => {
        onGatewaySelect(filteredGateways[0].apiId.toString());
      }, 0);
    }
  }, [filteredGateways, selectedGateway, onGatewaySelect]);

  if (filteredGateways.length === 0) {
    return null;
  }

  const selectedGatewayConfig = selectedGateway
    ? filteredGateways.find(
        (gateway) => gateway.apiId.toString() === selectedGateway
      )
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider">
          Payment Method
        </h4>
        {showError && (
          <span className="text-xs text-red-600 font-medium">
            * Required
          </span>
        )}
      </div>
      
      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
          Please select a payment method to continue
        </div>
      )}

      {/* All Gateway Options - Show all if no selection or if expanded OR if only one gateway */}
      {(!selectedGateway || isExpanded || filteredGateways.length === 1) && (
        <div className="space-y-1.5">
          {filteredGateways.map((gateway) => {
            const isSelected = selectedGateway === gateway.apiId.toString();
            const IconComponent = gateway.icon;

            return (
              <button
                key={gateway.id}
                className={`w-full text-left transition-all duration-200 border rounded-lg p-2 ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : showError
                    ? "border-red-300 bg-red-50 hover:bg-red-100"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => {
                  if (!disabled && !isSelected) {
                    // Only call onGatewaySelect if not already selected
                    onGatewaySelect(gateway.apiId.toString());
                    if (filteredGateways.length > 1) {
                      setIsExpanded(false);
                    }
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded ${
                      isSelected ? "bg-white" : "bg-gray-100"
                    }`}
                  >
                    <IconComponent className="h-4 w-4 text-gray-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-gray-900">
                        {gateway.name}
                      </span>
                      {isSelected && (
                        <CheckCircle className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span>{gateway.fees}</span>
                      <span>•</span>
                      <span className="truncate">{gateway.processingTime}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Gateway Display (Compact) - Only show when collapsed AND multiple gateways */}
      {selectedGatewayConfig && !isExpanded && filteredGateways.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full text-left border border-blue-500 bg-blue-50 rounded-lg p-2 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-white">
                  <selectedGatewayConfig.icon className="h-4 w-4 text-gray-700" />
                </div>
                <span className="font-medium text-sm text-gray-900">
                  {selectedGatewayConfig.name}
                </span>
                <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-xs text-blue-600 font-medium">Change</span>
            </div>
          </button>
        </motion.div>
      )}
    </div>
  );
}
