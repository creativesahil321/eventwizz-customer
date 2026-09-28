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
    brandColor: "from-[color:var(--checkout-cta)] to-[color:var(--checkout-cta)]",
    bgSelected: "bg-[color:color-mix(in_srgb,var(--checkout-brand-accent)_7%,white)] border-[color:color-mix(in_srgb,var(--checkout-brand-accent)_30%,white)]",
    textColor: "text-[color:var(--checkout-brand-accent)]",
    iconBg: "bg-[color:color-mix(in_srgb,var(--checkout-brand-accent)_12%,white)]",
  },
  paypal: {
    id: "paypal",
    name: "PayPal",
    description: "Pay with your PayPal account",
    icon: Smartphone,
    processingTime: "Instant",
    brandColor: "from-[color:var(--checkout-cta)] to-[color:var(--checkout-cta)]",
    bgSelected: "bg-[color:color-mix(in_srgb,var(--checkout-brand-accent)_7%,white)] border-[color:color-mix(in_srgb,var(--checkout-brand-accent)_30%,white)]",
    textColor: "text-[color:var(--checkout-brand-accent)]",
    iconBg: "bg-[color:color-mix(in_srgb,var(--checkout-brand-accent)_12%,white)]",
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

const GATEWAY_PROMPT_NAMES: Record<string, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  truelayer: "bank transfer",
  worldpay: "WorldPay",
  klarna: "Klarna",
};

/** e.g. "Choose PayPal or Stripe to continue" from available cart gateways. */
export function formatCheckoutGatewayContinuePrompt(
  gateways: Array<{ slug?: string | null }> | null | undefined,
): string {
  const names = Array.from(
    new Set(
      (gateways ?? [])
        .map((g) => {
          const slug = g.slug?.trim().toLowerCase() ?? "";
          return GATEWAY_PROMPT_NAMES[slug] ?? null;
        })
        .filter((n): n is string => Boolean(n)),
    ),
  );

  if (names.length === 0) return "Choose a payment method to continue";
  if (names.length === 1) return `Choose ${names[0]} to continue`;
  if (names.length === 2) {
    return `Choose ${names[0]} or ${names[1]} to continue`;
  }
  const last = names[names.length - 1];
  return `Choose ${names.slice(0, -1).join(", ")}, or ${last} to continue`;
}

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

  // Single gateway — clean selected card (matches order summary design)
  if (filteredGateways.length === 1 && selectedGateway) {
    const gateway = filteredGateways[0];
    const IconComponent = gateway.icon;
    return (
      <div id="checkout-payment-method" className="space-y-2 scroll-mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--checkout-muted-foreground)]">
          Payment Method
        </p>
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--checkout-brand-accent)]/30 bg-[color:var(--checkout-muted)]/30 p-3">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <IconComponent className="h-4 w-4 text-[color:var(--checkout-brand-primary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-[color:var(--checkout-foreground)]">
              {gateway.name}
            </span>
            <div className="text-xs text-[color:var(--checkout-muted-foreground)]">
              {gateway.description}
            </div>
          </div>
          <CheckCircle className="h-4 w-4 shrink-0 text-[color:var(--checkout-brand-accent)]" />
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
    <div id="checkout-payment-method" className="space-y-2 scroll-mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Payment Method
        </h4>
      </div>

      {/* The customer tapped Pay as instructed — prompt, don't scold: no red /
          pulsing / amber warning styling for a normal next step. */}
      {showError && (
        <p className="text-sm font-medium text-[color:var(--checkout-brand-accent)]">
          {formatCheckoutGatewayContinuePrompt(availableGateways)}
        </p>
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
                    ? "border-[color:color-mix(in_srgb,var(--checkout-brand-accent)_40%,white)] bg-white hover:bg-[color:color-mix(in_srgb,var(--checkout-brand-accent)_6%,white)]"
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
        <motion.div initial={false} animate={{ opacity: 1 }}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) setIsExpanded(true);
            }}
            className={`w-full text-left ${selectedGatewayConfig.bgSelected} rounded-xl p-3 hover:opacity-90 transition-all ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
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
