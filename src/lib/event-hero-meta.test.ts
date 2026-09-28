import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEventHeroBreadcrumbs,
  buildLocationPageBreadcrumbs,
} from "./event-hero-meta";

test("single-venue location page has no breadcrumb", () => {
  assert.equal(
    buildLocationPageBreadcrumbs({
      isMultiLocation: false,
      locationLabel: "Cambridge",
      homeHref: "/",
    }),
    null,
  );
});

test("multi-venue location page is Home / city", () => {
  assert.deepEqual(
    buildLocationPageBreadcrumbs({
      isMultiLocation: true,
      locationLabel: "Cambridge",
      homeHref: "/",
    }),
    [{ label: "Home", href: "/" }, { label: "Cambridge" }],
  );
});

test("event page always has a breadcrumb trail", () => {
  assert.deepEqual(
    buildEventHeroBreadcrumbs({
      eventLabel: "NYE Party",
      locationLabel: "Cambridge",
      homeHref: "/",
      locationHref: "/cambridge",
    }),
    [
      { label: "Home", href: "/" },
      { label: "Cambridge", href: "/cambridge" },
      { label: "NYE Party" },
    ],
  );
});

test("event breadcrumbs keep city only when a street is passed", () => {
  assert.deepEqual(
    buildEventHeroBreadcrumbs({
      eventLabel: "NYE Party",
      locationLabel: "London Rd, Six Mile Bottom, Newmarket CB8 0NN, UK",
    }),
    [
      { label: "Home", href: undefined },
      { label: "Newmarket", href: undefined },
      { label: "NYE Party" },
    ],
  );
});
