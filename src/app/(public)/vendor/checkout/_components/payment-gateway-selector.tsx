"use client";

import { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  Building2,
  Smartphone,
  Clock,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Payment gateway configuration with brand colors
const PAYMENT_GATEWAYS = {
  stripe: {
    id: "stripe",
    name: "Stripe",
    description: "Credit or debit card",
    icon: CreditCard,
    processingTime: "Instant",
    brandColor: "from-indigo-500 to-blue-600",
    bgSelected: "bg-indigo-50 border-indigo-300",
    textColor: "text-indigo-700",
    iconBg: "bg-indigo-100",
  },
  paypal: {
    id: "paypal",
    name: "PayPal",
    description: "Pay with your PayPal account",
    icon: Smartphone,
    processingTime: "Instant",
    brandColor: "from-blue-500 to-blue-600",
    bgSelected: "bg-blue-50 border-blue-300",
    textColor: "text-blue-700",
    iconBg: "bg-blue-100",
  },
  truelayer: {
    id: "truelayer",
    name: "Bank Transfer",
    description: "Pay directly from your bank",
    icon: Building2,
    processingTime: "1-2 business days",
    brandColor: "from-emerald-500 to-green-600",
    bgSelected: "bg-emerald-50 border-emerald-300",
    textColor: "text-emerald-700",
    iconBg: "bg-emerald-100",
  },
  worldpay: {
    id: "worldpay",
    name: "WorldPay",
    description: "Secure card payments",
    icon: CreditCard,
    processingTime: "Instant",
    brandColor: "from-red-500 to-rose-600",
    bgSelected: "bg-rose-50 border-rose-300",
    textColor: "text-rose-700",
    iconBg: "bg-rose-100",
  },
  klarna: {
    id: "klarna",
    name: "Klarna",
    description: "Buy now, pay later",
    icon: Clock,
    processingTime: "Instant approval",
    brandColor: "from-pink-500 to-fuchsia-600",
    bgSelected: "bg-pink-50 border-pink-300",
    textColor: "text-pink-700",
    iconBg: "bg-pink-100",
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

  // If only one gateway, show it as auto-selected without the full selector 
  if (filteredGateways.length === 1 && selectedGateway) {
    const gateway = filteredGateways[0];
    const IconComponent = gateway.icon;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Payment Method
        </h4>
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${gateway.bgSelected}`}>
          <div className={`p-2 rounded-lg ${gateway.iconBg}`}>
            <IconComponent className={`h-4 w-4 ${gateway.textColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-gray-900">
              {gateway.name}
            </span>
            <div className="text-xs text-gray-500">{gateway.description}</div>
          </div>
          <CheckCircle className={`h-4 w-4 ${gateway.textColor}`} />
        </div>
      </div>
    );
  }

  const selectedGatewayConfig = selectedGateway
    ? filteredGateways.find(
        (gateway) => gateway.apiId.toString() === selectedGateway
      )
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Payment Method
        </h4>
        {showError && (
          <span className="text-xs text-red-600 font-medium animate-pulse">
            Select one ↓
          </span>
        )}
      </div>
      
      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-700 font-medium">
          Please select a payment method to continue
        </div>
      )}

      {/* Show all gateway options when no selection or expanded */}
      {(!selectedGateway || isExpanded) && (
        <div className="space-y-2">
          {filteredGateways.map((gateway) => {
            const isSelected = selectedGateway === gateway.apiId.toString();
            const IconComponent = gateway.icon;

            return (
              <button
                key={gateway.id}
                className={`w-full text-left transition-all duration-200 border rounded-xl p-3 group ${
                  isSelected
                    ? `${gateway.bgSelected} shadow-sm`
                    : showError
                    ? "border-red-200 bg-red-50/50 hover:bg-red-50"
                    : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => {
                  if (!disabled && !isSelected) {
                    onGatewaySelect(gateway.apiId.toString());
                    if (filteredGateways.length > 1) {
                      setIsExpanded(false);
                    }
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isSelected ? gateway.iconBg : "bg-gray-100 group-hover:bg-gray-200"
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 ${isSelected ? gateway.textColor : "text-gray-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-gray-900">
                        {gateway.name}
                      </span>
                      {isSelected && (
                        <CheckCircle className={`h-3.5 w-3.5 ${gateway.textColor} flex-shrink-0`} />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {gateway.description} · {gateway.processingTime}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Compact selected display when collapsed */}
      {selectedGatewayConfig && !isExpanded && filteredGateways.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button
            onClick={() => setIsExpanded(true)}
            className={`w-full text-left ${selectedGatewayConfig.bgSelected} rounded-xl p-3 hover:opacity-90 transition-all`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedGatewayConfig.iconBg}`}>
                  <selectedGatewayConfig.icon className={`h-4 w-4 ${selectedGatewayConfig.textColor}`} />
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-900">
                    {selectedGatewayConfig.name}
                  </span>
                  <CheckCircle className={`h-3.5 w-3.5 ${selectedGatewayConfig.textColor} inline ml-1.5`} />
                </div>
              </div>
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                Change
                <ChevronDown className="h-3 w-3" />
              </span>
            </div>
          </button>
        </motion.div>
      )}
    </div>
  );
}
