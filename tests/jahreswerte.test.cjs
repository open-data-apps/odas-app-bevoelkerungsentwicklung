const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Funktionen aus app.js extrahieren (Klammerbilanz, wie teilbestand.test.cjs) und im vm ausführen.
const src = fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8");
function funktion(name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} nicht in app.js gefunden`);
  let depth = 0, end = src.indexOf(") {", start) + 2;
  for (let i = end; i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}" && --depth === 0) { end = i + 1; break; }
  }
  return src.slice(start, end);
}
const ctx = vm.createContext({});
vm.runInContext(["parseWert", "jahresWerte", "zellenText"].map(funktion).join("\n"), ctx);

// Zeilen wie in der Münchner Quelle: MONAT = "JJJJMM" bzw. "Summe", WERT als String, "NA" = noch nicht veröffentlicht.
const zeile = (jahr, monat, wert) => ({ MONATSZAHL: "X", AUSPRAEGUNG: "insgesamt", JAHR: jahr, MONAT: monat, WERT: wert });
const monate = (jahr, werte) => werte.map((w, i) => zeile(jahr, jahr + String(i + 1).padStart(2, "0"), String(w)));
const GEBORENE_2024 = [1377, 1225, 1205, 1359, 1087, 1305, 1398, 1368, 1265, 1350, 1375, 907];

test("Bewegungsthema: Summe-Zeile ist der Jahreswert, Monate werden nicht zusätzlich addiert", () => {
  const r = ctx.jahresWerte([...monate("2024", GEBORENE_2024), zeile("2024", "Summe", "15221")]);
  assert.equal(r.byJahr["2024"], 15221);
  assert.deepEqual([...r.unvollstaendig], []);
});

test("Bestandsthema ohne Summe-Zeile: Jahreswert = letzter Monatswert, nicht Summe", () => {
  const werte = Array.from({ length: 12 }, (_, i) => 100 + i);
  const r = ctx.jahresWerte(monate("2025", werte).reverse());
  assert.equal(r.byJahr["2025"], 111);
  assert.deepEqual([...r.unvollstaendig], []);
});

test("Bestandsthema 2026 nur Jan–Mär (Rest NA): letzter gültiger Monat, als unvollständig markiert", () => {
  const r = ctx.jahresWerte([
    ...monate("2025", Array.from({ length: 12 }, (_, i) => 100 + i)),
    ...monate("2026", [200, 201, 202, "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA"]),
  ]);
  assert.equal(r.byJahr["2026"], 202);
  assert.deepEqual([...r.unvollstaendig], ["2026"]);
});

test("Bewegungsthema 2026 mit Summe-Zeile nur aus Januar: Summe, aber unvollständig", () => {
  const r = ctx.jahresWerte([
    ...monate("2024", GEBORENE_2024), zeile("2024", "Summe", "15221"),
    ...monate("2026", [1176, "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA"]),
    zeile("2026", "Summe", "1176"),
  ]);
  assert.equal(r.byJahr["2024"], 15221);
  assert.equal(r.byJahr["2026"], 1176);
  assert.deepEqual([...r.unvollstaendig], ["2026"]);
});

test("Bewegungsthema, laufendes Jahr noch ohne Summe-Zeile: Monate summiert, unvollständig", () => {
  const r = ctx.jahresWerte([
    ...monate("2024", GEBORENE_2024), zeile("2024", "Summe", "15221"),
    ...monate("2026", [1176, 1100, 1200]),
  ]);
  assert.equal(r.byJahr["2026"], 3476);
  assert.deepEqual([...r.unvollstaendig], ["2026"]);
});

test("Tabelle: Zahlen de-DE, NA als –, Jahr/Monat unverändert", () => {
  assert.equal(ctx.zellenText("WERT", "15221"), "15.221");
  assert.equal(ctx.zellenText("VERAEND_VORMONAT_PROZENT", "-0.32"), "-0,32");
  assert.equal(ctx.zellenText("WERT", "NA"), "–");
  assert.equal(ctx.zellenText("VORJAHRESWERT", "NA"), "–");
  assert.equal(ctx.zellenText("JAHR", "2024"), "2024");
  assert.equal(ctx.zellenText("MONAT", "202401"), "202401");
  assert.equal(ctx.zellenText("WERT", ""), "");
  assert.equal(ctx.zellenText("AUSPRAEGUNG", "insgesamt"), "insgesamt");
});
