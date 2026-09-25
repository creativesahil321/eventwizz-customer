import assert from "node:assert/strict";
import { test } from "node:test";
import { isChatBotHiddenOnPath } from "./chat-page-context";

test("hides the chatbot on onboarding and review/preview routes", () => {
  assert.equal(isChatBotHiddenOnPath("/on-boarding"), true);
  assert.equal(isChatBotHiddenOnPath("/on-boarding/step-11"), true);
  assert.equal(isChatBotHiddenOnPath("/preview/onboarding"), true);
  assert.equal(isChatBotHiddenOnPath("/preview/site"), true);
  assert.equal(isChatBotHiddenOnPath("/preview/event"), true);
  assert.equal(isChatBotHiddenOnPath("/preview"), true);
});

test("hides the chatbot on support workspaces so it cannot cover the reply bar", () => {
  assert.equal(isChatBotHiddenOnPath("/customer/support/inbox"), true);
  assert.equal(isChatBotHiddenOnPath("/customer/support/inbox/EW-1"), true);
  assert.equal(isChatBotHiddenOnPath("/vendor/support/inbox/12"), true);
  assert.equal(isChatBotHiddenOnPath("/admin/support"), true);
});

test("keeps the chatbot on live venue and dashboard routes", () => {
  assert.equal(isChatBotHiddenOnPath("/"), false);
  assert.equal(isChatBotHiddenOnPath("/vendor/dashboard"), false);
  assert.equal(isChatBotHiddenOnPath("/preview-hall"), false);
  assert.equal(isChatBotHiddenOnPath("/seaton-delaval/events/christmas-gala"), false);
});
