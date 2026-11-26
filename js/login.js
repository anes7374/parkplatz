"use strict";

// Schlüssel im sessionStorage für die angemeldete E-Mail.
// Muss mit CURRENT_USER_KEY in js/parking-common.js übereinstimmen
// (eigene Datei pro Seite, daher hier noch einmal festgelegt).
const CURRENT_USER_KEY = "itse.currentUser";

// ===== Elemente aus dem HTML holen =====
const form = document.getElementById("loginForm");

const stepEmail = document.getElementById("stepEmail");
const stepPassword = document.getElementById("stepPassword");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const emailEcho = document.getElementById("emailEcho");
const submitBtn = document.getElementById("submitBtn");

// isValidEmail() kommt aus js/login-logic.js (gemeinsam mit dem Server).

// Liest die E-Mail bereinigt aus: ohne Leerzeichen am Rand und klein
// geschrieben, damit "Max@…" und "max@…" dieselbe Person sind.
function getEmail() {
  return emailInput.value.trim().toLowerCase();
}

// ===== Schritt 1 -> Schritt 2 =====
function goToPasswordStep() {
  const email = getEmail();

  if (!isValidEmail(email)) {
    emailError.textContent = "Bitte eine gültige E-Mail-Adresse eingeben.";
    emailInput.focus();
    return;
  }

  emailError.textContent = "";
  emailEcho.textContent = email;      // E-Mail oben in Schritt 2 anzeigen

  stepEmail.classList.add("is-hidden");
  stepPassword.classList.remove("is-hidden");
  passwordInput.focus();
}

nextBtn.addEventListener("click", goToPasswordStep);

// ===== Zurück zu Schritt 1 =====
backBtn.addEventListener("click", () => {
  passwordError.textContent = "";
  stepPassword.classList.add("is-hidden");
  stepEmail.classList.remove("is-hidden");
  emailInput.focus();
});

// ===== Absenden (Schritt 2) =====
// Datei mit den Test-Anmeldedaten (Pfad zählt ab index.html).
// fetch() funktioniert nur über einen Server (node server.js),
// nicht beim Öffnen per Doppelklick (file://).
const USERS_FILE_PATH = "data/users.txt";

// Schalter für die Prüfung gegen data/users.txt.
// false = TESTWEISE AUSGESCHALTET: Anmeldung klappt mit jedem Passwort.
// Zum Einschalten wieder auf true setzen.
const IS_LOGIN_CHECK_ENABLED = false;

// Adresse am eigenen Server (server.js), die neue Einträge an
// data/users.txt anhängt.
const ADD_USER_URL = "/api/users";

// Lädt den Text der Datei mit den Test-Benutzern.
// cache: "no-store", damit Änderungen an users.txt sofort gelten.
async function loadUsersText() {
  const response = await fetch(USERS_FILE_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${USERS_FILE_PATH} nicht gefunden (HTTP ${response.status})`);
  }
  return response.text();
}

// Schickt einen neuen Eintrag an den Server. Der Browser darf die Datei
// nicht selbst beschreiben – das macht server.js.
async function saveUserOnServer(email, password) {
  const response = await fetch(ADD_USER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(`Server hat abgelehnt (HTTP ${response.status})`);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();   // Seite soll nicht neu laden

  // Enter im E-Mail-Feld schickt das Formular auch in Schritt 1 ab.
  // Dann wie "Weiter" behandeln, damit die E-Mail-Prüfung nicht übersprungen wird.
  if (!stepEmail.classList.contains("is-hidden")) {
    goToPasswordStep();
    return;
  }

  passwordError.textContent = "";

  // =========================================================
  // NUR FÜR TESTS: E-Mail und Passwort werden mit data/users.txt
  // verglichen. Die Datei kann jeder im Browser lesen – deshalb
  // später durch ein Backend ersetzen:
  //
  // SPÄTER (Backend) – im echten Betrieb das Passwort NICHT im Browser prüfen.
  // Schickt E-Mail + Passwort an euer Backend (Server), das
  // mit der Datenbank abgleicht und zurückmeldet, ob es passt.
  //
  // Beispiel (auskommentiert, bis euer Server steht):
  //
  // const response = await fetch("/api/login", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     email: getEmail(),
  //     password: passwordInput.value
  //   })
  // });
  // const result = await response.json();
  // if (result.ok) {
  //   goToParkingPage(getEmail());
  // } else {
  //   passwordError.textContent = "E-Mail oder Passwort ist falsch.";
  // }
  // =========================================================

  // Während die Datei lädt, ist der Button gesperrt – sonst würde
  // schnelles doppeltes Absenden zweimal laden und weiterleiten.
  if (submitBtn.disabled) {
    return;
  }
  submitBtn.disabled = true;

  const email = getEmail();
  const password = passwordInput.value;

  let usersText;
  try {
    usersText = await loadUsersText();
  } catch (error) {
    console.error("Anmeldedaten konnten nicht geladen werden:", error);
    // Ohne Prüfung trotzdem anmelden, nur speichern geht dann nicht.
    if (!IS_LOGIN_CHECK_ENABLED) {
      goToParkingPage(email);
      return;
    }
    // Auf der Seite nur eine allgemeine Meldung (Wunsch Jonas:
    // kein Hinweis auf Live Server).
    passwordError.textContent = "Anmeldung ist gerade nicht möglich.";
    submitBtn.disabled = false;
    return;
  }

  const users = parseUsers(usersText);   // aus js/login-logic.js

  // Die Eingabe wird nicht getrimmt, das Passwort in der Datei schon
  // (parseUsers). Passwörter mit Leerzeichen am Rand gehen daher nicht –
  // für Testkonten reicht das.
  if (IS_LOGIN_CHECK_ENABLED && !isLoginValid(users, email, password)) {
    passwordError.textContent = "E-Mail oder Passwort ist falsch.";
    submitBtn.disabled = false;
    passwordInput.focus();
    return;
  }

  // Neue E-Mail (geht nur bei ausgeschalteter Prüfung): als Eintrag
  // in data/users.txt am Server speichern.
  if (!hasUser(users, email)) {
    try {
      await saveUserOnServer(email, password);
    } catch (error) {
      // Anmeldung trotzdem erlauben, nur das Speichern hat nicht geklappt
      // (z. B. weil die Seite über Live Server statt server.js läuft).
      console.error("Eintrag konnte nicht gespeichert werden:", error);
    }
  }

  goToParkingPage(email);
});

// ===== Seite wird (wieder) angezeigt =====
// Nach der Anmeldung bleibt der Button gesperrt, weil die Seite gleich
// wechselt. Kommt man zurück (Abmelden, Zurück-Button), stellt der
// Browser die Seite oft samt gesperrtem Button wieder her – dann ginge
// "Anmelden" nicht mehr. "pageshow" läuft bei jedem Anzeigen der Seite,
// auch wenn sie aus dem Zwischenspeicher des Browsers kommt.
window.addEventListener("pageshow", () => {
  submitBtn.disabled = false;
  passwordError.textContent = "";
});

// ===== Nach erfolgreicher Anmeldung =====
// Die E-Mail kommt in den sessionStorage: Er gilt nur für diesen Tab und
// wird beim Schließen gelöscht – ähnlich wie eine Sitzung beim Server.
function goToParkingPage(email) {
  sessionStorage.setItem(CURRENT_USER_KEY, email);
  window.location.href = "pages/parkplatz.html";
}
