export const REGISTER_OTP_VERIFIED_COOKIE = "otp_verified";

/**
 * Middleware and the OTP page skip to create-password when this cookie is set.
 * A new send-OTP must not reuse that skip — the user has to enter the new code.
 */
export function shouldSkipRegisterOtpPage(options: {
  otpVerified: boolean;
  isRestartingVerification: boolean;
}): boolean {
  if (options.isRestartingVerification) return false;
  return options.otpVerified;
}

export function restartRegisterEmailVerification(
  deleteCookie: (name: string, options?: { path?: string }) => void,
): void {
  deleteCookie(REGISTER_OTP_VERIFIED_COOKIE, { path: "/" });
}
