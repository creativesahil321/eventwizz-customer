"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardContent, CardHeader, OnboardingCard } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFormContext } from "../../form-provider";
import {
  isGatewayStatusActive,
  stepTenSchema,
  StepTenType,
} from "../../form-provider/schema";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import {
  OnboardingFieldGroupTitle,
  OnboardingTitle,
} from "@/components/ui/typography";
import { Resolver, type FieldErrors } from "react-hook-form";
import { useSession } from "next-auth/react";
import { StripeConnectButton } from "./stripe-connect-button";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { guidedInsetSectionSurfaceClass } from "../../guided-section-surface";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { PayPalConnectButton } from "./paypal-connect-button";
import { TrueLayerConnectButton } from "./truelayer-connect-button";
import { ChevronDown, ChevronUp, Info, Sparkles } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const [loading, setLoading] = useState(false);
  const { update: updateSession } = useSession();
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const eventId = useEventId(globalForm, "stepTen");

  const form = useForm<StepTenType>({
    resolver: zodResolver(stepTenSchema) as Resolver<StepTenType>,
    defaultValues: {
      step: 10,
      event_id: eventId,
      accept_payment_method: "payment_gateway",
      payment_gateways: {
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
      },
      is_skipped: false,
    },
    mode: "onChange",
  });

  // Helper to get initial payment gateways from backend persistence data
  const getInitialPaymentGateways = useCallback(() => {
    const stepTenData = globalForm.getValues("stepTen");

    // Check if we have payment_gateways data from backend (new structure)
    const paymentGateways = (stepTenData as Record<string, unknown>)
      ?.payment_gateways;

    if (paymentGateways && typeof paymentGateways === "object") {
      // Return the payment_gateways directly (already in correct format)
      return paymentGateways as StepTenType["payment_gateways"];
    }

    // Return defaults if no data
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
      gateways: StepTenType["payment_gateways"] | undefined,
    ): StepTenType["accept_payment_method"] => {
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

  // Update form when eventId changes or when persistence data loads
  useEffect(() => {
    if (eventId > 0) {
      form.setValue("event_id", eventId);
    }

    // Load payment gateways from persistence data
    const stepTenData = globalForm.getValues("stepTen");
    const paymentGateways = (stepTenData as Record<string, unknown>)
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
  }, [eventId, form, globalForm, getInitialPaymentGateways, deriveAcceptPaymentMethod]);

  // Watch form values
  const paymentGateways = form.watch("payment_gateways");
  const stripeStatus = form.watch("payment_gateways.stripe.status");
  const paypalStatus = form.watch("payment_gateways.paypal.status");
  const truelayerStatus = form.watch("payment_gateways.truelayer.status");

  // Keep backend field aligned with ACTIVE gateways before Zod runs on submit.
  useEffect(() => {
    const gateways = form.getValues("payment_gateways");
    form.setValue("accept_payment_method", deriveAcceptPaymentMethod(gateways), {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [stripeStatus, paypalStatus, truelayerStatus, form, deriveAcceptPaymentMethod]);

  const hasConnectedGateway =
    isGatewayStatusActive(paymentGateways?.stripe?.status) ||
    isGatewayStatusActive(paymentGateways?.paypal?.status) ||
    isGatewayStatusActive(paymentGateways?.truelayer?.status) ||
    isGatewayStatusActive(paymentGateways?.worldpay?.status) ||
    isGatewayStatusActive(paymentGateways?.klarna?.status);

  // Handler for TrueLayer Connect (Pay by Bank)
  const handleTrueLayerConnect = async () => {
    try {
      setLoading(true);
      const loadingToast = toast.loading("Connecting to TrueLayer...");

      const response =
        await onboardingService.connectPaymentGateway("truelayer");

      // Check if response is successful
      if (!response.status) {
        // Error toast is handled by axios interceptor
        return;
      }

      // Get auth_url from data object (standardized backend response)
      const auth_url = response.data?.auth_url;

      if (auth_url) {
        // Update form state with new structure
        form.setValue("payment_gateways.truelayer", {
          status: "pending",
          account_id: response.data?.account_id || "",
        });

        // Save state before redirect
        localStorage.setItem("truelayer_connecting", "true");
        localStorage.setItem("onboarding_step", "10");

        // Update toast to success
        toast.success("Redirecting to TrueLayer...", {
          id: loadingToast,
          duration: 1000,
        });

        // Redirect to TrueLayer in the same window
        setTimeout(() => {
          window.location.href = auth_url;
        }, 1000);
      } else {
        console.error("Invalid response structure:", response);
      }
    } catch (error) {
      console.error("TrueLayer connection error:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  // Handler for Stripe Connect
  const handleStripeConnect = async () => {
    try {
      setLoading(true);
      toast.info("Connecting to Stripe...", { duration: 2000 });

      // Call the API to get Stripe onboarding URL
      const response = await onboardingService.connectPaymentGateway("stripe");

      // Debug: Log the full response to understand its structure
      console.log("Stripe Connect Response:", response);

      // Check if response is successful
      if (!response.status) {
        // Error toast is handled by axios interceptor
        return;
      }

      // Get data from standardized backend response
      const onboarding_url = response.data?.onboarding_url;
      const account_id = response.data?.account_id;

      if (onboarding_url && account_id) {
        // Update form state with new structure
        form.setValue("payment_gateways.stripe", {
          status: "pending",
          account_id: account_id,
        });

        // Store account ID in localStorage for the return page fallback
        localStorage.setItem("stripe_account_id", account_id);

        // Open Stripe onboarding in a new window
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

          // Monitor popup window closure
          const checkInterval = setInterval(() => {
            if (stripeWindow.closed) {
              clearInterval(checkInterval);

              // Check if we have a successful connection by looking at localStorage
              const connectionSuccess = localStorage.getItem(
                "stripe_connection_success",
              );
              if (connectionSuccess === "true") {
                // Clear the success flag
                localStorage.removeItem("stripe_connection_success");
                // Refresh the page to get updated payment gateway status
                toast.success(
                  "Stripe connection completed! Refreshing page...",
                  { duration: 2000 },
                );
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                toast.info(
                  "Stripe onboarding window closed. If you completed the setup, your account details are under review.",
                  { duration: 4000 },
                );
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
        toast.error(
          response.message ||
            "Failed to initiate Stripe connection. Invalid response from server.",
        );
      }
    } catch (error) {
      console.error("Stripe connection error:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  // Handler for PayPal Connect
  const handlePayPalConnect = async () => {
    try {
      setLoading(true);
      toast.info("Connecting to PayPal...", { duration: 2000 });

      // Call the API to get PayPal onboarding URL
      const response = await onboardingService.connectPaymentGateway("paypal");

      // Debug: Log the full response to understand its structure
      console.log("PayPal Connect Response:", response);

      // Check if response is successful
      if (!response.status) {
        // Error toast is handled by axios interceptor
        return;
      }

      // Get data from standardized backend response
      const onboarding_url = response.data?.onboarding_url;
      const account_id = response.data?.account_id;

      if (onboarding_url && account_id) {
        // Update form state with new structure
        form.setValue("payment_gateways.paypal", {
          status: "pending",
          account_id: account_id,
        });

        // Store merchant ID in localStorage for the return page fallback
        localStorage.setItem("paypal_merchant_id", account_id);

        // Open PayPal onboarding in a new window
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

          // Monitor popup window closure
          const checkInterval = setInterval(() => {
            if (paypalWindow.closed) {
              clearInterval(checkInterval);

              // Check if we have a successful connection by looking at localStorage
              const connectionSuccess = localStorage.getItem(
                "paypal_connection_success",
              );
              if (connectionSuccess === "true") {
                // Clear the success flag
                localStorage.removeItem("paypal_connection_success");
                // Refresh the page to get updated payment gateway status
                toast.success(
                  "PayPal connection completed! Refreshing page...",
                  { duration: 2000 },
                );
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                toast.info(
                  "PayPal onboarding window closed. If you completed the setup, your account details are under review.",
                  { duration: 4000 },
                );
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
        toast.error(
          response.message ||
            "Failed to initiate PayPal connection. Invalid response from server.",
        );
      }
    } catch (error) {
      console.error("PayPal connection error:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  // Handler for Skip
  const handleSkip = async () => {
    setLoading(true);
    try {
      form.setValue("is_skipped", true);
      globalForm.setValue("stepTen.is_skipped", true);

      // INSTANT TRANSITION: Set active step FIRST for smooth UX
      setActiveStep(11);

      // Then handle async operations in background
      Promise.all([updateSession({ on_boarding_step: 11 }), save()]).catch(
        (error) => {
          console.error("Background save error:", error);
        },
      );

      toast.info(
        "Payment setup skipped. You can complete this anytime from your dashboard.",
        { duration: 5000 },
      );
    } catch (error) {
      console.error("Error skipping payment setup:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const onSubmitInvalid = useCallback((errors: FieldErrors<StepTenType>) => {
    if (errors.payment_gateways) {
      toast.error(
        "Connect at least one payment method (bank, Stripe, or PayPal) to save, or tap Skip for now.",
        { duration: 6500 },
      );
    } else if (errors.accept_payment_method) {
      toast.error(
        errors.accept_payment_method.message?.toString() ||
          "Choose how customers can pay (bank transfer, card/online, or both).",
        { duration: 6500 },
      );
    } else {
      toast.error("Please fix the highlighted fields to continue.");
    }
  }, []);

  // Handler for Submit (only runs after Zod + RHF validation passes)
  const onSubmit = async (data: StepTenType) => {
    setLoading(true);
    try {
      // Backend expects accept_payment_method based on what is actually ACTIVE.
      data.accept_payment_method = deriveAcceptPaymentMethod(
        data.payment_gateways,
      );
      globalForm.setValue("stepTen", data);

      data.event_id = data?.event_id as number;

      const hasAnyActiveGateway =
        isGatewayStatusActive(data.payment_gateways?.stripe?.status) ||
        isGatewayStatusActive(data.payment_gateways?.paypal?.status) ||
        isGatewayStatusActive(data.payment_gateways?.truelayer?.status) ||
        isGatewayStatusActive(data.payment_gateways?.worldpay?.status) ||
        isGatewayStatusActive(data.payment_gateways?.klarna?.status);

      const response = await onboardingService.storeStepTenData({
        ...data,
        isApproved: true,
      });

      if (response && response.status) {
        globalForm.setValue("stepTen", { ...data, isApproved: true });
        // INSTANT TRANSITION: Set active step FIRST for smooth UX
        setActiveStep(11);
        toast.success("Payment settings saved successfully!");

        // Then handle async operations in background
        Promise.all([
          updateSession({
            on_boarding_step: 11,
            ...(hasAnyActiveGateway ? { has_payment_provider: true } : {}),
          }),
          save(),
        ]).catch((error) => {
          console.error("Background save error:", error);
        });
      } else {
        // Error toast is handled by axios interceptor
      }
    } catch (error) {
      console.error("Error during Step Ten submission:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-8 px-4 bg-transparent">
      <div className="w-full max-w-4xl mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              How Would You Like To Accept Payment?
            </OnboardingTitle>
          </CardHeader>
          <CardContent className="px-6 py-2 pb-8">
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <input type="hidden" {...form.register("step")} />
                <input type="hidden" {...form.register("event_id")} />
                <input type="hidden" {...form.register("accept_payment_method")} />
                <input type="hidden" {...form.register("is_skipped")} />

                <WholeStepGuidedShell
                  form={form}
                  sectionId="step-ten-payments"
                  chipLabel="Payment methods"
                  chipDescription="Bank transfer and card providers (optional to skip)."
                  lenientApproval
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepTenPersistedApproved === true}
                  renderFooter={({ guided }) => (
                    <GuidedWholeStepBottomActions
                      guided={guided}
                      loading={loading}
                      labelWhenReady="Save & continue"
                      onContinue={() =>
                        void form.handleSubmit(onSubmit, onSubmitInvalid)()
                      }
                      statusSlot={
                        guided.allSectionsApproved && !hasConnectedGateway ? (
                          <span className="mx-auto max-w-xl px-2 text-center text-xs text-amber-500/95">
                            You&apos;ve reviewed this step, but{" "}
                            <strong className="font-semibold text-amber-200">
                              Save &amp; continue
                            </strong>{" "}
                            only works after at least one provider is connected.
                            Use{" "}
                            <strong className="font-semibold text-amber-200">
                              Skip for now
                            </strong>{" "}
                            if you&apos;ll set this up later.
                          </span>
                        ) : undefined
                      }
                      hintSlot={
                        <p className="mx-auto max-w-xl px-2 text-center text-xs text-muted-foreground">
                          <span className="text-foreground/90">
                            Save &amp; continue
                          </span>{" "}
                          saves and moves on only when a payment provider is
                          connected. Not ready? Use{" "}
                          <span className="text-foreground/90">
                            Skip for now
                          </span>
                          .
                        </p>
                      }
                      extraActions={
                        <Button
                          variant="event-outline"
                          type="button"
                          onClick={handleSkip}
                          className={guidedOnboardingSkipButtonClass}
                          disabled={loading}
                        >
                          Skip for Now
                        </Button>
                      }
                    />
                  )}
                >
                  {() => (
                    <>
                      {/* Pay by Bank Section (TrueLayer) */}
                      <section className="w-full mb-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <OnboardingFieldGroupTitle className="text-base">
                            🏦 Pay by Bank Transfer
                          </OnboardingFieldGroupTitle>
                          <Sparkles className="w-5 h-5 text-green-500" />
                        </div>
                        <Alert className="border-green-300 bg-green-100 text-green-900 dark:!border-green-400 dark:!bg-green-100 dark:!text-green-900">
                          <Info className="h-4 w-4 text-green-700 dark:text-green-700 shrink-0" />
                          <AlertDescription className="text-green-900 dark:!text-green-900 text-sm [&_strong]:text-green-900 [&_strong]:dark:!text-green-900">
                            <strong>Direct Bank-to-Bank Payments:</strong>{" "}
                            Customers pay directly from their banking app - no
                            card details needed. 40% lower fees than cards. FCA
                            authorized and trusted by millions.
                          </AlertDescription>
                        </Alert>

                        <TrueLayerConnectButton
                          status={
                            paymentGateways?.truelayer?.status as
                              | "pending"
                              | "active"
                              | "under_review"
                              | "restricted"
                              | undefined
                          }
                          accountId={paymentGateways?.truelayer?.account_id}
                          bankDetails={paymentGateways?.truelayer?.bank}
                          isConnecting={loading}
                          onConnect={handleTrueLayerConnect}
                        />
                      </section>

                      {/* Visual Separator */}
                      <div className="my-8 flex items-center justify-center">
                        <div className="flex-1 border-t border-white/15" />
                        <div className="bg-transparent px-4 text-sm font-medium text-muted-foreground">
                          OR
                        </div>
                        <div className="flex-1 border-t border-white/15" />
                      </div>

                      {/* Online Payment Providers Section */}
                      <section
                        className={guidedInsetSectionSurfaceClass(
                          "w-full mb-4 space-y-6",
                        )}
                      >
                        {/* Recommended Providers */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <OnboardingFieldGroupTitle className="text-base">
                              💳 Online Card Payments
                            </OnboardingFieldGroupTitle>
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                          </div>
                          <Alert
                            className="border-blue-300 dark:border-blue-400"
                            style={{
                              backgroundColor: "rgb(219 234 254)",
                              color: "rgb(30 58 138)",
                            }}
                          >
                            <Info
                              className="h-4 w-4 shrink-0"
                              style={{ color: "rgb(29 78 216)" }}
                            />
                            <AlertDescription
                              className="text-sm"
                              style={{ color: "rgb(30 58 138)" }}
                            >
                              <strong>Credit/Debit Card Processing:</strong>{" "}
                              Accept Visa, Mastercard, and other major cards.
                              5-minute setup, automatic payouts, no technical
                              knowledge required. Your money flows directly to
                              your bank account.
                            </AlertDescription>
                          </Alert>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StripeConnectButton
                              isConnected={
                                isGatewayStatusActive(
                                  paymentGateways?.stripe?.status,
                                )
                              }
                              status={paymentGateways?.stripe?.status}
                              accountId={paymentGateways?.stripe?.account_id}
                              onConnect={handleStripeConnect}
                              disabled={loading}
                            />

                            <PayPalConnectButton
                              isConnected={
                                isGatewayStatusActive(
                                  paymentGateways?.paypal?.status,
                                )
                              }
                              status={paymentGateways?.paypal?.status}
                              merchantId={paymentGateways?.paypal?.account_id}
                              onConnect={handlePayPalConnect}
                              disabled={loading}
                            />
                          </div>
                        </div>

                        {/* Advanced Options (Collapsible) */}
                        <Collapsible
                          open={showAdvancedOptions}
                          onOpenChange={setShowAdvancedOptions}
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full flex items-center justify-between p-4 h-auto"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  ⚙️ Advanced Options
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  (WorldPay, Klarna)
                                </span>
                              </div>
                              {showAdvancedOptions ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </Button>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="pt-4 space-y-6">
                            <Alert className="border-amber-300 bg-amber-100 text-amber-900 dark:!border-amber-400 dark:!bg-amber-100 dark:!text-amber-900">
                              <Info className="h-4 w-4 text-amber-700 dark:text-amber-700 shrink-0" />
                              <AlertDescription className="text-amber-900 dark:!text-amber-900 text-sm [&_strong]:text-amber-900 [&_strong]:dark:!text-amber-900">
                                <strong>Advanced users only:</strong> These
                                providers require manual API key entry and
                                manual payout processing. Only use if you
                                already have an account with these providers.
                              </AlertDescription>
                            </Alert>

                            {/* WorldPay & Klarna Note */}
                            <div className="space-y-4">
                              <Alert
                                className="border-gray-300 dark:border-gray-400"
                                style={{
                                  backgroundColor: "rgb(243 244 246)",
                                  color: "rgb(17 24 39)",
                                }}
                              >
                                <Info
                                  className="h-4 w-4 shrink-0"
                                  style={{ color: "rgb(55 65 81)" }}
                                />
                                <AlertDescription
                                  className="text-sm"
                                  style={{ color: "rgb(17 24 39)" }}
                                >
                                  <strong>WorldPay & Klarna:</strong> Advanced
                                  payment gateways are currently managed
                                  separately. Please contact support if you need
                                  to configure these providers.
                                </AlertDescription>
                              </Alert>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </section>

                      {/* Skip Information */}
                      <Alert className="border-amber-300 bg-amber-100 text-amber-900 dark:!border-amber-400 dark:!bg-amber-100 dark:!text-amber-900">
                        <Info className="h-4 w-4 text-amber-700 dark:text-amber-700 shrink-0" />
                        <AlertDescription className="text-amber-900 dark:!text-amber-900 text-sm [&_strong]:text-amber-900 [&_strong]:dark:!text-amber-900">
                          <strong>Not ready to set up payments?</strong> You can
                          skip this step and configure your payment methods
                          later from your dashboard. However, you won&apos;t be
                          able to accept bookings until payment is set up.
                        </AlertDescription>
                      </Alert>
                    </>
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
