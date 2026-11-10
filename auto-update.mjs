// Wird vom Server (server.mjs) alle 15 Minuten gestartet. Aktualisiert die Daten nur, wenn nötig:
//  - nach Spielende (Anstoß + 2 h) bis das Ergebnis in data.json steht: öffentlicher Export (kein Login)
//  - mit --daily (oder ohne data.json): alles; Quoten nur mit KICKTIPP_EMAIL/KICKTIPP_PASSWORD
// Aufruf: node auto-update.mjs [--daily]
import './export/time.mjs';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DATA_FILE, hasLogin } from './export/config.mjs';
import { endOf } from './export/time.mjs';

const run = script => spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], { stdio: 'inherit' }).status;

let data = null;
try { data = JSON.parse(await readFile(DATA_FILE, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; }

const daily = process.argv.includes('--daily') || !data;
const now = Date.now(), SIX_H = 6 * 3600_000;
// Spiel ist zu Ende, hat aber noch kein Ergebnis (max. 6 h lang nachfragen, z. B. bei Verlegungen)
const pending = data?.matches.filter(m => m.kickoff && !m.result && endOf(m) <= now && endOf(m) >= now - SIX_H) ?? [];

if (!daily && !pending.length) {
  console.error(`${new Date().toISOString()} nichts zu tun`);
  process.exit(0);
}
console.error(`${new Date().toISOString()} ${!data ? 'erste Aktualisierung' : daily ? 'tägliche Aktualisierung' : `${pending.length} Spiel(e) ohne Ergebnis`}`);
// Fehlschlag beim Quotenabruf (z. B. Login) blockiert den Export nicht; die alten Quoten bleiben
if (daily && hasLogin() && run('./export/fetch-odds.mjs') !== 0) console.error('Quotenabruf fehlgeschlagen, exportiere mit gespeicherten Quoten');
else if (daily && !hasLogin()) console.error('Keine Kicktipp-Zugangsdaten gesetzt, Quoten werden nicht aktualisiert');
process.exit(run('./export/export.mjs') ?? 1);
