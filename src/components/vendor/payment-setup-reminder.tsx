"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaymentSetupReminderProps {
  className?: string;
  dismissible?: boolean;
}

/**
 * Payment Setup Reminder Banner
 *
 * Displays a prominent reminder banner when vendors haven't completed
 * their payment setup during onboarding. This encourages them to connect
 * a payment provider (Stripe/PayPal) or configure bank transfer.
 *
 * Usage:
 * ```tsx
 * // Add to vendor dashboard or any vendor page
 * import { PaymentSetupReminder } from "@/components/vendor/payment-setup-reminder";
 *
 * export default function VendorDashboard() {
 *   return (
 *     <div>
 *       <PaymentSetupReminder />
 *       {/* Rest of dashboard content *\/}
 *     </div>
 *   );
 * }
 * ```
 */
export function PaymentSetupReminder({
  className,
  dismissible = true,
}: PaymentSetupReminderProps) {
  const { data: session } = useSession();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage for dismissed state
    const dismissed = localStorage.getItem("payment_reminder_dismissed");
    const dismissedAt = dismissed ? parseInt(dismissed, 10) : 0;
    const oneDayInMs = 24 * 60 * 60 * 1000;

    // Show reminder again after 24 hours
    if (dismissed && Date.now() - dismissedAt < oneDayInMs) {
      setIsDismissed(true);
      return;
    }

    // Check if payment setup is needed
    // Note: These properties will be added to session type in implementation
    const user = session?.user as any;
    const needsPaymentSetup =
      user?.payment_setup_skipped === true || !user?.has_payment_provider;

    setIsVisible(needsPaymentSetup);
  }, [session]);

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissed timestamp
    localStorage.setItem("payment_reminder_dismissed", Date.now().toString());
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <Alert
      variant="default"
      className={cn(
        "mb-6 border-l-4 border-l-amber-500 bg-amber-50 border-amber-200",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <CreditCard className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <AlertTitle className="text-amber-900 font-semibold mb-2">
            Complete Your Payment Setup
          </AlertTitle>
          <AlertDescription className="text-amber-800 mb-4">
            <p className="mb-2">
              You haven&apos;t set up your payment method yet. To start
              accepting bookings and receiving payments, you need to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Connect your Stripe or PayPal account, or</li>
              <li>Add your bank transfer details</li>
            </ul>
            <p className="mt-2 text-sm font-medium">
              ⚠️ Without payment setup, customers cannot complete bookings for
              your events.
            </p>
          </AlertDescription>
          <div className="flex items-center gap-3">
            <Button
              asChild
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Link href="/vendor/payment-settings">
                <CreditCard className="mr-2 h-4 w-4" />
                Complete Payment Setup
              </Link>
            </Button>
            {dismissible && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
              >
                Remind Me Later
              </Button>
            )}
          </div>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-amber-600 hover:text-amber-900 hover:bg-amber-100"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </Alert>
  );
}

/**
 * Compact version of the payment setup reminder
 * For use in navbar or smaller spaces
 */
export function PaymentSetupReminderCompact({
  className,
}: {
  className?: string;
}) {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Note: These properties will be added to session type in implementation
    const user = session?.user as any;
    const needsPaymentSetup =
      user?.payment_setup_skipped === true || !user?.has_payment_provider;

    setIsVisible(needsPaymentSetup);
  }, [session]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md",
        className
      )}
    >
      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <span className="text-sm text-amber-900 flex-1">
        Payment setup incomplete
      </span>
      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
        <Link href="/vendor/payment-settings">Setup</Link>
      </Button>
    </div>
  );
}
