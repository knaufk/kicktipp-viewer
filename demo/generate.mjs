// Erzeugt erfundene Beispieldaten (demo/data.json) zum Ausprobieren der Seite ohne eigene Kicktipp-Runde.
// Deterministisch (fester Seed): Teams, Spieler, Tipps, Ergebnisse und Quoten sind ausgedacht.
// Aufruf: node demo/generate.mjs
import { writeFile } from 'node:fs/promises';

let seed = 20262027;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const poisson = l => { let k = 0, p = Math.exp(-l), s = p; const u = rnd(); while (u > s && k < 10) s += p *= l / ++k; return k; };
const pmf = (l, k) => Math.exp(-l) * l ** k / [...Array(k).keys()].reduce((f, i) => f * (i + 1), 1);

const TEAMS = ['FC Nordhafen', 'SV Bergstadt', 'Eintracht Talheim', 'Union Seefeld', 'TSV Moorbach', 'VfB Lindenau',
  'Borussia Kreuzberg', 'SC Rheinau', 'Fortuna Waldeck', 'Arminia Hohenfels', 'Kickers Ostwald', 'SpVgg Auenthal',
  'Hertha Brückenau', 'Alemannia Steinach', 'Viktoria Kleefeld', 'Rot-Weiß Felsberg', 'Germania Sandkamp', '1. FC Wiesengrund'];
const strength = new Map(TEAMS.map(t => [t, 0.6 + rnd() * 0.9]));
const PLAYERS = ['Anna', 'Ben', 'Clara', 'Deniz', 'Emil', 'Fatma', 'Gregor', 'Hanna', 'Ilias', 'Jule', 'Kai', 'Lotte']
  .map((name, i) => ({ id: String(1001 + i), name, home: rnd() * 0.6 - 0.2, draw: rnd() * 0.5, goals: rnd() * 1.2 - 0.3, noise: 0.4 + rnd() * 0.9, skip: rnd() * 0.06 }));

const PLAYED = 11;                                     // Spieltage mit Ergebnis; der nächste ist schon getippt
const sign = ([h, a]) => Math.sign(h - a);
const cat = (tip, res) => tip[0] === res[0] && tip[1] === res[1] ? 4 : sign(tip) !== sign(res) ? 0 : sign(tip) && tip[0] - tip[1] === res[0] - res[1] ? 3 : 2;

// Doppelrunde nach dem Kreisverfahren: 17 Hinrunden-Spieltage, Rückrunde gespiegelt
const rounds = [];
const ring = [...TEAMS];
for (let r = 0; r < TEAMS.length - 1; r++) {
  rounds.push([...Array(TEAMS.length / 2).keys()].map(i => r % 2 ? [ring[TEAMS.length - 1 - i], ring[i]] : [ring[i], ring[TEAMS.length - 1 - i]]));
  ring.splice(1, 0, ring.pop());
}
rounds.push(...rounds.map(r => r.map(([h, a]) => [a, h])));

const out = { title: 'Demo-Liga 2026/2027', slug: 'demo', fetchedAt: '2026-11-08T21:00:00.000Z', players: PLAYERS.map(({ id, name }) => ({ id, name })), matches: [], tips: [] };
const start = new Date('2026-08-22T15:30:00Z');
rounds.forEach((games, r) => games.forEach(([home, away], i) => {
  const day = new Date(start.getTime() + r * 7 * 86400_000 + (i === 0 ? -1 : i === 8 ? 1 : 0) * 86400_000);
  const kickoff = day.toISOString().slice(0, 10) + (i === 0 ? 'T20:30:00' : i === 8 ? 'T17:30:00' : 'T15:30:00');
  const lh = 1.45 * strength.get(home) / strength.get(away) ** 0.8, la = 1.15 * strength.get(away) / strength.get(home) ** 0.8;
  // Quoten aus den Poisson-Wahrscheinlichkeiten mit 7 % Marge
  let ph = 0, pd = 0, pa = 0;
  for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) { const p = pmf(lh, x) * pmf(la, y); if (x > y) ph += p; else if (x === y) pd += p; else pa += p; }
  const q = p => Math.round(100 / (p * 1.07)) / 100;
  const m = { id: String(5000 + r * 9 + i), matchday: r + 1, kickoff, home, away, result: r < PLAYED ? [poisson(lh), poisson(la)] : null, odds: r <= PLAYED ? { h: q(ph), d: q(pd), a: q(pa) } : null };
  out.matches.push(m);
  if (r > PLAYED) return;
  for (const p of PLAYERS) {
    if (rnd() < p.skip) continue;
    const g = l => Math.max(0, Math.round(l + p.goals / 2 + (rnd() - 0.5) * 2 * p.noise));
    let tip = [g(lh + p.home), g(la - p.home)];
    if (Math.abs(tip[0] - tip[1]) <= 1 && rnd() < p.draw) tip = [Math.min(...tip), Math.min(...tip)];
    out.tips.push({ player: p.id, match: m.id, tip, points: m.result ? cat(tip, m.result) : null });
  }
}));

await writeFile(new URL('./data.json', import.meta.url), JSON.stringify(out));
console.error(`OK: ${out.players.length} Spieler, ${out.matches.length} Spiele, ${out.tips.length} Tipps`);
