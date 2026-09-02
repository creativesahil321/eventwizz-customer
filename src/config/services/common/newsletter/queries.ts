import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { themeKeys } from "@/hooks/use-theme-query";
import { downloadBlob } from "@/lib/export";
import { newsletterService } from "./newsletter.service";
import type {
  ConfirmSubscriptionResult,
  CustomerSubscribeResult,
  ExportCsvParams,
  NewsletterCounts,
  NewsletterCsvFile,
  PublicUnsubscribeResult,
  SubscribePayload,
  SubscribeResult,
  SubscriberListParams,
  SubscriberListResult,
  UnsubscribeInfo,
} from "./types";

export type CustomerNewsletterToggleVars =
  | "subscribe"
  | "unsubscribe"
  | {
      action: "subscribe";
      location_id?: number;
    }
  | { action: "unsubscribe" };

export const newsletterKeys = {
  vendor: ["vendor", "newsletters"] as const,
  vendorList: (filters: SubscriberListParams) =>
    [...newsletterKeys.vendor, filters] as const,
  vendorCounts: () => [...newsletterKeys.vendor, "counts"] as const,
  unsubscribePreview: (token: string) =>
    ["public", "newsletter", "unsubscribe", token] as const,
};

function invalidateVendorLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: newsletterKeys.vendor });
}

/**
 * Branch subscribe UX on `data.result`, not `status` or `data.state`.
 * `notify: "silent"` when the caller renders inline UI (no duplicate toast).
 */
export function handleSubscribeResponse(
  res: Pick<SubscribeResult, "result" | "message">,
  queryClient: QueryClient,
  options?: { notify?: "toast" | "silent" },
) {
  const { result, message } = res;
  const notify = options?.notify ?? "toast";

  switch (result) {
    case "pending":
      if (notify === "toast") toast.success(message);
      break;
    case "confirmation_pending":
      if (notify === "toast") toast.info(message);
      break;
    case "subscribed":
      if (notify === "toast") toast.success(message);
      void queryClient.invalidateQueries({ queryKey: themeKeys.all });
      break;
    case "already_subscribed":
      if (notify === "toast") toast.info(message);
      void queryClient.invalidateQueries({ queryKey: themeKeys.all });
      break;
  }
}

/* ------------------------------ Vendor ------------------------------ */

export const useNewsletterSubscribers = (params: SubscriberListParams) =>
  useQuery<SubscriberListResult>({
    queryKey: newsletterKeys.vendorList(params),
    queryFn: () => newsletterService.listSubscribers(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

export const useNewsletterCounts = () =>
  useQuery<NewsletterCounts>({
    queryKey: newsletterKeys.vendorCounts(),
    queryFn: () => newsletterService.getCounts(),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

export const useExportNewsletterCsv = () => {
  const queryClient = useQueryClient();

  return useMutation<NewsletterCsvFile, Error, ExportCsvParams>({
    mutationFn: (params) => newsletterService.exportCsv(params),
    onSuccess: (file) => {
      downloadBlob(file.blob, file.filename);
      invalidateVendorLists(queryClient);
    },
  });
};

export const useVendorUnsubscribe = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => newsletterService.vendorUnsubscribe(id),
    onSuccess: () => {
      invalidateVendorLists(queryClient);
    },
  });
};

/* ------------------------------ Public ------------------------------ */

export const usePublicSubscribe = () => {
  const queryClient = useQueryClient();

  return useMutation<SubscribeResult, Error, SubscribePayload>({
    mutationFn: (payload) => newsletterService.subscribe(payload),
    onSuccess: (data) =>
      handleSubscribeResponse(data, queryClient, { notify: "silent" }),
  });
};

export const useResendNewsletterConfirmation = () =>
  useMutation<SubscribeResult, Error, SubscribePayload>({
    mutationFn: (payload) => newsletterService.resendConfirmation(payload),
  });

export const useConfirmNewsletterSubscription = () =>
  useMutation<ConfirmSubscriptionResult, Error, string>({
    mutationFn: (token) => newsletterService.confirmSubscription(token),
  });

export const useUnsubscribeInfo = (token: string) =>
  useQuery<UnsubscribeInfo>({
    queryKey: newsletterKeys.unsubscribePreview(token),
    queryFn: () => newsletterService.getUnsubscribeInfo(token),
    enabled: token.length >= 20,
    retry: false,
    refetchOnWindowFocus: false,
  });

export const useUnsubscribeByToken = () =>
  useMutation<PublicUnsubscribeResult, Error, string>({
    mutationFn: (token) => newsletterService.unsubscribeByToken(token),
  });

/* ----------------------------- Customer ----------------------------- */

export const useCustomerNewsletterToggle = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CustomerSubscribeResult | { message: string },
    Error,
    CustomerNewsletterToggleVars
  >({
    mutationFn: (vars) => {
      if (
        vars === "unsubscribe" ||
        (typeof vars !== "string" && vars.action === "unsubscribe")
      ) {
        return newsletterService.customerUnsubscribe();
      }
      if (vars === "subscribe") {
        return newsletterService.customerSubscribe();
      }
      return newsletterService.customerSubscribe({
        location_id: vars.location_id,
      });
    },
    onSuccess: (data, vars) => {
      const isUnsubscribe =
        vars === "unsubscribe" ||
        (typeof vars !== "string" && vars.action === "unsubscribe");
      if (isUnsubscribe) {
        void queryClient.invalidateQueries({ queryKey: themeKeys.all });
        return;
      }
      handleSubscribeResponse(data as CustomerSubscribeResult, queryClient, {
        notify: "toast",
      });
    },
  });
};
