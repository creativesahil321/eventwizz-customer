"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useVendorPaymentGateways } from "../../_lib/queries";
import { vendorPaymentGatewayService } from "@/services/vendor/payment-gateway/payment-gateway.service";
import type {
  PaymentGatewayAccount,
  PaymentGatewaysResponse,
} from "@/services/vendor/payment-gateway/payment-gateway.service";
import type { PaymentGatewayCredentials } from "@/services/vendor/payment-gateway/types";
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
import {
  MAX_ACCOUNTS_PER_GATEWAY,
  MAX_TOTAL_ACCOUNTS,
  PaymentSettingsSetupLayout,
  type GatewayKind,
} from "./payment-settings-setup-layout";

const PAYMENT_GATEWAYS_QUERY_KEY = ["vendor", "payment-gateways"] as const;

function isUsableAccount(account: PaymentGatewayAccount): boolean {
  if (!account?.id) return false;
  const status = account.account_status;
  return (
    !status ||
    status === "active" ||
    status === "under_review" ||
    status === "pending"
  );
}

export function PaymentGatewayManager() {
  const { update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [connectingGateway, setConnectingGateway] = useState<GatewayKind | null>(
    null,
  );
  const [enablingAccountId, setEnablingAccountId] = useState<number | null>(
    null,
  );
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<
    number | null
  >(null);
  const [accountToRemove, setAccountToRemove] = useState<number | null>(null);
  const [truelayerConnectHint, setTruelayerConnectHint] = useState<
    string | null
  >(null);

  const queryClient = useQueryClient();
  const { data: gatewaysData, isLoading, refetch } = useVendorPaymentGateways();

  const paymentGateways = useMemo(
    () => gatewaysData?.data?.payment_gateways ?? {},
    [gatewaysData?.data?.payment_gateways],
  );

  const canAdd = useMemo(
    () => gatewaysData?.data?.can_add ?? {},
    [gatewaysData?.data?.can_add],
  );

  const stripeAccounts = useMemo(
    () => (paymentGateways.stripe ?? []).filter(isUsableAccount),
    [paymentGateways.stripe],
  );
  const paypalAccounts = useMemo(
    () => (paymentGateways.paypal ?? []).filter(isUsableAccount),
    [paymentGateways.paypal],
  );
  const truelayerAccounts = useMemo(
    () => (paymentGateways.truelayer ?? []).filter(isUsableAccount),
    [paymentGateways.truelayer],
  );

  const totalAccounts =
    stripeAccounts.length + paypalAccounts.length + truelayerAccounts.length;

  const canAddStripe =
    canAdd.stripe === true &&
    stripeAccounts.length < MAX_ACCOUNTS_PER_GATEWAY &&
    totalAccounts < MAX_TOTAL_ACCOUNTS;
  const canAddPayPal =
    canAdd.paypal === true &&
    paypalAccounts.length < MAX_ACCOUNTS_PER_GATEWAY &&
    totalAccounts < MAX_TOTAL_ACCOUNTS;
  const canAddTrueLayer =
    canAdd.truelayer === true &&
    truelayerAccounts.length < MAX_ACCOUNTS_PER_GATEWAY &&
    totalAccounts < MAX_TOTAL_ACCOUNTS;

  const removeAccountFromCache = useCallback(
    (idToRemove: number) => {
      queryClient.setQueryData<{
        status: boolean;
        message: string;
        data?: PaymentGatewaysResponse;
        errors: string[];
      }>(PAYMENT_GATEWAYS_QUERY_KEY, (prev) => {
        if (!prev?.data?.payment_gateways) return prev;
        const nextGateways = { ...prev.data.payment_gateways };
        for (const key of Object.keys(nextGateways)) {
          nextGateways[key] = nextGateways[key].filter(
            (a) => a.id !== idToRemove,
          );
        }
        return {
          ...prev,
          data: {
            ...prev.data,
            payment_gateways: nextGateways,
          },
        };
      });
    },
    [queryClient],
  );

  const setAccountEnabledInCache = useCallback(
    (accountId: number, isEnabled: boolean) => {
      queryClient.setQueryData<{
        status: boolean;
        message: string;
        data?: PaymentGatewaysResponse;
        errors: string[];
      }>(PAYMENT_GATEWAYS_QUERY_KEY, (prev) => {
        if (!prev?.data?.payment_gateways) return prev;
        const nextGateways: Record<string, PaymentGatewayAccount[]> = {};
        for (const [gateway, accounts] of Object.entries(
          prev.data.payment_gateways,
        )) {
          const ownsAccount = accounts.some((a) => a.id === accountId);
          nextGateways[gateway] = accounts.map((account) => {
            if (account.id === accountId) {
              return { ...account, is_enabled: isEnabled };
            }
            if (isEnabled && ownsAccount) {
              return { ...account, is_enabled: false };
            }
            return account;
          });
        }
        return {
          ...prev,
          data: {
            ...prev.data,
            payment_gateways: nextGateways,
          },
        };
      });
    },
    [queryClient],
  );

  const handleMakeDefault = useCallback(
    async (accountId: number) => {
      setEnablingAccountId(accountId);
      try {
        const res = await vendorPaymentGatewayService.setPaymentGatewayEnabled(
          accountId,
          true,
        );
        if (!res.status) return;
        setAccountEnabledInCache(accountId, true);
        void refetch();
      } catch (error) {
        console.error("Enable payment gateway error:", error);
      } finally {
        setEnablingAccountId(null);
      }
    },
    [refetch, setAccountEnabledInCache],
  );

  const handleRemoveConfirm = useCallback(async () => {
    if (accountToRemove == null) return;
    if (totalAccounts <= 1) {
      toast.error("You must keep at least one payment account linked.");
      setAccountToRemove(null);
      return;
    }

    const idToRemove = accountToRemove;
    setAccountToRemove(null);
    setDisconnectingAccountId(idToRemove);
    try {
      const res =
        await vendorPaymentGatewayService.deletePaymentGateway(idToRemove);
      if (!res.status) return;
      removeAccountFromCache(idToRemove);
      if (totalAccounts - 1 === 0) {
        void updateSession({ has_payment_provider: false });
      }
      void refetch();
    } catch (error) {
      console.error("Disconnect payment gateway error:", error);
    } finally {
      setDisconnectingAccountId(null);
    }
  }, [
    accountToRemove,
    refetch,
    removeAccountFromCache,
    totalAccounts,
    updateSession,
  ]);

  const connectGateway = async (
    gateway: GatewayKind,
    credentials: PaymentGatewayCredentials,
  ) => {
    const label =
      gateway === "stripe"
        ? "Stripe"
        : gateway === "paypal"
          ? "PayPal"
          : "TrueLayer";
    const countByGateway =
      gateway === "stripe"
        ? stripeAccounts.length
        : gateway === "paypal"
          ? paypalAccounts.length
          : truelayerAccounts.length;

    if (countByGateway >= MAX_ACCOUNTS_PER_GATEWAY) {
      toast.error(
        `You can link up to ${MAX_ACCOUNTS_PER_GATEWAY} ${label} accounts.`,
      );
      return;
    }
    if (totalAccounts >= MAX_TOTAL_ACCOUNTS) {
      toast.error(
        `You can link up to ${MAX_TOTAL_ACCOUNTS} payment accounts in total.`,
      );
      return;
    }

    const loadingToast = toast.loading(`Checking your ${label} details…`);

    try {
      setLoading(true);
      setConnectingGateway(gateway);

      const response = await vendorPaymentGatewayService.connectPaymentGateway(
        gateway,
        credentials,
      );

      toast.dismiss(loadingToast);

      if (!response.status) return;

      if (gateway === "truelayer") {
        setTruelayerConnectHint(response.data?.webhook_setup_hint || null);
      }

      void refetch();
      void updateSession({ has_payment_provider: true });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error(`${gateway} connection error:`, error);
    } finally {
      setLoading(false);
      setConnectingGateway(null);
    }
  };

  if (isLoading) {
    return <PaymentGatewayManagerSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-4 pb-20 sm:pb-24">
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-md sm:p-6">
        <PaymentSettingsSetupLayout
          stripeAccounts={stripeAccounts}
          paypalAccounts={paypalAccounts}
          truelayerAccounts={truelayerAccounts}
          canAddStripe={canAddStripe}
          canAddPayPal={canAddPayPal}
          canAddTrueLayer={canAddTrueLayer}
          loading={loading}
          connectingGateway={connectingGateway}
          enablingAccountId={enablingAccountId}
          disconnectingAccountId={disconnectingAccountId}
          truelayerConnectHint={truelayerConnectHint}
          onConnectStripe={(credentials) =>
            void connectGateway("stripe", credentials)
          }
          onConnectPayPal={(credentials) =>
            void connectGateway("paypal", credentials)
          }
          onConnectTrueLayer={(credentials) =>
            void connectGateway("truelayer", credentials)
          }
          onMakeDefault={(accountId) => void handleMakeDefault(accountId)}
          onDisconnect={(accountId) => setAccountToRemove(accountId)}
        />
      </div>

      <AlertDialog
        open={accountToRemove != null}
        onOpenChange={(open) => !open && setAccountToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this payment account?</AlertDialogTitle>
            <AlertDialogDescription>
              Customers will no longer be able to pay with this account. You can
              link it again later. You must keep at least one payment account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRemoveConfirm()}
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

function PaymentGatewayManagerSkeleton() {
  return (
    <div className="space-y-4 pb-20 sm:pb-24">
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-md sm:p-6">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
