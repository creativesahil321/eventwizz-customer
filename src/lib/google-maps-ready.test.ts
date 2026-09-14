import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveGoogleMapsLoadAction } from "./google-maps-ready";

test("inits when Maps is already on the window", () => {
  assert.equal(
    resolveGoogleMapsLoadAction({
      hasMapsApi: true,
      scriptExists: true,
      scriptMarkedLoaded: false,
    }),
    "init",
  );
});

test("inits when the existing script already finished loading", () => {
  assert.equal(
    resolveGoogleMapsLoadAction({
      hasMapsApi: false,
      scriptExists: true,
      scriptMarkedLoaded: true,
    }),
    "init",
  );
});

test("waits only when a script is in flight", () => {
  assert.equal(
    resolveGoogleMapsLoadAction({
      hasMapsApi: false,
      scriptExists: true,
      scriptMarkedLoaded: false,
    }),
    "wait-script",
  );
});

test("injects a script when nothing is present", () => {
  assert.equal(
    resolveGoogleMapsLoadAction({
      hasMapsApi: false,
      scriptExists: false,
      scriptMarkedLoaded: false,
    }),
    "inject",
  );
});
