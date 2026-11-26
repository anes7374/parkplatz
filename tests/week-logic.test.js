"use strict";

// Tests für week-logic.js (Start im Projektordner: node --test)
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getIsoWeek,
  formatWeekKey,
  getWeekMonday,
  getWeeksInYear,
  parseWeekKey,
  addWeeks,
  formatWeekLabel
} = require("../js/week-logic.js");

// Monate in new Date(...) zählen ab 0: 10 = November, 11 = Dezember, 0 = Jänner.

// ----- getIsoWeek -----

test("getIsoWeek: 26.11.2026 ist KW 48", () => {
  assert.deepEqual(getIsoWeek(new Date(2026, 10, 26)), { year: 2026, week: 48 });
});

test("getIsoWeek: Montag und Sonntag gehören zur selben Woche", () => {
  assert.deepEqual(getIsoWeek(new Date(2026, 10, 23)), { year: 2026, week: 48 });
  assert.deepEqual(getIsoWeek(new Date(2026, 10, 29)), { year: 2026, week: 48 });
});

test("getIsoWeek: 1.1.2027 (Freitag) gehört noch zu KW 53 von 2026", () => {
  assert.deepEqual(getIsoWeek(new Date(2027, 0, 1)), { year: 2026, week: 53 });
});

test("getIsoWeek: 29.12.2025 (Montag) gehört schon zu KW 1 von 2026", () => {
  assert.deepEqual(getIsoWeek(new Date(2025, 11, 29)), { year: 2026, week: 1 });
});

test("getIsoWeek: Uhrzeit spielt keine Rolle", () => {
  assert.deepEqual(getIsoWeek(new Date(2026, 10, 29, 23, 59)), { year: 2026, week: 48 });
});

// ----- formatWeekKey / parseWeekKey -----

test("formatWeekKey: einstellige Woche bekommt eine 0 davor", () => {
  assert.equal(formatWeekKey({ year: 2026, week: 5 }), "2026-W05");
});

test("parseWeekKey: gültiger Schlüssel", () => {
  assert.deepEqual(parseWeekKey("2026-W48"), { year: 2026, week: 48 });
});

test("parseWeekKey: ungültige Eingaben ergeben null", () => {
  assert.equal(parseWeekKey("2026-W00"), null);
  assert.equal(parseWeekKey("2025-W53"), null);   // 2025 hat nur 52 Wochen
  assert.equal(parseWeekKey("2026-48"), null);
  assert.equal(parseWeekKey("abc"), null);
  assert.equal(parseWeekKey(null), null);
  assert.equal(parseWeekKey("0050-W10"), null);   // Jahr zu klein
});

test("getWeeksInYear: 2026 hat 53 Wochen, 2025 nur 52", () => {
  assert.equal(getWeeksInYear(2026), 53);
  assert.equal(getWeeksInYear(2025), 52);
});

// ----- getWeekMonday -----

test("getWeekMonday: KW 48/2026 beginnt am 23.11.2026", () => {
  assert.equal(getWeekMonday(2026, 48).toISOString().slice(0, 10), "2026-11-23");
});

test("getWeekMonday: KW 1/2026 beginnt am 29.12.2025", () => {
  assert.equal(getWeekMonday(2026, 1).toISOString().slice(0, 10), "2025-12-29");
});

// ----- addWeeks -----

test("addWeeks: nächste und vorige Woche", () => {
  assert.equal(addWeeks("2026-W48", 1), "2026-W49");
  assert.equal(addWeeks("2026-W48", -1), "2026-W47");
});

test("addWeeks: über den Jahreswechsel", () => {
  assert.equal(addWeeks("2026-W53", 1), "2027-W01");
  assert.equal(addWeeks("2027-W01", -1), "2026-W53");
});

test("addWeeks: ungültiger Schlüssel wirft einen Fehler", () => {
  assert.throws(() => addWeeks("kaputt", 1));
});

// ----- formatWeekLabel -----

test("formatWeekLabel: zeigt KW und Montag bis Sonntag", () => {
  assert.equal(formatWeekLabel("2026-W48"), "KW 48 · 23.11.–29.11.2026");
});

test("formatWeekLabel: Woche über den Jahreswechsel", () => {
  assert.equal(formatWeekLabel("2026-W01"), "KW 1 · 29.12.–04.01.2026");
});
