"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SquarePen,
  User,
  UserPlus,
  UserCheck,
  UserX,
  AlertCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  useDeleteStaff,
  useStaff,
  useUpdateStaffStatus,
} from "../_lib/queries";
import { StaffMember as StaffMemberType } from "@/services/common/staff-management/type";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { StaffLoadingSkeleton } from "./skeleton-loader";
import Image from "next/image";

interface StaffManagementProps {
  searchParams?: {
    search?: string;
    status?: string;
    page?: string;
  };
}

// Error display component
function StaffError({ message }: { message: string }) {
  return (
    <div className="w-full p-6 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-center gap-2 text-red-600 mb-2">
        <AlertCircle className="h-5 w-5" />
        <h3 className="font-semibold">Error Loading Staff</h3>
      </div>
      <p className="text-red-700">{message}</p>
    </div>
  );
}

export default function StaffManagement({
  searchParams = {},
}: StaffManagementProps) {
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMemberType | null>(
    null,
  );
  // Track staff IDs being updated
  const [updatingStaffIds, setUpdatingStaffIds] = useState<number[]>([]);

  // Format search params for API query
  const queryParams = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    search: searchParams.search || "",
    status:
      (searchParams.status as "active" | "inactive" | undefined) || undefined,
  };

  // Fetch staff data
  const { data: staffData, isLoading, isError, error } = useStaff(queryParams);

  // Delete staff mutation
  const { mutate: deleteStaff, isPending: isDeleting } = useDeleteStaff();

  // Update staff status mutation
  const { mutate: updateStatus } = useUpdateStaffStatus();

  // Handle delete staff
  const handleDeleteStaff = (staff: StaffMemberType) => {
    setStaffToDelete(staff);
    setDeleteDialogOpen(true);
  };

  // Confirm delete staff
  const confirmDelete = () => {
    if (staffToDelete) {
      deleteStaff(staffToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setStaffToDelete(null);
        },
      });
    }
  };

  // Handle status toggle
  const handleToggleStatus = (staff: StaffMemberType) => {
    const newStatus = staff.status === "active" ? "inactive" : "active";

    // Add this staff ID to the updating list
    setUpdatingStaffIds((prev) => [...prev, staff.id]);

    updateStatus(
      {
        id: staff.id,
        status: newStatus,
      },
      {
        onSuccess: () => {
          // Remove this staff ID from the updating list on success
          setUpdatingStaffIds((prev) => prev.filter((id) => id !== staff.id));
        },
        onError: () => {
          // Remove this staff ID from the updating list on error
          setUpdatingStaffIds((prev) => prev.filter((id) => id !== staff.id));
        },
      },
    );
  };

  if (isLoading) {
    return <StaffLoadingSkeleton />;
  }

  if (isError) {
    return (
      <StaffError
        message={(error as Error)?.message || "Failed to load staff members"}
      />
    );
  }

  // Handle the nested data structure from the API
  const staffMembers = staffData?.data?.data || [];

  if (!staffMembers.length) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <UserX className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium mb-2">No staff members found</h3>
        <p className="text-gray-500 mb-4">
          Click the &ldquo;Add Staff&rdquo; button to add your first staff
          member
        </p>
        <PermissionGuard permissionKey="create-staff">
          <Link href="./staff-management/create">
            <Button variant="event-primary">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </Link>
        </PermissionGuard>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {staffMembers.map((member: StaffMemberType) => {
          // Check if this specific staff member is being updated
          const isUpdating = updatingStaffIds.includes(member.id);

          return (
            <Card
              key={member.id}
              className="shadow-sm border border-[var(--color-border)] hover:shadow-md transition-all duration-300 bg-white flex flex-col overflow-hidden"
            >
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex flex-wrap justify-between items-start gap-x-3 gap-y-2">
                  <CardTitle className="flex items-center gap-2 relative min-w-0 flex-1 max-w-full">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                      {member.avatar ? (
                        <Image
                          src={member.avatar}
                          alt={`${member.first_name} ${member.last_name}`}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <span className="text-lg font-semibold block truncate">
                        {member.first_name} {member.last_name}
                      </span>
                      <span
                        className="text-sm text-gray-500 block truncate"
                        title={member.email}
                      >
                        {member.email}
                      </span>
                    </div>
                  </CardTitle>

                  {/* Only show status toggle if user has permission to update staff */}
                  <PermissionGuard permissionKey="update-staff">
                    <div className="flex-shrink-0 min-w-[5.5rem]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`px-2 sm:px-3 py-1 h-auto text-xs whitespace-nowrap ${
                          member.status === "active"
                            ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                            : "bg-gray-100 text-gray-500"
                        }`}
                        onClick={() => handleToggleStatus(member)}
                        disabled={isUpdating}
                        title={
                          member.status === "active" ? "Active" : "Inactive"
                        }
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-3 w-3 sm:mr-1 animate-spin flex-shrink-0" />
                            <span>Updating</span>
                          </>
                        ) : member.status === "active" ? (
                          <>
                            <UserCheck className="h-3 w-3 sm:mr-1 flex-shrink-0" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 sm:mr-1 flex-shrink-0" />
                            <span>Inactive</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </PermissionGuard>
                </div>
                <CardDescription className="mt-2 text-muted-foreground flex items-center gap-2 min-w-0">
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100 capitalize flex-shrink-0">
                    {member.role}
                  </Badge>
                  {member.phone && (
                    <span
                      className="text-sm text-gray-500 truncate min-w-0 flex-1"
                      title={member.phone}
                    >
                      {member.phone}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 flex-shrink-0">
                <div className="flex gap-2 items-center">
                  {/* Only show Edit button if user has update permission */}
                  <PermissionGuard permissionKey="update-staff">
                    <Link
                      href={`./staff-management/edit/${member.id}`}
                      className="flex-1 min-w-0"
                    >
                      <Button variant="event-primary" className="w-full">
                        <SquarePen className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                        <span className="sm:hidden">Edit</span>
                      </Button>
                    </Link>
                  </PermissionGuard>

                  {/* Only show Delete button if user has delete permission */}
                  <PermissionGuard permissionKey="delete-staff">
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-red-50 flex-shrink-0"
                      onClick={() => handleDeleteStaff(member)}
                      disabled={isDeleting && staffToDelete?.id === member.id}
                    >
                      {isDeleting && staffToDelete?.id === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              staff member account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
