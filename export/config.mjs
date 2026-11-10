// Gemeinsame Konfiguration aus Umgebungsvariablen (siehe .env.example).
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Generierte Daten (data.json, odds.json); im Container ein Volume unter /data
export const DATA_DIR = resolve(process.env.DATA_DIR ?? fileURLToPath(new URL('../data', import.meta.url)));
export const DATA_FILE = resolve(DATA_DIR, 'data.json');
export const ODDS_FILE = resolve(DATA_DIR, 'odds.json');

// Runden-Slug aus der Kicktipp-URL (https://www.kicktipp.de/<slug>/); Argument hat Vorrang
export function slug() {
  const s = process.argv[2] ?? process.env.KICKTIPP_SLUG;
  if (!s) {
    console.error('FEHLER: Kicktipp-Runde fehlt (KICKTIPP_SLUG setzen oder als Argument übergeben)');
    process.exit(1);
  }
  return s;
}

export const hasLogin = () => Boolean(process.env.KICKTIPP_EMAIL && process.env.KICKTIPP_PASSWORD);

// Höflich zu Kicktipp: erkennbarer User-Agent und kurze Pause vor jeder Anfrage
export const USER_AGENT = 'kicktipp-viewer (+https://github.com/knaufk/kicktipp-viewer)';
export const pause = () => new Promise(r => setTimeout(r, 500));
