// Meldet sich bei Kicktipp an, liest die Quoten aller Spieltage und schreibt odds.json ins Datenverzeichnis.
// Aufruf: KICKTIPP_EMAIL=... KICKTIPP_PASSWORD=... node export/fetch-odds.mjs [slug]
// Ohne Umgebungsvariablen werden E-Mail und Passwort im Terminal abgefragt.
import './time.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { parseOdds } from './odds-parse.mjs';
import { kickoffDate } from './time.mjs';
import { DATA_DIR, DATA_FILE, ODDS_FILE, slug } from './config.mjs';

const SLUG = slug();
const BASE = `https://www.kicktipp.de/${SLUG}`;

async function ask(question, hidden = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = s => rl.line.length && s.length === 1 ? rl.output.write('*') : (s.includes(question) || s === '\r\n' ? rl.output.write(s) : 0);
  const a = await rl.question(question);
  rl.close();
  return a;
}

const email = process.env.KICKTIPP_EMAIL ?? await ask('Kicktipp-E-Mail: ');
const password = process.env.KICKTIPP_PASSWORD ?? await ask('Passwort: ', true);

const jar = new Map();
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
const store = res => res.headers.getSetCookie().forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); });
const get = async url => {
  const res = await fetch(url, { headers: { cookie: cookie() }, redirect: 'manual' });
  store(res);
  return res;
};

const login = await fetch(`${BASE}/profil/loginaction`, {
  method: 'POST', redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie() },
  body: new URLSearchParams({ kennung: email, passwort: password }),
});
store(login);
if (!jar.size || (login.headers.get('location') ?? '').includes('login')) throw new Error('Login fehlgeschlagen (E-Mail/Passwort prüfen)');

const first = await get(`${BASE}/tippabgabe`);
if (first.status >= 300) throw new Error(`Nicht eingeloggt (Weiterleitung nach ${first.headers.get('location')})`);
const firstHtml = await first.text();
const season = firstHtml.match(/tippsaisonId=(\d+)/)[1];
const days = Math.max(...[...firstHtml.matchAll(/spieltagIndex=(\d+)/g)].map(m => Number(m[1])));

const out = [];
for (let d = 1; d <= days; d++) {
  const res = await get(`${BASE}/tippabgabe?tippsaisonId=${season}&spieltagIndex=${d}`);
  if (res.status >= 300) throw new Error(`Spieltag ${d}: Weiterleitung nach ${res.headers.get('location')}`);
  const odds = parseOdds(await res.text(), d);
  out.push(...odds);
  process.stderr.write(`Spieltag ${d}/${days}: ${odds.length} Quoten\n`);
}
// Quoten bereits angepfiffener Spiele einfrieren: der zuletzt gespeicherte Vor-Anpfiff-Stand bleibt erhalten.
// Kicktipp zeigt auf vergangenen Spieltagen keine Quoten mehr, daher alte Einträge immer übernehmen.
const readJson = async (file, fallback) => {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
};
const key = o => `${o.matchday}|${o.home}|${o.away}`;
const matches = (await readJson(DATA_FILE, { matches: [] })).matches;
const started = new Set(matches.filter(m => m.kickoff && kickoffDate(m) <= new Date()).map(key));
const old = new Map((await readJson(ODDS_FILE, [])).map(o => [key(o), o]));
const all = new Map(old);
for (const o of out) if (!(started.has(key(o)) && old.has(key(o)))) all.set(key(o), o);
const merged = [...all.values()].sort((a, b) => a.matchday - b.matchday);
await mkdir(DATA_DIR, { recursive: true });
await writeFile(ODDS_FILE, JSON.stringify(merged, null, 1));
console.error(`OK: ${merged.length} Spiele mit Quoten in ${ODDS_FILE}`);
