/** System log entry (dummy shape; replace with API type when backend is ready) */
export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  action: string;
  user: string;
  message: string;
  ip_address?: string;
}
