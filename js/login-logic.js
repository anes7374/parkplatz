"use strict";

// Logik für die Test-Anmeldung mit data/users.txt – ohne DOM, damit sie
// mit node --test prüfbar ist (wie parking-logic.js).

// Trennzeichen zwischen E-Mail und Passwort in einer Zeile.
const USER_FIELD_SEPARATOR = ";";
// Zeilen, die damit beginnen, sind Kommentare.
const COMMENT_PREFIX = "#";
// Obergrenzen für neue Einträge, damit niemand riesige Zeilen in die
// Datei am Server schreiben kann.
const MAX_EMAIL_LENGTH = 254;
// Muss zu maxlength="128" am Passwortfeld in index.html passen.
const MAX_PASSWORD_LENGTH = 128;

// Grobe Format-Prüfung: mind. ein Zeichen, @, ein Zeichen, Punkt, Endung.
// Wird im Browser (login.js) und am Server (server.js) verwendet.
function isValidEmail(value) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(value);
}

// Prüft einen neuen Eintrag, bevor der Server ihn in die Datei schreibt.
// Gibt null zurück, wenn alles passt, sonst den Grund als Text.
function validateNewUser(email, password) {
  if (typeof email !== "string" || typeof password !== "string") {
    return "E-Mail und Passwort müssen Text sein";
  }
  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return "E-Mail oder Passwort ist zu lang";
  }
  if (!isValidEmail(email)) {
    return "E-Mail hat kein gültiges Format";
  }
  // ";" würde die Zeile beim Einlesen falsch trennen, ein Zeilenumbruch
  // würde eine zweite, erfundene Zeile in die Datei schmuggeln, und ein
  // "#" am Anfang würde die Zeile zum Kommentar machen.
  if (
    email.includes(USER_FIELD_SEPARATOR) ||
    email.startsWith(COMMENT_PREFIX) ||
    /[\r\n]/.test(password)
  ) {
    return "E-Mail oder Passwort enthält ein unerlaubtes Zeichen";
  }
  // Ein leeres Passwort ist bewusst erlaubt: Bei ausgeschalteter Prüfung
  // darf man sich auch ohne Passwort anmelden (Testbetrieb).
  return null;
}

// Macht aus dem Text der Datei eine Liste von { email, password }.
// Leere Zeilen, Kommentare und Zeilen ohne ";" werden übersprungen.
// Die E-Mail wird klein geschrieben, damit "Max@…" und "max@…" passen.
function parseUsers(text) {
  const users = [];
  // \r?\n: Windows-Dateien enden Zeilen mit \r\n, Mac/Linux nur mit \n.
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith(COMMENT_PREFIX)) {
      continue;
    }

    const separatorIndex = line.indexOf(USER_FIELD_SEPARATOR);
    if (separatorIndex === -1) {
      continue;
    }

    // Nur am ersten ";" trennen: So darf das Passwort selbst ";" enthalten.
    const email = line.slice(0, separatorIndex).trim().toLowerCase();
    const password = line.slice(separatorIndex + 1).trim();
    if (email === "") {
      continue;
    }

    users.push({ email, password });
  }

  return users;
}

// true, wenn es einen Benutzer mit genau dieser E-Mail und diesem Passwort gibt.
// Die E-Mail muss schon bereinigt sein (trim + klein), das Passwort zählt exakt.
function isLoginValid(users, email, password) {
  return users.some((user) => user.email === email && user.password === password);
}

// true, wenn es zu dieser E-Mail schon einen Eintrag gibt (Passwort egal).
function hasUser(users, email) {
  return users.some((user) => user.email === email);
}

// Baut den Text, der für einen neuen Eintrag hinten an die Datei
// angehängt wird ("email;passwort" + Zeilenumbruch). Der bisherige Text
// wird nur gebraucht, um zu sehen, ob er mit einem Zeilenumbruch endet.
function buildNewUserLine(existingText, email, password) {
  // Ein ";" in der E-Mail würde die Zeile beim Einlesen falsch trennen.
  if (email.includes(USER_FIELD_SEPARATOR)) {
    throw new Error(`E-Mail darf kein "${USER_FIELD_SEPARATOR}" enthalten`);
  }
  // Endet die Datei nicht mit einem Zeilenumbruch, zuerst einen einfügen,
  // sonst klebt die neue Zeile an der letzten.
  const lineBreak = existingText === "" || existingText.endsWith("\n") ? "" : "\n";
  return `${lineBreak}${email}${USER_FIELD_SEPARATOR}${password}\n`;
}

// Nur für die Tests in Node.js: Dort gibt es "module", im Browser nicht.
// Im Browser sind die Funktionen oben einfach global verfügbar – deshalb
// muss index.html diese Datei VOR js/login.js einbinden.
if (typeof module !== "undefined") {
  module.exports = {
    isValidEmail,
    validateNewUser,
    parseUsers,
    isLoginValid,
    hasUser,
    buildNewUserLine
  };
}
