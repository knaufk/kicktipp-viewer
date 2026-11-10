# Kicktipp Viewer

Auswertungsseite für eine private [Kicktipp](https://www.kicktipp.de)-Tipprunde.
Ein Node-Skript holt Spiele, Ergebnisse, Tipps und Wettquoten von Kicktipp und schreibt sie nach `data.json`;
`public/index.html` (Vanilla JS, keine Build-Schritte) wertet sie aus:

- Punkte pro Spieltag
- Tippverhalten
- Wettgewinn (1 € pro Tipp) inkl. Ranking und Kumulation
- Quoten vs. Tippverteilung
- „Mut zum Risiko"

Keine Abhängigkeiten, nur Node ≥ 22. Standard-Betrieb ist ein Docker-Container, der die Seite ausliefert und die
Daten selbst aktualisiert.

## Struktur

| Pfad | Zweck |
|---|---|
| `public/` | Auslieferbare Seite: `index.html`, `favicon.svg` |
| `server.mjs` | Liefert `public/` und `data.json` aus, aktualisiert die Daten (Container-Einstiegspunkt) |
| `export/export.mjs` | Öffentliche Tippübersicht scrapen → `data.json` (kein Login) |
| `export/fetch-odds.mjs` | Mit Kicktipp-Login die Quoten aller Spieltage holen → `odds.json` |
| `export/config.mjs` | Konfiguration aus Umgebungsvariablen (Runde, Datenverzeichnis) |
| `export/odds-parse.mjs`, `export/time.mjs` | Quoten-Parser; Zeit-Helfer (Anstoßzeiten sind Europe/Berlin) |
| `export/odds-snippet.js` | Manuelle Alternative: Snippet für die Browser-Konsole auf der Tippabgabe |
| `update.mjs` | Lokal: Quoten holen, dann exportieren |
| `auto-update.mjs` | Vom Server alle 15 min gestartet: aktualisiert nur, wenn nötig |
| `Dockerfile`, `compose.yaml`, `.env.example` | Container-Image und Beispielkonfiguration |

## Docker

```bash
cp .env.example .env        # mindestens KICKTIPP_SLUG eintragen
docker compose up -d        # http://localhost:8080
```

Der Container holt beim Start einmal alle Daten, prüft danach alle 15 min, ob ein Spiel (Anstoß + 2 h) zu Ende ist und
noch kein Ergebnis hat, und aktualisiert täglich ab `ODDS_HOUR` (Berliner Zeit) alles inkl. Quoten. Die Daten liegen im
Volume `/data` (`data.json`, `odds.json`). Konfiguration über Umgebungsvariablen:

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `KICKTIPP_SLUG` | ja | Runde aus der URL, `https://www.kicktipp.de/<slug>/` |
| `KICKTIPP_EMAIL`, `KICKTIPP_PASSWORD` | nein | Login eines Mitglieds, nur für die Wettquoten |
| `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` | nein | Passwortschutz der Seite (leer = keiner) |
| `PORT` | nein | Port im Container (Standard `8080`) |
| `ODDS_HOUR` | nein | Stunde der täglichen Komplettaktualisierung (Standard `6`) |

## Lokal nutzen

```bash
export KICKTIPP_SLUG=<slug>
npm run update              # fragt Kicktipp-E-Mail/Passwort ab (oder KICKTIPP_EMAIL / KICKTIPP_PASSWORD setzen)
node export/export.mjs      # nur Tipps/Ergebnisse, ohne Login
npm run serve               # nur ausliefern: http://localhost:8080
npm start                   # ausliefern + automatisch aktualisieren (wie im Container)
```

Die Daten landen in `data/` (oder `DATA_DIR`). Quoten werden beim Export per Spieltag + Teamnamen aus `odds.json`
zugeordnet. Quoten bereits angepfiffener Spiele werden eingefroren (der letzte Vor-Anpfiff-Stand bleibt).
