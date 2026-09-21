import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyVendorBookingFactsToDates,
  buildAiOnboardingSystemPrompt,
  ensureOnboardingDates,
  ensureStepSevenRooms,
  extractVendorBookingFacts,
  formatVendorFactsForPrompt,
  parseVendorDescriptionHints,
  uniqueAiDatesByEventDate,
} from "./ai-onboarding-sanitize";
import { MESSY_XMAS_VENDOR_PROMPT } from "./vendor-messy-prompt.fixture";

const ROOM_NAMES = ["Ballroom", "Open Terrace", "Hall"];

function dateEnding(isoDates: string[], monthDay: string) {
  return isoDates.find((iso) => iso.endsWith(monthDay));
}

test("messy xmas prompt extracts Dec 25 and 27 only, not the 26th price label", () => {
  const facts = extractVendorBookingFacts(MESSY_XMAS_VENDOR_PROMPT);
  assert.equal(facts.eventDates.length, 2);
  assert.ok(dateEnding(facts.eventDates, "-12-25"), "expected 25 Dec");
  assert.ok(dateEnding(facts.eventDates, "-12-27"), "expected 27 Dec");
  assert.equal(dateEnding(facts.eventDates, "-12-26"), undefined);
});

test("messy xmas prompt maps pound prices onto the listed event dates", () => {
  const facts = extractVendorBookingFacts(MESSY_XMAS_VENDOR_PROMPT);
  const d25 = dateEnding(facts.eventDates, "-12-25")!;
  const d27 = dateEnding(facts.eventDates, "-12-27")!;
  assert.equal(facts.pricesByDate?.[d25], 50);
  assert.equal(facts.pricesByDate?.[d27], 90);
});

test("messy xmas prompt reads 20% deposit due 30 days before", () => {
  const facts = extractVendorBookingFacts(MESSY_XMAS_VENDOR_PROMPT);
  assert.equal(facts.depositPercent, 20);
  assert.equal(facts.depositDueDaysBefore, 30);
});

test("messy xmas prompt treats menu as included and extracts courses plus drink add-ons", () => {
  const facts = extractVendorBookingFacts(MESSY_XMAS_VENDOR_PROMPT);
  assert.equal(facts.menuIncludedInPrice, true);
  const courseNames = (facts.menuCourses ?? []).map((c) => c.name.toLowerCase());
  assert.ok(courseNames.some((n) => n.includes("starter")));
  assert.ok(courseNames.some((n) => n.includes("main")));
  assert.ok(courseNames.some((n) => n.includes("dessert")));
  const items = (facts.menuCourses ?? []).flatMap((c) =>
    c.items.map((i) => i.title.toLowerCase()),
  );
  assert.ok(items.some((t) => t.includes("tea")));
  assert.ok(items.some((t) => t.includes("paneer")));
  assert.ok(items.some((t) => t.includes("gulab")));
  const drinks = facts.drinkPackages ?? [];
  assert.equal(drinks.length, 3);
  assert.ok(drinks.some((d) => /vodka/i.test(d.title) && d.price === 23));
  assert.ok(drinks.some((d) => /beer/i.test(d.title) && d.price === 40));
  assert.ok(drinks.some((d) => /orange/i.test(d.title) && d.price === 89));
});

test("everything is same and drinks on two named rooms are parsed as hints", () => {
  const hints = parseVendorDescriptionHints(
    MESSY_XMAS_VENDOR_PROMPT,
    ROOM_NAMES,
  );
  assert.equal(hints.wantsSameDatesAllRooms, true);
  assert.equal(hints.wantsSameDataAllRooms, true);
  assert.equal(hints.prefersDepositPayment, true);
  assert.equal(hints.wantsRoomSpecificDrinks, true);
  assert.ok(
    hints.drinkRoomKeys?.some((k) => k.includes("ballroom")),
    `drink rooms: ${hints.drinkRoomKeys?.join(",")}`,
  );
  assert.ok(
    hints.drinkRoomKeys?.some((k) => k.includes("openterrace") || k.includes("terrace")),
    `drink rooms: ${hints.drinkRoomKeys?.join(",")}`,
  );
});

test("apply facts uses table deposit, per-date prices, and 30-day due date", () => {
  const facts = extractVendorBookingFacts(MESSY_XMAS_VENDOR_PROMPT);
  const dates = applyVendorBookingFactsToDates(undefined, facts);
  assert.equal(dates.length, 2);
  const d25 = dates.find((d) => d.event_date.endsWith("-12-25"))!;
  const d27 = dates.find((d) => d.event_date.endsWith("-12-27"))!;
  assert.ok(d25);
  assert.ok(d27);
  assert.equal(d25.booking_type, "tables");
  assert.equal(d25.payment_type, "deposit");
  assert.equal(d25.deposit_value, "20");
  assert.equal(d25.tables[0]?.price, "100");
  assert.equal(d27.tables[0]?.price, "180");
  const due25 = new Date(`${d25.event_date}T00:00:00`);
  due25.setDate(due25.getDate() - 30);
  assert.equal(d25.deposit_due_date, due25.toISOString().slice(0, 10));
});

test("drinks land only on Ballroom and Open Terrace", () => {
  const hints = parseVendorDescriptionHints(
    MESSY_XMAS_VENDOR_PROMPT,
    ROOM_NAMES,
  );
  const packages = (hints.bookingFacts.drinkPackages ?? []).map((p) => ({
    title: p.title,
    description: p.title,
    price: p.price,
    available_quantity: 100,
  }));
  const rooms = ensureStepSevenRooms(
    undefined,
    ROOM_NAMES,
    {
      drinks_option: 1,
      drink_title: "Drinks",
      drink_description: "Add-ons",
      packages,
    },
    hints,
  );
  const byName = Object.fromEntries(rooms.map((r) => [r.room_name, r]));
  assert.equal(byName.Ballroom?.drinks_option, 1);
  assert.equal(byName["Open Terrace"]?.drinks_option, 1);
  assert.equal(byName.Hall?.drinks_option, 0);
  assert.equal(byName.Hall?.packages.length, 0);
  assert.ok((byName.Ballroom?.packages.length ?? 0) >= 3);
});

test("facts prompt tells the model not to invent 26 Dec or a discount code", () => {
  const facts = extractVendorBookingFacts(MESSY_XMAS_VENDOR_PROMPT);
  const block = formatVendorFactsForPrompt(facts);
  assert.match(block, /12-25/);
  assert.match(block, /12-27/);
  assert.doesNotMatch(block, /12-26/);
  assert.match(block, /50/);
  assert.match(block, /90/);
  assert.match(block, /20%/);
  assert.match(block, /30 days/);
  assert.match(block, /deposit/i);
  assert.match(block, /not (a |create a )?promo/i);
});

test("onboarding system prompt trains the model on messy vendor English", () => {
  const prompt = buildAiOnboardingSystemPrompt(10);
  assert.match(prompt, /MESSY VENDOR ENGLISH/);
  assert.match(prompt, /PRICE LABEL/);
  assert.match(prompt, /do not create a promo/i);
  assert.match(prompt, /EACH event_date may appear ONCE/i);
});

function ticketDate(iso: string, title: string) {
  return {
    event_date: iso,
    booking_type: "tickets" as const,
    tickets: [
      {
        title,
        description: title,
        total_capacity: "10",
        price: "10",
      },
    ],
    tables: [],
  };
}

test("uniqueAiDatesByEventDate keeps one object per calendar day", () => {
  const dates = uniqueAiDatesByEventDate([
    ticketDate("2026-12-18", "Morning"),
    ticketDate("2026-12-18", "Evening"),
    ticketDate("2026-12-19 ", "Day 2 a"),
    ticketDate("2026-12-19", "Day 2 b"),
  ]);
  assert.deepEqual(
    dates.map((d) => d.event_date),
    ["2026-12-18", "2026-12-19"],
  );
});

test("ensureOnboardingDates collapses duplicate AI calendar days", () => {
  const dates = ensureOnboardingDates(
    [
      ticketDate("2026-12-18", "A"),
      ticketDate("2026-12-18", "B"),
      ticketDate("2026-12-19", "C"),
      ticketDate("2026-12-19", "D"),
    ],
    extractVendorBookingFacts(""),
  );
  const days = dates.map((d) => d.event_date);
  assert.equal(new Set(days).size, days.length);
  assert.deepEqual(days, ["2026-12-18", "2026-12-19"]);
});

test("listed event dates win over a requested date count", () => {
  const facts = extractVendorBookingFacts(
    "4 dates please, 2026-12-18 and 2026-12-19",
  );
  assert.equal(facts.requestedDateCount, undefined);
  assert.deepEqual(facts.eventDates, ["2026-12-18", "2026-12-19"]);
});
