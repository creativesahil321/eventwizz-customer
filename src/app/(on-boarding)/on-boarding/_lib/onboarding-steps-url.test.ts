import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOnboardingStepsUrl } from "./onboarding-steps-url";

test("saved steps GET has no true/false override", () => {
  assert.equal(buildOnboardingStepsUrl(42), "/vendor/onboarding/steps/42");
});

test("preview GETs append true or false only", () => {
  assert.equal(
    buildOnboardingStepsUrl(42, true),
    "/vendor/onboarding/steps/42/true",
  );
  assert.equal(
    buildOnboardingStepsUrl(42, false),
    "/vendor/onboarding/steps/42/false",
  );
});
