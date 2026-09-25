import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EVENT_GALLERY_MIN_IMAGES_WHEN_USED,
  coerceGalleryImageId,
  countEventGalleryItems,
  isEventGalleryCountValid,
} from "./event-gallery-count";

test("gallery may be skipped entirely or must have at least three images", () => {
  assert.equal(EVENT_GALLERY_MIN_IMAGES_WHEN_USED, 3);
  assert.equal(isEventGalleryCountValid(0), true);
  assert.equal(isEventGalleryCountValid(1), false);
  assert.equal(isEventGalleryCountValid(2), false);
  assert.equal(isEventGalleryCountValid(3), true);
  assert.equal(isEventGalleryCountValid(4), true);
});

test("gallery count matches images the grid can show", () => {
  assert.equal(coerceGalleryImageId("12"), 12);
  assert.equal(
    countEventGalleryItems([
      { id: "1", url: "/storage/gallery/1.jpg" },
      { id: 2, url: "https://cdn.example/2.jpg" },
      { preview: "blob:http://localhost/3" },
      "/storage/gallery/4.jpg",
    ]),
    4,
  );
  assert.equal(
    isEventGalleryCountValid(
      countEventGalleryItems([
        { id: "1", url: "/storage/gallery/1.jpg" },
        { id: 2, url: "https://cdn.example/2.jpg" },
        "/storage/gallery/3.jpg",
      ]),
    ),
    true,
  );
});
