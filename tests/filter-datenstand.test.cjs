const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Lädt die ausgelieferte app/app.js; nur DOM-Grenzen werden gefaked.
const noop = () => {};
const c = vm.createContext({ console, window: { location: { href: "https://fixture.test/app/", pathname: "/app/" }, addEventListener: noop },
  document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [] } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8"), c);

// Zeilen wie in der Münchner Quelle: MONAT = "JJJJMM" bzw. "Summe", "NA" = noch nicht veröffentlicht.
const R = [
  { MONATSZAHL: "Altersgruppen", AUSPRAEGUNG: "Berufsschulpflichtige", MONAT: "202603", WERT: "5" },
  { MONATSZAHL: "Altersgruppen", AUSPRAEGUNG: "Berufsschulpflichtige", MONAT: "202604", WERT: "NA" },
  { MONATSZAHL: "Familienstand", AUSPRAEGUNG: "ledig", MONAT: "202512", WERT: "7" },
  { MONATSZAHL: "Familienstand", AUSPRAEGUNG: "ledig", MONAT: "Summe", WERT: "9" },
];

test("Ausprägungen passen zum Thema; Thema „Alle“ liefert alle (Live-Befund 27.10.2026)", () => {
  assert.deepEqual([...c.auspraegungenZuThema(R, "Familienstand")], ["ledig"]);
  assert.deepEqual([...c.auspraegungenZuThema(R, "")].sort(), ["Berufsschulpflichtige", "ledig"]);
});

test("Letzter veröffentlichter Monat: größter JJJJMM mit Zahlenwert, NA und Summe zählen nicht", () => {
  assert.equal(c.letzterVeroeffentlichterMonat(R), "202603");
  assert.equal(c.letzterVeroeffentlichterMonat(R.filter((r) => r.MONATSZAHL === "Familienstand")), "202512");
  assert.equal(c.letzterVeroeffentlichterMonat([]), "");
});

test("Monat wird deutsch ausgeschrieben", () => {
  assert.equal(c.formatMonat("202603"), "März 2026");
  assert.equal(c.formatMonat("202512"), "Dezember 2025");
  assert.equal(c.formatMonat("Summe"), "");
});
