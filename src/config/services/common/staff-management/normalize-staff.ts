import type { StaffLocationApi, StaffMember } from "./type";

/** Empty row when payload is missing (should not happen after successful GET). */
const EMPTY_STAFF: StaffMember = {
  id: 0,
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  status: "active",
  role: "",
  role_id: 0,
  locations: [],
  created_at: "",
};

/**
 * Maps one staff JSON object from **GET** list or **GET** show into `StaffMember`.
 * Expects the same snake_case fields as your Laravel API (`first_name`, `role_id`, `locations: [{ id, city }]`, …).
 */
export function normalizeStaffApiPayload(data: unknown): StaffMember {
  if (!data || typeof data !== "object") {
    return EMPTY_STAFF;
  }

  const o = data as Record<string, unknown>;

  const locationsRaw = o.locations;
  const locations: StaffLocationApi[] = Array.isArray(locationsRaw)
    ? (locationsRaw as Record<string, unknown>[]).map((l) => ({
        id: Number(l.id) || 0,
        city: String(l.city ?? ""),
      }))
    : [];

  const roleId = o.role_id;
  const role_id =
    typeof roleId === "number" && Number.isFinite(roleId)
      ? roleId
      : Number(roleId) || 0;

  const statusRaw = o.status;
  const status: StaffMember["status"] =
    statusRaw === "inactive" ? "inactive" : "active";

  return {
    id: Number(o.id) || 0,
    username: String(o.username ?? ""),
    first_name: String(o.first_name ?? ""),
    last_name: String(o.last_name ?? ""),
    email: String(o.email ?? ""),
    phone: String(o.phone ?? ""),
    status,
    role: String(o.role ?? ""),
    role_id,
    locations,
    created_at: String(o.created_at ?? ""),
  };
}
