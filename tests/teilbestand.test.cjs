const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Verschachtelte Funktion aus app.js extrahieren (Klammerbilanz) und mit Stubs ausführen.
const src = fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8");
const start = src.indexOf("async function fetchAllRecordsThroughProxy(");
let depth = 0, end = src.indexOf(") {", start) + 2; // Funktionskörper, nicht der Standardparameter "() => {}"
for (let i = end; i < src.length; i++) {
  if (src[i] === "{") depth++;
  if (src[i] === "}" && --depth === 0) { end = i + 1; break; }
}
function lade(seiten) {
  let aufruf = 0;
  const ctx = vm.createContext({ configdata: {}, buildUrl: () => "u",
    fetchDatenAlsCkan: async () => seiten[Math.min(aufruf++, seiten.length - 1)] });
  vm.runInContext(src.slice(start, end), ctx);
  return ctx.fetchAllRecordsThroughProxy(2, () => {});
}
const seite = (ids, total) => ({ success: true, result: { total, fields: [], records: ids.map(id => ({ _id: id })) } });

test("bekannte Gesamtzahl, Quelle endet zu früh: Teilbestand mit Hinweis statt Fehler", async () => {
  const r = await lade([seite([1, 2], 6), seite([3, 4], 6), seite([], 6)]);
  assert.equal(r.result.records.length, 4);
  assert.match(r.result.ladeHinweis, /4 von 6/);
});
test("bekannte Gesamtzahl, wiederholte Seite: Teilbestand mit Hinweis statt Fehler", async () => {
  const r = await lade([seite([1, 2], 6), seite([1, 2], 6)]);
  assert.equal(r.result.records.length, 2);
  assert.match(r.result.ladeHinweis, /wiederholt/);
});
test("ohne geladene Datensätze bleibt es ein Fehler", async () => {
  await assert.rejects(lade([seite([], 6)]), /unvollständig/);
});
