"use client";

import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import {
  useCustomerNewsletterToggle,
  useSyncCustomerNewsletterFlag,
  useThemeNewsletterSubscription,
} from "@/services/common/newsletter";

export default function DashboardNewsletterCard() {
  const { settings } = useDomain();
  // The dashboard shows the subscription status right away.
  useSyncCustomerNewsletterFlag(true);
  const { isLoggedInCustomer, isSubscribed } = useThemeNewsletterSubscription();
  const toggle = useCustomerNewsletterToggle();

  const brandName = settings?.name ?? "this venue";
  const isLoading = !isLoggedInCustomer;

  return (
    <section className="relative w-full text-black">
      <section className="relative w-full rounded-lg border bg-background p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <header className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="title-header text-xl font-bold sm:text-2xl">
                Event updates
              </h2>
              {isLoading ? (
                <Skeleton className="h-5 w-24 rounded-full" />
              ) : (
                <StatusBadge isSubscribed={isSubscribed} />
              )}
            </div>
            <p className="mt-1 max-w-lg text-xs text-muted-foreground sm:text-sm">
              {isLoading ? (
                <Skeleton className="h-4 w-72" />
              ) : isSubscribed ? (
                <>You&apos;re receiving new dates and offers from {brandName}.</>
              ) : (
                <>
                  Get notified about new dates, venues and offers from{" "}
                  {brandName}. No spam.
                </>
              )}
            </p>
          </header>

          <div className="shrink-0 sm:self-center">
            {isLoading ? (
              <Skeleton className="h-9 w-32 rounded-md" />
            ) : isSubscribed ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate("unsubscribe")}
              >
                {toggle.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
                Unsubscribe
              </Button>
            ) : (
              <Button
                variant="event-primary"
                size="sm"
                className="gap-2"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate("subscribe")}
              >
                {toggle.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Subscribe
              </Button>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function StatusBadge({ isSubscribed }: { isSubscribed: boolean }) {
  if (isSubscribed) {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        <CheckCircle2 className="h-3 w-3" />
        Subscribed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not subscribed
    </Badge>
  );
}
