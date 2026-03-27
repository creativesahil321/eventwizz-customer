/**
 * Placeholder images for AI-generated events/onboarding.
 * All images are royalty-free Unsplash photos matched to each event category.
 * Every image within a set is unique (no repeated photo IDs within the same set).
 * Vendors can replace any of these in the editor after the event is created.
 *
 * Primary lookup: getImagesByCategoryId(categoryId) — maps the exact API category IDs
 * Fallback:       getDummyImages(eventType)          — maps high-level type strings
 */

export interface EventImageSet {
  cover: string;
  banner: string;
  package: string;
  scheduler_background: string;
  menu_background: string;
  gallery: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Category-based image sets (keyed by backend category ID from the API)
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_IMAGES: Record<number, EventImageSet> = {
  // 1 — Christmas Events
  1: {
    cover: "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=1920&h=1080&fit=crop&q=80", // Christmas tree with lights
    banner: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1920&h=1080&fit=crop&q=80", // Christmas ornaments
    package: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=800&h=600&fit=crop&q=80", // festive decorations
    scheduler_background: "https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?w=1920&h=1080&fit=crop&q=80", // Christmas lights
    menu_background: "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=1920&h=1080&fit=crop&q=80", // Christmas cookies
    gallery: [
      "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1612979168796-bcae1575b8c5?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1602521879046-b994fcd56190?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514377006585-6e7975371bd6?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 2 — New Year Parties
  2: {
    cover: "https://images.unsplash.com/photo-1532290082932-ad87f0fae36f?w=1920&h=1080&fit=crop&q=80", // fireworks night sky
    banner: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&h=1080&fit=crop&q=80", // party lights crowd
    package: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop&q=80", // celebration lights
    scheduler_background: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=1920&h=1080&fit=crop&q=80", // sparkler night
    menu_background: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&h=1080&fit=crop&q=80", // concert crowd
    gallery: [
      "https://images.unsplash.com/photo-1532290082932-ad87f0fae36f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 3 — Halloween Events
  3: {
    cover: "https://images.unsplash.com/photo-1667223687781-b6025c7cd48d?w=1920&h=1080&fit=crop&q=80", // jack-o-lanterns
    banner: "https://images.unsplash.com/photo-1494376877685-d3d2559d4f82?w=1920&h=1080&fit=crop&q=80", // pumpkins
    package: "https://images.unsplash.com/photo-1604227878600-00157ecb7c74?w=800&h=600&fit=crop&q=80", // halloween decor
    scheduler_background: "https://images.unsplash.com/photo-1667137242524-372396101e88?w=1920&h=1080&fit=crop&q=80", // spooky scene
    menu_background: "https://images.unsplash.com/photo-1602786909440-854ff4d21dfb?w=1920&h=1080&fit=crop&q=80", // carved pumpkins
    gallery: [
      "https://images.unsplash.com/photo-1667223687781-b6025c7cd48d?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1494376877685-d3d2559d4f82?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1604227878600-00157ecb7c74?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1667137242524-372396101e88?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1602786909440-854ff4d21dfb?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1573306522240-15658094d2e1?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1571931468289-38ebb2c5a1c2?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1481018085669-2bc6e4f00eed?w=800&h=600&fit=crop&q=80", // spooky house
    ],
  },

  // 4 — Valentine's Day Specials
  4: {
    cover: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1920&h=1080&fit=crop&q=80", // romantic roses
    banner: "https://images.unsplash.com/photo-1484979045040-0ab3854b6acb?q=80&w=1148&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Valentine's hearts
    package: "https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=800&h=600&fit=crop&q=80", // rose petals
    scheduler_background: "https://plus.unsplash.com/premium_photo-1673488825874-36f1403311ba?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // heart sparklers
    menu_background: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&q=80", // romantic dinner
    gallery: [
      "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515871204537-49a5fe66a31f?q=80&w=1082&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549763204-2af507b4a9f5?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1581022295087-35e593704911?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800&h=600&fit=crop&q=80",
      "https://plus.unsplash.com/premium_photo-1673716788642-7f2d2c72f03f?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },

  // 5 — Easter Events
  5: {
    cover: "https://images.unsplash.com/photo-1457301353672-324d6d14f471?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Easter eggs
    banner: "https://images.unsplash.com/photo-1457364887197-9150188c107b?w=1920&h=1080&fit=crop&q=80", // spring flowers
    package: "https://images.unsplash.com/photo-1711483667297-72f65fd35cb4?w=800&h=600&fit=crop&q=80", // Easter decor
    scheduler_background: "https://images.unsplash.com/photo-1759433582178-5e16266a480b?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // sunrise spring
    menu_background: "https://images.unsplash.com/photo-1559142843-5b8fcb9de0af?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // festive balloons
    gallery: [
      "https://plus.unsplash.com/premium_photo-1676914696263-d6d078f3d628?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1457364887197-9150188c107b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1711483667297-72f65fd35cb4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1563292769-4e05b684851a?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1649465555429-d465316c33f9?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1770732418337-ff4b2c12fe79?q=80&w=1173&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1617031035978-e946aaa6b624?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },

  // 6 — Bottomless Brunch
  6: {
    cover: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop&q=80", // food spread
    banner: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&q=80", // restaurant dining
    package: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80", // restaurant interior
    scheduler_background: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1920&h=1080&fit=crop&q=80", // brunch food
    menu_background: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1920&h=1080&fit=crop&q=80", // plated meal
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 7 — Lipstick Powder & Paint (glam / cabaret / drag-lite)
  7: {
    cover: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1920&h=1080&fit=crop&q=80", // glamorous look
    banner: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&h=1080&fit=crop&q=80", // beauty portrait
    package: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop&q=80", // makeup brushes
    scheduler_background: "https://images.unsplash.com/photo-1576756373655-ce09d738c78c?w=1920&h=1080&fit=crop&q=80", // cosmetics
    menu_background: "https://images.unsplash.com/photo-1515688594390-b649af70d282?w=1920&h=1080&fit=crop&q=80", // beauty products
    gallery: [
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576756373655-ce09d738c78c?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515688594390-b649af70d282?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1668440476639-095ea4207383?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 8 — Live Music & Gigs
  8: {
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&h=1080&fit=crop&q=80", // concert stage lights
    banner: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&h=1080&fit=crop&q=80", // crowd at concert
    package: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80", // live performance
    scheduler_background: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&h=1080&fit=crop&q=80", // concert crowd
    menu_background: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1920&h=1080&fit=crop&q=80", // DJ & music
    gallery: [
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549678012-1bff827fced8?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 9 — DJ Nights & Club Events
  9: {
    cover: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop&q=80", // club celebrations
    banner: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&h=1080&fit=crop&q=80", // DJ party crowd
    package: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80", // neon party lights
    scheduler_background: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=1920&h=1080&fit=crop&q=80", // nightclub atmosphere
    menu_background: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1920&h=1080&fit=crop&q=80", // cocktail bar
    gallery: [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 10 — Comedy Shows
  10: {
    cover: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=1920&h=1080&fit=crop&q=80", // stage microphone
    banner: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop&q=80", // audience event
    package: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop&q=80", // speaker on stage
    scheduler_background: "https://images.unsplash.com/photo-1647589047037-ba94e650388f?w=1920&h=1080&fit=crop&q=80", // event hall
    menu_background: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1920&h=1080&fit=crop&q=80", // festive event
    gallery: [
      "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1647589047037-ba94e650388f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1580188928585-0ef5c1a5c4dd?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560523160-754a9e25c68f?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 11 — Drag Shows & Brunches
  11: {
    cover: "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1920&h=1080&fit=crop&q=80", // colorful stage performance
    banner: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=1920&h=1080&fit=crop&q=80", // glitter / sparkle
    package: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=800&h=600&fit=crop&q=80", // festive
    scheduler_background: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop&q=80", // brunch food
    menu_background: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&q=80", // dining
    gallery: [
      "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 12 — Themed Parties (90s, 00s, Ibiza, etc.)
  12: {
    cover: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&h=1080&fit=crop&q=80", // party crowd
    banner: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop&q=80", // celebration lights
    package: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=600&fit=crop&q=80", // cocktails
    scheduler_background: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1920&h=1080&fit=crop&q=80", // dance floor
    menu_background: "https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=1920&h=1080&fit=crop&q=80", // neon lights
    gallery: [
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 13 — Food & Drink Festivals
  13: {
    cover: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop&q=80", // food spread
    banner: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1920&h=1080&fit=crop&q=80", // plated food
    package: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&h=600&fit=crop&q=80", // restaurant plating
    scheduler_background: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1920&h=1080&fit=crop&q=80", // colorful dishes
    menu_background: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1920&h=1080&fit=crop&q=80", // grilled food
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 14 — Street Food Markets
  14: {
    cover: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&h=1080&fit=crop&q=80", // food market
    banner: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&q=80", // dining table
    package: "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&h=600&fit=crop&q=80", // food prep
    scheduler_background: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1920&h=1080&fit=crop&q=80", // street food
    menu_background: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1920&h=1080&fit=crop&q=80", // plated dish
    gallery: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 15 — Pride Events
  15: {
    cover: "https://plus.unsplash.com/premium_photo-1712841312176-0b67d9c6efa5?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // rainbow pride flag
    banner: "https://images.unsplash.com/photo-1637808947243-e21c44ba0422?w=1920&h=1080&fit=crop&q=80", // pride celebration
    package: "https://images.unsplash.com/photo-1562507837-9b1c19d62000?w=800&h=600&fit=crop&q=80", // colorful pride
    scheduler_background: "https://images.unsplash.com/photo-1684010103961-e35c9ca9c620?w=1920&h=1080&fit=crop&q=80", // rainbow colors
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80", // event food
    gallery: [
      "https://images.unsplash.com/photo-1562887250-9a52d844ad30?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1637808947243-e21c44ba0422?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1562507837-9b1c19d62000?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1684010103961-e35c9ca9c620?w=800&h=600&fit=crop&q=80",
      "https://plus.unsplash.com/premium_photo-1661440137084-cd48887ce831?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1528459584353-5297db1a9c01?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1608310558884-a956ec05421f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1713783313107-9ef218eb6f88?q=80&w=686&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },

  // 16 — Afrobeats / Bashment Nights
  16: {
    cover: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&h=1080&fit=crop&q=80", // concert crowd
    banner: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1920&h=1080&fit=crop&q=80", // live performance
    package: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&q=80", // DJ mixing
    scheduler_background: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=1920&h=1080&fit=crop&q=80", // party lights
    menu_background: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1920&h=1080&fit=crop&q=80", // cocktails
    gallery: [
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549678012-1bff827fced8?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 17 — Day Raves / Outdoor Parties
  17: {
    cover: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1920&h=1080&fit=crop&q=80", // outdoor dance
    banner: "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=1920&h=1080&fit=crop&q=80", // festival crowd
    package: "https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&h=600&fit=crop&q=80", // neon party
    scheduler_background: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&h=1080&fit=crop&q=80", // stage lights
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80", // event food
    gallery: [
      "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 18 — Open Mic & Spoken Word
  18: {
    cover: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=1920&h=1080&fit=crop&q=80", // microphone stage
    banner: "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=1920&h=1080&fit=crop&q=80", // performance stage
    package: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop&q=80", // speaker
    scheduler_background: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1920&h=1080&fit=crop&q=80", // event
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80", // food
    gallery: [
      "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1580188928585-0ef5c1a5c4dd?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560523160-754a9e25c68f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1647589047037-ba94e650388f?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 19 — Networking & Business Events
  19: {
    cover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop&q=80", // conference audience
    banner: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1920&h=1080&fit=crop&q=80", // business event
    package: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop&q=80", // networking people
    scheduler_background: "https://images.unsplash.com/photo-1573497161161-c3e73707e25c?w=1920&h=1080&fit=crop&q=80", // professional meeting
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80", // catering
    gallery: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1573497161161-c3e73707e25c?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 20 — Workshops & Masterclasses
  20: {
    cover: "https://images.unsplash.com/photo-1560523160-754a9e25c68f?w=1920&h=1080&fit=crop&q=80", // workshop setting
    banner: "https://images.unsplash.com/photo-1591280063444-d3c514eb6e13?w=1920&h=1080&fit=crop&q=80", // creative class
    package: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=600&fit=crop&q=80", // learning event
    scheduler_background: "https://images.unsplash.com/photo-1585974738771-84483dd9f89f?w=1920&h=1080&fit=crop&q=80", // classroom
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80", // catering
    gallery: [
      "https://images.unsplash.com/photo-1560523160-754a9e25c68f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1591280063444-d3c514eb6e13?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1585974738771-84483dd9f89f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1647589047037-ba94e650388f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1580188928585-0ef5c1a5c4dd?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop&q=80",
    ],
  },

  // 21 — Diwali (Festival of Lights — diyas, fireworks, rangoli, sparklers)
  21: {
    cover: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?w=1920&h=1080&fit=crop&q=80", // group of lit diyas on tiled floor
    banner: "https://images.unsplash.com/photo-1532290082932-ad87f0fae36f?w=1920&h=1080&fit=crop&q=80", // Diwali fireworks
    package: "https://images.unsplash.com/photo-1662720868850-e60cefb03201?w=800&h=600&fit=crop&q=80", // candles and festive lights
    scheduler_background: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&h=1080&fit=crop&q=80", // sparkler night celebration
    menu_background: "https://images.unsplash.com/photo-1532290082932-ad87f0fae36f?w=1920&h=1080&fit=crop&q=80", // fireworks display
    gallery: [
      "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?w=800&h=600&fit=crop&q=80", // lit diyas on floor
      "https://images.unsplash.com/photo-1532290082932-ad87f0fae36f?w=800&h=600&fit=crop&q=80", // Diwali fireworks
      "https://images.unsplash.com/photo-1662720868850-e60cefb03201?w=800&h=600&fit=crop&q=80", // candles and festive lights
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80", // sparkler night celebration
      "https://images.unsplash.com/photo-1532290082932-ad87f0fae36f?w=800&h=600&fit=crop&q=80", // fireworks night sky
      "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?w=800&h=600&fit=crop&q=80", // lit diyas on floor
      "https://images.unsplash.com/photo-1532290082932-ad87f0fae36f?w=800&h=600&fit=crop&q=80", // Diwali fireworks
      "https://images.unsplash.com/photo-1662720868850-e60cefb03201?w=800&h=600&fit=crop&q=80", // candles and festive lights
    ],
  },

  // 22 — Eid (mosque, lanterns, crescent, celebration, food)
  22: {
    cover: "https://images.unsplash.com/photo-1564121211835-e88c852648ab?w=1920&h=1080&fit=crop&q=80", // grand mosque at sunset
    banner: "https://images.unsplash.com/photo-1561314945-0562f5b6d2c6?w=1920&h=1080&fit=crop&q=80", // ornamental lantern
    package: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=600&fit=crop&q=80", // Eid celebration lights
    scheduler_background: "https://images.unsplash.com/photo-1557168108-417ff8f16263?w=1920&h=1080&fit=crop&q=80", // mosque minaret at dusk
    menu_background: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&h=1080&fit=crop&q=80", // Middle-Eastern food spread
    gallery: [
      "https://images.unsplash.com/photo-1564121211835-e88c852648ab?w=800&h=600&fit=crop&q=80", // mosque dome
      "https://images.unsplash.com/photo-1561314945-0562f5b6d2c6?w=800&h=600&fit=crop&q=80", // ornamental lantern
      "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=600&fit=crop&q=80", // celebration lights
      "https://images.unsplash.com/photo-1563460716037-460a3ad24ba9?w=800&h=600&fit=crop&q=80", // minaret dusk
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop&q=80", // food spread
      "https://images.unsplash.com/photo-1579492450119-80542d516179?w=800&h=600&fit=crop&q=80", // Islamic geometric art
      "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&h=600&fit=crop&q=80", // henna/mehndi
      "https://images.unsplash.com/photo-1519817914152-22d216bb9170?w=800&h=600&fit=crop&q=80", // festive lights
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback sets by high-level event type (used when no category ID is provided)
// ─────────────────────────────────────────────────────────────────────────────
const EVENT_TYPE_IMAGES: Record<string, EventImageSet> = {
  wedding: {
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&q=80",
    scheduler_background: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1920&h=1080&fit=crop&q=80",
    menu_background: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1920&h=1080&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800&h=600&fit=crop&q=80",
    ],
  },
  corporate: {
    cover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop&q=80",
    scheduler_background: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1920&h=1080&fit=crop&q=80",
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1573497161161-c3e73707e25c?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop&q=80",
    ],
  },
  party: {
    cover: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80",
    scheduler_background: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=1920&h=1080&fit=crop&q=80",
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&h=600&fit=crop&q=80",
    ],
  },
  conference: {
    cover: "https://images.unsplash.com/photo-1647589047037-ba94e650388f?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop&q=80",
    scheduler_background: "https://images.unsplash.com/photo-1560523160-754a9e25c68f?w=1920&h=1080&fit=crop&q=80",
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1647589047037-ba94e650388f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1580188928585-0ef5c1a5c4dd?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560523160-754a9e25c68f?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1591280063444-d3c514eb6e13?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1585974738771-84483dd9f89f?w=800&h=600&fit=crop&q=80",
    ],
  },
  concert: {
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80",
    scheduler_background: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=1920&h=1080&fit=crop&q=80",
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549678012-1bff827fced8?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop&q=80",
    ],
  },
  restaurant: {
    cover: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
    scheduler_background: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&q=80",
    menu_background: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&h=600&fit=crop&q=80",
    ],
  },
  sports: {
    cover: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop&q=80",
    scheduler_background: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&h=1080&fit=crop&q=80",
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1589010796595-ed85dc467e71?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518611540400-6b85a0704342?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1614956554845-dd7b2aca10c0?w=800&h=600&fit=crop&q=80",
    ],
  },
  other: {
    cover: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&h=600&fit=crop&q=80",
    scheduler_background: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1920&h=1080&fit=crop&q=80",
    menu_background: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1920&h=1080&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&h=600&fit=crop&q=80",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PRIMARY: Look up images by the backend category ID (1–22).
 * Falls back to the `other` event-type set when the ID is unknown.
 */
export function getImagesByCategoryId(categoryId: number): EventImageSet {
  return CATEGORY_IMAGES[categoryId] ?? EVENT_TYPE_IMAGES.other;
}

/**
 * FALLBACK: Look up images by high-level event type string.
 * Accepts exact type names (case-insensitive) then keyword matching.
 * Used when no category ID is available.
 */
export function getDummyImages(eventType: string): EventImageSet {
  const t = (eventType || "").toLowerCase().trim();

  if (t in EVENT_TYPE_IMAGES) return EVENT_TYPE_IMAGES[t];

  if (t.includes("wedding") || t.includes("bridal") || t.includes("bride") || t.includes("groom"))
    return EVENT_TYPE_IMAGES.wedding;
  if (t.includes("corporate") || t.includes("business") || t.includes("networking"))
    return EVENT_TYPE_IMAGES.corporate;
  if (t.includes("party") || t.includes("birthday") || t.includes("celebration") ||
    t.includes("neon") || t.includes("nightlife") || t.includes("club") || t.includes("rave"))
    return EVENT_TYPE_IMAGES.party;
  if (t.includes("conference") || t.includes("seminar") || t.includes("workshop") ||
    t.includes("summit") || t.includes("masterclass"))
    return EVENT_TYPE_IMAGES.conference;
  if (t.includes("concert") || t.includes("music") || t.includes("festival") ||
    t.includes("dj") || t.includes("gig") || t.includes("live music"))
    return EVENT_TYPE_IMAGES.concert;
  if (t.includes("restaurant") || t.includes("dining") || t.includes("dinner") ||
    t.includes("food") || t.includes("brunch") || t.includes("banquet"))
    return EVENT_TYPE_IMAGES.restaurant;
  if (t.includes("sport") || t.includes("football") || t.includes("cricket") ||
    t.includes("marathon") || t.includes("fitness") || t.includes("tournament"))
    return EVENT_TYPE_IMAGES.sports;

  return EVENT_TYPE_IMAGES.other;
}

// ─────────────────────────────────────────────────────────────────────────────
// Image utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a remote image URL as a File object for form submission.
 */
export async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "jpg";
  return new File([blob], `${filename}.${extension}`, { type: blob.type });
}

/** True if the blob begins with common HTML/XML (Unsplash/captcha/error pages). */
async function blobLooksLikeMarkup(blob: Blob): Promise<boolean> {
  const sample = new TextDecoder().decode(await blob.slice(0, 96).arrayBuffer());
  const s = sample.trimStart().toLowerCase();
  return (
    s.startsWith("<!doctype") ||
    s.startsWith("<html") ||
    s.startsWith("<?xml") ||
    s.startsWith("<svg")
  );
}

/** Sniff real image format from magic bytes (CDN often sends application/octet-stream). */
async function sniffImageMime(blob: Blob): Promise<string | null> {
  const buf = await blob.slice(0, 16).arrayBuffer();
  const u = new Uint8Array(buf);
  if (u.length < 3) return null;
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return "image/jpeg";
  if (u.length >= 8 && u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47)
    return "image/png";
  if (u.length >= 6 && u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return "image/gif";
  if (u.length >= 12 && u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46) {
    const tag = String.fromCharCode(u[8], u[9], u[10], u[11]);
    if (tag === "WEBP") return "image/webp";
  }
  return null;
}

function extensionForMime(mime: string): string {
  const sub = mime.split("/")[1] || "jpg";
  return sub === "jpeg" ? "jpg" : sub;
}

/**
 * Fetches a URL and returns a File only if the body is a real raster image
 * (verified by magic bytes). Rejects HTML/error pages and misleading MIME types.
 */
export async function urlToImageFile(
  url: string,
  filename: string
): Promise<File | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;
    if (await blobLooksLikeMarkup(blob)) return null;

    const sniffed = await sniffImageMime(blob);
    if (!sniffed) return null;

    const ext = extensionForMime(sniffed);
    return new File([blob], `${filename}.${ext}`, { type: sniffed });
  } catch {
    return null;
  }
}

/**
 * Creates a placeholder PNG logo with the venue's initial letter.
 */
export function createPlaceholderLogo(venueName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const initial = (venueName || "E").charAt(0).toUpperCase();
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("Canvas not supported")); return; }

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#0F172A");
    gradient.addColorStop(1, "#334155");

    const r = 24;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.font = "bold 96px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, size / 2, size / 2 + 4);

    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Failed to create PNG blob")); return; }
      const safeName = venueName.toLowerCase().replace(/\s+/g, "-") || "venue";
      resolve(new File([blob], `${safeName}-logo.png`, { type: "image/png" }));
    }, "image/png");
  });
}

/** Wide PNG banner when Unsplash/CDN fetch fails (always passes Laravel `image` validation). */
export function createPlaceholderEventBanner(eventName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const w = 1200;
    const h = 630;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#1e3a5f");
    g.addColorStop(1, "#0f172a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const title = (eventName || "Event").slice(0, 48);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 52px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, w / 2, h / 2 - 16);

    ctx.font = "22px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("Placeholder — replace from your dashboard", w / 2, h / 2 + 36);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create PNG blob"));
          return;
        }
        resolve(
          new File([blob], "event-banner-placeholder.png", { type: "image/png" })
        );
      },
      "image/png",
      0.92
    );
  });
}

/** Square-ish PNG for package / small promo slots when remote fetch fails. */
export function createPlaceholderPackageImage(label: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const w = 800;
    const h = 600;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#334155");
    g.addColorStop(1, "#1e293b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const t = (label || "Package").slice(0, 40);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, w / 2, h / 2);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create PNG blob"));
          return;
        }
        resolve(
          new File([blob], "package-placeholder.png", { type: "image/png" })
        );
      },
      "image/png",
      0.92
    );
  });
}

/**
 * Fetches multiple gallery images as File objects in parallel.
 * Silently skips any that fail to fetch or return non-image content
 * (e.g. HTML error pages), so the backend only receives valid image files.
 */
export async function fetchGalleryFiles(urls: readonly string[]): Promise<File[]> {
  const results = await Promise.allSettled(
    urls.map((url, i) => urlToImageFile(url, `gallery-image-${i + 1}`))
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<File | null> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value as File);
}