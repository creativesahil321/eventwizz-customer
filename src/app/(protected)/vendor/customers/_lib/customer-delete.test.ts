import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CUSTOMER_DELETE_CONFIRM_PHRASE,
  CUSTOMER_DELETE_OTP_LENGTH,
  CUSTOMER_DELETE_WARNING,
  buildBulkDeletePayload,
  buildSendDeleteOtpPayload,
  buildSingleDeletePayload,
  buildVerifyDeleteOtpPayload,
  getCustomerDeleteLabel,
  isCustomerDeletePhraseReady,
  isSingleCustomerDelete,
  isSoftDeletedCustomersView,
  normalizeCustomerIds,
  parseCustomerDeleteOtpResponse,
  shouldShowCustomerRowActions,
  shouldShowCustomerRowSelection,
} from "./customer-delete.ts";

test("confirmation phrase is the exact backend contract", () => {
  assert.equal(CUSTOMER_DELETE_CONFIRM_PHRASE, "delete this customer");
});

test("OTP length matches the four-digit location delete flow", () => {
  assert.equal(CUSTOMER_DELETE_OTP_LENGTH, 4);
});

test("warning copy tells vendors restore is impossible", () => {
  assert.match(CUSTOMER_DELETE_WARNING, /cannot be undone from the vendor panel/i);
  assert.match(CUSTOMER_DELETE_WARNING, /cannot be restored/i);
});

test("soft-deleted filter is only status=delete", () => {
  assert.equal(isSoftDeletedCustomersView("delete"), true);
  assert.equal(isSoftDeletedCustomersView("active"), false);
  assert.equal(isSoftDeletedCustomersView("inactive"), false);
  assert.equal(isSoftDeletedCustomersView("all"), false);
  assert.equal(isSoftDeletedCustomersView(""), false);
});

test("soft-deleted view hides row selection and actions", () => {
  assert.equal(shouldShowCustomerRowSelection("delete"), false);
  assert.equal(shouldShowCustomerRowActions("delete"), false);
  assert.equal(shouldShowCustomerRowSelection("active"), true);
  assert.equal(shouldShowCustomerRowActions("active"), true);
  assert.equal(shouldShowCustomerRowSelection("inactive"), true);
  assert.equal(shouldShowCustomerRowActions("all"), true);
});

test("normalizeCustomerIds unique-numbers the same set regardless of order", () => {
  assert.deepEqual(normalizeCustomerIds(["36", 4, 36, "4"]), [4, 36]);
  assert.deepEqual(normalizeCustomerIds([123]), [123]);
});

test("OTP and delete payloads reuse the same customer_ids set", () => {
  const ids = [36, 4];
  assert.deepEqual(buildSendDeleteOtpPayload(ids), {
    customer_ids: [4, 36],
  });
  assert.deepEqual(buildVerifyDeleteOtpPayload(ids, "1234"), {
    customer_ids: [4, 36],
    otp: "1234",
  });
  assert.deepEqual(buildBulkDeletePayload(ids, "1234"), {
    customer_ids: [4, 36],
    otp: "1234",
    confirmation: "delete this customer",
  });
  assert.deepEqual(buildSingleDeletePayload("1234"), {
    otp: "1234",
    confirmation: "delete this customer",
  });
});

test("single delete is a one-element customer_ids set", () => {
  assert.equal(isSingleCustomerDelete([42]), true);
  assert.equal(isSingleCustomerDelete([42, 7]), false);
  assert.equal(isSingleCustomerDelete([]), false);
});

test("typed confirmation must match the phrase, ignoring surrounding case/space", () => {
  assert.equal(isCustomerDeletePhraseReady("delete this customer"), true);
  assert.equal(isCustomerDeletePhraseReady("  Delete This Customer  "), true);
  assert.equal(isCustomerDeletePhraseReady("delete this location"), false);
  assert.equal(isCustomerDeletePhraseReady(""), false);
});

test("customer label prefers name then email then id", () => {
  assert.equal(
    getCustomerDeleteLabel({
      id: 9,
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
    }),
    "Ada Lovelace",
  );
  assert.equal(
    getCustomerDeleteLabel({
      id: 9,
      first_name: "",
      last_name: "",
      email: "ada@example.com",
    }),
    "ada@example.com",
  );
  assert.equal(
    getCustomerDeleteLabel({
      id: 9,
      first_name: "",
      last_name: "",
      email: "",
    }),
    "Customer #9",
  );
});

test("OTP send response exposes masked email, cooldown, and customer count", () => {
  const parsed = parseCustomerDeleteOtpResponse({
    data: {
      masked_email: "v***r@example.com",
      resend_after: 45,
      expires_in: 120,
      customer_count: 3,
    },
  });
  assert.equal(parsed.maskedEmail, "v***r@example.com");
  assert.equal(parsed.resendAfter, 45);
  assert.equal(parsed.customerCount, 3);
});
