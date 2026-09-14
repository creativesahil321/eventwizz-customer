import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONTACT_NUMBER_FORMAT_MESSAGE,
  CONTACT_NUMBER_REQUIRED_MESSAGE,
  getContactNumberIssue,
} from "./contact-number";

test("rejects empty contact numbers", () => {
  assert.equal(getContactNumberIssue(""), CONTACT_NUMBER_REQUIRED_MESSAGE);
  assert.equal(getContactNumberIssue("   "), CONTACT_NUMBER_REQUIRED_MESSAGE);
  assert.equal(getContactNumberIssue(undefined), CONTACT_NUMBER_REQUIRED_MESSAGE);
});

test("rejects letters and other non-phone characters", () => {
  assert.equal(
    getContactNumberIssue("esdasedaesd00000000000000000esd"),
    CONTACT_NUMBER_FORMAT_MESSAGE,
  );
  assert.equal(
    getContactNumberIssue("call me 07700 900123"),
    CONTACT_NUMBER_FORMAT_MESSAGE,
  );
});

test("rejects numbers that do not have enough digits", () => {
  assert.match(String(getContactNumberIssue("+++ ---")), /digit/i);
  assert.match(String(getContactNumberIssue("12345")), /digit/i);
});

test("accepts formatted international and local numbers", () => {
  assert.equal(getContactNumberIssue("+44 7700 900123"), null);
  assert.equal(getContactNumberIssue("(020) 7946 0958"), null);
  assert.equal(getContactNumberIssue("07700900123"), null);
});
