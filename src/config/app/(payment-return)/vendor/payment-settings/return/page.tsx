"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { vendorPaymentGatewayService } from "@/services/vendor/payment-gateway/payment-gateway.service";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

export default function PaymentGatewayReturnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Processing your connection...");

  useEffect(() => {
    const handleReturn = async () => {
      // Check if this is from settings page
      const fromSettings = localStorage.getItem("settings_payment_setup");

      // Get gateway from URL params
      const gateway = searchParams.get("gateway") as
        | "stripe"
        | "paypal"
        | "truelayer";

      if (!gateway) {
        setStatus("error");
        setMessage("Invalid gateway specified");
        setTimeout(() => {
          router.push("/vendor/payment-settings");
        }, 2000);
        return;
      }

      try {
        // Get account ID: URL params first (Stripe/backend often append on redirect when return opens in popup), then localStorage
        const accountFromUrl =
          searchParams.get("account") || searchParams.get("account_id") || "";
        let accountId = accountFromUrl;

        if (!accountId) {
          if (gateway === "stripe") {
            accountId = localStorage.getItem("stripe_account_id") || "";
          } else if (gateway === "paypal") {
            accountId = localStorage.getItem("paypal_merchant_id") || "";
          } else if (gateway === "truelayer") {
            accountId = "";
          }
        }

        if (!accountId) {
          setStatus("error");
          setMessage("Missing account information. Please try connecting again.");
          // If opened as popup, close it so user isn't stuck; parent can try again
          setTimeout(() => {
            if (typeof window !== "undefined" && window.opener) {
              window.close();
            } else {
              router.push("/vendor/payment-settings?tab=payment-gateways");
            }
          }, 2000);
          return;
        }

        // Call the return handler with the account ID
        const response =
          await vendorPaymentGatewayService.handlePaymentGatewayReturn(
            gateway,
            accountId
          );

        if (response.status) {
          setStatus("success");
          setMessage(
            response.message || `${gateway} connected successfully!`
          );

          // Update session
          await updateSession({ has_payment_provider: true });

          // Clear localStorage flags and set success for parent (settings page polling)
          localStorage.removeItem(`${gateway}_connecting`);
          localStorage.removeItem("settings_payment_setup");
          localStorage.setItem(`${gateway}_connection_success`, "true");
          if (gateway === "stripe") {
            localStorage.setItem("stripe_connection_success", "true");
            localStorage.removeItem("stripe_account_id"); // Clean up after successful connection
          }
          if (gateway === "paypal") {
            localStorage.removeItem("paypal_merchant_id"); // Clean up after successful connection
          }

          // If opened as popup from vendor settings, close window so parent stays the only window
          setTimeout(() => {
            if (typeof window !== "undefined" && window.opener) {
              window.close();
            } else if (fromSettings === "true") {
              router.push("/vendor/payment-settings?tab=payment-gateways");
            } else {
              router.push("/vendor/dashboard");
            }
          }, 1500);
        } else {
          setStatus("error");
          setMessage(
            response.message ||
              `Failed to connect ${gateway}. Please try again.`
          );

          setTimeout(() => {
            if (typeof window !== "undefined" && window.opener) {
              window.close();
            } else if (fromSettings === "true") {
              router.push("/vendor/payment-settings?tab=payment-gateways");
            } else {
              router.push("/vendor/dashboard");
            }
          }, 2500);
        }
      } catch (error) {
        console.error("Return handling error:", error);
        setStatus("error");
        setMessage("An error occurred while processing your connection");

        setTimeout(() => {
          if (typeof window !== "undefined" && window.opener) {
            window.close();
            } else if (fromSettings === "true") {
              router.push("/vendor/payment-settings?tab=payment-gateways");
            } else {
              router.push("/vendor/dashboard");
            }
          }, 2500);
      }
    };

    handleReturn();
  }, [searchParams, router, updateSession]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Connection
              </h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Connection Successful!
              </h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-4">
                {typeof window !== "undefined" && window.opener
                  ? "This window will close automatically..."
                  : "Redirecting you back..."}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-4">
                {typeof window !== "undefined" && window.opener
                  ? "This window will close automatically..."
                  : "Redirecting you back..."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
