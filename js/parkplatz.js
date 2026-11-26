"use strict";

// ===== Übersicht aller Parkplätze =====
// Einstellungen, Speicher und Anmeldung kommen aus parking-common.js.
// Ein Klick auf einen Platz öffnet die Detailseite platz.html?id=P…,
// dort wird reserviert bzw. freigegeben.

// ===== Elemente aus dem HTML holen =====
const freeCountText = document.getElementById("freeCount");
const ownSpotHint = document.getElementById("ownSpotHint");
const messageText = document.getElementById("message");
const spotGrid = document.getElementById("spotGrid");
const weekLabel = document.getElementById("weekLabel");
const prevWeekLink = document.getElementById("prevWeek");
const nextWeekLink = document.getElementById("nextWeek");

// Gewählte Kalenderwoche, z. B. "2026-W48" (aus der Adresse, sonst aktuelle Woche).
const selectedWeekKey = getSelectedWeekKey();

// ===== Wochen-Auswahl =====
// Die Pfeile laden die Seite mit einer anderen Woche neu (?week=…).
// Vor die aktuelle Woche kann man nicht zurück.
function renderWeekNav() {
  weekLabel.textContent = formatWeekLabel(selectedWeekKey);
  nextWeekLink.href = "parkplatz.html?week=" + addWeeks(selectedWeekKey, 1);

  if (selectedWeekKey === getCurrentWeekKey()) {
    // Ein Link ohne href ist nicht klickbar; aria-disabled sagt es Screenreadern.
    prevWeekLink.removeAttribute("href");
    prevWeekLink.setAttribute("aria-disabled", "true");
  } else {
    prevWeekLink.href = "parkplatz.html?week=" + addWeeks(selectedWeekKey, -1);
    prevWeekLink.removeAttribute("aria-disabled");
  }
}

// ===== Anzeige aufbauen =====
function renderSummary(reservations, currentUser) {
  const freeCount = countFreeSpots(spotIds, reservations);
  freeCountText.textContent = freeCount + " von " + SPOT_COUNT + " Plätzen frei";

  const ownSpot = findSpotOfUser(reservations, currentUser);
  if (ownSpot === null) {
    ownSpotHint.textContent = "Tippe auf einen Platz, um Details zu sehen und ihn zu reservieren.";
  } else {
    ownSpotHint.textContent = "Dein Platz in dieser Woche: " + ownSpot + ". Tippe darauf, um ihn freizugeben.";
  }
}

// Kurze Statuswörter für die schmalen Kacheln im Lageplan.
const SHORT_STATUS_LABELS = {
  free: "Frei",
  mine: "Meiner",
  taken: "Belegt"
};

// Ein Platz ist ein Link (<a>), weil er zu einer anderen Seite führt.
// "?id=A6&week=2026-W48" hängt Platz und Woche an die Adresse – platz.js liest sie dort aus.
function createSpotLink(spotId, reservations, currentUser) {
  const status = getSpotStatus(spotId, reservations, currentUser);

  const link = document.createElement("a");
  link.className = "spot is-" + status;
  link.href = "platz.html?id=" + spotId + "&week=" + selectedWeekKey;
  // Vollständiger Text für Screenreader (die Kachel zeigt nur ein kurzes Wort).
  link.setAttribute("aria-label", "Platz " + spotId + ", " + STATUS_LABELS[status]);

  const number = document.createElement("span");
  number.className = "spot-number";
  number.textContent = spotId;

  const label = document.createElement("span");
  label.className = "spot-label";
  label.textContent = SHORT_STATUS_LABELS[status];

  link.append(number, label);
  return link;
}

// Eine Bauminsel/Lücke zwischen zwei Blöcken. aria-hidden: Screenreader
// überspringen sie, weil sie keine Information trägt.
function createGap() {
  const gap = document.createElement("span");
  gap.className = "spot-gap";
  gap.setAttribute("aria-hidden", "true");
  return gap;
}

// Der Eingang zum Parkplatz (kein Parkplatz, nur zur Orientierung).
function createEntrance() {
  const entrance = document.createElement("div");
  entrance.className = "entrance";
  entrance.textContent = "Eingang";
  return entrance;
}

// Wandelt eine Zelle (Platz, Lücke oder Eingang) in ein Element um.
function createCell(cell, reservations, currentUser) {
  if (cell.type === "gap") {
    return createGap();
  }
  if (cell.type === "entrance") {
    return createEntrance();
  }
  return createSpotLink(cell.id, reservations, currentUser);
}

// Zeichnet eine einzelne Reihe: Reihenbuchstabe vorne, dann die Plätze/Lücken.
function createRow(row, reservations, currentUser) {
  const rowElement = document.createElement("div");
  rowElement.className = "spot-row";

  const rowLabel = document.createElement("span");
  rowLabel.className = "row-label";
  rowLabel.textContent = row.label;
  rowElement.append(rowLabel);

  for (const cell of row.cells) {
    rowElement.append(createCell(cell, reservations, currentUser));
  }
  return rowElement;
}

// Zeichnet eine senkrechte Reihe (Spalte): Buchstabe oben, Plätze untereinander.
// Für die Reihe A an der Seite – dort stehen die Autos quer (liegende Kacheln).
function createColumn(row, reservations, currentUser) {
  const column = document.createElement("div");
  column.className = "spot-col";

  const colLabel = document.createElement("span");
  colLabel.className = "row-label";
  colLabel.textContent = row.label;
  column.append(colLabel);

  // Die Plätze liegen in einem eigenen Stapel, damit der Buchstabe links
  // daneben stehen kann und der erste Platz oben auf gleicher Höhe wie Reihe B beginnt.
  const stack = document.createElement("div");
  stack.className = "spot-stack";
  for (const cell of row.cells) {
    stack.append(createCell(cell, reservations, currentUser));
  }
  column.append(stack);
  return column;
}

// Baumstreifen zwischen den beiden Reihen einer Doppelreihe.
// aria-hidden: Screenreader überspringen ihn (keine Information).
function createTreeStrip() {
  const strip = document.createElement("div");
  strip.className = "tree-strip";
  strip.setAttribute("aria-hidden", "true");
  return strip;
}

// Zeichnet den Lageplan: links die senkrechte Reihe A, rechts die
// waagrechten Doppelreihen (je zwei Reihen mit Baumstreifen dazwischen).
function renderGrid(reservations, currentUser) {
  spotGrid.textContent = "";   // alten Plan entfernen

  // Reihen schnell über ihren Buchstaben finden.
  const rowsByLabel = {};
  for (const row of parkingLayout) {
    rowsByLabel[row.label] = row;
  }

  // Senkrechte Reihe A an der linken Seite.
  spotGrid.append(createColumn(rowsByLabel[SIDE_ROW], reservations, currentUser));

  // Rechter Bereich: die waagrechten Doppelreihen untereinander.
  const rightArea = document.createElement("div");
  rightArea.className = "lot-right";

  for (const band of PARKING_BANDS) {
    const bandElement = document.createElement("div");
    bandElement.className = "band";

    band.forEach((label, index) => {
      if (index > 0) {
        bandElement.append(createTreeStrip());   // zwischen zwei Reihen
      }
      bandElement.append(createRow(rowsByLabel[label], reservations, currentUser));
    });

    rightArea.append(bandElement);
  }

  spotGrid.append(rightArea);
}

// ===== Start =====
function startPage() {
  const currentUser = requireLogin();
  if (currentUser === null) {
    return;   // requireLogin leitet bereits zur Anmeldung weiter
  }

  setUpTopBar(currentUser);
  renderWeekNav();

  const loaded = loadReservations(selectedWeekKey);
  if (loaded.wasReset) {
    messageText.textContent =
      "Die gespeicherten Reservierungen waren beschädigt und wurden zurückgesetzt.";
  }

  renderSummary(loaded.reservations, currentUser);
  renderGrid(loaded.reservations, currentUser);
}

startPage();
