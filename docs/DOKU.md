# ITSE-Projekt – Dokumentation

Kategorie: Schule · Team: allein · Stand: 2026-11-26

<!-- Wird automatisch von ~/Programming/Claude/scripts/token_stats.py gefüllt (Stop-Hook). Nicht von Hand bearbeiten. -->
<!-- TOKENS:START -->
## Tokenverbrauch

_Automatisch aktualisiert · Stand 2026-11-26 09:53 · 12 Sitzung(en) · 49 Prompts · 399 Anfragen an das Modell_

| Kennzahl | Tokens | Kosten | Bedeutung |
|---|---:|---:|---|
| **Aktueller Kontext** | 200.333 | – | So viel Text liest Claude derzeit pro Anfrage (Verlauf + Regeln + Dateien) |
| **Neu gelesen** | 966.175 | $ 6,78 | Text, der zum ersten Mal verarbeitet wurde (Prompts, Dateien, Befehlsausgaben) |
| **Geschrieben** | 386.955 | $ 7,67 | Antworten, Code und Denken von Claude |
| Wiederholt gelesen (Cache) | 64.814.315 | $ 24,21 | Bisheriger Verlauf, bei jeder Anfrage erneut gelesen – sehr günstig (5–10 % des Input-Preises) |
| **Gesamt** | 66.167.445 | **$ 38,66** | Token-Summe wird vom Cache dominiert, die Kosten nicht |

_Kosten = API-Listenpreise laut `scripts/prices.json`. Mit einem Claude-Abo (Pro/Max) wird nicht pro Token abgerechnet – dann zeigt der Wert, was die Nutzung über die API kosten würde._
_Achtung: keine Preise für claude-haiku-5-5 – in `prices.json` ergänzen, sonst sind die Kosten zu niedrig._

### Pro Prompt (letzte 10 von 49)

| Zeit | Prompt | Anfragen | Neu gelesen | Geschrieben | Cache | Kontext danach |
|---|---|---:|---:|---:|---:|---:|
| 11-26 09:17 | [Request interrupted by user] | 0 | 0 | 0 | 0 | 0 |
| 11-26 09:18 | Liegt nicht an der datei. Ich kann es im Ter… | 1 | 56 | 952 | 137,1 k | 137,1 k |
| 11-26 09:36 | [Image #1] Bitte bei der Anmeldung das noch… | 6 | 7,8 k | 4,9 k | 850,2 k | 145,9 k |
| 11-26 09:37 | Nein das ist falsch. Es sollte nicht über di… | 4 | 3,3 k | 3,6 k | 591,5 k | 150,1 k |
| 11-26 09:38 | Den Block ein bisschen länger machen. Es sol… | 2 | 1,4 k | 934 | 301,1 k | 151,6 k |
| 11-26 09:41 | Einträge werden nicht im txt File gespeichert | 3 | 1,9 k | 1,8 k | 456,4 k | 153,5 k |
| 11-26 09:47 | Mache bitte auch noch, dass bei der seite ei… | 18 | 37,6 k | 21,7 k | 3,07 Mio. | 191,8 k |
| 11-26 09:51 | Project: /Users/jonas/Programming/VS Code/IT… | 5 | 28,1 k | 3,7 k | 90,7 k | 28,1 k |
| 11-26 09:51 | Project path: /Users/jonas/Programming/VS Co… | 8 | 35,3 k | 8,1 k | 181,4 k | 35,3 k |
| 11-26 09:52 | Die Belegung sollte sich ein bisschen veränd… | 4 | 8,5 k | 7,6 k | 777,0 k | 200,3 k |
<!-- TOKENS:END -->

<!-- Dauerhafte Doku. Beschreibt den aktuellen Zustand, wird nach jeder Änderung aktualisiert. Verlauf steht in ~/Programming/Doku/. -->

## Zweck

Web-Projekt im Fach ITSE: Anmeldeseite plus Parkplatzverwaltung für die HTL Braunau. Aktuell ein klickbarer Frontend-Prototyp (HTML/CSS/JavaScript) mit einem kleinen Test-Server (`server.js`, Node.js, nur Built-in-Module). Die Anmeldung prüft E-Mail und Passwort gegen Testzugänge in `data/users.txt`; neue Anmeldungen werden vom Test-Server in dieselbe Datei geschrieben.

## Aktueller Stand

- **Fertig:** Anmeldung mit HTL-Braunau-Logo und Kontaktdaten der Schule (graues Feld unten in der Anmelde-Karte: Adresse, Telefon, E-Mail) (zwei Schritte: E-Mail, Passwort) führt nach Erfolg auf die Übersicht. Übersicht als Lageplan nach Luftbild: senkrechte Reihe A links (liegende Kacheln) mit Eingang statt A10–A12, rechts drei waagrechte Doppelreihen B/C, D/E, F/G mit Baumstreifen dazwischen (ca. 110 Plätze, Nummern wie „C4“), Bauminseln als Lücken, Belegung realistisch: beim Eingang und an den Reihen-Anfängen dicht, nach außen leerer. Für Handy optimiert (Detailkarte passt, Button voll breit, Liste untereinander). Klick auf einen Platz öffnet die Detailseite (Status, Bereich, Lage, Hinweis), dort reservieren bzw. freigeben (nach dem Reservieren Hinweis auf die Bodenmarkierung); maximal ein Platz pro Person. Nur helles Design. Ordnerstruktur `pages/`, `css/`, `js/`, `assets/`. Kalenderwoche auf der Übersicht (ISO 8601, „KW 48 · 23.11.–29.11.2026“) mit ‹ › zum Blättern; Reservierungen gelten pro Woche, eine Person hat höchstens einen Platz pro Woche; die Vergangenheit lässt sich nicht anzeigen. Anmeldung funktioniert nach Abmelden und erneutem Anmelden (Button wird beim Zurückkehren wieder aktiviert). Userdaten werden im Browser gespeichert.
- **In Arbeit:** Anmeldung über `data/users.txt` mit Test-Server (`node server.js`, Branch `feat/login-textfile`, noch nicht committet). `node --test`: 102 Tests grün.
- **Als Nächstes:** Entscheidung über ein Backend, echte Parkplatzdaten der HTL Braunau.

## Karte

<!-- Einstiegspunkt für Claude (Information Hiding): pro Bereich eine Zeile. Knapp halten – Details gehören in docs/bereiche/<bereich>.md. -->

| Bereich | Zweck | Dateien / Ordner | Schnittstelle nach außen | Detail-Doku | Hängt ab von |
|---|---|---|---|---|---|
| Anmeldung | Zweistufige Anmeldeseite, prüft gegen Testzugänge, unbekannte E-Mails gehen an den Test-Server, leitet nach Erfolg auf die Übersicht | `index.html`, `css/login.css`, `js/login.js`, `js/login-logic.js`, `data/users.txt`, `assets/` | `goToParkingPage()` leitet nach `pages/parkplatz.html` weiter; `js/login-logic.js`: `parseUsers`, `isLoginValid`, `hasUser`, `isValidEmail`, `validateNewUser` | – | – |
| Test-Server | Liefert die Seiten aus und nimmt neue Anmeldungen entgegen, hängt sie an `data/users.txt` an (Schreibwarteschlange, nur localhost) | `server.js`, `data/` | `GET` Dateien (Seiten, `data/users.txt`); `POST /api/users` mit `{email, password}` → 201 neu angelegt / 200 schon vorhanden / 400 ungültig / 413 zu groß / 415 kein JSON (Schutz vor fremden Webseiten) | – | Anmeldung (`js/login-logic.js`) |
| Parkplatz-Logik | Zählen, reservieren, freigeben, Lage berechnen – ohne DOM, testbar | `js/parking-logic.js` | `buildLayout`, `listSpotIds`, `countFreeSpots`, `findSpotOfUser`, `getSpotStatus`, `reserveSpot`, `releaseSpot`, `applyFixedReservations`, `getSpotPosition` | – | – |
| Wochen-Logik | Kalenderwochen nach ISO 8601: aktuelle Woche, Schlüssel wie `2026-W48`, Montag, Wochenanzahl, Beschriftung „KW 48 · 23.11.–29.11.2026“ – ohne DOM, testbar | `js/week-logic.js` | `getIsoWeek`, `formatWeekKey`, `parseWeekKey`, `getWeekMonday`, `getWeeksInYear`, `addWeeks`, `formatWeekLabel` | – | – |
| Gemeinsamer Teil | Einstellungen (Anzahl, feste Plätze), Speicher, Login-Prüfung, obere Leiste, aktuelle/gewählte Woche (`?week=`) | `js/parking-common.js` | `requireLogin`, `logout`, `setUpTopBar`, `getCurrentWeekKey`, `getSelectedWeekKey`, `loadReservations(weekKey)`, `saveReservations(weekKey, reservations)`, Konstanten | – | Parkplatz-Logik, Wochen-Logik |
| Übersicht | Raster aller Plätze der gewählten Woche, Wochenwechsel mit ‹ › (nicht vor die aktuelle Woche), jeder Platz verlinkt auf die Detailseite | `pages/parkplatz.html`, `js/parkplatz.js`, `css/parkplatz.css` | Seite `pages/parkplatz.html?week=2026-W48` (Parameter `week` optional, sonst aktuelle Woche) | – | Gemeinsamer Teil |
| Detailseite | Infos zu einem Platz für die gewählte Woche, reservieren/freigeben, Zurück-Link behält die Woche | `pages/platz.html`, `js/platz.js`, `css/parkplatz.css` | Seite `pages/platz.html?id=P5&week=2026-W48`, schreibt den Speicher der Woche | – | Gemeinsamer Teil |
| Tests | Prüft die Parkplatz-Logik, die Wochen-Logik (`tests/week-logic.test.js`), die Anmeldeprüfung (`js/login-logic.js`), die Validierung neuer Nutzer und den Test-Server (`tests/server.test.js`, mit temporärem Ordner) | `tests/` | `node --test` | – | Parkplatz-Logik, Wochen-Logik, Anmeldung, Test-Server |

Die Anmeldung speichert die angemeldete E-Mail in `sessionStorage` (Schlüssel `itse.currentUser`). Die Parkplatzseite speichert Reservierungen pro Kalenderwoche in `localStorage` (Schlüssel `itse.parkingReservationsByWeek`, Format: `{ "2026-W48": { "P5": "name@domain" } }` – Woche → Platz-ID → E-Mail). Der frühere Schlüssel `itse.parkingReservations` wird nicht mehr gelesen. Die Plätze stehen als Lageplan (senkrechte Reihe A + waagrechte Doppelreihen B/C, D/E, F/G) in `ROW_SEGMENTS`, `SIDE_ROW` und `PARKING_BANDS`.

## Bedienung

- Starten: `node server.js` im Projektordner, dann http://localhost:8080 im Browser öffnen. Nur von diesem Computer erreichbar. Nicht per Doppelklick (`file://`) und nicht über Live Server – dort geht die Anmeldung, aber nichts wird gespeichert.
- Anmelden: E-Mail und Passwort wie in `data/users.txt` (Testzugänge, eine Zeile je Konto: `email;passwort`, `#` für Kommentare).
- **Prüfung derzeit ausgeschaltet:** `IS_LOGIN_CHECK_ENABLED = false` in `js/login.js` – jedes Passwort wird akzeptiert. Zum Einschalten auf `true` setzen.
- **Neue Einträge speichern:** Meldet sich eine E-Mail an, die noch nicht in `data/users.txt` steht, schickt die Seite sie an den Test-Server (`POST /api/users`). Der hängt `email;passwort` an `data/users.txt` an, sofern die E-Mail neu ist. Gültig sind eine E-Mail im Format `name@domain`, begrenzte Länge, kein `;` und keine Zeilenumbrüche. Nur bei laufendem `node server.js`.
- Kalenderwoche: Auf der Übersicht mit ‹ › blättern; die aktuelle Woche ist die früheste auswählbare. Die Woche steht in der Adresse (`?week=2026-W48`).
- Tests: `node --test` (Node.js, keine Dependency).

## Wichtige Entscheidungen

| Datum | Entscheidung | Grund |
|---|---|---|
| 2026-11-16 | Userdaten nur im Browser speichern: E-Mail in `sessionStorage`, Reservierungen in `localStorage` | Klickbarer Prototyp ohne Backend; später ersetzt ein Backend beides |
| 2026-11-16 | Logik ohne DOM-Zugriff in `parking-logic.js` | Testbar mit `node:test`, ohne Browser |
| 2026-11-16 | Maximal ein Parkplatz pro Person | Vorgabe des Prototyps, damit eine Person nicht mehrere Plätze blockiert |
| 2026-11-16 | Keine Dependencies, kein Build-Schritt | Schulprojekt, einfach zu erklären und zu starten |
| 2026-11-16 | 5 Plätze fest belegt (`FIXED_RESERVATIONS` in `js/parking-common.js`), werden bei jedem Laden über die gespeicherten Reservierungen gelegt | Wunsch Jonas: Beispieldaten, damit nicht alles frei ist; niemand kann sie freigeben |
| 2026-11-26 | Belegung durch andere pro Kalenderwoche ausgewürfelt: `OCCUPANCY_RULES` (Gruppen mit Wahrscheinlichkeit, nahe Eingang höher) in `js/parking-common.js`, Zufall mit Startwert = Wochenschlüssel (`pickOccupiedSpots` in `js/parking-logic.js`); ersetzt `FIXED_RESERVATIONS` | Wunsch Jonas: Belegung soll sich beim Wochenwechsel etwas ändern; gleiche Woche bleibt beim Neuladen gleich |
| 2026-11-16 | Lageplan nach Luftbild: senkrechte Reihe A links (`SIDE_ROW`, liegende Kacheln), rechts waagrechte Doppelreihen B/C, D/E, F/G (`PARKING_BANDS`) mit Baumstreifen; Reihen/Blöcke in `ROW_SEGMENTS` (`js/parking-common.js`) | Wunsch Jonas: genau wie im Foto – A senkrecht, Rest waagrecht; Zahlen pro Block sind Schätzwerte und in `ROW_SEGMENTS` leicht korrigierbar |
| 2026-11-16 | Nur helles Design, kein Dunkelmodus | Wunsch Jonas; weicht bewusst von DESIGN.md (hell + dunkel) ab |
| 2026-11-16 | Reservieren nur auf der Detailseite, Plätze in der Übersicht sind Links | Wunsch Jonas: Klick auf Platz zeigt eine einfache Infoseite |
| 2026-11-26 | Testanmeldung über Klartextdatei `data/users.txt`, per `fetch` geladen; allgemeine Fehlermeldung ohne Hinweis auf den Server | Jonas möchte Testzugangsdaten in einer Textdatei; nur für Tests, später ersetzt ein Backend die Datei |
| 2026-11-26 | Eigener Test-Server (`server.js`, nur Built-in-Module) statt Live Server; neue Anmeldungen werden in `data/users.txt` auf dem Server geschrieben | Jonas will neue Einträge in der Datei auf dem Server; der Browser kann keine Dateien schreiben, der Download-Weg wurde abgelehnt |
| 2026-11-26 | Reservierungen pro Kalenderwoche (ISO 8601), gewählte Woche in der Adresse (`?week=`), Wechsel mit ‹ › | Jonas möchte zwischen Wochen wechseln können; die Woche in der URL bleibt beim Zurück-Link und beim Neuladen erhalten |
| 2026-11-26 | Keine Woche vor der aktuellen anzeigen oder bearbeiten | Vergangene Reservierungen sollen nicht verändert werden können |
| 2026-11-16 | Ordner `pages/`, `css/`, `js/`, `assets/`; `index.html` bleibt im Hauptordner | Übersichtlichkeit; Einstieg über `index.html` bleibt gleich |
| 2026-11-16 | Cache-Busting (`?v=…`) an JS/CSS in `pages/`; Detailkarte startet versteckt + `try/catch` mit „Seite neu laden“-Hinweis | Browser lud nach Umbauten alte JS-Dateien gemischt → leere Detailkarte |

## Bekannte Probleme / Einschränkungen

- Kein Backend: Reservierungen sind nur im jeweiligen Browser sichtbar, nicht geräteübergreifend.
- Reservierungen aus der Zeit vor der Wochen-Umstellung (Schlüssel `itse.parkingReservations`) werden nicht übernommen und sind nicht mehr sichtbar.
- Passwörter im Klartext in `data/users.txt`, für jeden im Browser lesbar – nur für Tests.
- Test-Server: Wer den Server erreicht, kann Einträge in `data/users.txt` anhängen. Standardmäßig nur von localhost erreichbar; nicht ins Netz stellen.
- Login geht nicht per Doppelklick (`file://`) und speichert über Live Server nichts; nur über `node server.js`.
- Anzahl und Lage der Parkplätze der HTL Braunau sind unbekannt, die 20 Plätze sind Beispieldaten.
