"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardContent, CardHeader, OnboardingCard } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useFormContext } from "../../form-provider";
import {
  isGatewayStatusActive,
  stepTenSchema,
  StepTenType,
} from "../../form-provider/schema";
import { normalizeStepTenPaymentGatewaysFromApi } from "../../form-provider/normalize-step-ten-gateways";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { vendorPaymentGatewayService } from "@/services/vendor/payment-gateway/payment-gateway.service";
import { OnboardingTitle } from "@/components/ui/typography";
import { Resolver, type FieldErrors } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";
import { Button } from "@/components/ui/button";
import { PaymentSetupLayout, type CardProvider } from "./payment-setup-layout";
import type { PaymentGatewayCredentials } from "@/services/vendor/payment-gateway/types";
import { resolveConnectedAccountId } from "@/services/vendor/payment-gateway/types";
import { BankTransferFields } from "@/components/payment/bank-transfer-fields";
import type { BankTransferOnboardingOffer } from "../../form-provider/normalize-step-ten-gateways";

export default function StepTen() {
  const {
    form: globalForm,
    save,
    setActiveStep,
    persistedProgressHydrated,
  } = useFormContext();

  const stepTenPersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepTen.isApproved",
  });
  const persistedStepTen = useWatch({
    control: globalForm.control,
    name: "stepTen",
  });
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<CardProvider | null>(null);
  const [sessionOnlineAccountId, setSessionOnlineAccountId] = useState<
    number | null
  >(null);
  const [sessionBankAccount, setSessionBankAccount] = useState<{
    id: number;
    key?: string;
  } | null>(null);
  const [bankRemoved, setBankRemoved] = useState(false);
  const [bankConnecting, setBankConnecting] = useState(false);
  const [bankDisconnectingId, setBankDisconnectingId] = useState<number | null>(
    null,
  );
  const { update: updateSession } = useSession();
  const eventId = useEventId(globalForm, "stepTen");

  const form = useForm<StepTenType>({
    resolver: zodResolver(stepTenSchema) as Resolver<StepTenType>,
    defaultValues: {
      step: 10,
      event_id: eventId,
      isApproved: false,
      is_skipped: false,
    },
    mode: "onChange",
  });

  const deriveAcceptPaymentMethod = useCallback(
    (
      gateways: StepTenType["payment_gateways"] | undefined,
    ): StepTenType["accept_payment_method"] => {
      void gateways;
      return "payment_gateway";
    },
    [],
  );

  // Keep local step form in sync with persistence (nested online/offline → flat UI).
  useEffect(() => {
    if (eventId > 0) {
      form.setValue("event_id", eventId);
    }

    if (!persistedStepTen || typeof persistedStepTen !== "object") return;

    const mappedGateways = normalizeStepTenPaymentGatewaysFromApi(
      (persistedStepTen as Record<string, unknown>).payment_gateways,
    ) as StepTenType["payment_gateways"];

    form.setValue("payment_gateways", mappedGateways);
    form.setValue(
      "isApproved",
      (persistedStepTen as { isApproved?: boolean }).isApproved === true,
    );
    form.setValue(
      "is_skipped",
      (persistedStepTen as { is_skipped?: boolean }).is_skipped === true,
    );
    form.setValue(
      "accept_payment_method",
      deriveAcceptPaymentMethod(mappedGateways),
      { shouldValidate: true, shouldDirty: false },
    );
  }, [eventId, form, persistedStepTen, deriveAcceptPaymentMethod]);

  const paymentGateways = form.watch("payment_gateways");
  const stripeStatus = form.watch("payment_gateways.stripe.status");
  const paypalStatus = form.watch("payment_gateways.paypal.status");

  useEffect(() => {
    const gateways = form.getValues("payment_gateways");
    form.setValue(
      "accept_payment_method",
      deriveAcceptPaymentMethod(gateways),
      {
        shouldValidate: true,
        shouldDirty: false,
      },
    );
  }, [
    stripeStatus,
    paypalStatus,
    form,
    deriveAcceptPaymentMethod,
  ]);

  const stripeConnected = isGatewayStatusActive(
    paymentGateways?.stripe?.status,
  );
  const paypalConnected = isGatewayStatusActive(
    paymentGateways?.paypal?.status,
  );
  const hasConnectedGateway = stripeConnected || paypalConnected;

  const bankOffer = (
    persistedStepTen as { bank_transfer?: BankTransferOnboardingOffer } | null
  )?.bank_transfer;
  const bankFeatureOn = bankOffer != null;
  const onlineAccountId =
    sessionOnlineAccountId ?? bankOffer?.online_account_id ?? null;
  const linkedBankId = bankRemoved
    ? null
    : (sessionBankAccount?.id ??
      (typeof bankOffer?.id === "number" ? bankOffer.id : null));
  const linkedBankKey = bankRemoved
    ? undefined
    : (sessionBankAccount?.key ?? bankOffer?.key);

  const keepBankTransfer = useCallback(
    <T extends StepTenType>(data: T): T => ({
      ...data,
      bank_transfer: globalForm.getValues("stepTen.bank_transfer"),
    }),
    [globalForm],
  );

  const syncGlobalGateways = useCallback(() => {
    globalForm.setValue(
      "stepTen.payment_gateways",
      form.getValues("payment_gateways"),
    );
  }, [form, globalForm]);

  const handleDisconnect = async (gateway: CardProvider) => {
    setDisconnecting(gateway);
    const clear = () => {
      if (gateway === "stripe") {
        form.setValue("payment_gateways.stripe", {
          status: undefined,
          account_id: "",
        });
      } else {
        form.setValue("payment_gateways.paypal", {
          status: undefined,
          account_id: "",
        });
      }
      syncGlobalGateways();
    };
    try {
      await vendorPaymentGatewayService.disconnectPaymentGateway(gateway);
      clear();
    } catch (error) {
      console.error(`Disconnect ${gateway} error:`, error);
      clear();
    } finally {
      setDisconnecting(null);
    }
  };

  const handleStripeConnect = async (
    credentials: PaymentGatewayCredentials,
  ) => {
    const loadingToast = toast.loading("Verifying Stripe credentials...");
    try {
      setLoading(true);

      const response = await onboardingService.connectPaymentGateway(
        "stripe",
        credentials,
      );

      toast.dismiss(loadingToast);
      if (!response.status) return;

      const account = response.data?.account;
      const status = account?.account_status || "active";
      const accountId = resolveConnectedAccountId(account);

      form.setValue("payment_gateways.stripe", {
        status,
        account_id: accountId,
      });
      if (typeof account?.id === "number") {
        setSessionOnlineAccountId(account.id);
      }
      syncGlobalGateways();
      void updateSession({ has_payment_provider: true });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Stripe connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalConnect = async (
    credentials: PaymentGatewayCredentials,
  ) => {
    const loadingToast = toast.loading("Verifying PayPal credentials...");
    try {
      setLoading(true);

      const response = await onboardingService.connectPaymentGateway(
        "paypal",
        credentials,
      );

      toast.dismiss(loadingToast);
      if (!response.status) return;

      const account = response.data?.account;
      const status = account?.account_status || "active";
      const accountId = resolveConnectedAccountId(account);

      form.setValue("payment_gateways.paypal", {
        status,
        account_id: accountId,
      });
      syncGlobalGateways();
      void updateSession({ has_payment_provider: true });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("PayPal connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBankConnect = async (input: {
    sourceAccountId?: number;
    publishableKey?: string;
    secret?: string;
  }) => {
    setBankConnecting(true);
    try {
      const hasKeys =
        (input.publishableKey?.trim().length ?? 0) > 0 ||
        (input.secret?.trim().length ?? 0) > 0;
      const result = await vendorPaymentGatewayService.connectBankTransfer({
        scope: "onboarding",
        sourceAccountId: hasKeys ? undefined : input.sourceAccountId,
        credentials: hasKeys
          ? {
              publishableKey: input.publishableKey ?? "",
              secret: input.secret ?? "",
            }
          : undefined,
      });
      if (result.status && typeof result.account?.id === "number") {
        setBankRemoved(false);
        setSessionBankAccount({
          id: result.account.id,
          key: result.account.key,
        });
        void onboardingService.notifyDataChanged();
      }
      return result;
    } finally {
      setBankConnecting(false);
    }
  };

  const handleBankDisconnect = async (accountId: number) => {
    setBankDisconnectingId(accountId);
    try {
      const result =
        await vendorPaymentGatewayService.deleteOnboardingPaymentGateway(
          accountId,
        );
      if (!result.status) return;
      setBankRemoved(true);
      setSessionBankAccount(null);
      void onboardingService.notifyDataChanged();
    } finally {
      setBankDisconnectingId(null);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      form.setValue("is_skipped", true);
      const skippedData: StepTenType = keepBankTransfer({
        ...form.getValues(),
        is_skipped: true,
        isApproved: true,
        event_id: form.getValues().event_id || (eventId as number),
      });
      globalForm.setValue("stepTen", skippedData);

      const response = await onboardingService.storeStepTenData(skippedData);

      if (response && response.status) {
        globalForm.setValue("stepTen", skippedData);
        toast.info(
          "Payment setup skipped. You can complete this anytime from Payment settings.",
          { duration: 5000 },
        );
        // Navigate to step 11 in UI, but persist completed step as 10.
        void setActiveStep(11, { skipSessionSync: true });
        Promise.all([updateSession({ on_boarding_step: 10 }), save()]).catch(
          (error) => {
            console.error("Background save error:", error);
          },
        );
      }
    } catch (error) {
      console.error("Error skipping payment setup:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitInvalid = useCallback((errors: FieldErrors<StepTenType>) => {
    if (errors.payment_gateways) {
      toast.error(
        "Connect at least one payment method (bank, Stripe, or PayPal) to continue, or skip payment and continue.",
        { duration: 6500 },
      );
    } else if (errors.accept_payment_method) {
      toast.error(
        errors.accept_payment_method.message?.toString() ||
          "Choose how guests can pay (bank transfer, card, or both).",
        { duration: 6500 },
      );
    } else {
      toast.error("Please fix the highlighted fields to continue.");
    }
  }, []);

  const onSubmit = async (data: StepTenType) => {
    setLoading(true);
    try {
      data.accept_payment_method = deriveAcceptPaymentMethod(
        data.payment_gateways,
      );
      data.is_skipped = false;
      data.isApproved = true;
      const stepPayload = keepBankTransfer(data);
      globalForm.setValue("stepTen", stepPayload);

      data.event_id = data?.event_id as number;

      const hasAnyActiveGateway =
        isGatewayStatusActive(data.payment_gateways?.stripe?.status) ||
        isGatewayStatusActive(data.payment_gateways?.paypal?.status) ||
        isGatewayStatusActive(data.payment_gateways?.worldpay?.status) ||
        isGatewayStatusActive(data.payment_gateways?.klarna?.status);

      const response = await onboardingService.storeStepTenData({
        ...stepPayload,
        isApproved: true,
      });

      if (response && response.status) {
        globalForm.setValue("stepTen", { ...stepPayload, isApproved: true });

        // Navigate to step 11 in UI, but persist completed step as 10.
        void setActiveStep(11, { skipSessionSync: true });
        Promise.all([
          updateSession({
            on_boarding_step: 10,
            ...(hasAnyActiveGateway ? { has_payment_provider: true } : {}),
          }),
          save(),
        ]).catch((error) => {
          console.error("Background save error:", error);
        });
      }
    } catch (error) {
      console.error("Error during Step Ten submission:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-start bg-transparent px-4 py-8">
      <div className="relative mx-auto mb-16 w-full max-w-3xl">
        <OnboardingCard className="mx-auto w-full shadow-sm">
          <CardHeader className="space-y-1.5 pb-2 pt-4 text-center sm:text-left">
            <OnboardingTitle>
              How would you like to accept payments?
            </OnboardingTitle>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-400 sm:mx-0">
              Connect card payments with Stripe or PayPal, and optionally bank
              transfers. You don&apos;t have to set this up now. Skip and
              connect a provider anytime from Payment settings. Your site still
              goes live; you just can&apos;t take bookings until a provider is
              connected.
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-0">
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <input type="hidden" {...form.register("step")} />
                <input type="hidden" {...form.register("event_id")} />
                <input
                  type="hidden"
                  {...form.register("accept_payment_method")}
                />
                <input type="hidden" {...form.register("is_skipped")} />

                <WholeStepGuidedShell
                  form={form}
                  sectionId="step-ten-payments"
                  chipLabel="Payment methods"
                  chipDescription="Card and bank transfer providers. You can skip this step."
                  lenientApproval
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepTenPersistedApproved === true}
                  renderFooter={({ guided }) => (
                    <GuidedWholeStepBottomActions
                      guided={guided}
                      loading={loading}
                      labelWhenReady="Continue to domain"
                      alwaysShowReadyLabel
                      continueDisabled={!hasConnectedGateway}
                      onContinue={() =>
                        void form.handleSubmit(onSubmit, onSubmitInvalid)()
                      }
                      statusSlot={
                        !hasConnectedGateway ? (
                          <span className="mx-auto max-w-xl px-2 text-center text-xs text-slate-400">
                            Link at least one payment account to take bookings,
                            or skip payment and continue to domain.
                          </span>
                        ) : (
                          <span className="mx-auto max-w-xl px-2 text-center text-xs text-emerald-400/90">
                            You&apos;re ready to continue to domain.
                          </span>
                        )
                      }
                      extraActions={
                        <Button
                          variant="event-outline"
                          type="button"
                          onClick={() => void handleSkip()}
                          className={guidedOnboardingSkipButtonClass}
                          disabled={loading}
                        >
                          Skip payment and continue
                        </Button>
                      }
                    />
                  )}
                >
                  {() => (
                    <PaymentSetupLayout
                      stripeConnected={stripeConnected}
                      paypalConnected={paypalConnected}
                      stripeAccountId={paymentGateways?.stripe?.account_id}
                      paypalAccountId={paymentGateways?.paypal?.account_id}
                      bankTransferConnected={typeof linkedBankId === "number"}
                      bankTransfer={
                        bankFeatureOn ? (
                          <BankTransferFields
                            variant="onboarding"
                            hasOnlineAccount={stripeConnected || paypalConnected}
                            sourceAccounts={
                              typeof onlineAccountId === "number"
                                ? [
                                    {
                                      id: onlineAccountId,
                                      label: "Connected account",
                                    },
                                  ]
                                : []
                            }
                            defaultSourceAccountId={
                              typeof onlineAccountId === "number"
                                ? onlineAccountId
                                : null
                            }
                            linkedAccounts={
                              typeof linkedBankId === "number"
                                ? [
                                    {
                                      id: linkedBankId,
                                      maskedKey: linkedBankKey,
                                    },
                                  ]
                                : []
                            }
                            connecting={bankConnecting}
                            disconnectingId={bankDisconnectingId}
                            onConnect={handleBankConnect}
                            onDisconnect={(accountId) =>
                              void handleBankDisconnect(accountId)
                            }
                          />
                        ) : undefined
                      }
                      loading={loading}
                      disconnecting={disconnecting}
                      onConnectStripe={(credentials) =>
                        void handleStripeConnect(credentials)
                      }
                      onConnectPayPal={(credentials) =>
                        void handlePayPalConnect(credentials)
                      }
                      onDisconnectStripe={() => void handleDisconnect("stripe")}
                      onDisconnectPayPal={() => void handleDisconnect("paypal")}
                      onSkip={() => void handleSkip()}
                      onFinish={() =>
                        void form.handleSubmit(onSubmit, onSubmitInvalid)()
                      }
                      finishDisabled={!hasConnectedGateway}
                      showFooter={false}
                    />
                  )}
                </WholeStepGuidedShell>
              </form>
            </Form>
          </CardContent>
        </OnboardingCard>
      </div>
    </div>
  );
}
