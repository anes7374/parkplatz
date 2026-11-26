"use strict";

// Kleiner Test-Server ohne Dependency (nur eingebaute Node-Module).
// Er liefert die Seiten aus (wie Live Server) und kann zusätzlich neue
// Einträge an data/users.txt anhängen – das darf der Browser nicht selbst.
//
// Starten im Projektordner:  node server.js
// Dann im Browser öffnen:     http://localhost:8080
//
// NUR FÜR TESTS: Passwörter stehen im Klartext in der Datei, und der
// Server liefert jede Datei im Projektordner aus (auch data/users.txt).
// Darum läuft er nur auf diesem Rechner (HOST unten).
// Später ersetzt ein echtes Backend mit Datenbank diesen Server.

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const { validateNewUser, parseUsers, hasUser, buildNewUserLine } = require("./js/login-logic.js");

// 8080 statt 3000, weil 3000 oft schon von anderen Projekten belegt ist.
const PORT = 8080;
// Nur auf diesem Rechner erreichbar. Für Zugriff von anderen Geräten im
// Netz auf "0.0.0.0" ändern – dann kann aber jeder dort Einträge anlegen.
const HOST = "127.0.0.1";

const ROOT_DIR = __dirname;
const USERS_FILE = path.join(ROOT_DIR, "data", "users.txt");
const ADD_USER_PATH = "/api/users";
// Größere Anfragen werden abgelehnt (Schutz vor riesigen Uploads).
const MAX_BODY_BYTES = 1024;

// Dateiendung -> Content-Type, damit der Browser die Datei richtig versteht.
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// Macht aus dem Pfad der Anfrage (z. B. "/pages/platz.html") einen Pfad
// im Projektordner. Gibt null zurück, wenn der Pfad aus dem Ordner
// hinausführen würde (z. B. "/../../geheim.txt") oder auf versteckte
// Dateien/Ordner zeigt (z. B. "/.git/config").
function resolveStaticPath(rootDir, urlPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    return null;   // kaputte %-Kodierung
  }
  // "\0" (aus "%00") ist in Dateinamen nicht erlaubt und würde beim
  // Lesen einen Fehler auslösen.
  if (decodedPath.includes("\0")) {
    return null;
  }
  if (decodedPath.split("/").some((part) => part.startsWith("."))) {
    return null;
  }
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath;
  const fullPath = path.join(rootDir, relativePath);
  if (fullPath !== rootDir && !fullPath.startsWith(rootDir + path.sep)) {
    return null;
  }
  return fullPath;
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": CONTENT_TYPES[".json"] });
  response.end(JSON.stringify(data));
}

// Liest den Body einer Anfrage als Text. Gibt null zurück, wenn er
// größer als MAX_BODY_BYTES ist.
function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let receivedBytes = 0;
    let isTooLarge = false;
    request.on("data", (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_BODY_BYTES) {
        isTooLarge = true;   // Rest noch annehmen, aber nicht speichern
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      resolve(isTooLarge ? null : Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });
}

// Liest users.txt. Fehlt die Datei, zählt sie als leer – dann legt
// appendFile sie beim ersten Eintrag neu an.
async function readUsersText(usersFile) {
  try {
    return await fs.readFile(usersFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

// Mehrere Anfragen gleichzeitig dürfen die Datei nicht durcheinander
// schreiben. Deshalb wird jeder Schreibvorgang hinten an diese Kette
// gehängt und läuft erst, wenn der vorige fertig ist.
let writeQueue = Promise.resolve();

// Hängt den Eintrag an, wenn es die E-Mail noch nicht gibt.
// Gibt true zurück, wenn wirklich etwas geschrieben wurde.
function addUserToFile(usersFile, email, password) {
  const task = writeQueue.then(async () => {
    const text = await readUsersText(usersFile);
    if (hasUser(parseUsers(text), email)) {
      return false;
    }
    // Nur anhängen statt die ganze Datei neu schreiben: Bricht der Server
    // mittendrin ab, bleiben die alten Einträge sicher erhalten.
    await fs.appendFile(usersFile, buildNewUserLine(text, email, password), "utf8");
    return true;
  });
  // Ein Fehler soll die Kette für spätere Anfragen nicht blockieren.
  writeQueue = task.catch(() => {});
  return task;
}

async function handleAddUser(request, response, usersFile) {
  // Nur JSON annehmen: Fremde Webseiten können ohne Rückfrage des
  // Browsers nur "einfache" Anfragen (z. B. text/plain) schicken. Für
  // application/json fragt der Browser vorher beim Server nach (Preflight),
  // und das beantwortet dieser Server nicht – so bleiben fremde Seiten draußen.
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.startsWith("application/json")) {
    sendJson(response, 415, { ok: false, error: "Nur JSON erlaubt" });
    return;
  }

  const body = await readBody(request);
  if (body === null) {
    sendJson(response, 413, { ok: false, error: "Anfrage zu groß" });
    return;
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    sendJson(response, 400, { ok: false, error: "Ungültige Anfrage" });
    return;
  }

  if (data === null || typeof data !== "object") {
    sendJson(response, 400, { ok: false, error: "Ungültige Anfrage" });
    return;
  }

  // Gleich bereinigen wie im Browser (login.js), damit "Max@…" = "max@…".
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : data.email;
  const password = data.password;

  const problem = validateNewUser(email, password);
  if (problem !== null) {
    sendJson(response, 400, { ok: false, error: problem });
    return;
  }

  const isAdded = await addUserToFile(usersFile, email, password);
  // E-Mails bewusst nicht ins Log schreiben (personenbezogene Daten).
  console.log(isAdded ? "Neuer Eintrag in users.txt gespeichert." : "Eintrag gab es schon.");
  sendJson(response, isAdded ? 201 : 200, { ok: true, isAdded });
}

async function handleStaticFile(response, rootDir, urlPath) {
  const filePath = resolveStaticPath(rootDir, urlPath);
  if (filePath === null) {
    response.writeHead(403);
    response.end("Verboten");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
    // no-store: Browser soll immer die aktuelle Datei holen (z. B. users.txt).
    response.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      response.writeHead(404);
      response.end("Nicht gefunden");
      return;
    }
    throw error;
  }
}

async function handleRequest(request, response, rootDir, usersFile) {
  let urlPath;
  try {
    urlPath = new URL(request.url, `http://${HOST}`).pathname;
  } catch {
    response.writeHead(400);
    response.end("Ungültige Adresse");
    return;
  }

  try {
    if (urlPath === ADD_USER_PATH) {
      if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, error: "Nur POST erlaubt" });
        return;
      }
      await handleAddUser(request, response, usersFile);
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end("Nicht erlaubt");
      return;
    }
    await handleStaticFile(response, rootDir, urlPath);
  } catch (error) {
    console.error("Fehler bei einer Anfrage:", error);
    if (!response.headersSent) {
      sendJson(response, 500, { ok: false, error: "Serverfehler" });
    }
  }
}

// Baut den Server. Ordner und Datei als Parameter, damit die Tests
// einen eigenen Ordner mit einer Test-users.txt verwenden können.
function createAppServer(rootDir, usersFile) {
  return http.createServer((request, response) =>
    handleRequest(request, response, rootDir, usersFile)
  );
}

// Nur starten, wenn die Datei direkt mit "node server.js" läuft –
// nicht, wenn die Tests sie mit require() laden.
if (require.main === module) {
  const server = createAppServer(ROOT_DIR, USERS_FILE);
  // Ist der Port schon belegt, deutlich melden statt still abzubrechen.
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} ist schon belegt – läuft dort ein anderer Server?`);
    } else {
      console.error("Server konnte nicht starten:", error);
    }
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    console.log(`Server läuft: http://localhost:${PORT}`);
  });
}

module.exports = { resolveStaticPath, createAppServer };
