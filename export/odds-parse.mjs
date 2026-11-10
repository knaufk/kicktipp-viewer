// Parser für die Quoten auf der Kicktipp-Tippabgabe (#tippabgabeSpiele).
const decode = s => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).trim();
const text = s => decode(s.replace(/<[^>]+>/g, ''));

export function parseOdds(html, matchday) {
  const tbl = html.match(/<table id="tippabgabeSpiele".*?<\/table>/s)?.[0] ?? '';
  return [...tbl.matchAll(/<tr>(.*?)<\/tr>/gs)].flatMap(([, row]) => {
    const tds = [...row.matchAll(/<td[^>]*>/g)].map((m, i, all) => row.slice(m.index, all[i + 1]?.index));
    const q = k => parseFloat(row.match(new RegExp(`class="quote quote${k}".*?quote-text">([\\d.]+)<`, 's'))?.[1]);
    const [h, d, a] = [q('heim'), q('remis'), q('gast')];
    if (tds.length < 3 || [h, d, a].some(Number.isNaN)) return [];
    return [{ matchday, home: text(tds[1]), away: text(tds[2]), h, d, a }];
  });
}
