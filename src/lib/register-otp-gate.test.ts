import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REGISTER_OTP_VERIFIED_COOKIE,
  restartRegisterEmailVerification,
  shouldSkipRegisterOtpPage,
} from "./register-otp-gate";

test("skips OTP only when already verified and not starting a new send", () => {
  assert.equal(
    shouldSkipRegisterOtpPage({
      otpVerified: true,
      isRestartingVerification: false,
    }),
    true,
  );
});

test("does not skip OTP after the user sends a new code", () => {
  assert.equal(
    shouldSkipRegisterOtpPage({
      otpVerified: true,
      isRestartingVerification: true,
    }),
    false,
  );
});

test("clears the otp_verified cookie when restarting email verification", () => {
  const deleted: Array<{ name: string; path?: string }> = [];
  restartRegisterEmailVerification((name, options) => {
    deleted.push({ name, path: options?.path });
  });
  assert.deepEqual(deleted, [
    { name: REGISTER_OTP_VERIFIED_COOKIE, path: "/" },
  ]);
});
