"use strict";

// ===== Reine Logik für Kalenderwochen (KW) =====
// Ohne DOM und ohne Speicher – testbar mit node --test (tests/week-logic.test.js).
//
// Eine Woche wird als Text-Schlüssel gespeichert, z. B. "2026-W48".
// Zweistellige Wochennummer: So lassen sich Schlüssel einfach als Text
// vergleichen ("2026-W09" < "2026-W48" < "2027-W01").
//
// Kalenderwochen nach ISO 8601 (gilt in Österreich):
// - Die Woche beginnt am Montag.
// - KW 1 ist die Woche, in der der erste Donnerstag des Jahres liegt.
//   Deshalb kann der 29.12. schon zu KW 1 des nächsten Jahres gehören.
//
// Gerechnet wird in UTC, damit die Zeitumstellung (Sommer-/Winterzeit)
// keine Stunde verschiebt und dadurch einen falschen Tag ergibt.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const THURSDAY = 4;   // getUTCDay(): 0 = Sonntag, 1 = Montag, … 4 = Donnerstag
const WEEK_KEY_PATTERN = /^(\d{4})-W(\d{2})$/;
// Ältere Jahre ablehnen: Date deutet die Jahre 0–99 als 1900–1999.
const MIN_YEAR = 2000;

// Wochentag 1–7 mit Montag = 1 und Sonntag = 7 (statt 0).
function getIsoWeekday(utcDate) {
  return utcDate.getUTCDay() === 0 ? DAYS_PER_WEEK : utcDate.getUTCDay();
}

// Liefert { year, week } für ein Datum (z. B. new Date() = heute).
function getIsoWeek(date) {
  // Nur Jahr/Monat/Tag übernehmen, Uhrzeit weglassen.
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Zum Donnerstag derselben Woche springen: Sein Jahr ist das KW-Jahr.
  day.setUTCDate(day.getUTCDate() + THURSDAY - getIsoWeekday(day));
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.floor((day - yearStart) / MS_PER_DAY / DAYS_PER_WEEK) + 1;
  return { year: day.getUTCFullYear(), week };
}

// { year: 2026, week: 5 } -> "2026-W05"
function formatWeekKey(isoWeek) {
  return isoWeek.year + "-W" + String(isoWeek.week).padStart(2, "0");
}

// Montag (UTC, 0 Uhr) der angegebenen Woche.
function getWeekMonday(year, week) {
  // Der 4. Jänner liegt immer in KW 1 – von dort zum Montag zurückgehen.
  const january4 = new Date(Date.UTC(year, 0, 4));
  const mondayOfWeek1 = Date.UTC(year, 0, 4 - getIsoWeekday(january4) + 1);
  return new Date(mondayOfWeek1 + (week - 1) * DAYS_PER_WEEK * MS_PER_DAY);
}

// Anzahl der Wochen im Jahr: 52 oder 53. Der 28. Dezember liegt immer
// in der letzten Woche seines Jahres.
function getWeeksInYear(year) {
  return getIsoWeek(new Date(year, 11, 28)).week;
}

// "2026-W48" -> { year: 2026, week: 48 }, ungültiger Text -> null.
// Wichtig, weil der Schlüssel aus der Adresse (?week=…) kommt und
// dort beliebiger Text stehen kann.
function parseWeekKey(weekKey) {
  if (typeof weekKey !== "string") {
    return null;
  }
  const match = weekKey.match(WEEK_KEY_PATTERN);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (year < MIN_YEAR || week < 1 || week > getWeeksInYear(year)) {
    return null;
  }
  return { year, week };
}

// Woche um "delta" verschieben: +1 = nächste, -1 = vorige Woche.
// Über den Montag gerechnet, dann klappt auch der Jahreswechsel.
function addWeeks(weekKey, delta) {
  const parsed = parseWeekKey(weekKey);
  if (parsed === null) {
    throw new Error("Ungültige Kalenderwoche: " + weekKey);
  }
  const monday = getWeekMonday(parsed.year, parsed.week);
  const movedMonday = new Date(monday.getTime() + delta * DAYS_PER_WEEK * MS_PER_DAY);
  // getIsoWeek liest lokale Datumswerte – deshalb ein lokales Datum bauen.
  const localDate = new Date(
    movedMonday.getUTCFullYear(), movedMonday.getUTCMonth(), movedMonday.getUTCDate()
  );
  return formatWeekKey(getIsoWeek(localDate));
}

// Datum als "23.11." bzw. mit Jahr "29.11.2026".
function formatDay(utcDate, withYear) {
  const day = String(utcDate.getUTCDate()).padStart(2, "0");
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  return day + "." + month + "." + (withYear ? utcDate.getUTCFullYear() : "");
}

// "2026-W48" -> "KW 48 · 23.11.–29.11.2026"
function formatWeekLabel(weekKey) {
  const parsed = parseWeekKey(weekKey);
  if (parsed === null) {
    throw new Error("Ungültige Kalenderwoche: " + weekKey);
  }
  const monday = getWeekMonday(parsed.year, parsed.week);
  const sunday = new Date(monday.getTime() + (DAYS_PER_WEEK - 1) * MS_PER_DAY);
  return "KW " + parsed.week + " · " + formatDay(monday, false) + "–" + formatDay(sunday, true);
}

// Nur für die Tests in Node.js: Dort gibt es "module", im Browser nicht.
// Im Browser sind die Funktionen oben einfach global verfügbar.
if (typeof module !== "undefined") {
  module.exports = {
    getIsoWeek,
    formatWeekKey,
    getWeekMonday,
    getWeeksInYear,
    parseWeekKey,
    addWeeks,
    formatWeekLabel
  };
}
