"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";

export default function PayPalReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handlePayPalReturn = async () => {
      try {
        // Get any query parameters PayPal might send back
        const merchantId = searchParams.get("merchantId");
        const merchantIdInPayPal = searchParams.get("merchantIdInPayPal");
        const permissionsGranted = searchParams.get("permissionsGranted");
        const accountStatus = searchParams.get("accountStatus");

        console.log("PayPal Return - Merchant ID:", merchantId);
        console.log(
          "PayPal Return - Merchant ID in PayPal:",
          merchantIdInPayPal
        );
        console.log("PayPal Return - Permissions Granted:", permissionsGranted);
        console.log("PayPal Return - Account Status:", accountStatus);

        if (
          merchantId &&
          permissionsGranted === "true" &&
          accountStatus === "active"
        ) {
          // Call the backend API using the common function
          const response = await onboardingService.handlePaymentGatewayReturn(
            "paypal",
            {
              merchantId,
              permissionsGranted,
              accountStatus,
            }
          );

          if (response.status) {
            setStatus("success");
            setMessage(
              "PayPal account connected successfully! You can now close this window and continue with your onboarding."
            );
            toast.success("PayPal connected successfully!");

            // Set a flag to indicate successful connection for parent page
            localStorage.setItem("paypal_connection_success", "true");
          } else {
            setStatus("error");
            setMessage(
              response.message ||
                "There was an issue processing your PayPal connection. Please try again."
            );
            toast.error("Failed to process PayPal connection");
          }
        } else {
          setStatus("error");
          setMessage("PayPal connection incomplete. Please try again.");
          toast.error("PayPal connection incomplete");
        }

        // If this was opened in a pop-up, close it after a short delay
        setTimeout(() => {
          if (window.opener) {
            // This is a pop-up window, close it
            window.close();
          } else {
            // This is the main window, redirect to onboarding payment step
            router.push("/on-boarding?step=10");
          }
        }, 2000);
      } catch (error) {
        console.error("PayPal return handling error:", error);
        setStatus("error");
        setMessage(
          "There was an issue processing your PayPal connection. Please try again."
        );
        toast.error("Failed to process PayPal connection");

        // Redirect after showing error
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            router.push("/on-boarding?step=10");
          }
        }, 3000);
      }
    };

    handlePayPalReturn();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            )}
            {status === "error" && (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {status === "loading" && "Processing..."}
            {status === "success" && "Success!"}
            {status === "error" && "Error"}
          </h1>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            {status === "loading" &&
              "Processing your PayPal connection. Please wait..."}
            {message}
          </p>
          {status === "success" && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                ✅ Your PayPal account has been successfully connected.
                <br />
                <br />
                {window.opener
                  ? "This window will close automatically..."
                  : "Redirecting to onboarding..."}
              </p>
            </div>
          )}
          {status === "error" && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                ❌ There was an issue processing your connection.
                <br />
                <br />
                Please try connecting again from the payment setup page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
