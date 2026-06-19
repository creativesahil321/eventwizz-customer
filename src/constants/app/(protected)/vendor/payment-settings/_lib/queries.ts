import { useQuery } from "@tanstack/react-query";
import { vendorPaymentGatewayService } from "@/services/vendor/payment-gateway/payment-gateway.service";

/**
 * Query hook to fetch vendor payment gateways status
 */
export function useVendorPaymentGateways() {
  return useQuery({
    queryKey: ["vendor", "payment-gateways"],
    queryFn: () => vendorPaymentGatewayService.getPaymentGateways(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
