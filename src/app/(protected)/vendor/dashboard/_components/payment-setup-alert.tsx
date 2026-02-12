"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function PaymentSetupAlert() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [hasPaymentProvider, setHasPaymentProvider] = useState(false);

  useEffect(() => {
    // Check if alert was dismissed
    const isDismissed = localStorage.getItem("payment_setup_alert_dismissed");
    if (isDismissed === "true") {
      setDismissed(true);
    }

    // Check if vendor has payment provider
    const hasProvider = session?.user?.has_payment_provider;
    setHasPaymentProvider(!!hasProvider);
  }, [session]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("payment_setup_alert_dismissed", "true");
  };

  // Don't show if dismissed or if payment provider is already set up
  if (dismissed || hasPaymentProvider) {
    return null;
  }

  return (
    <Alert className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-amber-700 hover:text-amber-900 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-4 pr-8">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-amber-600" />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-amber-900 text-lg">
              Payment Gateway Setup Required
            </h3>
          </div>
          
          <AlertDescription className="text-amber-800 mb-4">
            You haven&apos;t connected a payment gateway yet. Without a payment
            method, customers won&apos;t be able to complete their bookings.
            Connect Stripe, PayPal, or TrueLayer in just a few minutes.
          </AlertDescription>
          
          <div className="flex flex-wrap gap-3">
            <Link href="/vendor/settings?tab=payment-gateways">
              <Button
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Set Up Payment Gateway
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              Remind Me Later
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}
