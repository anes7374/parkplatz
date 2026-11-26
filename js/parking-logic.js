"use strict";

// ===== Reine Logik der Parkplatzverwaltung =====
// Diese Datei greift NICHT auf die Seite (DOM) oder den Speicher zu.
// Dadurch kann man sie im Browser UND in Node.js testen (siehe tests/).
//
// Datenmodell "reservations": ein Objekt, Schlüssel = Platz-ID,
// Wert = E-Mail der Person, die den Platz reserviert hat.
// Beispiel: { "A3": "max@htl-braunau.at", "B7": "anna@htl-braunau.at" }
// Fehlt ein Platz im Objekt, ist er frei.

// ===== Lageplan =====
// Der Parkplatz besteht aus Reihen (A, B, …). Jede Reihe ist in Blöcke
// geteilt, zwischen den Blöcken liegt eine Bauminsel (eine Lücke ohne Platz).
// "rowSegments" beschreibt pro Reihe, wie viele Plätze in jedem Block stehen,
// z. B. A: [5, 4] = erst 5 Plätze, dann eine Bauminsel, dann 4 Plätze.
//
// buildLayout erzeugt daraus eine Liste von Reihen. Jede Reihe hat Zellen:
//   { type: "spot", id: "A6", place: 6 }  – ein Parkplatz
//   { type: "gap" }                        – eine Bauminsel/Lücke
// Die Platz-ID ist Reihenbuchstabe + laufende Nummer in der Reihe.
function buildLayout(rowSegments, rowOrder) {
  const rows = [];
  for (const label of rowOrder) {
    const segments = rowSegments[label];
    const cells = [];
    let place = 0;

    segments.forEach((spotCount, segmentIndex) => {
      if (segmentIndex > 0) {
        cells.push({ type: "gap" });   // Bauminsel zwischen zwei Blöcken
      }
      for (let i = 0; i < spotCount; i++) {
        place++;
        cells.push({ type: "spot", id: label + place, place: place });
      }
    });

    rows.push({ label: label, cells: cells });
  }
  return rows;
}

// Baut eine Reihe aus einer ausdrücklichen Zellenliste. Jeder Eintrag ist:
//   eine Zahl      -> ein Parkplatz (ID = Reihenbuchstabe + Zahl, z. B. "A7")
//   "gap"          -> eine Bauminsel/Lücke
//   "entrance"     -> ein Eingang (kein Parkplatz)
// Nützlich für die Seitenreihe, in der an einer Stelle ein Eingang liegt.
function buildRow(label, cells) {
  const builtCells = cells.map((cell) => {
    if (cell === "gap") {
      return { type: "gap" };
    }
    if (cell === "entrance") {
      return { type: "entrance" };
    }
    return { type: "spot", id: label + cell, place: cell };
  });
  return { label: label, cells: builtCells };
}

// Alle Platz-IDs aus dem Layout, von oben nach unten und links nach rechts.
function listSpotIds(layout) {
  const spotIds = [];
  for (const row of layout) {
    for (const cell of row.cells) {
      if (cell.type === "spot") {
        spotIds.push(cell.id);
      }
    }
  }
  return spotIds;
}

// Zählt, wie viele der Plätze nicht reserviert sind.
function countFreeSpots(spotIds, reservations) {
  let freeCount = 0;
  for (const spotId of spotIds) {
    if (!reservations[spotId]) {
      freeCount++;
    }
  }
  return freeCount;
}

// Liefert die Platz-ID, die diese Person reserviert hat, oder null.
function findSpotOfUser(reservations, email) {
  for (const spotId in reservations) {
    if (reservations[spotId] === email) {
      return spotId;
    }
  }
  return null;
}

// Status eines Platzes aus Sicht der angemeldeten Person:
// "free" = frei, "mine" = von mir reserviert, "taken" = von jemand anderem.
function getSpotStatus(spotId, reservations, email) {
  const owner = reservations[spotId];
  if (!owner) {
    return "free";
  }
  if (owner === email) {
    return "mine";
  }
  return "taken";
}

// Reserviert einen Platz und gibt ein NEUES Objekt zurück.
// Das alte Objekt bleibt unverändert – so kann nichts "halb" gespeichert werden,
// wenn ein Fehler auftritt.
// Regel: Pro Person höchstens ein Platz.
function reserveSpot(reservations, spotId, email) {
  if (reservations[spotId]) {
    throw new Error("Platz " + spotId + " ist bereits belegt.");
  }

  const ownSpot = findSpotOfUser(reservations, email);
  if (ownSpot !== null) {
    throw new Error("Du hast bereits Platz " + ownSpot + " reserviert. Gib ihn zuerst frei.");
  }

  const updated = { ...reservations };   // Kopie anlegen
  updated[spotId] = email;
  return updated;
}

// Gibt einen eigenen Platz frei und liefert ein NEUES Objekt zurück.
// Fremde Plätze darf man nicht freigeben.
function releaseSpot(reservations, spotId, email) {
  if (reservations[spotId] !== email) {
    throw new Error("Platz " + spotId + " ist nicht von dir reserviert.");
  }

  const updated = { ...reservations };
  delete updated[spotId];
  return updated;
}

// Legt fest vergebene Plätze über die gespeicherten Reservierungen und
// gibt ein NEUES Objekt zurück. Fest vergebene Plätze gewinnen immer –
// auch wenn jemand denselben Platz vorher gespeichert hatte.
function applyFixedReservations(reservations, fixedReservations) {
  return { ...reservations, ...fixedReservations };
}

// ===== Belegung pro Woche "auswürfeln" =====
// Math.random() liefert bei jedem Neuladen etwas anderes. Hier soll aber
// dieselbe Woche immer gleich aussehen. Deshalb ein eigener Zufallsgenerator
// mit Startwert ("Seed"): gleicher Seed -> immer dieselbe Zahlenfolge.

// Macht aus einem Text (z. B. "2026-W48") eine Zahl (Hash, Verfahren FNV-1a).
// Schon ein anderes Zeichen ergibt eine ganz andere Zahl – so sehen auch
// benachbarte Wochen deutlich verschieden aus.
function hashText(text) {
  let hash = 2166136261;                       // Startwert laut FNV-1a
  for (const char of text) {
    hash ^= char.charCodeAt(0);                // Zeichen einmischen (XOR)
    hash = Math.imul(hash, 16777619) >>> 0;    // multiplizieren, auf 32 Bit kürzen
  }
  return hash;
}

// Liefert eine Funktion, die bei jedem Aufruf eine "Zufallszahl" von 0 bis
// unter 1 zurückgibt (lineare Kongruenz: neu = alt * a + c, auf 32 Bit gekürzt).
function createSeededRandom(seedText) {
  let state = hashText(seedText);
  return function nextRandom() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;   // 2^32 -> Ergebnis zwischen 0 und 1
  };
}

// occupancyRules: Liste von { spots: ["A6", …], chance: 0.8 }.
// chance = Wahrscheinlichkeit, dass ein Platz dieser Gruppe belegt ist
// (1 = immer, 0.5 = jede zweite Woche ungefähr).
// Gibt die belegten Platz-IDs zurück – für denselben seedText immer gleich.
function pickOccupiedSpots(occupancyRules, seedText) {
  const nextRandom = createSeededRandom(seedText);
  const occupied = [];
  for (const rule of occupancyRules) {
    for (const spotId of rule.spots) {
      if (nextRandom() < rule.chance) {
        occupied.push(spotId);
      }
    }
  }
  return occupied;
}

// Zerlegt eine Platz-ID wie "B7" in Reihe "B" und Platz 7.
// Passt die ID nicht ins Muster (Buchstaben + Ziffern), kommt null zurück.
function getSpotPosition(spotId) {
  const match = spotId.match(/^([A-Z]+)(\d+)$/);
  if (match === null) {
    return null;
  }
  return { row: match[1], place: Number(match[2]) };
}

// Nur für die Tests in Node.js: Dort gibt es "module", im Browser nicht.
// Im Browser sind die Funktionen oben einfach global verfügbar.
if (typeof module !== "undefined") {
  module.exports = {
    buildLayout,
    buildRow,
    listSpotIds,
    countFreeSpots,
    findSpotOfUser,
    getSpotStatus,
    reserveSpot,
    releaseSpot,
    applyFixedReservations,
    createSeededRandom,
    pickOccupiedSpots,
    getSpotPosition
  };
}
