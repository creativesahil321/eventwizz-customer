import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyVendorBookingFactsToDates,
  extractVendorBookingFacts,
  parseVendorDescriptionHints,
} from "./ai-onboarding-sanitize";
import { buildAiEventSystemPrompt } from "@/app/(protected)/vendor/events/_lib/ai-event-vendor-intent";

const ROOMS = ["Ballroom", "Open Terrace", "Hall"];

function ending(dates: string[], md: string) {
  return dates.find((iso) => iso.endsWith(md));
}

const CANONICAL_UK = `
create christmas party 25th and 27th dec, tables only, 50 per head on 25 and 90 on 27, all rooms same ballroom terrace hall, menu included starter tea main shahi paneer chapati dessert gulab jamun, drinks only ballroom and terrace vodka 23 beer 40 orange juice 89, 20 percent deposit 30 days before, no discount
`.trim();

const EXTREMELY_MESSY = `
need christmas event 25th 27th dec tables. 3 rooms ballroom open terrace hall same setup. 50pp christmas day 90pp 27th. food included tea then shahi paneer chapati then gulab jamun. drinks only ballroom/terrace vodka23 beer pint40 oj89 hall nothing. 20% dep 30 days before each event. no codes.
`.trim();

test("canonical UK vendor rant becomes two December dates, tables, 50/90, deposit, no promo", () => {
  const facts = extractVendorBookingFacts(CANONICAL_UK, ROOMS);
  assert.equal(facts.eventDates.length, 2);
  const d25 = ending(facts.eventDates, "-12-25")!;
  const d27 = ending(facts.eventDates, "-12-27")!;
  assert.ok(d25);
  assert.ok(d27);
  assert.equal(facts.pricesByDate?.[d25], 50);
  assert.equal(facts.pricesByDate?.[d27], 90);
  assert.equal(facts.tablesOnly, true);
  assert.equal(facts.depositPercent, 20);
  assert.equal(facts.depositDueDaysBefore, 30);
  assert.equal(facts.omitDiscounts, true);
  assert.equal(facts.menuIncludedInPrice, true);
  const items = (facts.menuCourses ?? []).flatMap((c) =>
    c.items.map((i) => i.title.toLowerCase()),
  );
  assert.ok(items.some((t) => t.includes("tea")));
  assert.ok(items.some((t) => t.includes("paneer")));
  assert.ok(items.some((t) => t.includes("gulab")));
  assert.ok(facts.drinkPackages?.some((d) => /vodka/i.test(d.title) && d.price === 23));
  assert.ok(facts.drinkPackages?.some((d) => /beer/i.test(d.title) && d.price === 40));
  assert.ok(
    facts.drinkPackages?.some((d) => /orange|oj/i.test(d.title) && d.price === 89),
  );
});

test("25/12 and 27/12 are UK day/month dates, not US month/day", () => {
  const facts = extractVendorBookingFacts(
    "christmas event two dates 25/12 and 27/12 all rooms same",
  );
  assert.ok(ending(facts.eventDates, "-12-25"));
  assert.ok(ending(facts.eventDates, "-12-27"));
});

test("christmas day plus 27th is 25 Dec and 27 Dec", () => {
  const facts = extractVendorBookingFacts("christmas day and 27th");
  assert.ok(ending(facts.eventDates, "-12-25"));
  assert.ok(ending(facts.eventDates, "-12-27"));
});

test("UK price shorthand 25 50pp 27 90pp maps onto listed dates", () => {
  const facts = extractVendorBookingFacts(
    "christmas party 25th and 27th dec 25 50pp 27 90pp",
  );
  const d25 = ending(facts.eventDates, "-12-25")!;
  const d27 = ending(facts.eventDates, "-12-27")!;
  assert.equal(facts.pricesByDate?.[d25], 50);
  assert.equal(facts.pricesByDate?.[d27], 90);
});

test("25=50 27=90 and first/second date prices both work", () => {
  const equals = extractVendorBookingFacts(
    "christmas 25 and 27 dec 25=50 27=90",
  );
  assert.equal(equals.pricesByDate?.[ending(equals.eventDates, "-12-25")!], 50);
  assert.equal(equals.pricesByDate?.[ending(equals.eventDates, "-12-27")!], 90);

  const ordered = extractVendorBookingFacts(
    "christmas 25th and 27th dec first date 50 second date 90",
  );
  assert.equal(ordered.pricesByDate?.[ending(ordered.eventDates, "-12-25")!], 50);
  assert.equal(ordered.pricesByDate?.[ending(ordered.eventDates, "-12-27")!], 90);
});

test("no tickets / just tables is tables-only, not ticket booking", () => {
  const hints = parseVendorDescriptionHints(
    "christmas party 25 dec just tables, no tickets, 50 per head",
    ROOMS,
  );
  assert.equal(hints.prefersTablesBooking, true);
  assert.equal(hints.prefersTicketsOnly, false);
  assert.equal(hints.bookingFacts.tablesOnly, true);
  assert.notEqual(hints.bookingFacts.mentionsTickets, true);
  const dates = applyVendorBookingFactsToDates(undefined, hints.bookingFacts);
  assert.ok(dates.every((d) => d.booking_type === "tables"));
});

test("hall no drinks does not disable drinks on Ballroom and Terrace", () => {
  const hints = parseVendorDescriptionHints(
    "setup christmas event with ballroom terrace and hall all same but drinks only ballroom and terrace, hall no drinks, vodka 23 beer 40",
    ROOMS,
  );
  assert.equal(hints.omitDrinks, false);
  assert.ok(hints.drinkRoomKeys.some((k) => k.includes("ballroom")));
  assert.ok(
    hints.drinkRoomKeys.some((k) => k.includes("terrace")),
  );
  assert.ok(!hints.drinkRoomKeys.some((k) => k === "hall"));
});

test("month before and a fifth upfront are a 20% deposit due in 30 days", () => {
  const month = extractVendorBookingFacts(
    "tables 20% deposit due month before the event",
  );
  assert.equal(month.depositPercent, 20);
  assert.equal(month.depositDueDaysBefore, 30);

  const fifth = extractVendorBookingFacts("tables take a fifth upfront 30 days before");
  assert.equal(fifth.depositPercent, 20);
});

test("no codes / no promo means omit discounts, not a coupon", () => {
  const facts = extractVendorBookingFacts(EXTREMELY_MESSY, ROOMS);
  assert.equal(facts.omitDiscounts, true);
  assert.ok(ending(facts.eventDates, "-12-25"));
  assert.ok(ending(facts.eventDates, "-12-27"));
  assert.equal(facts.pricesByDate?.[ending(facts.eventDates, "-12-25")!], 50);
  assert.ok(facts.drinkPackages?.some((d) => /vodka/i.test(d.title) && d.price === 23));
  assert.ok(facts.drinkPackages?.some((d) => /orange|oj/i.test(d.title) && d.price === 89));
});

test("later actually-correction wins for the 25th price", () => {
  const facts = extractVendorBookingFacts(
    "christmas 25th and 27th dec 50 per head on 25 and 90 on 27. Actually the 25th should be 60.",
  );
  assert.equal(facts.pricesByDate?.[ending(facts.eventDates, "-12-25")!], 60);
  assert.equal(facts.pricesByDate?.[ending(facts.eventDates, "-12-27")!], 90);
});

test("contradictory drinks-only-hall vs hall-no-drinks is flagged", () => {
  const facts = extractVendorBookingFacts(
    "drinks only in Hall, but Hall has no drinks",
    ROOMS,
  );
  assert.ok((facts.contradictions ?? []).length > 0);
});

test("vendor event system prompt includes the extract pipeline and never-invent rules", () => {
  const prompt = buildAiEventSystemPrompt(10);
  assert.match(prompt, /UK VENDOR LANGUAGE/);
  assert.match(prompt, /per head/);
  assert.match(prompt, /NEVER invent/);
  assert.match(prompt, /last instruction wins/i);
});
