import { headers } from "next/headers";

/** True when proxy.ts stamped this request as vendor Door Scan. */
export async function isDoorScanRequest() {
  const pathname = (await headers()).get("x-pathname") || "";
  return (
    pathname === "/vendor/door-scan" || pathname.startsWith("/vendor/door-scan/")
  );
}
