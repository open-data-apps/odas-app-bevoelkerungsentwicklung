# Changelog

## 1.1.0 - 2026-04-21

### Added

- Datenabruf über lokalen Proxy-Endpunkt `/odp-data` per POST.
- Proxy-`path` wird robust mit `encodeURIComponent(...)` übertragen.

### Fixed

- Verarbeitung von unterschiedlichen Proxy-Antworten: direkte CKAN-JSON-Antworten und JSON im `content`-Wrapper.

### Changed

- Metadaten in `app-package.json` auf die aktuelle App-Funktion angepasst.
