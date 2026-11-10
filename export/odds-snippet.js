// Holt die Wettquoten (1/X/2) aller Spieltage von der eingeloggten Tippabgabe und lädt odds.json herunter.
// Nutzung: auf https://www.kicktipp.de/<runde>/tippabgabe öffnen (eingeloggt), Skript in die Konsole einfügen.
(async () => {
  const parseOdds = (doc, matchday) => [...doc.querySelectorAll('#tippabgabeSpiele tbody tr')].flatMap(tr => {
    const tds = tr.querySelectorAll('td');
    const q = cls => parseFloat(tr.querySelector(`.quote${cls} .quote-text`)?.textContent);
    const [h, d, a] = [q('heim'), q('remis'), q('gast')];
    if (tds.length < 3 || [h, d, a].some(Number.isNaN)) return [];
    return [{ matchday, home: tds[1].textContent.trim(), away: tds[2].textContent.trim(), h, d, a }];
  });

  // --- run ---
  const slug = location.pathname.split('/')[1];
  const season = document.querySelector('input[name=tippsaisonId]')?.value;
  const days = Math.max(...[...document.querySelectorAll('a[href*="spieltagIndex="]')].map(a => +new URL(a.href).searchParams.get('spieltagIndex')));
  const out = [];
  for (let day = 1; day <= days; day++) {
    const res = await fetch(`/${slug}/tippabgabe?tippsaisonId=${season}&spieltagIndex=${day}`, { credentials: 'same-origin' });
    if (res.url.includes('/profil/login')) throw new Error('Nicht eingeloggt');
    const odds = parseOdds(new DOMParser().parseFromString(await res.text(), 'text/html'), day);
    out.push(...odds);
    console.log(`Spieltag ${day}/${days}: ${odds.length} Quoten`);
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
  a.download = 'odds.json';
  a.click();
  console.log(`Fertig: ${out.length} Spiele mit Quoten`);
})();
