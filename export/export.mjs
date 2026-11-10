// Liest die öffentliche Tippübersicht der Kicktipp-Runde und schreibt data.json ins Datenverzeichnis.
// Aufruf: node export/export.mjs [slug]   (sonst KICKTIPP_SLUG)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { DATA_DIR, DATA_FILE, ODDS_FILE, slug } from './config.mjs';

const SLUG = slug();
const BASE = `https://www.kicktipp.de/${SLUG}`;

const decode = s => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).trim();
const text = s => decode(s.replace(/<[^>]+>/g, ''));
const get = async url => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
};

function parseScore(html) {
  const m = html.match(/kicktipp-heim">(\d+)<.*?kicktipp-gast">(\d+)</s);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function parseKickoff(s) {
  const m = s.match(/(\d\d)\.(\d\d)\.(\d\d) (\d\d):(\d\d)/);
  return m ? `20${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00` : null;
}

function parseMatchday(html, matchday) {
  const tbl = html.match(/<table id="spielplanSpiele".*?<\/table>/s)[0];
  const matches = [...tbl.matchAll(/<tr class="clickable"[^>]*tippspielId=(\d+)">(.*?)<\/tr>/gs)].map(([, id, row]) => {
    const tds = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(m => m[1]);
    return { id, matchday, kickoff: parseKickoff(text(tds[0])), home: text(tds[1]), away: text(tds[2]), result: parseScore(tds[3]), odds: null };
  });

  const rank = html.match(/<table id="ranking".*?<\/table>/s)[0];
  const players = [];
  const tips = [];
  for (const [, pid, row] of rank.matchAll(/<tr class="clickable[^"]*teilnehmer[^"]*" data-teilnehmer-id="(\d+)"[^>]*>(.*?)<\/tr>/gs)) {
    players.push({ id: pid, name: text(row.match(/mg_name">(.*?)<\/div>/s)[1]) });
    for (const [, idx, cell] of row.matchAll(/<td class="nw \w+ ereignis ereignis(\d+)">(.*?)<\/td>/gs)) {
      const m = matches[Number(idx)];
      const tip = text(cell.replace(/<sub.*?<\/sub>/s, '')).match(/^(\d+):(\d+)$/);
      if (!m || !tip) continue;
      const p = cell.match(/<sub class="p">(\d+)<\/sub>/);
      tips.push({ player: pid, match: m.id, tip: [Number(tip[1]), Number(tip[2])], points: p ? Number(p[1]) : m.result ? 0 : null });
    }
  }
  return { matches, players, tips };
}

const first = await get(`${BASE}/tippuebersicht`);
const season = first.match(/tippsaisonId=(\d+)/)[1];
const days = Math.max(...[...first.matchAll(/spieltagIndex=(\d+)/g)].map(m => Number(m[1])));
const title = text(first.match(/<title>(.*?)<\/title>/s)[1]).split(' - ')[0];

const out = { title, slug: SLUG, fetchedAt: new Date().toISOString(), players: [], matches: [], tips: [] };
const seen = new Map();
for (let d = 1; d <= days; d++) {
  const html = await get(`${BASE}/tippuebersicht?tippsaisonId=${season}&spieltagIndex=${d}`);
  const r = parseMatchday(html, d);
  r.players.forEach(p => seen.set(p.id, p));
  out.matches.push(...r.matches);
  out.tips.push(...r.tips);
  process.stderr.write(`Spieltag ${d}/${days}: ${r.matches.length} Spiele, ${r.tips.length} Tipps\n`);
}
out.players = [...seen.values()];

// Optional: Quoten aus odds.json (erzeugt von fetch-odds.mjs oder odds-snippet.js) anhand Spieltag + Teams zuordnen
try {
  const odds = JSON.parse(await readFile(ODDS_FILE, 'utf8'));
  const byKey = new Map(odds.map(o => [`${o.matchday}|${o.home}|${o.away}`, { h: o.h, d: o.d, a: o.a }]));
  let hit = 0;
  for (const m of out.matches) {
    m.odds = byKey.get(`${m.matchday}|${m.home}|${m.away}`) ?? null;
    if (m.odds) hit++;
  }
  console.error(`Quoten: ${hit}/${out.matches.length} Spiele zugeordnet`);
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  console.error(`Keine ${ODDS_FILE} gefunden, Quoten bleiben leer`);
}
await mkdir(DATA_DIR, { recursive: true });
await writeFile(DATA_FILE, JSON.stringify(out));
console.error(`OK: ${out.players.length} Spieler, ${out.matches.length} Spiele, ${out.tips.length} Tipps`);
