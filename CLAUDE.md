# CLAUDE.md – ITSE-Projekt

Kategorie: Schule
Team: <allein | Namen>
Abgabe / Deadline: <Datum oder –>
Git: ja

Web-Projekt im Fach ITSE: Anmeldeseite plus Parkplatzverwaltung für die HTL Braunau. Aktuell ein reiner Frontend-Prototyp (HTML/CSS/JS), noch ohne Backend.

## Tech-Stack

- Sprache: HTML, CSS, JavaScript (ohne Build-Schritt, ohne Framework)
- Plattform: Browser über den Test-Server `node server.js` → http://localhost:8080 (nur eingebaute Node-Module). Er liefert die Seiten aus und hängt neue Anmeldungen an `data/users.txt` an. Live Server/Doppelklick: Anmeldung geht, gespeichert wird nichts.
- Tests: Node.js-Testrunner (`node:test`, in Node eingebaut, keine Dependency)
- Erlaubte Dependencies: keine. Keine neue ohne Rücksprache.

## Architektur

```
index.html                 Einstieg: Anmeldung (bleibt im Hauptordner)
server.js                  Test-Server: liefert Dateien aus, POST /api/users hängt an data/users.txt an
pages/parkplatz.html       Übersicht aller Parkplätze
pages/platz.html           Detailseite eines Platzes (platz.html?id=P5)
css/login.css              Aussehen der Anmeldung
css/parkplatz.css          Aussehen von Übersicht und Detailseite
js/login.js                Anmeldung, leitet nach Erfolg weiter
js/login-logic.js          liest data/users.txt aus und prüft E-Mail + Passwort, ohne DOM
data/users.txt             Test-Anmeldedaten (email;passwort), nur für Tests
js/parking-logic.js        reine Logik (zählen, reservieren, freigeben, Lage), ohne DOM
js/week-logic.js           Kalenderwochen (ISO 8601) berechnen und anzeigen, ohne DOM
js/parking-common.js       Einstellungen, Speicher, Login-Prüfung (für beide Unterseiten)
js/parkplatz.js            Übersicht
js/platz.js                Detailseite
assets/                    Hintergrundbild (.psd = Quelldatei)
tests/                     Tests für js/parking-logic.js, js/week-logic.js, js/login-logic.js und server.js
docs/                      Projektdoku
```

Regeln:
- Relative Pfade in JS (z. B. `location.href`) zählen ab der HTML-Seite, nicht ab der JS-Datei.
- Logik ohne DOM-Zugriff gehört in `js/parking-logic.js`, damit sie testbar bleibt.
- Daten liegen vorerst nur im Browser: angemeldete E-Mail in `sessionStorage`, Reservierungen pro Kalenderwoche in `localStorage` (`itse.parkingReservationsByWeek`, Woche in der Adresse `?week=2026-W48`). Später ersetzt ein Backend beides.

## Bauen, Testen

```bash
# Server starten (http://localhost:8080)
node server.js

# Tests
node --test
```

## Projektspezifische Regeln

- UI-Sprache: Deutsch. Kommentare im Bestand sind Deutsch, daher in diesem Projekt ebenfalls Deutsch; Bezeichner Englisch.
- Login prüft testweise gegen `data/users.txt` (Klartext, im Browser lesbar) – nur für Tests, später ersetzt ein Backend die Datei. Prüfung derzeit aus (`IS_LOGIN_CHECK_ENABLED = false` in `js/login.js`); neue E-Mails speichert dann `server.js` in `data/users.txt`.
