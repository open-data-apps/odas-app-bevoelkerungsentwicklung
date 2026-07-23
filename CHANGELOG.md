# Changelog

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
