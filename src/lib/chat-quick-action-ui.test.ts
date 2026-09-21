import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isChatEventPickAction,
  isLongChatActionLabel,
  shouldStackChatQuickAction,
} from "./chat-quick-action-ui";

const longEventName =
  "Simmons Bars | Christmas At Simmons | Festive Happy Hour";

test("guest event href chips count as event picks, not generic pills", () => {
  assert.equal(
    isChatEventPickAction({
      id: "event-/bristol/events/festive-happy-hour",
      label: longEventName,
    }),
    true,
  );
  assert.equal(
    isChatEventPickAction({
      id: "event-pick-1",
      sendText: `Book ${longEventName} in Bristol`,
    }),
    true,
  );
  assert.equal(
    isChatEventPickAction({ id: "register", label: "Create account" }),
    false,
  );
});

test("long event titles stack full-width instead of overflowing a pill", () => {
  assert.equal(isLongChatActionLabel(longEventName), true);
  assert.equal(isLongChatActionLabel("Create account"), false);
  assert.equal(
    shouldStackChatQuickAction({
      id: "chat-nav-1",
      label: longEventName,
    }),
    true,
  );
  assert.equal(
    shouldStackChatQuickAction({
      id: "login",
      label: "Log in",
    }),
    false,
  );
});
