"use client";

import React from "react";
import {
  usePermission,
  useAnyPermission,
  usePermissions,
} from "@/hooks/usePermission";
import { PermissionGuard, PermissionButton } from "@/components/permission";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Example component showing how to use the permission system
 */
export function PermissionExample() {
  // Hooks usage examples
  const canCreateEvent = usePermission("create-event");
  const canManageStaff = usePermission("read-staff");
  const canManageEmailsOrNewsletters = useAnyPermission([
    "create-email-template",
    "read-newsletter",
  ]);

  const { permissions, isLoaded } = usePermissions();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Permission System Demo</CardTitle>
          <CardDescription>
            Examples of how to use the permission system in components
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Permission Status</h3>
            <div className="flex gap-2 mb-4">
              <Badge variant={isLoaded ? "outline" : "destructive"}>
                {isLoaded ? "Permissions Loaded" : "Loading Permissions..."}
              </Badge>
              <Badge variant="secondary">
                {permissions.length} permissions available
              </Badge>
            </div>

            <div className="bg-secondary/20 rounded p-3 mt-2 text-xs font-mono overflow-x-auto">
              {JSON.stringify(permissions, null, 2)}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Direct Hook Usage</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={canCreateEvent ? "default" : "outline"}
                  disabled={!canCreateEvent}
                >
                  Create Event
                </Button>
                <span className="text-sm">
                  {canCreateEvent
                    ? "✅ Permission granted"
                    : "❌ Permission denied"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={canManageStaff ? "default" : "outline"}
                  disabled={!canManageStaff}
                >
                  Manage Staff
                </Button>
                <span className="text-sm">
                  {canManageStaff
                    ? "✅ Permission granted"
                    : "❌ Permission denied"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={canManageEmailsOrNewsletters ? "default" : "outline"}
                  disabled={!canManageEmailsOrNewsletters}
                >
                  Email Management
                </Button>
                <span className="text-sm">
                  {canManageEmailsOrNewsletters
                    ? "✅ Any permission granted"
                    : "❌ All permissions denied"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-col items-start gap-4">
          <h3 className="text-lg font-medium w-full">Permission Components</h3>

          <div className="space-y-4 w-full">
            <PermissionGuard
              permissionKey="create-event"
              fallback={
                <div className="p-3 bg-muted rounded-md text-sm">
                  You need the &quot;create-event&quot; permission to see this
                  content.
                </div>
              }
            >
              <div className="p-3 bg-primary/10 rounded-md">
                This content is only visible with the &quot;create-event&quot;
                permission.
              </div>
            </PermissionGuard>

            <div className="flex flex-wrap gap-3">
              <PermissionButton permissionKey="create-ticket">
                Create Ticket
              </PermissionButton>

              <PermissionButton
                permissionKey="delete-event"
                variant="destructive"
              >
                Delete Event
              </PermissionButton>

              <PermissionButton
                permissionKey="non-existent-permission"
                variant="outline"
                hideOnNoPermission={false}
              >
                Hidden Feature
              </PermissionButton>
            </div>

            <PermissionGuard
              anyPermission={["read-staff", "update-staff"]}
              fallback={
                <div className="text-sm text-muted-foreground">
                  You need staff management permissions.
                </div>
              }
            >
              <div className="p-3 border rounded-md">
                This content is visible if you have any staff management
                permissions.
              </div>
            </PermissionGuard>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
