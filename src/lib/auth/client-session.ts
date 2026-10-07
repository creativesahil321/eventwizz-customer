import { clearVendorBrowserSession } from "@/lib/clear-vendor-browser-session";

/**
 * Remove every trace of the current account from the browser: React Query
 * cache, Zustand stores, and account-scoped browser storage.
 *
 * This does NOT end the session — that is `logout()`. It is also used on
 * impersonation exit, where the session is swapped (not ended) but the
 * impersonated vendor's data must not leak into the admin's view.
 *
 * Stores are imported lazily: several of them import the API client, which in
 * turn imports the logout flow.
 */
export async function clearClientSession({
  wipeAllStorage = false,
}: {
  /** Also clear ALL localStorage (security violations). */
  wipeAllStorage?: boolean;
} = {}): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Server-state cache.
  await run("query cache", async () => {
    const { getActiveQueryClient } = await import(
      "@/providers/query-provider/active-query-client"
    );
    const queryClient =
      getActiveQueryClient() ??
      (await import("@/providers/query-provider/queryClient")).default;
    queryClient?.clear();
  });

  // 2. Client stores. Reset BEFORE wiping storage: persist middleware rewrites
  //    its key on every set(), and step 3 removes those writes too.
  await run("stores", async () => {
    const [
      { useAuthStore },
      { usePermissionStore },
      { useLocationStore },
      { useDomainStore },
      { useCartEditStore },
      { useImpersonationStore },
    ] = await Promise.all([
      import("@/store/auth.store"),
      import("@/store/permission.store"),
      import("@/store/location.store"),
      import("@/store/domain.store"),
      import("@/store/cart-edit.store"),
      import("@/store/impersonation.store"),
    ]);
    useCartEditStore.getState().clearAllCarts();
    usePermissionStore.getState().reset();
    useLocationStore.getState().reset();
    useDomainStore.getState().reset();
    useImpersonationStore.getState().endImpersonation();
    useAuthStore.getState().setSession(null);
  });

  // 3. Account-scoped browser storage (single registry).
  await run("storage", () => {
    clearVendorBrowserSession();
    if (wipeAllStorage) window.localStorage.clear();
  });
}

/** Each step is independent: one failing must not stop the others. */
async function run(step: string, fn: () => unknown): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[clearClientSession] ${step} failed:`, error);
  }
}
