import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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

export const usePublicSubscribe = () =>
  useMutation<SubscribeResult, Error, SubscribePayload>({
    mutationFn: (payload) => newsletterService.subscribe(payload),
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: themeKeys.all });
    },
  });
};
