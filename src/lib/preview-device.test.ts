import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lockPreviewMenuHostScroll,
  readPreviewThemeVarStyle,
  resolvePreviewMobileMenuHost,
} from "./preview-device.ts";

type FakeEl = {
  closest: (selector: string) => FakeEl | null;
};

function chain(opts: {
  isFrame?: boolean;
  parent?: FakeEl | null;
}): FakeEl {
  const el: FakeEl = {
    closest(selector) {
      if (selector === "[data-preview-device]" && opts.isFrame) return el;
      return opts.parent?.closest(selector) ?? null;
    },
  };
  return el;
}

test("resolvePreviewMobileMenuHost prefers the device frame", () => {
  const frame = chain({ isFrame: true });
  const header = chain({ parent: frame });
  assert.equal(
    resolvePreviewMobileMenuHost(
      header as unknown as HTMLElement,
      {} as HTMLElement,
    ),
    frame,
  );
});

test("resolvePreviewMobileMenuHost falls back to the embedded scroller", () => {
  const header = chain({});
  const scroller = {} as HTMLElement;
  assert.equal(resolvePreviewMobileMenuHost(header as unknown as HTMLElement, scroller), scroller);
});

test("readPreviewThemeVarStyle is empty without an element", () => {
  assert.deepEqual(readPreviewThemeVarStyle(null), {});
});

test("lockPreviewMenuHostScroll hides overflow on a frame and restores it", () => {
  const host = { style: { overflowY: "auto" } } as HTMLElement;
  const unlock = lockPreviewMenuHostScroll(host);
  assert.equal(host.style.overflowY, "hidden");
  unlock();
  assert.equal(host.style.overflowY, "auto");
});
