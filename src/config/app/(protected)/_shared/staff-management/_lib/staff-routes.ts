/**
 * Staff list URL for the current app section (vendor vs admin shared UI).
 */
export function staffManagementListPath(pathname: string): string {
  return pathname.startsWith("/admin")
    ? "/admin/staff-management"
    : "/vendor/staff-management";
}
