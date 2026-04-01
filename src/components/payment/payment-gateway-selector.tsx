"use client";

import React from "react";
import {
  CreditCard,
  Smartphone,
  Globe,
  Shield,
  CheckCircle,
  Clock,
} from "lucide-react";

export interface PaymentGateway {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  fees?: string;
  processing_time?: string;
}

interface PaymentGatewaySelectorProps {
  gateways: PaymentGateway[];
  selectedGateway: PaymentGateway | null;
  onSelectGateway: (gateway: PaymentGateway) => void;
  totalAmount: number;
  currency?: string;
  isLoading?: boolean;
  className?: string;
}

const getGatewayIcon = (gatewayName: string) => {
  const name = gatewayName.toLowerCase();

  if (name.includes("stripe") || name.includes("card")) {
    return <CreditCard className="h-6 w-6" />;
  } else if (name.includes("paypal")) {
    return <Globe className="h-6 w-6" />;
  } else if (name.includes("klarna") || name.includes("buy now pay later")) {
    return <Smartphone className="h-6 w-6" />;
  } else {
    return <Shield className="h-6 w-6" />;
  }
};

const getGatewayDescription = (gatewayName: string) => {
  const name = gatewayName.toLowerCase();

  if (name.includes("stripe")) {
    return "Pay securely with your credit or debit card";
  } else if (name.includes("paypal")) {
    return "Pay with your PayPal account or credit card";
  } else if (name.includes("worldpay")) {
    return "Secure payment processing with WorldPay";
  } else if (name.includes("klarna")) {
    return "Buy now, pay later with flexible payment options";
  } else {
    return "Secure payment processing";
  }
};

const getGatewayFees = (gatewayName: string) => {
  const name = gatewayName.toLowerCase();

  if (name.includes("stripe")) {
    return "2.9% + 30¢";
  } else if (name.includes("paypal")) {
    return "2.9% + 30¢";
  } else if (name.includes("worldpay")) {
    return "2.5% + 25¢";
  } else if (name.includes("klarna")) {
    return "No fees";
  } else {
    return "Varies";
  }
};

export default function PaymentGatewaySelector({
  gateways,
  selectedGateway,
  onSelectGateway,
  totalAmount, // eslint-disable-line @typescript-eslint/no-unused-vars
  currency: _currency,
  isLoading = false,
  className = "",
}: PaymentGatewaySelectorProps) {
  if (gateways.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          No payment gateways available. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Professional Gateway Selection */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
          <h3 className="text-xl font-bold text-gray-900">
            Select Payment Method
          </h3>
        </div>

        <div className="grid gap-4">
          {gateways.map((gateway) => (
            <div
              key={gateway.id}
              className={`group relative border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 transform ${
                selectedGateway?.id === gateway.id
                  ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 ring-4 ring-blue-200 scale-105 shadow-lg"
                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:scale-102 hover:shadow-md"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => !isLoading && onSelectGateway(gateway)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3 rounded-xl transition-colors duration-200 ${
                      selectedGateway?.id === gateway.id
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                    }`}
                  >
                    {getGatewayIcon(gateway.name)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg mb-1">
                      {gateway.name}
                    </h4>
                    <p className="text-gray-600 mb-2">
                      {gateway.description ||
                        getGatewayDescription(gateway.name)}
                    </p>
                    <div className="flex items-center space-x-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Fees: {gateway.fees || getGatewayFees(gateway.name)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Instant
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      selectedGateway?.id === gateway.id
                        ? "border-blue-500 bg-blue-500 scale-110"
                        : "border-gray-300 group-hover:border-blue-400"
                    }`}
                  >
                    {selectedGateway?.id === gateway.id && (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              </div>

              {/* Selection indicator */}
              {selectedGateway?.id === gateway.id && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Professional Security Features */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-6 w-6 text-green-600" />
          <h4 className="font-bold text-green-900">Payment Security</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-800">
              256-bit SSL encryption
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-800">PCI DSS compliant</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-800">Fraud protection</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-800">Secure tokenization</span>
          </div>
        </div>
      </div>
    </div>
  );
}
