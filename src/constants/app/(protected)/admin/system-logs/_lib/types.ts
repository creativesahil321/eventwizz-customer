export type SystemLogLevel = "info" | "warning" | "error";

/** Row shape for the admin system logs table (API-backed). */
export interface SystemLogEntry {
  id: string;
  level: SystemLogLevel;
  time: string;
  description: string;
}
