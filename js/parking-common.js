"use strict";

// ===== Gemeinsamer Teil für parkplatz.html (Übersicht) und platz.html (Details) =====
// Braucht parking-logic.js und week-logic.js – muss im HTML also NACH diesen
// beiden geladen werden.

// ===== Lageplan (nach Luftbild des Parkplatzes, Zahlen noch Schätzwerte) =====
// Links die senkrechte Reihe A, rechts drei waagrechte Doppelreihen.
// In einer Doppelreihe stehen die Autos Front an Front, dazwischen läuft ein
// Baumstreifen: B↔C, D↔E, F↔G. Nach unten wird der Platz schmäler.

// Seitenreihe A (von oben nach unten). Zahl = Platz, "gap" = Bauminsel,
// "entrance" = Eingang. Der Eingang liegt dort, wo sonst A10–A12 wären,
// deshalb springt die Nummerierung von A9 auf A13.
const SIDE_ROW = "A";
const SIDE_ROW_CELLS = [
  1, 2, 3, 4, 5, 6, "gap",
  7, 8, 9, "entrance",
  13, 14, 15
];

// Die waagrechten Doppelreihen rechts. Pro Reihe: Anzahl Plätze je Block,
// zwischen zwei Blöcken eine Bauminsel. HIER die echten Zahlen anpassen.
const ROW_SEGMENTS = {
  B: [6, 6, 6],            // 1. Doppelreihe (waagrecht)
  C: [6, 6, 6],
  D: [6, 6, 5],            // 2. Doppelreihe
  E: [6, 6, 5],
  F: [5, 5, 4],            // 3. Doppelreihe (unten, kürzer)
  G: [5, 5, 4]
};
const ROW_ORDER = ["B", "C", "D", "E", "F", "G"];

// Welche Reihen bilden eine Doppelreihe (Baumstreifen dazwischen)?
const PARKING_BANDS = [
  ["B", "C"],
  ["D", "E"],
  ["F", "G"]
];

const PARKING_AREA_NAME = "Schülerparkplatz HTL Braunau";

// Layout bauen: zuerst die Seitenreihe A, dann die Doppelreihen B–G.
const parkingLayout = [buildRow(SIDE_ROW, SIDE_ROW_CELLS)].concat(
  buildLayout(ROW_SEGMENTS, ROW_ORDER)
);
const spotIds = listSpotIds(parkingLayout);
const SPOT_COUNT = spotIds.length;

// ===== Belegung durch andere (Beispieldaten) =====
// Am beliebtesten sind die Plätze beim Eingang (Reihe A) und an den
// Reihen-Anfängen links (nahe Reihe A); nach rechts wird es leerer.
// Pro Kalenderwoche wird mit diesen Wahrscheinlichkeiten ausgewürfelt,
// welche Plätze belegt sind – jede Woche sieht also etwas anders aus,
// dieselbe Woche aber immer gleich (siehe pickOccupiedSpots).
// Der Wert ist der "Besitzer" – keine echte E-Mail, damit niemand sie freigeben kann.
const FIXED_OWNER = "fest vergeben";
const OCCUPANCY_RULES = [
  // Direkt neben dem Eingang: immer belegt
  { chance: 1, spots: ["A6", "A7", "A8", "A9", "A13"] },
  // Anfänge der Doppelreihen: fast immer belegt
  { chance: 0.8, spots: ["B1", "B2", "B3", "B4", "C1", "C2", "C3", "D1", "D2", "E1", "F1", "G1"] },
  // Etwas weiter weg: ungefähr jede zweite Woche
  { chance: 0.4, spots: ["A5", "A14", "B5", "B7", "C4", "C5", "D3", "D4", "E2", "E3", "F2", "G2"] },
  // Weit weg vom Eingang: selten
  { chance: 0.15, spots: ["A4", "A15", "B8", "B9", "C6", "C7", "D5", "E4", "F3", "G3"] }
];

// Belegte Plätze einer Woche als { Platz-ID: FIXED_OWNER }.
function getFixedReservations(weekKey) {
  const fixedReservations = {};
  for (const spotId of pickOccupiedSpots(OCCUPANCY_RULES, weekKey)) {
    fixedReservations[spotId] = FIXED_OWNER;
  }
  return fixedReservations;
}

// Schlüssel im Browser-Speicher. CURRENT_USER_KEY muss mit js/login.js übereinstimmen.
const CURRENT_USER_KEY = "itse.currentUser";           // sessionStorage
// Reservierungen pro Kalenderwoche: { "2026-W48": { "C4": "max@…" }, … }.
// Neuer Schlüssel, weil sich das Format geändert hat (früher ohne Woche).
const RESERVATIONS_KEY = "itse.parkingReservationsByWeek";   // localStorage

// ===== Kalenderwoche =====
// Die gewählte Woche steht in der Adresse, z. B. parkplatz.html?week=2026-W49.
// So bleibt sie beim Wechsel auf die Detailseite und zurück erhalten.
const WEEK_PARAM = "week";

// Aktuelle Woche als Schlüssel, z. B. "2026-W48".
function getCurrentWeekKey() {
  return formatWeekKey(getIsoWeek(new Date()));   // aus week-logic.js
}

// Liest die Woche aus der Adresse. Fehlt sie, ist sie ungültig oder liegt
// sie in der Vergangenheit, gilt die aktuelle Woche – für vergangene
// Wochen zu reservieren ergibt keinen Sinn.
function getSelectedWeekKey() {
  const fromUrl = new URLSearchParams(window.location.search).get(WEEK_PARAM);
  const currentWeekKey = getCurrentWeekKey();
  if (parseWeekKey(fromUrl) === null || fromUrl < currentWeekKey) {
    return currentWeekKey;
  }
  return fromUrl;
}

// ===== Anmeldung =====
// Liefert die angemeldete E-Mail. Ist niemand angemeldet, geht es zurück
// zur Anmeldeseite und die Funktion liefert null.
function requireLogin() {
  const email = sessionStorage.getItem(CURRENT_USER_KEY);
  if (email === null || email === "") {
    window.location.href = "../index.html";   // Pfad zählt ab der HTML-Seite in pages/
    return null;
  }
  return email;
}

function logout() {
  sessionStorage.removeItem(CURRENT_USER_KEY);
  window.location.href = "../index.html";   // Pfad zählt ab der HTML-Seite in pages/
}

// Zeigt die E-Mail oben an und verbindet den Abmelden-Button.
// Beide Seiten haben dieselbe obere Leiste.
function setUpTopBar(email) {
  document.getElementById("userEmail").textContent = email;
  document.getElementById("logoutBtn").addEventListener("click", logout);
}

// ===== Speicher: Reservierungen laden und speichern =====
// localStorage speichert nur Text, daher JSON.stringify / JSON.parse.

// true, wenn value ein normales Objekt ist (kein Text, keine Liste, nicht null).
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Liest ALLE Wochen aus dem Speicher.
// Rückgabe: { byWeek, wasReset } – wasReset = true, wenn die
// gespeicherten Daten kaputt waren und deshalb leer gestartet wird.
function loadAllWeeks() {
  const savedText = localStorage.getItem(RESERVATIONS_KEY);
  let saved = {};
  let wasReset = false;

  if (savedText !== null) {
    try {
      saved = JSON.parse(savedText);
    } catch (error) {
      // Kaputte Daten nicht stillschweigend ignorieren: protokollieren und melden.
      console.error("Gespeicherte Reservierungen sind ungültig:", error);
      saved = {};
      wasReset = true;
    }

    // Gültiges JSON, aber kein normales Objekt (z. B. Text oder Liste)? Auch zurücksetzen.
    if (!isPlainObject(saved)) {
      console.error("Gespeicherte Reservierungen haben das falsche Format:", saved);
      saved = {};
      wasReset = true;
    }
  }

  return { byWeek: saved, wasReset: wasReset };
}

// Reservierungen EINER Woche.
// Rückgabe: { reservations, wasReset } wie bei loadAllWeeks.
function loadReservations(weekKey) {
  const loaded = loadAllWeeks();
  let weekReservations = loaded.byWeek[weekKey] ?? {};
  let wasReset = loaded.wasReset;

  if (!isPlainObject(weekReservations)) {
    console.error("Reservierungen dieser Woche haben das falsche Format:", weekReservations);
    weekReservations = {};
    wasReset = true;
  }

  // Die ausgewürfelten belegten Plätze dieser Woche darüberlegen.
  return {
    reservations: applyFixedReservations(weekReservations, getFixedReservations(weekKey)),
    wasReset: wasReset
  };
}

// Speichert nur die echten Reservierungen. Die fest vergebenen Plätze
// kommen beim Laden ohnehin wieder dazu – so kann man die Liste oben
// ändern, ohne dass alte Einträge im Speicher hängen bleiben.
// Nur diese eine Woche wird ersetzt, die anderen Wochen bleiben gleich.
function saveReservations(weekKey, reservations) {
  const toSave = {};
  for (const spotId in reservations) {
    if (reservations[spotId] !== FIXED_OWNER) {
      toSave[spotId] = reservations[spotId];
    }
  }
  const byWeek = loadAllWeeks().byWeek;
  byWeek[weekKey] = toSave;
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(byWeek));
}

// Status -> Text (Farbe allein reicht nicht als Information)
const STATUS_LABELS = {
  free: "Frei",
  mine: "Dein Platz",
  taken: "Belegt"
};
