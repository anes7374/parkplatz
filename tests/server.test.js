"use strict";

// Tests für server.js (Start im Projektordner: node --test)
// Der Server läuft dabei mit einem eigenen Testordner, die echte
// data/users.txt wird nicht verändert.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { resolveStaticPath, createAppServer } = require("../server.js");

const ROOT = path.join(path.sep, "projekt");

// ----- resolveStaticPath -----

test("resolveStaticPath: / zeigt auf index.html", () => {
  assert.equal(resolveStaticPath(ROOT, "/"), path.join(ROOT, "index.html"));
});

test("resolveStaticPath: normale Datei im Unterordner", () => {
  assert.equal(resolveStaticPath(ROOT, "/pages/platz.html"), path.join(ROOT, "pages", "platz.html"));
});

test("resolveStaticPath: blockiert Pfade aus dem Ordner hinaus", () => {
  assert.equal(resolveStaticPath(ROOT, "/../geheim.txt"), null);
  assert.equal(resolveStaticPath(ROOT, "/%2e%2e/geheim.txt"), null);
});

test("resolveStaticPath: blockiert versteckte Ordner wie .git", () => {
  assert.equal(resolveStaticPath(ROOT, "/.git/config"), null);
});

test("resolveStaticPath: blockiert %00 im Pfad", () => {
  assert.equal(resolveStaticPath(ROOT, "/index.html%00.txt"), null);
});

test("resolveStaticPath: kaputte %-Kodierung ergibt null", () => {
  assert.equal(resolveStaticPath(ROOT, "/%E0%A4%A"), null);
});

// ----- Server mit Testordner -----

// Legt einen Testordner mit users.txt an und startet den Server auf einem
// freien Port (0 = Betriebssystem sucht einen aus).
async function startTestServer(t, usersText) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "itse-server-test-"));
  const usersFile = path.join(rootDir, "users.txt");
  fs.writeFileSync(usersFile, usersText);

  const server = createAppServer(rootDir, usersFile);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.close();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { baseUrl, usersFile };
}

function postUser(baseUrl, body) {
  return fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("Server: neuer Eintrag wird an users.txt angehängt", async (t) => {
  const { baseUrl, usersFile } = await startTestServer(t, "# Test\nmax@htl-braunau.at;a\n");

  const response = await postUser(baseUrl, { email: " Neu@HTL-Braunau.at ", password: "geheim" });

  assert.equal(response.status, 201);
  assert.equal(fs.readFileSync(usersFile, "utf8"), "# Test\nmax@htl-braunau.at;a\nneu@htl-braunau.at;geheim\n");
});

test("Server: vorhandene E-Mail wird nicht doppelt eingetragen", async (t) => {
  const { baseUrl, usersFile } = await startTestServer(t, "max@htl-braunau.at;a\n");

  const response = await postUser(baseUrl, { email: "max@htl-braunau.at", password: "anders" });

  assert.equal(response.status, 200);
  assert.equal(fs.readFileSync(usersFile, "utf8"), "max@htl-braunau.at;a\n");
});

test("Server: gleichzeitige Anfragen gehen beide in die Datei", async (t) => {
  const { baseUrl, usersFile } = await startTestServer(t, "");

  await Promise.all([
    postUser(baseUrl, { email: "a@htl-braunau.at", password: "1" }),
    postUser(baseUrl, { email: "b@htl-braunau.at", password: "2" })
  ]);

  const lines = fs.readFileSync(usersFile, "utf8").trim().split("\n").sort();
  assert.deepEqual(lines, ["a@htl-braunau.at;1", "b@htl-braunau.at;2"]);
});

test("Server: lehnt ungültige Einträge ab und ändert nichts", async (t) => {
  const { baseUrl, usersFile } = await startTestServer(t, "max@htl-braunau.at;a\n");

  const response = await postUser(baseUrl, { email: "neu@htl-braunau.at", password: "x\nboese@x.at;y" });

  assert.equal(response.status, 400);
  assert.equal(fs.readFileSync(usersFile, "utf8"), "max@htl-braunau.at;a\n");
});

test("Server: kaputtes JSON ergibt 400", async (t) => {
  const { baseUrl } = await startTestServer(t, "");

  const response = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{kaputt"
  });

  assert.equal(response.status, 400);
});

test("Server: liefert users.txt als Text aus", async (t) => {
  const { baseUrl } = await startTestServer(t, "max@htl-braunau.at;a\n");

  const response = await fetch(`${baseUrl}/users.txt`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "max@htl-braunau.at;a\n");
});

test("Server: unbekannte Datei ergibt 404", async (t) => {
  const { baseUrl } = await startTestServer(t, "");

  const response = await fetch(`${baseUrl}/gibt-es-nicht.html`);

  assert.equal(response.status, 404);
});

test("Server: lehnt Anfragen ohne JSON ab (Schutz vor fremden Webseiten)", async (t) => {
  const { baseUrl, usersFile } = await startTestServer(t, "");

  const response = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ email: "boese@htl-braunau.at", password: "x" })
  });

  assert.equal(response.status, 415);
  assert.equal(fs.readFileSync(usersFile, "utf8"), "");
});

test("Server: zu große Anfrage ergibt 413", async (t) => {
  const { baseUrl } = await startTestServer(t, "");

  const response = await postUser(baseUrl, { email: "neu@htl-braunau.at", password: "x".repeat(2000) });

  assert.equal(response.status, 413);
});

test("Server: fehlende users.txt wird beim ersten Eintrag angelegt", async (t) => {
  const { baseUrl, usersFile } = await startTestServer(t, "");
  fs.rmSync(usersFile);

  const response = await postUser(baseUrl, { email: "neu@htl-braunau.at", password: "b" });

  assert.equal(response.status, 201);
  assert.equal(fs.readFileSync(usersFile, "utf8"), "neu@htl-braunau.at;b\n");
});

test("Server: Datei ohne Umbruch am Ende bekommt neue Zeile sauber angehängt", async (t) => {
  const { baseUrl, usersFile } = await startTestServer(t, "max@htl-braunau.at;a");

  await postUser(baseUrl, { email: "neu@htl-braunau.at", password: "b" });

  assert.equal(fs.readFileSync(usersFile, "utf8"), "max@htl-braunau.at;a\nneu@htl-braunau.at;b\n");
});
