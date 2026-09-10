import assert from "node:assert/strict";
import { test } from "node:test";
import {
  consumeStashedWizardStep,
  readVendorEventUpdateCurrentStep,
  resolveWizardStepAfterSave,
  resolveWizardStepsAfterSave,
  resolveWizardStepsFromGet,
  resolveVisibleWizardSteps,
  stashWizardStepForNextMount,
  toPositiveVendorEventPathId,
} from "./vendor-event-wizard-step";

test("Save & Next uses update current_step as-is (does not add one)", () => {
  assert.equal(
    resolveWizardStepAfterSave({
      updateCurrentStep: 2,
      savedStep: 1,
    }),
    2,
  );
  assert.equal(
    resolveWizardStepAfterSave({
      updateCurrentStep: 8,
      savedStep: 7,
    }),
    8,
  );
  assert.equal(
    resolveWizardStepAfterSave({
      updateCurrentStep: 8,
      savedStep: 8,
    }),
    8,
  );
});

test("Save & Next falls back to saved step + 1 when update current_step is missing", () => {
  assert.equal(
    resolveWizardStepAfterSave({
      savedStep: 1,
    }),
    2,
  );
  assert.equal(
    resolveWizardStepAfterSave({
      updateCurrentStep: "nope",
      savedStep: 7,
    }),
    8,
  );
  assert.equal(
    resolveWizardStepAfterSave({
      savedStep: 8,
    }),
    8,
  );
});

test("hard refresh opens completed_step, not current_step and not completed_step + 1", () => {
  assert.deepEqual(
    resolveWizardStepsFromGet({
      completed_step: 5,
      current_step: 6,
    }),
    { activeStep: 5, unlockStep: 6 },
  );
  assert.deepEqual(
    resolveWizardStepsFromGet({
      completed_step: 8,
      current_step: 8,
    }),
    { activeStep: 8, unlockStep: 8 },
  );
});

test("GET without completed_step falls back to current_step then 1", () => {
  assert.deepEqual(resolveWizardStepsFromGet({ current_step: 3 }), {
    activeStep: 3,
    unlockStep: 3,
  });
  assert.deepEqual(resolveWizardStepsFromGet({}), {
    activeStep: 1,
    unlockStep: 1,
  });
  assert.deepEqual(resolveWizardStepsFromGet(undefined), {
    activeStep: 1,
    unlockStep: 1,
  });
});

test("re-saving step 1 on a finished event goes to 2 without shrinking unlock", () => {
  assert.deepEqual(
    resolveWizardStepsAfterSave({
      updateCurrentStep: 2,
      updateCompletedStep: 8,
      savedStep: 1,
      previousUnlockStep: 8,
    }),
    { activeStep: 2, unlockStep: 8 },
  );
});

test("reads current_step from the update success payload without incrementing", () => {
  assert.equal(
    readVendorEventUpdateCurrentStep({
      status: true,
      message: "The step - 1 has been successfully saved.",
      data: {
        current_step: 2,
        completed_step: 8,
        event_id: 1034,
      },
    }),
    2,
  );
  assert.equal(readVendorEventUpdateCurrentStep({ status: true, data: {} }), undefined);
  assert.equal(readVendorEventUpdateCurrentStep(null), undefined);
});

test("clamps wizard steps to 1..8", () => {
  assert.equal(
    resolveWizardStepAfterSave({ updateCurrentStep: 99, savedStep: 1 }),
    8,
  );
  assert.deepEqual(
    resolveWizardStepsFromGet({ completed_step: 0, current_step: -2 }),
    { activeStep: 1, unlockStep: 1 },
  );
});

test("rejects boolean and non-numeric values as event path ids", () => {
  assert.equal(toPositiveVendorEventPathId(false), null);
  assert.equal(toPositiveVendorEventPathId(true), null);
  assert.equal(toPositiveVendorEventPathId("false"), null);
  assert.equal(toPositiveVendorEventPathId(0), null);
  assert.equal(toPositiveVendorEventPathId(1034), "1034");
  assert.equal(toPositiveVendorEventPathId("1034"), "1034");
});

test("create redirect stash survives SPA reload flag when the document was not this event", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };

  stashWizardStepForNextMount(577, 2, storage);
  assert.equal(
    consumeStashedWizardStep(577, storage, {
      type: "reload",
      documentUrl: "http://eventwizz.com:3000/vendor/events/create",
    }),
    2,
  );
});

test("hard refresh of the event editor discards create-redirect stash", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };

  stashWizardStepForNextMount(577, 2, storage);
  assert.equal(
    consumeStashedWizardStep(577, storage, {
      type: "reload",
      documentUrl: "http://eventwizz.com:3000/vendor/events/577",
    }),
    0,
  );
});

test("GET completed_step does not override a stashed Save & Next step", () => {
  assert.deepEqual(
    resolveVisibleWizardSteps({
      getData: { completed_step: 1, current_step: 2 },
      stashedStep: 2,
    }),
    { activeStep: 2, unlockStep: 2 },
  );
});
