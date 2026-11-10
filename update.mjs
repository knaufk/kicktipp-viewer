// Aktualisiert alle Daten: Quoten holen (Login), dann Spiele/Tipps exportieren und zusammenführen.
// Aufruf: node update.mjs [slug]   (sonst KICKTIPP_SLUG)
import { spawnSync } from 'node:child_process';

const slug = process.argv.slice(2);
for (const script of ['export/fetch-odds.mjs', 'export/export.mjs']) {
  const { status } = spawnSync(process.execPath, [script, ...slug], { stdio: 'inherit' });
  if (status !== 0) process.exit(status ?? 1);
}
