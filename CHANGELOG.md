# Changelog


## 1.23.0 - 2026-08-17
- `fetchOdasJson()` wirft jetzt bei nicht-JSON-Antworten (CSV, HTML, leerer Body) eine sprechende Konfigurationsfehlermeldung statt der rohen `JSON.parse`-Parserfehlermeldung (F-66)
- `urlDaten` zeigte auf einen nicht mehr existierenden Host (`offenedaten.esslingen.de`/`open-data-esslingen.de`, NXDOMAIN) bzw. auf den Platzhalter `.../testdaten` (HTTP 404) — jetzt auf die reale Datensatz-Landingpage der tatsächlich konfigurierten `apiurl`-Quelle verweisend, live per HTTP-Abruf verifiziert (F-67)

## 1.22.0 - 2026-08-17
- **CHG:** `instanz-config`-`category`-Vokabular auf Deutsch umgestellt (`allgemein`, `beschreibung`, `datenherkunft`, `kontakt-rechtliches`, `sonstiges`); die entfallenen Kategorien `metrics` und `advanced` wurden auf `beschreibung` bzw. `sonstiges` verteilt

## 1.21.0 - 2026-08-13
- FIX: Lifecycle-Ressourcen-Cleanup (F-57): iterierbare `beCleanups`-Map-Registry je Container plus top-level `onPageLeave()` räumen die erzeugte Chart-Instanz beim Seitenwechsel ab; verspätete Fetch-Erfolge/-Fehler nach dem Leave sind über einen `disposed`-Guard wirkungslos (kein Cache-Schreiben/Rendern, keine Fehleranzeige)

## 1.20.0 - 2026-08-12
- FIX: `app/index.html` auf den Template-Stand (F-47): Datei byte-gleich aus `oda-generic` übernommen — gültiges HTML, deutsche ARIA-Labels, Footer im Body; Titel und Fußzeile bleiben Platzhalter und werden zur Laufzeit aus der Instanz-Config überschrieben

## 1.19.0 - 2026-08-11
- FIX: Wiederholungsseite wird vor dem Einfügen erkannt — der seenPageKeys-Fallback in `fetchAllRecordsThroughProxy` prüft die Seitenwiederholung jetzt vor `allRecords.push(...)`, keine doppelten Records bei einem offset-ignorierenden CKAN-Endpunkt ohne `total`

## 1.18.0 - 2026-08-11
- FIX: CSV-Parsing auf PapaParse 5.4.1 umgestellt (F-40): `parseCsvToCkan` nutzt jetzt `Papa.parse` mit `header: true`, `skipEmptyLines: "greedy"` und Delimiter-Auto-Detect; gequotete Felder mit Zeilenumbruch werden RFC-4180-konform geparst; PapaParse-Fehler werden als sichtbarer Fehler gemeldet statt still übergangen; `toCkanShape` bleibt unverändert, die Alt-Helfer `parseDelimitedLine`/`detectDelimiter` entfallen

## 1.17.0 - 2026-08-07
- FIX: Bootstrap-Ziele der Methodik-Box instanzeindeutig machen (F-32) — `data-bs-target`, `aria-controls` und die Panel-ID der Methodik-Box tragen jetzt eine Instanzkennung (`-i1`, `-i2`, …); zwei App-Instanzen auf einer Seite kollidieren beim Auf- und Zuklappen der Methodik-Box nicht mehr

## 1.16.0 - 2026-08-07
- FIX: Fensterglobale `window._odasChart` durch Instanz-State ersetzt (Bestandsfehler) — das Chart.js-Objekt liegt jetzt in einer Closure-Variable pro App-Instanz statt dokumentweit; mehrere App-Instanzen auf einer Seite zerstören sich gegenseitig nicht mehr und kollidieren auch nicht mit anderen Apps

## 1.15.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.14.0 - 2026-08-06
- FIX: Base auf Template oda-generic 1.6.0 vereinheitlicht (Hook renderPageOverride)

## 1.13.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.12.0 - 2026-08-04
- FIX: Bootstrap, Chart.js vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.11.0 - 2026-08-04
- FIX: Chart.js-Version vereinheitlicht auf 4.4.9 (vorher uneinheitlich gepinnt oder ganz ungepinnt, laedt bei jedem Aufruf die neueste Version) — Voraussetzung fuer das geplante Vendoring (F-07 Teil 2)

## 1.10.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)

## 1.9.0 - 2026-07-31
- DOC: Standalone-Anleitung individualisiert (F-10) - `proxyAktiv` ist auf `nein` zu
  **setzen** statt zu belassen; Austausch der Datenquelle als eigener Schritt ergaenzt
- DOC: Standalone als eingeschraenkt gekennzeichnet

## 1.8.0 - 2026-07-31
- CHG: Platzhalter-Titel in der lokalen Konfiguration durch den echten App-Titel ersetzt

## 1.7.0 - 2026-07-31
- FIX: Quelldaten und string-Config-Werte werden vor der HTML-Ausgabe maskiert (F-08)
- CHG: toter Konfigurationsschlüssel lizenz entfernt (F-17)
- CHG: brandingCSS und brandingCSSFile als Base-Abhängigkeiten deklariert und lokal gespiegelt (F-17)
- CHG: format.typ von "String" auf v1-sicheres "string" korrigiert (F-18)
- CHG: dropdown-Default auf Feldebene verschoben statt in format (F-18)
- CHG: daten.schema auf assets/schema.json gesetzt (F-20)

## 1.6.0 - 2026-07-30

- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; `handleRouting()` wird `await`et und besitzt einen Fehlerpfad. Bisher blieb die Seite bei einem Fehler im Seitenaufbau stumm leer
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschliessenden Schraegstrich nicht mehr das letzte Verzeichnis ab; die Konfiguration wird auch unter `.../app` gefunden
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu (`setupSamePageLinks()`) - das Logo fuehrt damit aus Unteransichten zurueck zur Startseite
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0; app-spezifisches Aufraeumen laeuft ueber den neuen Hook `onPageLeave(page)` in `app/app.js`
- **FIX:** Der Pfad zur Branding-CSS wird jetzt relativ zum App-Verzeichnis aufgeloest (`../assets/branding.css`); bisher wurde die Datei beim lokalen Test unterhalb von `app/` gesucht und deshalb nicht gefunden

## 1.5.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)
- **FIX:** Startseiten-Renderer wird nun `await`et; bei asynchronen Apps erscheint kein kurzzeitiges `[object Promise]` in `#main-content`

## 1.4.0 - 2026-07-23

- **ENH:** Datenabruf auf den Schalter `proxyAktiv` umgestellt; direkte Abrufe sind der Standard, der ODAS-Proxy wird nur noch bei `ja` verwendet
- **ENH:** Einfachen Standalone-Betrieb hinter Traefik mit derselben `odas-config/config.json` wie in der Entwicklung ergänzt
- **ENH:** Traefik-Anbindung auf das externe Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` festgelegt
- **FIX:** Proxy-Basispfad funktioniert jetzt auch bei URLs mit `index.html`; der Ziel-Pfad wird URL-kodiert
- **FIX:** Raten-Schleife über fünf Proxy-Kandidaten und zwei HTTP-Methoden entfernt
- **DOC:** `proxyAktiv` bleibt auf `ja` voreingestellt, weil opendata.muenchen.de keinen CORS-Header sendet; Standalone-Betrieb erfordert eine CORS-freigegebene Datenquelle
- **DOC:** Start über `STANDALONE=true make up` dokumentiert

## 1.1.0 - 2026-04-21

### Added

- Datenabruf über lokalen Proxy-Endpunkt `/odp-data` per POST.
- Proxy-`path` wird robust mit `encodeURIComponent(...)` übertragen.

### Fixed

- Verarbeitung von unterschiedlichen Proxy-Antworten: direkte CKAN-JSON-Antworten und JSON im `content`-Wrapper.

### Changed

- Metadaten in `app-package.json` auf die aktuelle App-Funktion angepasst.
