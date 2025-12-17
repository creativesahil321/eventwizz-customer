"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";

type Status = "loading" | "success" | "error";

export default function TrueLayerReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const redirectAfterDelay = useCallback(
    (delay: number) => {
      setTimeout(() => {
        router.push("/on-boarding?step=10");
      }, delay);
    },
    [router]
  );

  const handleSuccess = useCallback(
    (response?: {
      status?: boolean;
      message?: string;
      data?: {
        bank_account?: {
          bank_name?: string;
          account_number?: string;
          sort_code?: string;
          account_id?: string;
        };
      };
    }) => {
      setStatus("success");

      // Get bank details from response
      const bankAccount = response?.data?.bank_account;
      const bankName = bankAccount?.bank_name || "your bank";
      const accountNumber = bankAccount?.account_number || "";

      let message =
        "Your TrueLayer bank account has been connected successfully!";

      if (bankAccount) {
        message = `Your ${bankName} account (${accountNumber}) has been connected successfully! You can now accept secure bank-to-bank payments from customers.`;
      }

      setMessage(message);
      toast.success("TrueLayer connected successfully!");

      // Set a flag to indicate successful connection for parent page
      localStorage.setItem("truelayer_connection_success", "true");
      localStorage.removeItem("truelayer_connecting");

      redirectAfterDelay(3000);
    },
    [redirectAfterDelay]
  );

  const handleError = useCallback(
    (errorMessage?: string) => {
      setStatus("error");
      setMessage(
        errorMessage ||
          "There was an issue processing your TrueLayer connection. Please try again."
      );
      toast.error("TrueLayer connection failed");
      redirectAfterDelay(3000);
    },
    [redirectAfterDelay]
  );

  useEffect(() => {
    const processTrueLayerReturn = async () => {
      try {
        // Get TrueLayer return parameters
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        console.log("TrueLayer Return - Code:", code);
        console.log("TrueLayer Return - State:", state);
        console.log("TrueLayer Return - Error:", error);
        console.log("TrueLayer Return - Error Description:", errorDescription);

        // Check if there's an error from TrueLayer
        if (error) {
          handleError(
            errorDescription ||
              `TrueLayer connection failed: ${error}. Please try again.`
          );
          return;
        }

        // Check if we have the required parameters
        if (!code || !state) {
          handleError(
            "Unable to verify your TrueLayer connection. Please try connecting again."
          );
          return;
        }

        // Call the backend API using the common function
        const response = await onboardingService.handlePaymentGatewayReturn(
          "truelayer",
          {
            code,
            state,
          }
        );

        if (response.status) {
          handleSuccess(response);
        } else {
          handleError(response.message);
        }
      } catch (error) {
        console.error("TrueLayer return handling error:", error);
        handleError(
          "An unexpected error occurred. Please try connecting again."
        );
      }
    };

    processTrueLayerReturn();
  }, [searchParams, handleSuccess, handleError]);

  const renderStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-16 h-16 text-green-600 animate-spin" />;
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
        return "Connected Successfully!";
      case "error":
        return "Connection Error";
    }
  };

  const renderStatusMessage = () => {
    if (status === "success") {
      return (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            ✅ {message}
            <br />
            <br />
            <strong>Bank-to-bank payments offer:</strong>
            <br />
            • 40% lower fees than cards
            <br />
            • Instant settlement
            <br />
            • Enhanced security
            <br />
            <br />
            Redirecting to onboarding...
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
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
              ? "Processing your TrueLayer connection. Please wait..."
              : message}
          </p>
          {renderStatusMessage()}
        </CardContent>
      </Card>
    </div>
  );
}
