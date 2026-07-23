"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardContent, CardHeader, OnboardingCard } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useFormContext } from "../../form-provider";
import {
  isGatewayStatusActive,
  stepElevenSchema,
  StepElevenType,
} from "../../form-provider/schema";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { vendorPaymentGatewayService } from "@/services/vendor/payment-gateway/payment-gateway.service";
import { OnboardingTitle } from "@/components/ui/typography";
import { Resolver, type FieldErrors } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";
import { Button } from "@/components/ui/button";
import {
  PaymentSetupLayout,
  type CardProvider,
} from "./payment-setup-layout";
import type { PaymentGatewayCredentials } from "@/services/vendor/payment-gateway/types";
import { resolveConnectedAccountId } from "@/services/vendor/payment-gateway/types";

export default function StepEleven() {
  const {
    form: globalForm,
    save,
    persistedProgressHydrated,
  } = useFormContext();

  const stepElevenPersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepEleven.isApproved",
  });
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<
    CardProvider | "truelayer" | null
  >(null);
  const [stripeWebhookUrl, setStripeWebhookUrl] = useState<string | null>(null);
  const [paypalWebhookUrl, setPaypalWebhookUrl] = useState<string | null>(null);
  const [truelayerWebhookUrl, setTruelayerWebhookUrl] = useState<string | null>(
    null,
  );
  const [truelayerWebhookHint, setTruelayerWebhookHint] = useState<
    string | null
  >(null);
  const [truelayerPublicKey, setTruelayerPublicKey] = useState<string | null>(
    null,
  );
  const { update: updateSession } = useSession();
  const router = useRouter();

  const eventId = useEventId(globalForm, "stepEleven");

  const form = useForm<StepElevenType>({
    resolver: zodResolver(stepElevenSchema) as Resolver<StepElevenType>,
    defaultValues: {
      step: 11,
      event_id: eventId,
      isApproved: false,
      is_skipped: false,
    },
    mode: "onChange",
  });

  const getInitialPaymentGateways = useCallback(() => {
    const stepElevenData = globalForm.getValues("stepEleven");
    const paymentGateways = (stepElevenData as Record<string, unknown>)
      ?.payment_gateways;

    if (paymentGateways && typeof paymentGateways === "object") {
      return paymentGateways as StepElevenType["payment_gateways"];
    }

    return {
      stripe: { status: undefined, account_id: "" },
      paypal: { status: undefined, account_id: "" },
      truelayer: {
        status: undefined,
        account_id: "",
        bank: {
          bank_name: undefined,
          account_masked: undefined,
        },
      },
      worldpay: { status: undefined, account_id: "" },
      klarna: { status: undefined, account_id: "" },
    };
  }, [globalForm]);

  const deriveAcceptPaymentMethod = useCallback(
    (
      gateways: StepElevenType["payment_gateways"] | undefined,
    ): StepElevenType["accept_payment_method"] => {
      const hasBankTransferActive = isGatewayStatusActive(
        gateways?.truelayer?.status,
      );
      const hasPaymentGatewayActive =
        isGatewayStatusActive(gateways?.stripe?.status) ||
        isGatewayStatusActive(gateways?.paypal?.status);

      if (hasBankTransferActive && hasPaymentGatewayActive) return "both";
      if (hasBankTransferActive) return "bank_transfer";
      return "payment_gateway";
    },
    [],
  );

  useEffect(() => {
    if (eventId > 0) {
      form.setValue("event_id", eventId);
    }

    const stepElevenData = globalForm.getValues("stepEleven");
    const paymentGateways = (stepElevenData as Record<string, unknown>)
      ?.payment_gateways;

    if (paymentGateways && typeof paymentGateways === "object") {
      const mappedGateways = getInitialPaymentGateways();
      form.setValue("payment_gateways", mappedGateways);
      form.setValue(
        "accept_payment_method",
        deriveAcceptPaymentMethod(mappedGateways),
        { shouldValidate: true, shouldDirty: false },
      );
    }
  }, [
    eventId,
    form,
    globalForm,
    getInitialPaymentGateways,
    deriveAcceptPaymentMethod,
  ]);

  const paymentGateways = form.watch("payment_gateways");
  const stripeStatus = form.watch("payment_gateways.stripe.status");
  const paypalStatus = form.watch("payment_gateways.paypal.status");
  const truelayerStatus = form.watch("payment_gateways.truelayer.status");

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
    truelayerStatus,
    form,
    deriveAcceptPaymentMethod,
  ]);

  const stripeConnected = isGatewayStatusActive(paymentGateways?.stripe?.status);
  const paypalConnected = isGatewayStatusActive(paymentGateways?.paypal?.status);
  const truelayerConnected = isGatewayStatusActive(
    paymentGateways?.truelayer?.status,
  );
  const hasConnectedGateway =
    stripeConnected || paypalConnected || truelayerConnected;

  const syncGlobalGateways = useCallback(() => {
    globalForm.setValue(
      "stepEleven.payment_gateways",
      form.getValues("payment_gateways"),
    );
  }, [form, globalForm]);

  const handleDisconnect = async (gateway: CardProvider | "truelayer") => {
    setDisconnecting(gateway);
    try {
      await vendorPaymentGatewayService.disconnectPaymentGateway(gateway);

      if (gateway === "stripe") {
        form.setValue("payment_gateways.stripe", {
          status: undefined,
          account_id: "",
        });
        setStripeWebhookUrl(null);
      } else if (gateway === "paypal") {
        form.setValue("payment_gateways.paypal", {
          status: undefined,
          account_id: "",
        });
        setPaypalWebhookUrl(null);
      } else {
        form.setValue("payment_gateways.truelayer", {
          status: undefined,
          account_id: "",
          bank: undefined,
        });
        setTruelayerWebhookUrl(null);
        setTruelayerWebhookHint(null);
        setTruelayerPublicKey(null);
      }
      syncGlobalGateways();
    } catch (error) {
      console.error(`Disconnect ${gateway} error:`, error);
      if (gateway === "stripe") {
        form.setValue("payment_gateways.stripe", {
          status: undefined,
          account_id: "",
        });
        setStripeWebhookUrl(null);
      } else if (gateway === "paypal") {
        form.setValue("payment_gateways.paypal", {
          status: undefined,
          account_id: "",
        });
        setPaypalWebhookUrl(null);
      } else {
        form.setValue("payment_gateways.truelayer", {
          status: undefined,
          account_id: "",
          bank: undefined,
        });
        setTruelayerWebhookUrl(null);
        setTruelayerWebhookHint(null);
        setTruelayerPublicKey(null);
      }
      syncGlobalGateways();
    } finally {
      setDisconnecting(null);
    }
  };

  const handleTrueLayerConnect = async (
    credentials: PaymentGatewayCredentials,
  ) => {
    const loadingToast = toast.loading("Verifying TrueLayer credentials...");
    try {
      setLoading(true);

      const response = await onboardingService.connectPaymentGateway(
        "truelayer",
        credentials,
      );

      toast.dismiss(loadingToast);
      if (!response.status) return;

      const account = response.data?.account;
      const status = account?.account_status || "active";
      const accountId = resolveConnectedAccountId(account);

      form.setValue("payment_gateways.truelayer", {
        status,
        account_id: accountId,
      });
      syncGlobalGateways();
      setTruelayerWebhookUrl(response.data?.webhook_url || null);
      setTruelayerWebhookHint(response.data?.webhook_setup_hint || null);
      setTruelayerPublicKey(response.data?.public_key || null);
      void updateSession({ has_payment_provider: true });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("TrueLayer connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStripeConnect = async (credentials: PaymentGatewayCredentials) => {
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
      syncGlobalGateways();
      setStripeWebhookUrl(response.data?.webhook_url || null);
      void updateSession({ has_payment_provider: true });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Stripe connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalConnect = async (credentials: PaymentGatewayCredentials) => {
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
      setPaypalWebhookUrl(response.data?.webhook_url || null);
      void updateSession({ has_payment_provider: true });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("PayPal connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      form.setValue("is_skipped", true);
      const skippedData: StepElevenType = {
        ...form.getValues(),
        is_skipped: true,
        isApproved: true,
        event_id: form.getValues().event_id || (eventId as number),
      };
      globalForm.setValue("stepEleven", skippedData);

      const response = await onboardingService.storeStepElevenData(skippedData);

      if (response && response.status) {
        globalForm.setValue("stepEleven", skippedData);
        await Promise.all([
          updateSession({ on_boarding_step: 11 }),
          save(),
        ]).catch((error) => {
          console.error("Background save error:", error);
        });

        toast.info(
          "Payment setup skipped. You can complete this anytime from your dashboard.",
          { duration: 5000 },
        );
        router.push("/preview/onboarding");
      }
    } catch (error) {
      console.error("Error skipping payment setup:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitInvalid = useCallback((errors: FieldErrors<StepElevenType>) => {
    if (errors.payment_gateways) {
      toast.error(
        "Connect at least one payment method (bank, Stripe, or PayPal) to complete onboarding, or skip payment and finish.",
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

  const onSubmit = async (data: StepElevenType) => {
    setLoading(true);
    try {
      data.accept_payment_method = deriveAcceptPaymentMethod(
        data.payment_gateways,
      );
      data.is_skipped = false;
      data.isApproved = true;
      globalForm.setValue("stepEleven", data);

      data.event_id = data?.event_id as number;

      const hasAnyActiveGateway =
        isGatewayStatusActive(data.payment_gateways?.stripe?.status) ||
        isGatewayStatusActive(data.payment_gateways?.paypal?.status) ||
        isGatewayStatusActive(data.payment_gateways?.truelayer?.status) ||
        isGatewayStatusActive(data.payment_gateways?.worldpay?.status) ||
        isGatewayStatusActive(data.payment_gateways?.klarna?.status);

      const response = await onboardingService.storeStepElevenData({
        ...data,
        isApproved: true,
      });

      if (response && response.status) {
        globalForm.setValue("stepEleven", { ...data, isApproved: true });

        await Promise.all([
          updateSession({
            on_boarding_step: 11,
            ...(hasAnyActiveGateway ? { has_payment_provider: true } : {}),
          }),
          save(),
        ]).catch((error) => {
          console.error("Background save error:", error);
        });

        router.push("/preview/onboarding");
      }
    } catch (error) {
      console.error("Error during Step Eleven submission:", error);
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
              transfers with TrueLayer. You can change this later in Payment
              settings.
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-0">
            <Form {...form}>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="space-y-4"
              >
                <input type="hidden" {...form.register("step")} />
                <input type="hidden" {...form.register("event_id")} />
                <input
                  type="hidden"
                  {...form.register("accept_payment_method")}
                />
                <input type="hidden" {...form.register("is_skipped")} />

                <WholeStepGuidedShell
                  form={form}
                  sectionId="step-eleven-payments"
                  chipLabel="Payment methods"
                  chipDescription="Card and bank transfer providers. You can skip this step."
                  lenientApproval
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepElevenPersistedApproved === true}
                  renderFooter={({ guided }) => (
                    <GuidedWholeStepBottomActions
                      guided={guided}
                      loading={loading}
                      labelWhenReady="Finish set-up"
                      alwaysShowReadyLabel
                      continueDisabled={!hasConnectedGateway}
                      onContinue={() =>
                        void form.handleSubmit(onSubmit, onSubmitInvalid)()
                      }
                      statusSlot={
                        !hasConnectedGateway ? (
                          <span className="mx-auto max-w-xl px-2 text-center text-xs text-slate-400">
                            Link at least one payment account to take bookings, or
                            skip payment and finish set-up.
                          </span>
                        ) : (
                          <span className="mx-auto max-w-xl px-2 text-center text-xs text-emerald-400/90">
                            You&apos;re ready to finish set-up.
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
                          Skip payment and finish
                        </Button>
                      }
                    />
                  )}
                >
                  {() => (
                    <PaymentSetupLayout
                      stripeConnected={stripeConnected}
                      paypalConnected={paypalConnected}
                      truelayerConnected={truelayerConnected}
                      stripeAccountId={paymentGateways?.stripe?.account_id}
                      paypalAccountId={paymentGateways?.paypal?.account_id}
                      truelayerAccountId={
                        paymentGateways?.truelayer?.account_id
                      }
                      stripeWebhookUrl={stripeWebhookUrl}
                      paypalWebhookUrl={paypalWebhookUrl}
                      truelayerWebhookUrl={truelayerWebhookUrl}
                      truelayerWebhookHint={truelayerWebhookHint}
                      truelayerPublicKey={truelayerPublicKey}
                      loading={loading}
                      disconnecting={disconnecting}
                      onConnectStripe={(credentials) =>
                        void handleStripeConnect(credentials)
                      }
                      onConnectPayPal={(credentials) =>
                        void handlePayPalConnect(credentials)
                      }
                      onConnectTrueLayer={(credentials) =>
                        void handleTrueLayerConnect(credentials)
                      }
                      onDisconnectStripe={() => void handleDisconnect("stripe")}
                      onDisconnectPayPal={() => void handleDisconnect("paypal")}
                      onDisconnectTrueLayer={() =>
                        void handleDisconnect("truelayer")
                      }
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
