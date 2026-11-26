"use strict";

// ===== Detailseite eines Parkplatzes (platz.html?id=P5) =====
// Einstellungen, Speicher und Anmeldung kommen aus parking-common.js.

// ===== Elemente aus dem HTML holen =====
const detailSection = document.getElementById("detail");
const notFoundSection = document.getElementById("notFound");
const spotTitle = document.getElementById("spotTitle");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const areaText = document.getElementById("areaText");
const positionText = document.getElementById("positionText");
const hintText = document.getElementById("hintText");
const messageText = document.getElementById("message");
const actionBtn = document.getElementById("actionBtn");
const weekLabel = document.getElementById("weekLabel");
const backLink = document.getElementById("backLink");

// ===== Zustand der Seite =====
// Die Platznummer steht in der Adresse hinter "?id=", z. B. platz.html?id=P5.
const spotId = new URLSearchParams(window.location.search).get("id");
// Woche steht hinter "&week=", z. B. platz.html?id=C4&week=2026-W49.
const selectedWeekKey = getSelectedWeekKey();
let currentUser = null;
let reservations = {};

// ===== Hinweistext je nach Situation =====
function getHint(status, ownSpot) {
  if (status === "mine") {
    return "Dieser Platz ist in dieser Woche für dich reserviert.";
  }
  if (status === "taken" && reservations[spotId] === FIXED_OWNER) {
    return "Dieser Platz ist fest vergeben und kann nicht reserviert werden.";
  }
  if (status === "taken") {
    return "Dieser Platz ist in dieser Woche von einer anderen Person reserviert.";
  }
  if (ownSpot !== null) {
    return "Du hast in dieser Woche bereits Platz " + ownSpot +
      ". Gib ihn zuerst frei, um diesen zu reservieren.";
  }
  return "Pro Person ist nur ein Platz pro Woche möglich.";
}

// ===== Anzeige aufbauen =====
function render() {
  const status = getSpotStatus(spotId, reservations, currentUser);
  const ownSpot = findSpotOfUser(reservations, currentUser);
  const position = getSpotPosition(spotId);

  document.title = "Parkplatz " + spotId + " – HTL Braunau";
  spotTitle.textContent = "Parkplatz " + spotId;
  statusDot.className = "legend-dot is-" + status;
  statusText.textContent = STATUS_LABELS[status];
  areaText.textContent = PARKING_AREA_NAME;
  positionText.textContent = "Reihe " + position.row + ", Platz " + position.place;
  hintText.textContent = getHint(status, ownSpot);

  // Button nur zeigen, wenn man hier etwas tun kann:
  // eigenen Platz freigeben oder freien Platz reservieren (wenn man noch keinen hat).
  if (status === "mine") {
    actionBtn.textContent = "Freigeben";
    actionBtn.hidden = false;
  } else if (status === "free" && ownSpot === null) {
    actionBtn.textContent = "Reservieren";
    actionBtn.hidden = false;
  } else {
    actionBtn.hidden = true;
  }
}

// ===== Klick auf Reservieren / Freigeben =====
actionBtn.addEventListener("click", () => {
  const status = getSpotStatus(spotId, reservations, currentUser);

  try {
    if (status === "mine") {
      reservations = releaseSpot(reservations, spotId, currentUser);
      messageText.textContent = "Platz " + spotId + " wurde für diese Woche freigegeben.";
    } else {
      reservations = reserveSpot(reservations, spotId, currentUser);
      messageText.textContent = "Platz " + spotId + " ist jetzt für " +
        formatWeekLabel(selectedWeekKey) + " für dich reserviert. " +
        "Vor Ort erkennst du ihn an der Markierung „" + spotId + "“ am Boden.";
    }
    saveReservations(selectedWeekKey, reservations);
  } catch (error) {
    // Fehlertext kommt aus parking-logic.js und ist für Menschen geschrieben.
    messageText.textContent = error.message;
  }

  render();
});

// ===== Start =====
function startPage() {
  currentUser = requireLogin();
  if (currentUser === null) {
    return;   // requireLogin leitet bereits zur Anmeldung weiter
  }

  setUpTopBar(currentUser);
  // Zurück zur Übersicht in derselben Woche
  backLink.href = "parkplatz.html?week=" + selectedWeekKey;

  // Ungültige oder fehlende Platznummer in der Adresse
  if (!spotIds.includes(spotId)) {
    detailSection.hidden = true;
    notFoundSection.hidden = false;
    return;
  }

  weekLabel.textContent = formatWeekLabel(selectedWeekKey);
  const loaded = loadReservations(selectedWeekKey);
  reservations = loaded.reservations;
  if (loaded.wasReset) {
    messageText.textContent =
      "Die gespeicherten Reservierungen waren beschädigt und wurden zurückgesetzt.";
  }

  render();
  detailSection.hidden = false;   // erst jetzt zeigen, wenn alles gefüllt ist
}

// Lädt eine Datei veraltet aus dem Cache, kann der Start fehlschlagen. Dann
// keine leere Karte zeigen, sondern einen klaren Hinweis zum Neuladen.
try {
  startPage();
} catch (error) {
  console.error("Detailseite konnte nicht geladen werden:", error);
  if (detailSection !== null) {
    detailSection.hidden = true;
  }
  const notFound = document.getElementById("notFound");
  const notFoundTitle = document.getElementById("notFoundTitle");
  const notFoundText = document.getElementById("notFoundText");
  if (notFound !== null && notFoundTitle !== null && notFoundText !== null) {
    notFoundTitle.textContent = "Seite neu laden";
    notFoundText.textContent =
      "Die Seite konnte nicht vollständig geladen werden. Bitte einmal komplett neu laden " +
      "(am PC Strg/Cmd + Umschalt + R, am Handy die Seite neu öffnen).";
    notFound.hidden = false;
  }
}
