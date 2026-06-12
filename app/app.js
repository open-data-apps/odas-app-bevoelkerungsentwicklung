/*
 * Bevölkerungsentwicklung
 * Quelle: Statistisches Amt München via opendata.muenchen.de
 * Lizenz: Datenlizenz Deutschland Namensnennung 2.0 (dl-by-de/2.0)
 *
 * Spalten: MONATSZAHL, AUSPRAEGUNG, JAHR, MONAT, WERT,
 *          VORJAHRESWERT, VERAEND_VORMONAT_PROZENT,
 *          VERAEND_VORJAHRESMONAT_PROZENT, ZWOELF_MONATE_MITTELWERT
 *
 * @param {Object}      configdata              – Konfigurationsdaten der App
 * @param {HTMLElement} enclosingHtmlDivElement – Ziel-Container
 * @returns {null}
 */

// ── Hilfsfunktion: Pfad + Query aus einer URL extrahieren ──────────────────
function extractPathFromUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch (e) {
    return url;
  }
}

// ── Hilfsfunktion: Ist ein String JSON? ───────────────────────────────────
function looksLikeJson(text) {
  const t = String(text).trim();
  return t.startsWith("{") || t.startsWith("[");
}

// ── CSV-Parser (Fallback falls Proxy CSV liefert) ──────────────────────────
function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((v) => String(v).trim());
}

function detectDelimiter(headerLine) {
  const candidates = [",", ";", "\t", "|"];
  let best = null,
    bestCount = -1;
  candidates.forEach((d) => {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  });
  return bestCount > 0 ? best : null;
}

function toCkanShape(records, headerNames = []) {
  const fieldSet = new Set();
  headerNames.forEach((h) => {
    if (String(h).trim()) fieldSet.add(String(h).trim());
  });
  records.forEach((row) => {
    if (row && typeof row === "object")
      Object.keys(row).forEach((k) => fieldSet.add(k));
  });
  return {
    success: true,
    result: { records, fields: [...fieldSet].map((id) => ({ id })) },
  };
}

function parseCsvToCkan(text) {
  const cleaned = String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!cleaned) return toCkanShape([]);
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return toCkanShape([]);
  const delimiter = detectDelimiter(lines[0]);
  if (!delimiter) throw new Error("Proxy-Inhalt ist kein erkennbares CSV.");
  const headers = parseDelimitedLine(lines[0], delimiter).map((h) => h.trim());
  if (!headers.length || headers.every((h) => !h.length))
    throw new Error("CSV-Kopfzeile konnte nicht gelesen werden.");
  if (lines.length === 1) return toCkanShape([], headers);
  const records = lines.slice(1).map((line) => {
    const cells = parseDelimitedLine(line, delimiter);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    return row;
  });
  return toCkanShape(records, headers);
}

function normalizeAsCkanPayload(data) {
  if (!data) throw new Error("Leere Proxy-Antwort.");
  if (Array.isArray(data)) return toCkanShape(data);
  if (typeof data !== "object")
    throw new Error("Proxy-Antwort hat ungültiges Format.");
  // Bereits CKAN-Form mit result.records
  if (data.result && Array.isArray(data.result.records)) {
    return {
      success: typeof data.success === "boolean" ? data.success : true,
      result: data.result,
    };
  }
  if (Array.isArray(data.records)) return toCkanShape(data.records);
  return data;
}

// ── Proxy-Antwort parsen ──────────────────────────────────────────────────
// Der ODAS-Proxy wrappt die Antwort in { content: "...", contentType: "..." }
// Wir entpacken und normalisieren auf CKAN-Shape.
function parseProxyResponse(responseText) {
  const trimmed = String(responseText).trim();
  if (!trimmed) throw new Error("Leere Proxy-Antwort.");

  if (looksLikeJson(trimmed)) {
    let proxyData;
    try {
      proxyData = JSON.parse(trimmed);
    } catch {
      throw new Error("Proxy-Antwort ist kein gültiges JSON.");
    }

    // Fall 1: Proxy gibt { content: ..., contentType: ... }
    if ("content" in proxyData) {
      // content ist bereits ein Objekt (Proxy hat JSON geparst)
      if (typeof proxyData.content === "object" && proxyData.content !== null) {
        return normalizeAsCkanPayload(proxyData.content);
      }
      // content ist ein String
      if (typeof proxyData.content === "string") {
        const contentType = String(proxyData.contentType || "").toLowerCase();
        const contentText = proxyData.content;
        if (contentType.includes("csv") || !looksLikeJson(contentText)) {
          return parseCsvToCkan(contentText);
        }
        try {
          return normalizeAsCkanPayload(JSON.parse(contentText));
        } catch {
          throw new Error("Proxy-Inhalt ist weder gültiges JSON noch CSV.");
        }
      }
    }

    // Fall 2: Proxy gibt direktes CKAN-JSON (kein content-Wrapper)
    return normalizeAsCkanPayload(proxyData);
  }

  // Fall 3: Proxy gibt reinen Text zurück → als CSV versuchen
  return parseCsvToCkan(trimmed);
}

// ── Proxy-Fetch mit mehreren Kandidaten (wie realtimedataview) ─────────────
async function fetchJsonThroughProxy(url) {
  // App-Basispfad ermitteln (ohne index.html / trailing slash)
  const appBasePath = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : window.location.pathname.replace(/\/[^/]*$/, "/");

  const pathOnly = extractPathFromUrl(url); // z.B. /api/3/action/datastore_search?...
  const encodedFull = encodeURIComponent(url); // vollständige URL
  const encodedPath = encodeURIComponent(pathOnly); // nur Pfad

  // Proxy-Kandidaten — identisch zum realtimedataview-Pattern
  const proxyCandidates = [
    `${appBasePath}odp-data?path=${encodedFull}`,
    `${appBasePath}odp-data?path=${encodedPath}`,
    `odp-data?path=${encodedFull}`,
    `odp-data?path=${encodedPath}`,
    `${window.location.origin}/odp-data?path=${encodedFull}`,
  ];

  const uniqueCandidates = [...new Set(proxyCandidates)];
  const attempts = [];

  for (const endpoint of uniqueCandidates) {
    for (const method of ["POST", "GET"]) {
      try {
        const response = await fetch(endpoint, {
          method,
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const responseText = await response.text();
        return parseProxyResponse(responseText);
      } catch (error) {
        attempts.push(`${method} ${endpoint}: ${error.message}`);
      }
    }
  }

  throw new Error("Proxy-Aufruf fehlgeschlagen.\n" + attempts.join("\n"));
}

// ── Haupt-App-Funktion ────────────────────────────────────────────────────
function app(configdata = {}, enclosingHtmlDivElement) {
  const apiurl = (configdata.apiurl || "").trim();
  const titel = configdata.titel || "Bevölkerungsentwicklung";
  const PAGE_SIZE = 25;

  const preferredFieldOrder = [
    "MONATSZAHL",
    "AUSPRAEGUNG",
    "JAHR",
    "MONAT",
    "WERT",
    "VORJAHRESWERT",
    "VERAEND_VORMONAT_PROZENT",
    "VERAEND_VORJAHRESMONAT_PROZENT",
    "ZWOELF_MONATE_MITTELWERT",
  ];

  const fieldLabels = {
    MONATSZAHL: "Thema",
    AUSPRAEGUNG: "Ausprägung",
    JAHR: "Jahr",
    MONAT: "Monat",
    WERT: "Wert",
    VORJAHRESWERT: "Vorjahreswert",
    VERAEND_VORMONAT_PROZENT: "Veränd. zum Vormonat (%)",
    VERAEND_VORJAHRESMONAT_PROZENT: "Veränd. zum Vorjahresmonat (%)",
    ZWOELF_MONATE_MITTELWERT: "12-Monats-Mittelwert",
  };

  function toColumnLabel(fieldName) {
    if (fieldLabels[fieldName]) return fieldLabels[fieldName];
    return String(fieldName)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  function getVisibleFields(allFields) {
    const withoutInternal = allFields.filter((f) => f !== "_id");
    const ordered = preferredFieldOrder.filter((f) =>
      withoutInternal.includes(f),
    );
    const remaining = withoutInternal.filter(
      (f) => !preferredFieldOrder.includes(f),
    );
    return [...ordered, ...remaining];
  }

  function updateLoadProgress({ loaded = 0, total = null, pages = 0 }) {
    const statusEl = enclosingHtmlDivElement.querySelector("#odas-load-status");
    const barEl = enclosingHtmlDivElement.querySelector("#odas-load-bar");
    const barLabelEl = enclosingHtmlDivElement.querySelector(
      "#odas-load-bar-label",
    );
    if (!statusEl || !barEl || !barLabelEl) return;

    const loadedText = loaded.toLocaleString("de-DE");

    if (typeof total === "number" && total > 0) {
      const percent = Math.max(
        0,
        Math.min(100, Math.round((loaded / total) * 100)),
      );
      const totalText = total.toLocaleString("de-DE");
      barEl.classList.remove("progress-bar-striped", "progress-bar-animated");
      barEl.style.width = `${percent}%`;
      barEl.setAttribute("aria-valuenow", String(percent));
      barLabelEl.textContent = `${percent}%`;
      statusEl.textContent = `Lade Datensätze: ${loadedText} von ${totalText} (${pages} Seiten)`;
      return;
    }

    barEl.classList.add("progress-bar-striped", "progress-bar-animated");
    barEl.style.width = loaded > 0 ? "100%" : "0%";
    barEl.setAttribute("aria-valuenow", loaded > 0 ? "100" : "0");
    barLabelEl.textContent = `${loadedText}`;
    statusEl.textContent = `Lade Datensätze: ${loadedText} geladen (${pages} Seiten)`;
  }

  if (!apiurl) {
    enclosingHtmlDivElement.innerHTML =
      '<div class="alert alert-warning m-3">Keine API-URL konfiguriert.</div>';
    return null;
  }

  // Baut die Lade-URL mit Paginierung
  function buildUrl(limit = 5000, offset = 0) {
    try {
      const u = new URL(apiurl);
      u.searchParams.set("limit", String(limit));
      u.searchParams.set("offset", String(offset));
      return u.toString();
    } catch {
      const cleaned = apiurl
        .replace(/([?&])limit=[^&]*/g, "$1")
        .replace(/([?&])offset=[^&]*/g, "$1")
        .replace(/[?&]$/, "");
      const sep = cleaned.includes("?") ? "&" : "?";
      return `${cleaned}${sep}limit=${limit}&offset=${offset}`;
    }
  }

  // Lädt alle Seiten aus CKAN (offset/limit), bis alle Datensätze geholt sind.
  async function fetchAllRecordsThroughProxy(
    batchSize = 5000,
    onProgress = () => {},
  ) {
    const allRecords = [];
    let allFields = [];
    let offset = 0;
    let total = null;
    let pages = 0;
    const seenPageKeys = new Set();

    onProgress({ loaded: 0, total: null, pages: 0 });

    while (true) {
      const json = await fetchJsonThroughProxy(buildUrl(batchSize, offset));
      if (!json.success) throw new Error("CKAN API Fehler.");

      const result = json.result || {};
      const pageRecords = Array.isArray(result.records) ? result.records : [];
      const pageFields = Array.isArray(result.fields) ? result.fields : [];

      if (!allFields.length && pageFields.length) {
        allFields = pageFields;
      }
      if (typeof result.total === "number" && Number.isFinite(result.total)) {
        total = result.total;
      }

      if (!pageRecords.length) break;

      allRecords.push(...pageRecords);
      offset += pageRecords.length;
      pages += 1;

      onProgress({
        loaded: allRecords.length,
        total,
        pages,
      });

      if (total !== null && offset >= total) break;

      // Fallback, falls ein Endpunkt offset ignoriert und immer dieselbe Seite liefert.
      if (total === null) {
        const first = pageRecords[0] || {};
        const last = pageRecords[pageRecords.length - 1] || {};
        const pageKey = `${pageRecords.length}:${JSON.stringify(first)}:${JSON.stringify(last)}`;
        if (seenPageKeys.has(pageKey)) break;
        seenPageKeys.add(pageKey);
      }

      if (pages > 10000) {
        throw new Error("Zu viele Seiten beim Laden der Daten.");
      }
    }

    return {
      success: true,
      result: {
        records: allRecords,
        fields: allFields,
        total: total ?? allRecords.length,
      },
    };
  }

  // ── Grundgerüst rendern ────────────────────────────────────────────────
  enclosingHtmlDivElement.innerHTML = `
    <div class="container-fluid py-3">
      <h2 class="mb-1">${titel}</h2>
      <p class="text-muted small mb-3">
        Quelle: Statistisches Amt München &mdash;
        <a href="https://opendata.muenchen.de/dataset/monatszahlen-bevoelkerung"
           target="_blank" rel="noopener">opendata.muenchen.de</a> &mdash;
        Lizenz: <a href="https://www.govdata.de/dl-de/by-2-0"
           target="_blank" rel="noopener">dl-by-de/2.0</a>
      </p>

      <div class="row g-2 mb-3">
        <div class="col-auto">
          <label class="form-label mb-0 small">Thema</label>
          <select id="odas-filter-thema" class="form-select form-select-sm">
            <option value="">Alle</option>
          </select>
        </div>
        <div class="col-auto">
          <label class="form-label mb-0 small">Ausprägung</label>
          <select id="odas-filter-ausp" class="form-select form-select-sm">
            <option value="">Alle</option>
          </select>
        </div>
        <div class="col-auto">
          <label class="form-label mb-0 small">Jahr</label>
          <select id="odas-filter-jahr" class="form-select form-select-sm">
            <option value="">Alle</option>
          </select>
        </div>
      </div>

      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <canvas id="odas-chart" height="80"></canvas>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div id="odas-table-wrap">
            <div class="p-4">
              <div class="small text-muted mb-2" id="odas-load-status">Lade Datensätze: 0 geladen (0 Seiten)</div>
              <div class="progress" role="progressbar" aria-label="Ladefortschritt Datensätze" aria-valuemin="0" aria-valuemax="100">
                <div id="odas-load-bar" class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%" aria-valuenow="0">
                  <span id="odas-load-bar-label">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p class="text-muted small mt-2" id="odas-count"></p>
    </div>`;

  function processRecords(json) {
    const records = json.result.records;
    const allFields = json.result.fields
      .map((f) => f.id)
      .filter((f) => f !== "_full_text");
    const visibleFields = getVisibleFields(allFields);
    let currentPage = 1;

    if (!records || !records.length) {
      enclosingHtmlDivElement.querySelector("#odas-table-wrap").innerHTML =
        '<p class="p-3 text-muted">Keine Datensätze gefunden.</p>';
      return;
    }

    // Unique-Werte für Filter
    function uniqueSorted(vals) {
      return [...new Set(vals)].sort((a, b) => {
        const na = Number(a),
          nb = Number(b);
        return !isNaN(na) && !isNaN(nb)
          ? na - nb
          : String(a).localeCompare(String(b), "de");
      });
    }
    function fillSelect(id, vals) {
      const sel = enclosingHtmlDivElement.querySelector(id);
      if (!sel) return;
      uniqueSorted(vals).forEach((v) => {
        const o = document.createElement("option");
        o.value = o.textContent = v;
        sel.appendChild(o);
      });
    }

    // Vor dem Befüllen die alten Optionen entfernen (außer der ersten "Alle" Option)
    ["#odas-filter-thema", "#odas-filter-ausp", "#odas-filter-jahr"].forEach((id) => {
      const sel = enclosingHtmlDivElement.querySelector(id);
      if (sel) {
        while (sel.options.length > 1) {
          sel.remove(1);
        }
      }
    });

    fillSelect(
      "#odas-filter-thema",
      records.map((r) => r["MONATSZAHL"]),
    );
    fillSelect(
      "#odas-filter-ausp",
      records.map((r) => r["AUSPRAEGUNG"]),
    );
    fillSelect(
      "#odas-filter-jahr",
      records.map((r) => r["JAHR"]),
    );

    // ── Render-Funktion ────────────────────────────────────────────────
    function render(data) {
      const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
      currentPage = Math.min(Math.max(currentPage, 1), totalPages);
      const pageStart = (currentPage - 1) * PAGE_SIZE;
      const pageData = data.slice(pageStart, pageStart + PAGE_SIZE);

      // Tabelle
      const header = visibleFields
        .map(
          (f) =>
            `<th class="text-nowrap" title="${f}">${toColumnLabel(f)}</th>`,
        )
        .join("");
      const rows = pageData
        .map(
          (r) =>
            "<tr>" +
            visibleFields
              .map((f) => `<td title="${r[f] ?? ""}">${r[f] ?? ""}</td>`)
              .join("") +
            "</tr>",
        )
        .join("");

      enclosingHtmlDivElement.querySelector("#odas-table-wrap").innerHTML = `
        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center px-3 pt-3 pb-2">
          <div class="small text-muted">Zeige ${data.length === 0 ? 0 : pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, data.length)} von ${data.length} Datensätzen</div>
          <div class="btn-group btn-group-sm" role="group" aria-label="Tabellen-Paginierung">
            <button class="btn btn-outline-secondary" id="odas-prev-page" ${currentPage === 1 ? "disabled" : ""}>Zurück</button>
            <button class="btn btn-outline-secondary disabled" id="odas-page-info">Seite ${currentPage}/${totalPages}</button>
            <button class="btn btn-outline-secondary" id="odas-next-page" ${currentPage === totalPages ? "disabled" : ""}>Weiter</button>
          </div>
        </div>
        <div class="table-responsive odas-table-responsive">
          <table class="table table-sm table-hover table-striped mb-0 odas-data-table">
            <thead class="table-dark"><tr>${header}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;

      enclosingHtmlDivElement.querySelector("#odas-count").textContent =
        `${data.length} Datensätze.`;

      const prevBtn =
        enclosingHtmlDivElement.querySelector("#odas-prev-page");
      const nextBtn =
        enclosingHtmlDivElement.querySelector("#odas-next-page");
      if (prevBtn)
        prevBtn.addEventListener("click", () => {
          if (currentPage > 1) {
            currentPage -= 1;
            render(data);
          }
        });
      if (nextBtn)
        nextBtn.addEventListener("click", () => {
          if (currentPage < totalPages) {
            currentPage += 1;
            render(data);
          }
        });

      // Chart: WERT nach JAHR (Jahressumme)
      if (typeof Chart !== "undefined") {
        const byJahr = {};
        data.forEach((r) => {
          const j = r["JAHR"];
          const v = parseFloat(String(r["WERT"] || "0").replace(",", "."));
          if (j && !isNaN(v)) byJahr[j] = (byJahr[j] || 0) + v;
        });
        const jahre = Object.keys(byJahr).sort();
        const werte = jahre.map((j) => byJahr[j]);
        const canvas = enclosingHtmlDivElement.querySelector("#odas-chart");
        if (canvas) {
          if (window._odasChart) window._odasChart.destroy();
          window._odasChart = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
              labels: jahre,
              datasets: [
                {
                  label: "WERT (Jahressumme)",
                  data: werte,
                  borderColor: "rgba(13,110,253,1)",
                  backgroundColor: "rgba(13,110,253,0.1)",
                  fill: true,
                  tension: 0.3,
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                title: { display: true, text: `${titel} – Jahresverlauf` },
              },
              scales: { y: { beginAtZero: false } },
            },
          });
        }
      }
    }

    // ── Filter-Logik ───────────────────────────────────────────────────
    function getFiltered() {
      const fT =
        enclosingHtmlDivElement.querySelector("#odas-filter-thema")?.value ||
        "";
      const fA =
        enclosingHtmlDivElement.querySelector("#odas-filter-ausp")?.value ||
        "";
      const fJ =
        enclosingHtmlDivElement.querySelector("#odas-filter-jahr")?.value ||
        "";
      return records.filter(
        (r) =>
          (!fT || String(r["MONATSZAHL"]) === fT) &&
          (!fA || String(r["AUSPRAEGUNG"]) === fA) &&
          (!fJ || String(r["JAHR"]) === fJ),
      );
    }

    ["#odas-filter-thema", "#odas-filter-ausp", "#odas-filter-jahr"].forEach(
      (id) => {
        const el = enclosingHtmlDivElement.querySelector(id);
        if (el)
          el.addEventListener("change", () => {
            currentPage = 1;
            render(getFiltered());
          });
      },
    );

    // Erstmals rendern
    render(records);
  }

  // ── Daten laden ────────────────────────────────────────────────────────
  window._odas_cachedDevelopmentRecordsMap = window._odas_cachedDevelopmentRecordsMap || {};
  if (window._odas_cachedDevelopmentRecordsMap[apiurl]) {
    processRecords(window._odas_cachedDevelopmentRecordsMap[apiurl]);
  } else {
    fetchAllRecordsThroughProxy(5000, updateLoadProgress)
      .then((json) => {
        if (!json.success) throw new Error("CKAN API Fehler.");
        window._odas_cachedDevelopmentRecordsMap[apiurl] = json;
        processRecords(json);
      })
      .catch((err) => {
        const tableWrap = enclosingHtmlDivElement.querySelector("#odas-table-wrap");
        if (tableWrap) {
          tableWrap.innerHTML = `<div class="alert alert-danger m-3"><strong>Fehler:</strong> ${err.message}</div>`;
        }
      });
  }

  return null;
}

/*
 * Lädt Chart.js dynamisch in den <head>.
 * IMMER am Ende der Datei, AUSSERHALB von app().
 */
function addToHead() {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js";
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}
