"use strict";

// Tests für parking-logic.js (Start im Projektordner: node --test)
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildLayout,
  buildRow,
  listSpotIds,
  countFreeSpots,
  findSpotOfUser,
  getSpotStatus,
  reserveSpot,
  releaseSpot,
  applyFixedReservations,
  getSpotPosition,
  createSeededRandom,
  pickOccupiedSpots
} = require("../js/parking-logic.js");

const MAX = "max@htl-braunau.at";
const ANNA = "anna@htl-braunau.at";

// ----- buildLayout -----

test("buildLayout: nummeriert eine Reihe durchgehend ab 1", () => {
  const layout = buildLayout({ A: [3] }, ["A"]);
  const ids = layout[0].cells.map((cell) => cell.id);
  assert.deepEqual(ids, ["A1", "A2", "A3"]);
});

test("buildLayout: setzt zwischen zwei Blöcken eine Lücke", () => {
  const layout = buildLayout({ A: [2, 2] }, ["A"]);
  const types = layout[0].cells.map((cell) => cell.type);
  assert.deepEqual(types, ["spot", "spot", "gap", "spot", "spot"]);
});

test("buildLayout: zählt über die Lücke hinweg weiter", () => {
  const layout = buildLayout({ A: [2, 2] }, ["A"]);
  const spots = layout[0].cells.filter((cell) => cell.type === "spot");
  assert.deepEqual(spots.map((cell) => cell.id), ["A1", "A2", "A3", "A4"]);
});

test("buildLayout: hält die Reihenfolge der Reihen ein", () => {
  const layout = buildLayout({ A: [1], B: [1] }, ["A", "B"]);
  assert.deepEqual([layout[0].label, layout[1].label], ["A", "B"]);
});

// ----- buildRow -----

test("buildRow: wandelt Zahlen, Lücken und Eingang in Zellen um", () => {
  const row = buildRow("A", [1, 2, "gap", "entrance", 5]);
  assert.deepEqual(row.cells, [
    { type: "spot", id: "A1", place: 1 },
    { type: "spot", id: "A2", place: 2 },
    { type: "gap" },
    { type: "entrance" },
    { type: "spot", id: "A5", place: 5 }
  ]);
});

test("buildRow: ein Eingang ist kein Parkplatz (nicht in der ID-Liste)", () => {
  const row = buildRow("A", [1, "entrance", 3]);
  assert.deepEqual(listSpotIds([row]), ["A1", "A3"]);
});

// ----- listSpotIds -----

test("listSpotIds: liefert alle Platz-IDs ohne die Lücken", () => {
  const layout = buildLayout({ A: [2, 1], B: [2] }, ["A", "B"]);
  assert.deepEqual(listSpotIds(layout), ["A1", "A2", "A3", "B1", "B2"]);
});

// ----- countFreeSpots -----

test("countFreeSpots: ohne Reservierungen sind alle Plätze frei", () => {
  assert.equal(countFreeSpots(["P1", "P2", "P3"], {}), 3);
});

test("countFreeSpots: reservierte Plätze werden abgezogen", () => {
  const reservations = { P1: MAX, P3: ANNA };
  assert.equal(countFreeSpots(["P1", "P2", "P3"], reservations), 1);
});

test("countFreeSpots: leere Platzliste ergibt 0", () => {
  assert.equal(countFreeSpots([], {}), 0);
});

// ----- findSpotOfUser -----

test("findSpotOfUser: liefert null, wenn die Person keinen Platz hat", () => {
  assert.equal(findSpotOfUser({ P1: ANNA }, MAX), null);
});

test("findSpotOfUser: liefert null bei leeren Reservierungen", () => {
  assert.equal(findSpotOfUser({}, MAX), null);
});

test("findSpotOfUser: liefert die Platz-ID der Person", () => {
  assert.equal(findSpotOfUser({ P1: ANNA, P4: MAX }, MAX), "P4");
});

// ----- getSpotStatus -----

test("getSpotStatus: nicht reservierter Platz ist 'free'", () => {
  assert.equal(getSpotStatus("P1", {}, MAX), "free");
});

test("getSpotStatus: eigener Platz ist 'mine'", () => {
  assert.equal(getSpotStatus("P1", { P1: MAX }, MAX), "mine");
});

test("getSpotStatus: Platz einer anderen Person ist 'taken'", () => {
  assert.equal(getSpotStatus("P1", { P1: ANNA }, MAX), "taken");
});

// ----- reserveSpot -----

test("reserveSpot: trägt die Person beim Platz ein", () => {
  const result = reserveSpot({}, "P2", MAX);
  assert.deepEqual(result, { P2: MAX });
});

test("reserveSpot: behält bestehende Reservierungen anderer", () => {
  const result = reserveSpot({ P1: ANNA }, "P2", MAX);
  assert.deepEqual(result, { P1: ANNA, P2: MAX });
});

test("reserveSpot: gibt ein neues Objekt zurück", () => {
  const original = {};
  const result = reserveSpot(original, "P2", MAX);
  assert.notEqual(result, original);
});

test("reserveSpot: verändert das ursprüngliche Objekt nicht", () => {
  const original = { P1: ANNA };
  reserveSpot(original, "P2", MAX);
  assert.deepEqual(original, { P1: ANNA });
});

test("reserveSpot: wirft einen Fehler, wenn der Platz belegt ist", () => {
  assert.throws(() => reserveSpot({ P1: ANNA }, "P1", MAX), /bereits belegt/);
});

test("reserveSpot: wirft einen Fehler, wenn die Person schon einen Platz hat", () => {
  assert.throws(() => reserveSpot({ P1: MAX }, "P2", MAX), /bereits Platz P1/);
});

// ----- releaseSpot -----

test("releaseSpot: gibt den eigenen Platz frei", () => {
  const result = releaseSpot({ P1: MAX, P2: ANNA }, "P1", MAX);
  assert.deepEqual(result, { P2: ANNA });
});

test("releaseSpot: verändert das ursprüngliche Objekt nicht", () => {
  const original = { P1: MAX };
  releaseSpot(original, "P1", MAX);
  assert.deepEqual(original, { P1: MAX });
});

test("releaseSpot: wirft einen Fehler bei fremdem Platz", () => {
  assert.throws(() => releaseSpot({ P1: ANNA }, "P1", MAX), /nicht von dir/);
});

test("releaseSpot: wirft einen Fehler bei freiem Platz", () => {
  assert.throws(() => releaseSpot({}, "P1", MAX), /nicht von dir/);
});

// ----- applyFixedReservations -----

const FIXED = { P3: "fest vergeben", P7: "fest vergeben" };

test("applyFixedReservations: fügt fest vergebene Plätze hinzu", () => {
  const result = applyFixedReservations({ P1: MAX }, FIXED);
  assert.deepEqual(result, { P1: MAX, P3: "fest vergeben", P7: "fest vergeben" });
});

test("applyFixedReservations: fest vergeben gewinnt gegen gespeicherte Reservierung", () => {
  const result = applyFixedReservations({ P3: MAX }, FIXED);
  assert.equal(result.P3, "fest vergeben");
});

test("applyFixedReservations: fest vergebener Platz ist für andere belegt", () => {
  const result = applyFixedReservations({}, FIXED);
  assert.equal(getSpotStatus("P3", result, MAX), "taken");
  assert.equal(countFreeSpots(["P1", "P2", "P3", "P7"], result), 2);
});

test("applyFixedReservations: verändert das ursprüngliche Objekt nicht", () => {
  const original = { P1: MAX };
  applyFixedReservations(original, FIXED);
  assert.deepEqual(original, { P1: MAX });
});

// ----- getSpotPosition -----

test("getSpotPosition: zerlegt eine einstellige ID", () => {
  assert.deepEqual(getSpotPosition("A6"), { row: "A", place: 6 });
});

test("getSpotPosition: zerlegt eine zweistellige ID", () => {
  assert.deepEqual(getSpotPosition("B17"), { row: "B", place: 17 });
});

test("getSpotPosition: liefert null bei ungültiger ID", () => {
  assert.equal(getSpotPosition("kaputt"), null);
});

// ----- createSeededRandom / pickOccupiedSpots -----

test("createSeededRandom: gleicher Seed ergibt dieselbe Zahlenfolge", () => {
  const first = createSeededRandom("2026-W48");
  const second = createSeededRandom("2026-W48");

  assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
});

test("createSeededRandom: Zahlen liegen zwischen 0 und unter 1", () => {
  const nextRandom = createSeededRandom("2026-W48");

  for (let i = 0; i < 1000; i++) {
    const value = nextRandom();
    assert.ok(value >= 0 && value < 1);
  }
});

test("pickOccupiedSpots: chance 1 ist immer belegt, chance 0 nie", () => {
  const rules = [{ chance: 1, spots: ["A1", "A2"] }, { chance: 0, spots: ["B1", "B2"] }];

  assert.deepEqual(pickOccupiedSpots(rules, "2026-W48"), ["A1", "A2"]);
});

test("pickOccupiedSpots: dieselbe Woche ergibt dieselbe Belegung", () => {
  const rules = [{ chance: 0.5, spots: ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"] }];

  assert.deepEqual(pickOccupiedSpots(rules, "2026-W48"), pickOccupiedSpots(rules, "2026-W48"));
});

test("pickOccupiedSpots: benachbarte Wochen sehen unterschiedlich aus", () => {
  const spots = Array.from({ length: 20 }, (_, index) => "B" + (index + 1));
  const rules = [{ chance: 0.5, spots }];

  const week48 = pickOccupiedSpots(rules, "2026-W48");
  const week49 = pickOccupiedSpots(rules, "2026-W49");

  assert.notDeepEqual(week48, week49);
});
