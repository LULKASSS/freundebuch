/* Der Faden: gezeichnete Linie, an der die Einträge eines Menschen wie Anhänger hängen (Entwurf „Faden“). */
import { $, $$, esc, zustand } from './basis.js';
import { ART } from './zeichnungen.js';

const breit = () => matchMedia('(min-width: 700px)').matches;

/* Zufall mit Startwert, damit jeder Faden immer gleich gezogen ist. */
export function zufall(text) {
  let h = 1779033703 ^ text.length;
  for (const c of text) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/* Weiche Kurve durch Punkte (Catmull-Rom als Bézier), dazu Abtasten für „x an der Stelle y“. */
function segmente(p, zu = false) {
  const n = p.length, hol = (i) => (zu ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  const s = [];
  for (let i = 0; i < (zu ? n : n - 1); i++) {
    const [a, b, c, d] = [hol(i - 1), hol(i), hol(i + 1), hol(i + 2)];
    s.push([b, [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], [c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6], c]);
  }
  return s;
}
const z = (v) => v.toFixed(1);
const pfad = (s) => `M${z(s[0][0][0])},${z(s[0][0][1])}` + s.map(([, c1, c2, e]) => `C${z(c1[0])},${z(c1[1])} ${z(c2[0])},${z(c2[1])} ${z(e[0])},${z(e[1])}`).join('');
function abtasten(s) {
  const pkt = [];
  for (const [a, b, c, d] of s) for (let t = 0; t <= 1; t += 1 / 16) {
    const u = 1 - t, k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    pkt.push([k[0] * a[0] + k[1] * b[0] + k[2] * c[0] + k[3] * d[0], k[0] * a[1] + k[1] * b[1] + k[2] * c[1] + k[3] * d[1]]);
  }
  return (y) => {
    for (let i = 1; i < pkt.length; i++) if (pkt[i][1] >= y) {
      const [p, q] = [pkt[i - 1], pkt[i]], f = q[1] === p[1] ? 0 : (y - p[1]) / (q[1] - p[1]);
      return p[0] + (q[0] - p[0]) * f;
    }
    return pkt[pkt.length - 1][0];
  };
}

/* Statt Kreis: ein kleines Schildchen mit Loch, wie ein Anhänger am Faden, mit dem Anfangsbuchstaben. */
const SCHILD_FORM = 'M40 4C45 4 70 18 73 22c2.5 3.2 3 5.5 3 9.5V88c0 6-3 9-9 9H13c-6 0-9-3-9-9V31.5c0-4 .5-6.3 3-9.5C10 18 35 4 40 4z';
const SCHILD_LOCH = 'M34.5 21a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0z';
export const mono = (p, g = 48) => {
  const kipp = ((zufall(p.id)() * 2 - 1) * 6).toFixed(1);
  return `<span class="mono" style="${g ? `--g:${g}px;` : ''}--mono:var(--ton-${p.farbe});--kipp:${kipp}deg" aria-hidden="true"><svg viewBox="0 0 80 100"><path fill-rule="evenodd" d="${SCHILD_FORM} ${SCHILD_LOCH}"/></svg><span>${esc([...p.name.trim()][0])}</span></span>`;
};

/* Zeichen für selbst angelegte Arten: ein kleiner Anhänger mit dem Anfangsbuchstaben. */
const eigenBild = (name) => `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path fill="var(--fuell, transparent)" d="M60 18c5 0 27 14 30 18 1.5 2 2 4 2 7v50c0 5-3 8-8 8H36c-5 0-8-3-8-8V43c0-3 .5-5 2-7 3-4 25-18 30-18z"/><circle cx="60" cy="36" r="4"/><text x="60" y="88" text-anchor="middle" font-family="Young Serif, Georgia, serif" font-size="46" fill="currentColor" stroke="none">${esc([...name][0].toUpperCase())}</text></svg>`;
export const artBild = (z, name = '') => ART[z] || (z === 'eigen' && name ? eigenBild(name) : ART.frei);

/* Der Faden: eine weiche, leicht wellige Linie, die genau durch die Jahresknoten läuft. */
let fadenRahmen = 0;
export const beobachter = new ResizeObserver(() => { cancelAnimationFrame(fadenRahmen); fadenRahmen = requestAnimationFrame(fadenZeichnen); });
/* Am PC hängen die Anhänger abwechselnd links und rechts und greifen ineinander. Jeder Jahresknoten
 * bekommt eine eigene Zeile unter allem, was vorher hängt; die Anhänger seines Jahres folgen darunter. */
function anhaengerLegen(f) {
  const liste = $('.faden-liste', f);
  const kinder = $$(':scope > li', liste);
  if (!breit()) { liste.classList.remove('gelegt'); liste.style.height = ''; kinder.forEach((li) => (li.style.top = '')); return; }
  liste.classList.add('gelegt');
  const unten = { l: 0, r: 0 };
  let cursor = 0, vorigerOben = null;
  for (const li of kinder) {
    const h = li.offsetHeight;
    let oben;
    if (li.classList.contains('anhaenger')) {
      const seite = li.classList.contains('seite-l') ? 'l' : 'r';
      oben = Math.max(vorigerOben === null ? cursor : vorigerOben + 58, unten[seite] ? unten[seite] + 22 : 0, cursor);
      unten[seite] = oben + h;
      vorigerOben = oben;
    } else {
      const frei = Math.max(unten.l, unten.r);
      oben = frei ? frei + 18 : 0;
      cursor = oben + h + 4;
      vorigerOben = null;
    }
    li.style.top = `${oben}px`;
  }
  liste.style.height = `${Math.max(cursor, unten.l, unten.r)}px`;
}

const schnurPfad = (fx, hx, hy, neu = '') => {
  const mx = (fx + hx) / 2;
  return `<path class="faden-schnur${neu}" pathLength="1" d="M${z(fx)},${z(hy - 2)} Q${z(mx)},${z(hy + 9)} ${z(hx)},${z(hy)}"/><circle class="faden-punkt" cx="${z(fx)}" cy="${z(hy - 2)}" r="2.6"/>`;
};

export function fadenZeichnen() {
  const f = $('[data-faden]');
  if (!f) return;
  anhaengerLegen(f);
  const box = f.getBoundingClientRect();
  const W = box.width, H = box.height;
  const schmal = !breit();
  const basis = schmal ? 26 : W / 2;
  const rnd = zufall(f.dataset.faden + (schmal ? 's' : 'b'));
  const A = schmal ? 3.5 : 6;
  const mitte = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; };
  const knoten = $$('.knoten', f).map((k) => mitte(k)[1]);
  const pkt = [[basis + 1, 0]];
  for (let y = 60; y < H - 50; y += 70 + rnd() * 50) {
    if (knoten.some((k) => Math.abs(k - y) < 34)) continue;
    pkt.push([basis + (rnd() * 2 - 1) * A, y]);
  }
  knoten.forEach((k) => pkt.push([basis, k]));
  pkt.push([basis + (schmal ? 3 : -4), H - 18]);
  pkt.sort((a, b) => a[1] - b[1]);
  const seg = segmente(pkt), xBei = abtasten(seg);
  const [ex, ey] = pkt[pkt.length - 1];
  const ende = `M${z(ex)},${z(ey)} c1.5,6 -2,10 -7,11 c-4,1 -6,-2 -4,-4`;
  const hinten = $('.faden-hinten', f), vorn = $('.faden-vorn', f);
  for (const s of [hinten, vorn]) { s.setAttribute('viewBox', `0 0 ${z(W)} ${z(H)}`); s.setAttribute('width', z(W)); s.setAttribute('height', z(H)); }
  hinten.innerHTML = `<path class="faden-linie" d="${pfad(seg)}"/><path class="faden-linie" d="${ende}"/>`;
  vorn.innerHTML = $$('.anhaenger', f).map((li) => {
    const [hx, hy] = mitte($('.loch', li));
    return schnurPfad(xBei(hy), hx, hy, li.dataset.eintrag === zustand.neuId ? ' neu' : '');
  }).join('');
  fadenObenZeichnen(schmal);
}

/* Am Handy kommt der Faden schon aus dem Ausweis und läuft an den Geschenkideen vorbei nach unten. */
function fadenObenZeichnen(schmal) {
  const svg = $('.faden-oben'), seite = $('.seite-person'), oese = $('.ausweis-oese'), f = $('[data-faden]');
  if (!svg || !seite || !oese || !f) return;
  if (!schmal) { svg.innerHTML = ''; svg.setAttribute('height', '0'); return; }
  const sb = seite.getBoundingClientRect(), ob = oese.getBoundingClientRect(), fb = f.getBoundingClientRect();
  const x0 = ob.left + ob.width / 2 - sb.left, y0 = ob.top + ob.height / 2 - sb.top;
  const x1 = fb.left - sb.left + 27, y1 = fb.top - sb.top;
  const W = sb.width, H = y1 + 2;
  svg.setAttribute('viewBox', `0 0 ${z(W)} ${z(H)}`); svg.setAttribute('width', z(W)); svg.setAttribute('height', z(H));
  const rnd = zufall(f.dataset.faden + 'oben');
  const pkt = [[x0, y0], [x0 + 1.5, y0 + 26]];
  for (let y = y0 + 90; y < y1 - 50; y += 80 + rnd() * 40) pkt.push([x1 + (rnd() * 2 - 1) * 3.5, y]);
  pkt.push([x1, y1]);
  const seg = segmente(pkt), xBei = abtasten(seg);
  const schnuere = $$('.ideen .idee .loch', seite).filter((l) => !l.closest('details:not([open])')).map((l) => {
    const r = l.getBoundingClientRect(), hx = r.left + r.width / 2 - sb.left, hy = r.top + r.height / 2 - sb.top;
    return schnurPfad(xBei(hy), hx, hy);
  }).join('');
  svg.innerHTML = `<path class="faden-linie" d="${pfad(seg)}"/>${schnuere}`;
}
