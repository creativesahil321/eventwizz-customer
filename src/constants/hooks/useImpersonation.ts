"use client";

import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";
import {
  useImpersonationStore,
  type AdminSessionBackup,
} from "@/store/impersonation.store";
import { usePermissionStore } from "@/store/permission.store";
import { impersonationService } from "@/services/admin/impersonation/impersonation.service";
import type { ImpersonateVendorData } from "@/services/admin/impersonation/types";
import { fetchProfileData } from "@/app/(protected)/_shared/profile/_lib/queries";

/**
 * Builds a NextAuth-compatible credentials object from impersonation data.
 * Reuses the existing CredentialsProvider authorize() flow.
 */
function buildVendorCredentials(data: ImpersonateVendorData) {
  return {
    redirect: false,
    email: data.user.email,
    token: data.token,
    account_type: data.account_type,
    active_role: data.active_role,
    uuid: data.user.uuid,
    first_name: data.user.first_name,
    last_name: data.user.last_name,
    avatar: data.user.avatar ?? "",
    status: data.user.status,
    isOnboarded: String(data.isOnboarded),
    on_boarding_step: data.on_boarding_step
      ? String(data.on_boarding_step)
      : undefined,
    vendor_location_id: data.vendor_location_id
      ? String(data.vendor_location_id)
      : undefined,
    permissions: JSON.stringify(data.permissions),
    has_payment_provider: String(data.has_payment_provider),
  };
}

/** Detects the "stale active session" error the backend returns. */
function isStaleSessionError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("active impersonation") ||
    lower.includes("active session") ||
    lower.includes("exit it first") ||
    lower.includes("session exists")
  );
}

/**
 * Hook for starting vendor impersonation from the admin panel.
 *
 * Flow:
 * 1. Snapshot current admin session → sessionStorage
 * 2. Call backend POST /admin/impersonate/vendor
 *    - If backend has a stale session (tab was closed mid-impersonation),
 *      auto-exit the stale backend record and retry once.
 * 3. Swap NextAuth session to vendor credentials
 * 4. Update Zustand stores (auth, permissions)
 * 5. Navigate to /vendor/dashboard
 */
export function useStartImpersonation() {
  const authStore = useAuthStore.getState;
  const impersonationStore = useImpersonationStore.getState;
  const permissionStore = usePermissionStore.getState;

  return useMutation({
    mutationFn: async ({
      vendorId,
      vendorName,
      vendorEmail,
    }: {
      vendorId: number;
      vendorName: string;
      vendorEmail: string;
    }) => {
      const currentImpersonation = impersonationStore();
      if (currentImpersonation.isImpersonating) {
        throw new Error(
          "Already impersonating a vendor. Exit current session first."
        );
      }

      // 1. Snapshot admin session.
      //    first_name/last_name may be empty in the auth store if the login
      //    response didn't include them. Try to enrich from the profile API
      //    so the backup (and the name shown after exit) is always accurate.
      const admin = authStore();
      let snapshotFirstName = admin.user?.first_name;
      let snapshotLastName = admin.user?.last_name;
      let snapshotAvatar = admin.user?.avatar ?? undefined;

      if (!snapshotFirstName && !snapshotLastName) {
        try {
          const profileResponse = await fetchProfileData();
          const pd = (profileResponse as unknown as { data?: { first_name?: string; last_name?: string; avatar?: string } })?.data;
          if (pd?.first_name || pd?.last_name) {
            snapshotFirstName = pd.first_name;
            snapshotLastName = pd.last_name;
            if (pd.avatar) snapshotAvatar = pd.avatar;
            // Also update the live store so the header shows correctly right now
            useAuthStore.getState().updateUser({
              first_name: pd.first_name ?? "",
              last_name: pd.last_name ?? "",
              ...(pd.avatar ? { avatar: pd.avatar } : {}),
            });
          }
        } catch {
          // Non-critical — fall back to whatever is in the store
        }
      }

      const adminBackup: AdminSessionBackup = {
        token: admin.token!,
        email: admin.user?.email ?? "",
        uuid: admin.user?.uuid ?? undefined,
        first_name: snapshotFirstName,
        last_name: snapshotLastName,
        avatar: snapshotAvatar,
        account_type: admin.account_type ?? "admin",
        active_role: admin.active_role ?? undefined,
        status: admin.user?.status,
        permissions: permissionStore().permissions,
      };

      // 2. Call backend
      let response = await impersonationService.startImpersonation(vendorId);

      // 2a. Backend has a stale active-session record (happens when the admin
      //     closed/refreshed the tab during a previous impersonation so the
      //     frontend lost its sessionStorage state but the backend record
      //     was never cleaned up). Silently force-exit the stale record and
      //     retry once — the admin should never see this error manually.
      if (!response.status && isStaleSessionError(response.message ?? "")) {
        try {
          await impersonationService.exitImpersonation();
        } catch {
          // Best-effort — backend may already have cleaned it up
        }
        // Also clear any residual local impersonation state
        impersonationStore().endImpersonation();
        // Retry the start call now that the stale session is cleared
        response = await impersonationService.startImpersonation(vendorId);
      }

      if (!response.status) {
        throw new Error(response.message || "Impersonation request failed.");
      }

      const vendorData = response.data;

      // 3. Save admin backup + set impersonation flag
      impersonationStore().startImpersonation(adminBackup, {
        id: vendorId,
        name: vendorName,
        email: vendorEmail,
      });

      // 4. Swap NextAuth session to vendor
      const signInResult = await signIn(
        "credentials",
        buildVendorCredentials(vendorData)
      );

      if (signInResult?.error) {
        // Rollback impersonation state on failure
        impersonationStore().endImpersonation();
        throw new Error("Failed to create vendor session.");
      }

      // 5. Update Zustand auth store with vendor data
      useAuthStore.getState().login(vendorData.token, {
        uuid: vendorData.user.uuid,
        email: vendorData.user.email,
        first_name: vendorData.user.first_name,
        last_name: vendorData.user.last_name,
        avatar: vendorData.user.avatar,
        status: vendorData.user.status,
        account_type: "vendor",
        active_role: vendorData.active_role,
      });

      // 6. Set vendor permissions
      usePermissionStore.getState().setPermissions(vendorData.permissions);

      return vendorData;
    },

    onSuccess: () => {
      // Toast handled by Axios response interceptor (backend message).
      window.location.href = "/vendor/dashboard";
    },

    onError: () => {
      // Toast handled by Axios response/error interceptor.
    },
  });
}

/**
 * Hook for exiting vendor impersonation and restoring admin session.
 *
 * Flow:
 * 1. Notify backend (logs exit event + invalidates impersonation token)
 * 2. Read admin backup from impersonation store
 * 3. Swap NextAuth session back to admin credentials
 * 4. Restore Zustand stores (auth, permissions)
 * 5. Clear impersonation state
 * 6. Navigate to admin panel
 */
export function useExitImpersonation() {
  return useMutation({
    mutationFn: async () => {
      const store = useImpersonationStore.getState();

      if (!store.isImpersonating || !store.originalAdmin) {
        throw new Error("No active impersonation session to exit.");
      }

      const adminBackup = store.originalAdmin;

      // 1. Notify backend (non-blocking — don't fail if backend is unreachable)
      try {
        await impersonationService.exitImpersonation();
      } catch {
        console.warn(
          "[Impersonation] Backend exit notification failed. Continuing with local restore."
        );
      }

      // 2. Restore NextAuth session to admin
      const signInResult = await signIn("credentials", {
        redirect: false,
        email: adminBackup.email,
        token: adminBackup.token,
        account_type: adminBackup.account_type,
        active_role: adminBackup.active_role ?? "",
        uuid: adminBackup.uuid ?? "",
        first_name: adminBackup.first_name ?? "",
        last_name: adminBackup.last_name ?? "",
        avatar: adminBackup.avatar ?? "",
        status: adminBackup.status ?? "active",
        permissions: JSON.stringify(adminBackup.permissions),
      });

      if (signInResult?.error) {
        throw new Error(
          "Failed to restore admin session. Please log in again."
        );
      }

      // 3. Restore Zustand auth store from backup
      useAuthStore.getState().login(adminBackup.token, {
        uuid: adminBackup.uuid,
        email: adminBackup.email,
        first_name: adminBackup.first_name,
        last_name: adminBackup.last_name,
        avatar: adminBackup.avatar,
        status: adminBackup.status ?? "active",
        account_type: adminBackup.account_type as "admin",
        active_role: adminBackup.active_role,
      });

      // 3a. The admin NextAuth session stores first_name/last_name as "" at
      //     login time (the login response may not include them). Fetch the
      //     profile API now (using the restored admin token) so the header
      //     shows the real name immediately after redirect, without waiting
      //     for the profile page to load.
      try {
        const profileResponse = await fetchProfileData();
        const profileData = (profileResponse as unknown as { data?: { first_name?: string; last_name?: string; avatar?: string } })?.data;
        if (profileData?.first_name || profileData?.last_name) {
          useAuthStore.getState().updateUser({
            first_name: profileData.first_name ?? adminBackup.first_name,
            last_name: profileData.last_name ?? adminBackup.last_name,
            ...(profileData.avatar ? { avatar: profileData.avatar } : {}),
          });
        }
      } catch {
        // Non-critical — silently fall back to the backup values
      }

      // 4. Restore admin permissions
      usePermissionStore.getState().setPermissions(adminBackup.permissions);

      // 5. Clear impersonation state
      store.endImpersonation();

      // 6. Clear vendor-specific localStorage data
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("location-storage");
          localStorage.removeItem("vendor_location_id");
        } catch {
          // Silent — non-critical
        }
      }
    },

    onSuccess: () => {
      // Toast handled by Axios response interceptor.
      window.location.href = "/admin/dashboard";
    },

    onError: () => {
      // Toast handled by Axios interceptor; redirect to admin as fallback.
      window.location.href = "/admin/dashboard";
    },
  });
}
