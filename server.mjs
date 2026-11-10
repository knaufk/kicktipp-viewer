// Liefert die Seite aus (public/ + data.json aus dem Datenverzeichnis) und aktualisiert die Daten selbst:
// beim Start einmal komplett, danach alle 15 Minuten nach Bedarf, täglich ab ODDS_HOUR (Berliner Zeit) komplett.
// Aufruf: node server.mjs [--no-update]
import './export/time.mjs';
import { spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_FILE, slug } from './export/config.mjs';

const PORT = Number(process.env.PORT ?? 8080);
const ODDS_HOUR = Number(process.env.ODDS_HOUR ?? 6);
const CHECK_MINUTES = 15;
const PUBLIC = fileURLToPath(new URL('./public/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
const log = msg => console.error(`${new Date().toISOString()} ${msg}`);

// Optionale Basic Auth (sonst z. B. im vorgeschalteten Reverse Proxy)
const { BASIC_AUTH_USER: AUTH_USER, BASIC_AUTH_PASSWORD: AUTH_PASSWORD } = process.env;
const sha = s => createHash('sha256').update(s).digest();
const expected = AUTH_USER && AUTH_PASSWORD ? sha(`${AUTH_USER}:${AUTH_PASSWORD}`) : null;
const authorized = req => {
  if (!expected) return true;
  const [scheme, value] = (req.headers.authorization ?? '').split(' ');
  return scheme === 'Basic' && !!value && timingSafeEqual(sha(Buffer.from(value, 'base64').toString()), expected);
};

const server = createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { return res.writeHead(400).end(); }
  if (path === '/healthz') return res.end('ok');
  if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405).end();
  if (!authorized(req)) return res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Kicktipp Viewer"' }).end();

  const file = path === '/data.json' ? DATA_FILE : join(PUBLIC, normalize(path === '/' ? '/index.html' : path));
  if (!file.startsWith(PUBLIC) && file !== DATA_FILE) return res.writeHead(404).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' || e.code === 'EISDIR' ? 404 : 500).end();
  }
});
server.listen(PORT, () => log(`Kicktipp Viewer läuft auf Port ${PORT}`));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.close(() => process.exit(0)));

// Aktualisierung: auto-update.mjs als Kindprozess, nie zwei gleichzeitig
if (!process.argv.includes('--no-update')) {
  slug();                                          // ohne Runde gar nicht erst starten
  let running = false, lastDaily = null;
  const today = () => new Date().toLocaleDateString('sv');   // YYYY-MM-DD in Berliner Zeit
  const update = () => {
    if (running) return;
    const daily = lastDaily !== today() && (lastDaily === null || new Date().getHours() >= ODDS_HOUR);
    running = true;
    const child = spawn(process.execPath, [fileURLToPath(new URL('./auto-update.mjs', import.meta.url)), ...(daily ? ['--daily'] : [])], { stdio: 'inherit' });
    child.on('exit', code => {
      running = false;
      if (code === 0 && daily) lastDaily = today();
      if (code !== 0) log(`Aktualisierung fehlgeschlagen (Exit-Code ${code})`);
    });
  };
  update();
  setInterval(update, CHECK_MINUTES * 60_000);
}
