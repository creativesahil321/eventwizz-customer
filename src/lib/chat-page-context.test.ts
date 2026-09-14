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

test("keeps the chatbot on live venue and dashboard routes", () => {
  assert.equal(isChatBotHiddenOnPath("/"), false);
  assert.equal(isChatBotHiddenOnPath("/vendor/dashboard"), false);
  assert.equal(isChatBotHiddenOnPath("/preview-hall"), false);
  assert.equal(isChatBotHiddenOnPath("/seaton-delaval/events/christmas-gala"), false);
});
