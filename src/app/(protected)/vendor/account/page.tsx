"use client";

import { Shell } from "@/components/shell";
import { useAuthStore } from "@/store/auth.store";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PermissionRoute } from "@/components/permission/PermissionRoute";

export default function AccountPage() {
  const { data: session } = useSession();
  const { user, account_type, active_role } = useAuthStore();

  return (
    <PermissionRoute
      permissionKey="read-account"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell>
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-6">
            <h1 className="text-2xl title-header font-bold mb-4">
              Account Information
            </h1>
            <p className="text-muted-foreground mb-6">
              View your account details and role information
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                  <CardDescription>Your basic user information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">
                      Full Name
                    </span>
                    <span className="font-medium">
                      {user?.full_name || "Not available"}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-medium">
                      {user?.email || "Not available"}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">
                      User ID
                    </span>
                    <span className="font-medium">
                      {user?.id || "Not available"}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <span className="font-medium capitalize">
                      {user?.status || "Not available"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Role Information</CardTitle>
                  <CardDescription>
                    Your role and permissions details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">
                      User Type
                    </span>
                    <span className="font-medium capitalize">
                      {account_type || "Not available"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      User type determines your navigation path (admin, vendor,
                      etc.)
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">
                      Staff Role
                    </span>
                    <span className="font-medium capitalize">
                      {active_role || "Not available"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Staff role determines your specific permissions
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">
                      Session Type
                    </span>
                    <span className="font-medium capitalize">
                      {session?.user?.account_type || "Not available"}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">
                      Session Role
                    </span>
                    <span className="font-medium capitalize">
                      {session?.user?.active_role || "Not available"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
