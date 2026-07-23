"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";

type Status = "loading" | "success" | "error";

export default function StripeReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [apiResponse, setApiResponse] = useState<{
    success?: boolean;
    status?: boolean;
    message?: string;
    gateway?: string;
    account_status?: string;
    account_data?: {
      account_id?: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      details_submitted?: boolean;
    };
  } | null>(null);

  const redirectAfterDelay = useCallback(
    (delay: number) => {
      setTimeout(() => {
        if (window.opener) {
          window.close();
        } else {
          router.push("/on-boarding?step=11");
        }
      }, delay);
    },
    [router]
  );

  const handleSuccess = useCallback(
    (response?: {
      success?: boolean;
      status?: boolean;
      message?: string;
      gateway?: string;
      account_status?: string;
      account_data?: {
        account_id?: string;
        charges_enabled?: boolean;
        payouts_enabled?: boolean;
        details_submitted?: boolean;
      };
    }) => {
      setStatus("success");

      // Get account status from API response (passed as parameter or from state)
      const accountStatus =
        response?.account_status || apiResponse?.account_status;
      let message = "Your Stripe account has been connected successfully!";

      if (accountStatus === "active") {
        message =
          "Your Stripe account is now active! You can accept payments from guests.";
        toast.success("Stripe account activated!");
      } else if (accountStatus === "under_review") {
        message =
          "Your Stripe account is under review. You'll be notified once it's approved.";
        toast.success("Stripe account submitted for review!");
      } else if (accountStatus === "restricted") {
        message =
          "Your Stripe account has some restrictions. Please check your dashboard for details.";
        toast.warning("Stripe account has restrictions");
      } else {
        message = "Your Stripe account has been connected successfully!";
        toast.success("Stripe connected successfully!");
      }

      setMessage(message);

      // Set a flag to indicate successful connection for parent page
      localStorage.setItem("stripe_connection_success", "true");
      localStorage.removeItem("stripe_account_id");

      redirectAfterDelay(3000);
    },
    [redirectAfterDelay, apiResponse?.account_status]
  );

  const handleError = useCallback(
    (errorMessage?: string) => {
      setStatus("error");
      setMessage(
        errorMessage ||
          "There was an issue processing your connection. Please try again."
      );
      toast.error("Connection failed");

      redirectAfterDelay(3000);
    },
    [redirectAfterDelay]
  );

  useEffect(() => {
    const processStripeReturn = async () => {
      try {
        const accountId = searchParams.get("account");
        const storedAccountId = localStorage.getItem("stripe_account_id");
        const finalAccountId = accountId || storedAccountId;

        // Check if account ID contains placeholder values
        if (
          finalAccountId &&
          (finalAccountId.includes("{{") ||
            finalAccountId.includes("ACCOUNT_ID"))
        ) {
          handleError(
            "Invalid account ID received. Please try connecting again."
          );
          return;
        }

        // Prepare the API call parameters
        const apiParams: Record<string, string> = {};
        if (finalAccountId) {
          apiParams.account = finalAccountId;
        }

        const response = await onboardingService.handlePaymentGatewayReturn(
          "stripe",
          apiParams
        );

        setApiResponse(response);

        // Check both 'success' and 'status' fields for backward compatibility
        const isSuccess = response.success === true || response.status === true;

        if (isSuccess) {
          handleSuccess(response);
        } else {
          handleError(response.message);
        }
      } catch (error) {
        console.error("Error processing Stripe return:", error);
        handleError(
          "An unexpected error occurred. Please try connecting again."
        );
      }
    };

    processStripeReturn();
  }, [searchParams, handleSuccess, handleError]);

  const renderStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-16 h-16 text-green-600" />;
      case "error":
        return <XCircle className="w-16 h-16 text-red-600" />;
    }
  };

  const renderStatusTitle = () => {
    switch (status) {
      case "loading":
        return "Processing...";
      case "success":
        return "Submitted Successfully!";
      case "error":
        return "Connection Error";
    }
  };

  const renderStatusMessage = () => {
    if (status === "success") {
      const accountStatus = apiResponse?.account_status;
      const accountData = apiResponse?.account_data;

      let statusColor = "green";
      let statusIcon = "✅";

      if (accountStatus === "under_review") {
        statusColor = "yellow";
        statusIcon = "⏳";
      } else if (accountStatus === "restricted") {
        statusColor = "orange";
        statusIcon = "⚠️";
      }

      return (
        <div
          className={`mt-4 p-4 bg-${statusColor}-50 rounded-lg border border-${statusColor}-200`}
        >
          <p className={`text-sm text-${statusColor}-800`}>
            {statusIcon} {message}
            <br />
            <br />
            {accountStatus === "active" && (
              <>
                Your account is fully activated and ready to accept payments.
                <br />
                {accountData?.charges_enabled && "✅ Charges enabled"}
                <br />
                {accountData?.payouts_enabled && "✅ Payouts enabled"}
                <br />
                {accountData?.details_submitted && "✅ Details submitted"}
              </>
            )}
            {accountStatus === "under_review" && (
              <>
                Your account details are being reviewed by Stripe.
                <br />
                This usually takes 1-2 business days.
                <br />
                You&apos;ll receive an email once the review is complete.
              </>
            )}
            {accountStatus === "restricted" && (
              <>
                Your account has some restrictions that need attention.
                <br />
                Please check your Stripe dashboard for more details.
                <br />
                Contact Stripe support if you need assistance.
              </>
            )}
            {!accountStatus && (
              <>You can now accept payments from guests through Stripe.</>
            )}
            <br />
            <br />
            {window.opener
              ? "This window will close automatically..."
              : "Redirecting to onboarding..."}
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-800">
            ❌ {message}
            <br />
            <br />
            Please try connecting again from the payment setup page.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">{renderStatusIcon()}</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {renderStatusTitle()}
          </h1>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            {status === "loading"
              ? "Processing your Stripe connection. Please wait..."
              : message}
          </p>
          {renderStatusMessage()}
        </CardContent>
      </Card>
    </div>
  );
}
