import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mergeSiteEssentialsListingEvents,
  normalizeSiteEssentialsEvents,
} from "./site-essentials-preview-events";

test("keeps listing booking_option so preview cards match live ticket/table icons", () => {
  const [both, tables] = normalizeSiteEssentialsEvents([
    {
      name: "Girls Nightout",
      slug: "girls-nightout",
      banner_image: "https://example.com/g.jpg",
      lowest_price: 50,
      booking_option: "both",
    },
    {
      name: "Diwali party",
      slug: "diwali-party-1",
      banner_image: "https://example.com/d.jpg",
      lowest_price: 10,
      booking_option: "tables",
    },
  ]);

  assert.equal(both.booking_option, "both");
  assert.equal(tables.booking_option, "tables");
});

test("copies booking_option from the API when the preview snapshot omitted it", () => {
  const merged = mergeSiteEssentialsListingEvents(
    [
      {
        name: "Girls Nightout",
        slug: "girls-nightout",
        banner_image: "https://example.com/g.jpg",
        lowest_price: 50,
      },
    ],
    [
      {
        name: "Girls Nightout",
        slug: "girls-nightout",
        banner_image: "https://example.com/g.jpg",
        lowest_price: 50,
        booking_option: "both",
      },
    ],
  );
  assert.equal(merged[0]?.booking_option, "both");
});

test("omits booking_option when the API does not send a valid value", () => {
  const [event] = normalizeSiteEssentialsEvents([
    {
      name: "Wade Mcdowell",
      slug: "wade-mcdowell",
      banner_image: "https://example.com/w.jpg",
      lowest_price: 35,
    },
  ]);

  assert.equal(event.booking_option, undefined);
});
