"use strict";

// Tests für login-logic.js (Start im Projektordner: node --test)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  isValidEmail,
  validateNewUser,
  parseUsers,
  isLoginValid,
  hasUser,
  buildNewUserLine
} = require("../js/login-logic.js");

// ----- parseUsers -----

test("parseUsers: liest eine Zeile als E-Mail und Passwort", () => {
  const users = parseUsers("max@htl-braunau.at;test123");

  assert.deepEqual(users, [{ email: "max@htl-braunau.at", password: "test123" }]);
});

test("parseUsers: leerer Text ergibt leere Liste", () => {
  assert.deepEqual(parseUsers(""), []);
});

test("parseUsers: überspringt Kommentare und leere Zeilen", () => {
  const text = "# Kommentar\n\nmax@htl-braunau.at;a\n   \n# noch einer";

  const users = parseUsers(text);

  assert.deepEqual(users, [{ email: "max@htl-braunau.at", password: "a" }]);
});

test("parseUsers: versteht Windows-Zeilenenden", () => {
  const users = parseUsers("max@htl-braunau.at;a\r\nanna@htl-braunau.at;b\r\n");

  assert.deepEqual(users.map((user) => user.password), ["a", "b"]);
});

test("parseUsers: schreibt die E-Mail klein und entfernt Leerzeichen am Rand", () => {
  const users = parseUsers("  Max@HTL-Braunau.at ; test123  ");

  assert.deepEqual(users, [{ email: "max@htl-braunau.at", password: "test123" }]);
});

test("parseUsers: trennt nur am ersten ;, damit das Passwort ; enthalten darf", () => {
  const users = parseUsers("max@htl-braunau.at;ab;cd");

  assert.equal(users[0].password, "ab;cd");
});

test("parseUsers: überspringt Zeilen ohne ; und ohne E-Mail", () => {
  const users = parseUsers("ohne-trennzeichen\n;nurpasswort\nmax@htl-braunau.at;a");

  assert.deepEqual(users, [{ email: "max@htl-braunau.at", password: "a" }]);
});

test("parseUsers: die echte data/users.txt enthält gültige Einträge", () => {
  const text = fs.readFileSync(path.join(__dirname, "..", "data", "users.txt"), "utf8");

  const users = parseUsers(text);

  assert.ok(users.length > 0);
  assert.ok(users.every((user) => user.email.includes("@") && user.password !== ""));
});

// ----- isLoginValid -----

const USERS = [
  { email: "max@htl-braunau.at", password: "test123" },
  { email: "anna@htl-braunau.at", password: "parken2026" }
];

test("isLoginValid: richtige E-Mail und richtiges Passwort", () => {
  assert.equal(isLoginValid(USERS, "anna@htl-braunau.at", "parken2026"), true);
});

test("isLoginValid: falsches Passwort", () => {
  assert.equal(isLoginValid(USERS, "max@htl-braunau.at", "falsch"), false);
});

test("isLoginValid: Passwort eines anderen Benutzers zählt nicht", () => {
  assert.equal(isLoginValid(USERS, "max@htl-braunau.at", "parken2026"), false);
});

test("isLoginValid: unbekannte E-Mail", () => {
  assert.equal(isLoginValid(USERS, "fremd@htl-braunau.at", "test123"), false);
});

test("isLoginValid: leeres Passwort", () => {
  assert.equal(isLoginValid(USERS, "max@htl-braunau.at", ""), false);
});

test("isLoginValid: Groß-/Kleinschreibung beim Passwort zählt", () => {
  assert.equal(isLoginValid(USERS, "max@htl-braunau.at", "TEST123"), false);
});

test("isLoginValid: leere Benutzerliste", () => {
  assert.equal(isLoginValid([], "max@htl-braunau.at", "test123"), false);
});

// ----- hasUser -----

test("hasUser: findet eine vorhandene E-Mail, egal welches Passwort", () => {
  assert.equal(hasUser(USERS, "max@htl-braunau.at"), true);
});

test("hasUser: unbekannte E-Mail", () => {
  assert.equal(hasUser(USERS, "fremd@htl-braunau.at"), false);
});

// ----- buildNewUserLine -----

test("buildNewUserLine: Datei endet mit Umbruch -> nur die neue Zeile", () => {
  const line = buildNewUserLine("# Kommentar\nmax@htl-braunau.at;a\n", "neu@htl-braunau.at", "geheim");

  assert.equal(line, "neu@htl-braunau.at;geheim\n");
});

test("buildNewUserLine: Datei endet ohne Umbruch -> zuerst Umbruch", () => {
  const line = buildNewUserLine("max@htl-braunau.at;a", "neu@htl-braunau.at", "b");

  assert.equal(line, "\nneu@htl-braunau.at;b\n");
});

test("buildNewUserLine: leere Datei bekommt genau eine Zeile", () => {
  assert.equal(buildNewUserLine("", "neu@htl-braunau.at", "b"), "neu@htl-braunau.at;b\n");
});

test("buildNewUserLine: neuer Eintrag ist danach anmeldbar", () => {
  const existingText = "max@htl-braunau.at;a";
  const text = existingText + buildNewUserLine(existingText, "neu@htl-braunau.at", "x;y");

  const users = parseUsers(text);

  assert.equal(isLoginValid(users, "neu@htl-braunau.at", "x;y"), true);
  assert.equal(users.length, 2);
});

test("buildNewUserLine: E-Mail mit ; wird abgelehnt", () => {
  assert.throws(() => buildNewUserLine("", "a;b@htl-braunau.at", "x"));
});

// ----- isValidEmail / validateNewUser -----

test("isValidEmail: gültiges und ungültiges Format", () => {
  assert.equal(isValidEmail("max@htl-braunau.at"), true);
  assert.equal(isValidEmail("max-ohne-at"), false);
});

test("validateNewUser: gültiger Eintrag ergibt null", () => {
  assert.equal(validateNewUser("neu@htl-braunau.at", "geheim"), null);
});

test("validateNewUser: lehnt ungültige E-Mail ab", () => {
  assert.notEqual(validateNewUser("kein-format", "geheim"), null);
});

test("validateNewUser: lehnt Zeilenumbruch im Passwort ab", () => {
  assert.notEqual(validateNewUser("neu@htl-braunau.at", "a\nfremd@x.at;b"), null);
});

test("validateNewUser: lehnt ; in der E-Mail ab", () => {
  assert.notEqual(validateNewUser("a;b@htl-braunau.at", "x"), null);
});

test("validateNewUser: lehnt zu lange Passwörter ab", () => {
  assert.notEqual(validateNewUser("neu@htl-braunau.at", "x".repeat(129)), null);
});

test("validateNewUser: lehnt Nicht-Text ab", () => {
  assert.notEqual(validateNewUser(undefined, 123), null);
});

test("validateNewUser: lehnt E-Mail mit # am Anfang ab (wäre ein Kommentar)", () => {
  assert.notEqual(validateNewUser("#a@htl-braunau.at", "x"), null);
});

test("validateNewUser: leeres Passwort ist erlaubt (Testbetrieb)", () => {
  assert.equal(validateNewUser("neu@htl-braunau.at", ""), null);
});
