# CLAUDE.md

Kicktipp Viewer: Scraper (Node, ESM, ohne Dependencies) + Auswertungsseite für eine Kicktipp-Tipprunde, betrieben als Docker-Container. Öffentliches Repo: README auf Englisch, Code-Kommentare/UI/Logs auf Deutsch. Siehe [README.md](README.md).

## Befehle
- `npm run update` – Quoten (Login) + Export; `node export/export.mjs` – nur Export ohne Login (beide brauchen `KICKTIPP_SLUG`)
- `npm run serve` – Seite auf http://localhost:8080 ohne Aktualisierung; `npm start` – mit Aktualisierung (wie im Container)
- `npm run demo` – Seite mit erfundenen Beispieldaten (`demo/data.json`, neu erzeugen mit `node demo/generate.mjs`)
- `docker compose up -d --build` – Container lokal (Konfiguration in `.env`, siehe `.env.example`)
- Image: GitHub Action `.github/workflows/docker.yml` → `ghcr.io/knaufk/kicktipp-viewer` (`main`, Tags `v*`)
- Es gibt keine Tests, keinen Linter und keinen Build.

## Konventionen
- Reines ESM (`.mjs`), nur Node-Builtins und globales `fetch`; keine npm-Pakete hinzufügen.
- `public/index.html` ist eine einzelne Datei (Inline-CSS/JS, Vanilla); lädt `data.json` relativ per `fetch`. Keine externen Ressourcen (DSGVO): Chart.js und Schriften liegen in `public/vendor/`.
- Nichts Rundenspezifisches hart kodieren: Punkte je Kategorie kommen aus `PTS` (aus den Tipps abgelesen), Quoten sind optional (`hasOdds`).
- Keine echten Spielernamen oder Tipps ins Repo (`data/` ist ignoriert); für Beispiele `demo/` nutzen.
- Konfiguration nur über Umgebungsvariablen (`export/config.mjs`); neue Variablen in `.env.example` und README dokumentieren.
- Code-Kommentare, UI-Texte und Logs sind auf Deutsch – beibehalten; README auf Englisch.
- Kicktipp wird per Regex auf dem HTML geparst (`export.mjs`, `odds-parse.mjs`); bei Layoutänderungen dort anpassen. `odds-snippet.js` dupliziert die Parser-Logik für die Browser-Konsole – bei Änderungen beide pflegen.

## Wichtige Details
- Anstoßzeiten sind Berliner Ortszeit ohne Zeitzone. Immer `export/time.mjs` importieren (setzt `TZ=Europe/Berlin`), bevor `new Date(kickoff)` genutzt wird.
- Spielende wird als Anstoß + 120 min geschätzt (`MATCH_MINUTES`); `auto-update.mjs` fragt höchstens 6 h danach nach.
- `server.mjs` startet `auto-update.mjs` beim Start mit `--daily`, dann alle 15 min, und täglich ab `ODDS_HOUR` erneut mit `--daily`.
- Quoten werden über `matchday|home|away` zugeordnet (Teamnamen müssen exakt passen). Quoten angepfiffener Spiele werden eingefroren – nicht überschreiben.
- `data.json` und `odds.json` sind generierte Daten im Datenverzeichnis (`DATA_DIR`, lokal `data/`, im Container `/data`), nicht im Repo. Nicht von Hand editieren; `odds.json` lässt sich nicht neu erzeugen (Kicktipp zeigt alte Quoten nicht mehr).
- Zugangsdaten nur über `KICKTIPP_EMAIL`/`KICKTIPP_PASSWORD`. Nie ins Repo, nie in Logs oder Ausgaben schreiben.
