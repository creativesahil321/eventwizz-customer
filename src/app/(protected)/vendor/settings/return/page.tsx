"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { vendorPaymentGatewayService } from "@/services/vendor/payment-gateway/payment-gateway.service";
import { toast } from "sonner";
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
        toast.error("Invalid gateway specified");
        setTimeout(() => {
          router.push("/vendor/settings");
        }, 2000);
        return;
      }

      try {
        // Collect all query parameters
        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          if (key !== "gateway") {
            params[key] = value;
          }
        });

        // Call the return handler
        const response =
          await vendorPaymentGatewayService.handlePaymentGatewayReturn(
            gateway,
            params
          );

        if (response.status) {
          setStatus("success");
          setMessage(
            response.message || `${gateway} connected successfully!`
          );
          toast.success(`${gateway} connected successfully!`);

          // Update session
          await updateSession({ has_payment_provider: true });

          // Clear localStorage flags and set success for parent (settings page polling)
          localStorage.removeItem(`${gateway}_connecting`);
          localStorage.removeItem("settings_payment_setup");
          localStorage.setItem(`${gateway}_connection_success`, "true");
          if (gateway === "stripe") {
            localStorage.setItem("stripe_connection_success", "true");
          }

          // If opened as popup from vendor settings, close window so parent stays the only window
          setTimeout(() => {
            if (typeof window !== "undefined" && window.opener) {
              window.close();
            } else if (fromSettings === "true") {
              router.push("/vendor/settings?tab=payment-gateways");
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
          toast.error(
            response.message ||
              `Failed to connect ${gateway}. Please try again.`
          );

          setTimeout(() => {
            if (typeof window !== "undefined" && window.opener) {
              window.close();
            } else if (fromSettings === "true") {
              router.push("/vendor/settings?tab=payment-gateways");
            } else {
              router.push("/vendor/dashboard");
            }
          }, 2500);
        }
      } catch (error) {
        console.error("Return handling error:", error);
        setStatus("error");
        setMessage("An error occurred while processing your connection");
        toast.error("An error occurred while processing your connection");

        setTimeout(() => {
          if (typeof window !== "undefined" && window.opener) {
            window.close();
          } else if (fromSettings === "true") {
            router.push("/vendor/settings?tab=payment-gateways");
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
                Redirecting you back...
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
                Redirecting you back...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
