"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useVendorPaymentGateways } from "../../_lib/queries";
import { vendorPaymentGatewayService } from "@/services/vendor/payment-gateway/payment-gateway.service";
import type { PaymentGatewaysResponse } from "@/services/vendor/payment-gateway/payment-gateway.service";

const PAYMENT_GATEWAYS_QUERY_KEY = ["vendor", "payment-gateways"] as const;
import { MultiAccountGatewayCard } from "./multi-account-gateway-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GATEWAY_IDS = ["stripe", "paypal", "truelayer"] as const;
type GatewayId = (typeof GATEWAY_IDS)[number];

export function PaymentGatewayManager() {
  const { update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [connectingGateway, setConnectingGateway] = useState<string | null>(
    null,
  );

  const [accountToRemove, setAccountToRemove] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { data: gatewaysData, isLoading, refetch } = useVendorPaymentGateways();

  const paymentGateways = useMemo(
    () => gatewaysData?.data?.payment_gateways ?? {},
    [gatewaysData?.data?.payment_gateways],
  );

  const getGatewayAccounts = useCallback(
    (id: GatewayId) => paymentGateways[id] ?? [],
    [paymentGateways],
  );

  // Check if any gateway has at least one account
  const hasAnyGateway = useMemo(() => {
    return GATEWAY_IDS.some((id) => {
      const accounts = getGatewayAccounts(id);
      return accounts.some(
        (a) => a.account_status === "active" && a.account_id,
      );
    });
  }, [getGatewayAccounts]);

  const handleDisable = useCallback(
    async (accountId: number) => {
      const res = await vendorPaymentGatewayService.setPaymentGatewayEnabled(
        accountId,
        false,
      );
      if (res.status) {
        queryClient.setQueryData<{
          status: boolean;
          message: string;
          data?: PaymentGatewaysResponse;
          errors: string[];
        }>(PAYMENT_GATEWAYS_QUERY_KEY, (prev) => {
          if (!prev?.data?.payment_gateways) return prev;
          const next = {
            ...prev,
            data: { payment_gateways: { ...prev.data.payment_gateways } },
          };
          for (const key of Object.keys(next.data!.payment_gateways)) {
            next.data!.payment_gateways[key] = next.data!.payment_gateways[
              key
            ].map((a) =>
              a.id === accountId ? { ...a, is_enabled: false } : a,
            );
          }
          return next;
        });
      }
    },
    [queryClient],
  );

  const handleEnable = useCallback(
    async (accountId: number) => {
      const res = await vendorPaymentGatewayService.setPaymentGatewayEnabled(
        accountId,
        true,
      );
      if (res.status) {
        queryClient.setQueryData<{
          status: boolean;
          message: string;
          data?: PaymentGatewaysResponse;
          errors: string[];
        }>(PAYMENT_GATEWAYS_QUERY_KEY, (prev) => {
          if (!prev?.data?.payment_gateways) return prev;
          const next = {
            ...prev,
            data: { payment_gateways: { ...prev.data.payment_gateways } },
          };
          for (const key of Object.keys(next.data!.payment_gateways)) {
            const accounts = next.data!.payment_gateways[key];
            next.data!.payment_gateways[key] = accounts.map((a) =>
              a.id === accountId
                ? { ...a, is_enabled: true }
                : { ...a, is_enabled: false },
            );
          }
          return next;
        });
      }
    },
    [queryClient],
  );

  const handleRemoveClick = useCallback((accountId: number) => {
    setAccountToRemove(accountId);
  }, []);

  const handleRemoveConfirm = useCallback(async () => {
    if (accountToRemove == null) return;
    const idToRemove = accountToRemove;
    setAccountToRemove(null);
    const res =
      await vendorPaymentGatewayService.deletePaymentGateway(idToRemove);
    if (res.status) {
      queryClient.setQueryData<{
        status: boolean;
        message: string;
        data?: PaymentGatewaysResponse;
        errors: string[];
      }>(PAYMENT_GATEWAYS_QUERY_KEY, (prev) => {
        if (!prev?.data?.payment_gateways) return prev;
        const next = {
          ...prev,
          data: {
            payment_gateways: { ...prev.data.payment_gateways },
          },
        };
        for (const key of Object.keys(next.data!.payment_gateways)) {
          next.data!.payment_gateways[key] = next.data!.payment_gateways[
            key
          ].filter((a) => a.id !== idToRemove);
        }
        return next;
      });
      const accountsLeft = GATEWAY_IDS.reduce(
        (sum, id) =>
          sum +
          (paymentGateways[id] ?? []).filter((a) => a.id !== idToRemove).length,
        0,
      );
      if (accountsLeft === 0) {
        updateSession({ has_payment_provider: false });
      }
    }
  }, [accountToRemove, queryClient, paymentGateways, updateSession]);

  const handleRemoveCancel = useCallback(() => {
    setAccountToRemove(null);
  }, []);

  // Handler for Stripe Connect
  const handleStripeConnect = async () => {
    try {
      setLoading(true);
      setConnectingGateway("stripe");
      toast.info("Connecting to Stripe...", { duration: 2000 });

      const response =
        await vendorPaymentGatewayService.connectPaymentGateway("stripe");

      if (!response.status) {
        return;
      }

      const onboarding_url = response.data?.onboarding_url;
      const account_id = response.data?.account_id;

      if (onboarding_url && account_id) {
        localStorage.setItem("stripe_account_id", account_id);

        const stripeWindow = window.open(
          onboarding_url,
          "_blank",
          "width=800,height=800",
        );

        if (stripeWindow) {
          toast.success(
            "Stripe onboarding opened! Complete the setup to connect your account.",
            { duration: 5000 },
          );

          const checkInterval = setInterval(() => {
            if (stripeWindow.closed) {
              clearInterval(checkInterval);

              const connectionSuccess = localStorage.getItem(
                "stripe_connection_success",
              );
              if (connectionSuccess === "true") {
                localStorage.removeItem("stripe_connection_success");
                toast.success("Stripe connected successfully!", {
                  duration: 2000,
                });
                setTimeout(() => {
                  refetch();
                  updateSession({ has_payment_provider: true });
                }, 1000);
              } else {
                toast.info(
                  "Stripe window closed. If you completed the setup, your account is under review.",
                  { duration: 4000 },
                );
                refetch();
              }
            }
          }, 1000);
        } else {
          toast.error(
            "Pop-up blocked! Please allow pop-ups to connect with Stripe.",
          );
        }
      } else {
        console.error("Invalid response structure:", response);
      }
    } catch (error) {
      console.error("Stripe connection error:", error);
    } finally {
      setLoading(false);
      setConnectingGateway(null);
    }
  };

  // Handler for PayPal Connect
  const handlePayPalConnect = async () => {
    try {
      setLoading(true);
      setConnectingGateway("paypal");
      toast.info("Connecting to PayPal...", { duration: 2000 });

      const response =
        await vendorPaymentGatewayService.connectPaymentGateway("paypal");

      if (!response.status) {
        return;
      }

      const onboarding_url = response.data?.onboarding_url;
      const account_id = response.data?.account_id;

      if (onboarding_url && account_id) {
        localStorage.setItem("paypal_merchant_id", account_id);

        const paypalWindow = window.open(
          onboarding_url,
          "_blank",
          "width=800,height=800",
        );

        if (paypalWindow) {
          toast.success(
            "PayPal onboarding opened! Complete the setup to connect your account.",
            { duration: 5000 },
          );

          const checkInterval = setInterval(() => {
            if (paypalWindow.closed) {
              clearInterval(checkInterval);

              const connectionSuccess = localStorage.getItem(
                "paypal_connection_success",
              );
              if (connectionSuccess === "true") {
                localStorage.removeItem("paypal_connection_success");
                toast.success("PayPal connected successfully!", {
                  duration: 2000,
                });
                setTimeout(() => {
                  refetch();
                  updateSession({ has_payment_provider: true });
                }, 1000);
              } else {
                toast.info(
                  "PayPal window closed. If you completed the setup, your account is under review.",
                  { duration: 4000 },
                );
                refetch();
              }
            }
          }, 1000);
        } else {
          toast.error(
            "Pop-up blocked! Please allow pop-ups to connect with PayPal.",
          );
        }
      } else {
        console.error("Invalid response structure:", response);
      }
    } catch (error) {
      console.error("PayPal connection error:", error);
    } finally {
      setLoading(false);
      setConnectingGateway(null);
    }
  };

  // Handler for TrueLayer Connect
  const handleTrueLayerConnect = async () => {
    try {
      setLoading(true);
      setConnectingGateway("truelayer");
      const loadingToast = toast.loading("Connecting to TrueLayer...");

      const response =
        await vendorPaymentGatewayService.connectPaymentGateway("truelayer");

      if (!response.status) {
        return;
      }

      const auth_url = response.data?.auth_url;

      if (auth_url) {
        localStorage.setItem("truelayer_connecting", "true");
        localStorage.setItem("settings_payment_setup", "true");

        toast.success("Redirecting to TrueLayer...", {
          id: loadingToast,
          duration: 1000,
        });

        setTimeout(() => {
          window.location.href = auth_url;
        }, 1000);
      } else {
        console.error("Invalid response structure:", response);
      }
    } catch (error) {
      console.error("TrueLayer connection error:", error);
    } finally {
      setLoading(false);
      setConnectingGateway(null);
    }
  };

  if (isLoading) {
    return <PaymentGatewayManagerSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 pb-20 sm:pb-24">
      {/* Warning Alert if no gateway connected */}
      {!hasAnyGateway && (
        <Alert className="border-amber-200 bg-amber-50 mb-4 break-words">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <AlertDescription className="text-amber-900 text-sm sm:text-base">
            <strong>Action Required:</strong> You need to connect at least one
            payment gateway to start accepting bookings. Without a payment
            method, customers won&apos;t be able to complete their bookings.
          </AlertDescription>
        </Alert>
      )}

      {/* Pay by Bank Section (TrueLayer) */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 mb-4 min-w-0 space-y-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="text-base sm:text-lg font-semibold text-black">
            🏦 Pay by Bank Transfer
          </h3>
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
        </div>
        <Alert className="border-green-200 bg-green-50 break-words">
          <Info className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
          <AlertDescription className="text-green-900 text-xs sm:text-sm">
            <strong>Direct Bank-to-Bank Payments:</strong> Customers pay
            directly from their banking app - no card details needed. 40% lower
            fees than cards. FCA authorised and trusted by millions.
          </AlertDescription>
        </Alert>

        <MultiAccountGatewayCard
          name="TrueLayer"
          description="Direct bank-to-bank transfers with instant confirmation"
          logo={
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-2xl">🏦</span>
            </div>
          }
          accounts={getGatewayAccounts("truelayer")}
          isConnecting={connectingGateway === "truelayer"}
          onConnect={handleTrueLayerConnect}
          onEnable={handleEnable}
          onDisable={handleDisable}
          onRemove={handleRemoveClick}
          disabled={loading}
          features={["40% lower fees", "Instant settlements", "FCA regulated"]}
          bankDetails={
            getGatewayAccounts("truelayer").find((a) => a.is_enabled)?.bank
          }
        />
      </div>

      {/* Visual Separator */}
      <div className="flex items-center justify-center my-4 min-w-0">
        <div className="flex-1 min-w-0 border-t border-[var(--color-border)]" />
        <div className="px-3 sm:px-4 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
          OR
        </div>
        <div className="flex-1 min-w-0 border-t border-[var(--color-border)]" />
      </div>

      {/* Online Card Payments Section */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 mb-4 min-w-0 space-y-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="text-base sm:text-lg font-semibold text-black">
            💳 Online Card Payments
          </h3>
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
        </div>
        <Alert className="border-blue-200 bg-blue-50 break-words">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <AlertDescription className="text-blue-900 text-xs sm:text-sm">
            <strong>Credit/Debit Card Processing:</strong> Accept Visa,
            Mastercard, and other major cards. 5-minute setup, automatic
            payouts, no technical knowledge required.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stripe */}
          <MultiAccountGatewayCard
            name="Stripe"
            description="Industry-leading payment processing with global reach"
            logo={
              <div className="w-12 h-12 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  viewBox="0 0 24 24"
                  fill="#635BFF"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                </svg>
              </div>
            }
            accounts={getGatewayAccounts("stripe")}
            isConnecting={connectingGateway === "stripe"}
            onConnect={handleStripeConnect}
            onEnable={handleEnable}
            onDisable={handleDisable}
            onRemove={handleRemoveClick}
            disabled={loading}
            features={["5-min setup", "Auto payouts", "99.9% uptime"]}
          />

          {/* PayPal */}
          <MultiAccountGatewayCard
            name="PayPal"
            description="Trusted by millions worldwide for secure payments"
            logo={
              <div className="w-12 h-12 rounded-lg bg-[#0070BA]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  viewBox="0 0 24 24"
                  fill="#0070BA"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-1.12 7.106h2.065c.46 0 .853-.331.93-.781.009-.054.016-.11.023-.165l.962-6.095a1.35 1.35 0 0 1 1.338-1.14h.843c3.896 0 6.946-1.585 7.832-6.164.353-1.837.172-3.371-.648-4.481z" />
                </svg>
              </div>
            }
            accounts={getGatewayAccounts("paypal")}
            isConnecting={connectingGateway === "paypal"}
            onConnect={handlePayPalConnect}
            onEnable={handleEnable}
            onDisable={handleDisable}
            onRemove={handleRemoveClick}
            disabled={loading}
            features={["Trusted brand", "Buyer protection", "Easy setup"]}
          />
        </div>
      </div>

      {/* Help Section */}
      <Alert className="border-blue-200 bg-blue-50 mt-4 break-words">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <AlertDescription className="text-blue-900 text-sm sm:text-base">
          <strong>Need help?</strong> Our payment gateways are easy to set up
          and don&apos;t require technical knowledge. If you encounter any
          issues, contact our support team for assistance.
        </AlertDescription>
      </Alert>

      {/* Remove payment method confirmation */}
      <AlertDialog
        open={accountToRemove != null}
        onOpenChange={(open) => !open && handleRemoveCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect the payment method from your account. You can
              add it again anytime from this page. Customers will no longer be
              able to pay with this option at checkout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRemoveCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Skeleton loader - same card style as other vendor pages
function PaymentGatewayManagerSkeleton() {
  return (
    <div className="space-y-4 pb-20 sm:pb-24">
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
