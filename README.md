# Bevölkerungsentwicklung - App für den Open Data App-Store (ODAS)

Interaktive Visualisierung von Monatszahlen zur Bevölkerung für den [Open Data App Store](https://open-data-app-store.de/). Entspricht der [Open Data App-Spezifikation](https://open-data-apps.github.io/open-data-app-docs/open-data-app-spezifikation/). Mehr unter https://github.com/open-data-apps

---

## Funktionen

![Screenshot der App 1](assets/Desktop_Screenshot_1.png)

![Screenshot der App 2](assets/Desktop_Screenshot_2.png)

Single Page Application mit Logo, Menü, Impressum/Datenschutz/Kontakt-Seiten und Fußzeile. Die Konfiguration wird vom ODAS geladen. Inhalte:

- Filter nach Thema (`MONATSZAHL`), Ausprägung (`AUSPRAEGUNG`) und Jahr (`JAHR`)
- Tabellarische Anzeige der CKAN-Datensätze (max. 500 Zeilen in der Tabelle)
- Linienchart mit Jahressummen für `WERT`
- Robuster Datenabruf über lokalen Proxy-Endpunkt `/odp-data`

---

## Datenformat

Unterstützt CKAN Datastore JSON (API `datastore_search`, inkl. `resource_id`).

---

## Kompatible Datensätze

Datensätze mit folgenden Kernfeldern (weitere Felder sind zulässig):

| Feldname      | Beschreibung                       |
| ------------- | ---------------------------------- |
| `MONATSZAHL`  | Thema/Kategorie                    |
| `AUSPRAEGUNG` | Ausprägung innerhalb der Kategorie |
| `JAHR`        | Jahr der Beobachtung               |
| `WERT`        | Numerischer Wert (für Chart-Summe) |

---

## Entwicklung

**Voraussetzungen:** Docker / Docker Compose, Make

```bash
make build up
```

App läuft auf http://localhost:8089 (Konfiguration wird lokal geladen).

### Wichtige Dateien

| Datei                      | Beschreibung                                                                  |
| -------------------------- | ----------------------------------------------------------------------------- |
| `app/app.js`               | Hauptlogik: Proxy-Load, Filter, Tabellenrendering und Chart.js-Visualisierung |
| `app-package.json`         | App-Metadaten und Instanz-Konfigurationsfelder für den ODAS                   |
| `odas-config/config.json`  | Lokale Konfiguration für die Entwicklung                                      |
| `assets/odas-app-icon.svg` | App-Icon                                                                      |

---

## Konfiguration (Instanz)

| Parameter     | Beschreibung                                                            | Pflicht |
| ------------- | ----------------------------------------------------------------------- | ------- |
| `apiurl`      | CKAN Datastore-URL (inkl. `resource_id`), wird über `/odp-data` geladen | ja      |
| `urlDaten`    | URL zur Datensatzseite im Open Data Portal                              | ja      |
| `titel`       | Anzeigetitel im Inhaltsbereich                                          | ja      |
| `seitentitel` | Browser-Tab-Titel                                                       | ja      |
| `icon`        | App-Icon in der Kopfzeile                                               | ja      |
| `sprache`     | Sprache der App (aktuell `de`)                                          | ja      |

---

## Autor

© 2026, Ondics GmbH
