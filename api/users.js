"use strict";

// Vercel Serverless Function: ersetzt online den lokalen server.js.
// POST /api/users  -> haengt {email, password, ts} an eine Redis-Liste "users".
// Verbindung ueber REDIS_URL (von der Upstash-Integration gesetzt).
// Nur eingebaute Node-Module (tls/net/url), keine npm-Dependency (Projektregel).
//
// NUR FUER TESTS: Passwoerter werden im Klartext gespeichert, damit ihr sie
// zum Pruefen seht. Fuer den echten Betrieb spaeter als Hash ablegen.

const tls = require("node:tls");
const net = require("node:net");

const LIST_KEY = "users";
const MAX_FIELD = 256;        // laengere Eingaben ablehnen (Schutz)
const TIMEOUT_MS = 5000;

// Baut ein Redis-Kommando im RESP-Format (z. B. RPUSH users <wert>).
function encodeCommand(args) {
  let out = `*${args.length}\r\n`;
  for (const arg of args) {
    const str = String(arg);
    out += `$${Buffer.byteLength(str)}\r\n${str}\r\n`;
  }
  return out;
}

// Verbindet sich mit Redis, authentifiziert und fuehrt die Kommandos
// nacheinander aus. Liest pro Kommando genau eine Antwortzeile
// (AUTH -> +OK, RPUSH -> :<anzahl>), was fuer Schreibzugriffe reicht.
function runRedis(redisUrl, commands) {
  return new Promise((resolve, reject) => {
    const u = new URL(redisUrl);
    const useTls = u.protocol === "rediss:";
    const port = Number(u.port) || 6379;
    const options = { host: u.hostname, port };

    const socket = useTls
      ? tls.connect({ ...options, servername: u.hostname })
      : net.connect(options);

    let buffer = "";
    const waiters = [];          // offene Antworten (FIFO)
    let settled = false;

    const done = (err, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      err ? reject(err) : resolve(value);
    };

    const timer = setTimeout(() => done(new Error("Zeitueberschreitung")), TIMEOUT_MS);

    // Zerlegt den Puffer in vollstaendige Zeilen und ordnet sie den
    // wartenden Kommandos zu.
    const drain = () => {
      let idx;
      while ((idx = buffer.indexOf("\r\n")) !== -1 && waiters.length) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const w = waiters.shift();
        line.startsWith("-") ? w.reject(new Error(line.slice(1))) : w.resolve(line);
      }
    };

    const sendCommand = (args) =>
      new Promise((res, rej) => {
        waiters.push({ resolve: res, reject: rej });
        socket.write(encodeCommand(args));
        drain();
      });

    socket.on("data", (chunk) => { buffer += chunk.toString("utf8"); drain(); });
    socket.on("error", (err) => done(err));
    socket.on("close", () => { if (!settled) done(new Error("Verbindung geschlossen")); });

    const start = async () => {
      try {
        const password = decodeURIComponent(u.password || "");
        const username = decodeURIComponent(u.username || "");
        if (password) {
          // Mit Benutzername (ACL) oder nur Passwort authentifizieren.
          await sendCommand(username ? ["AUTH", username, password] : ["AUTH", password]);
        }
        let last;
        for (const cmd of commands) last = await sendCommand(cmd);
        clearTimeout(timer);
        done(null, last);
      } catch (err) {
        clearTimeout(timer);
        done(err);
      }
    };

    socket.on(useTls ? "secureConnect" : "connect", start);
  });
}

module.exports = async (req, res) => {
  // Nur POST ist erlaubt. Die Liste gibt es bewusst nicht oeffentlich zu
  // lesen (sonst waeren die Passwoerter wieder fuer jeden im Netz sichtbar).
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Nur POST erlaubt" });
    return;
  }

  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  if (!redisUrl) {
    res.status(500).json({ error: "Datenbank ist nicht verbunden" });
    return;
  }

  // Body einlesen (Vercel parst JSON meist selbst; sonst manuell).
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { body = JSON.parse(raw); } catch { body = null; }
  }

  const email = body && typeof body.email === "string" ? body.email.trim() : "";
  const password = body && typeof body.password === "string" ? body.password : "";

  if (!email || !password || email.length > MAX_FIELD || password.length > MAX_FIELD) {
    res.status(400).json({ error: "E-Mail oder Passwort fehlt/zu lang" });
    return;
  }

  const entry = JSON.stringify({ email, password, ts: new Date().toISOString() });

  try {
    await runRedis(redisUrl, [["RPUSH", LIST_KEY, entry]]);
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Speichern fehlgeschlagen:", error.message);
    res.status(500).json({ error: "Speichern fehlgeschlagen" });
  }
};
