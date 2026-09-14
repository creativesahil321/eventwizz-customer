export type VendorEventTabStatus = "complete" | "current" | "upcoming";

export function getVendorEventTabStatus(params: {
  stepId: number;
  stepValue: string;
  activeTab: string;
  unlockStep: number;
  contentComplete?: Partial<Record<string, boolean>>;
}): VendorEventTabStatus {
  if (params.activeTab === params.stepValue) return "current";

  if (
    params.contentComplete &&
    Object.prototype.hasOwnProperty.call(params.contentComplete, params.stepValue)
  ) {
    return params.contentComplete[params.stepValue] ? "complete" : "upcoming";
  }

  if (params.stepId <= params.unlockStep) return "complete";
  return "upcoming";
}
