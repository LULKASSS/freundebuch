/* Kleine Strichzeichnungen als Platzhalter für Produktbilder und als Zeichen der Arten.
 * Strich in currentColor, Füllung über --fuell (Entwurf setzt sie), Rundungen bewusst nicht ganz gerade,
 * damit es nach Hand aussieht. Echte Produktfotos kommen später aus der Link-Vorschau. */

const s = (inhalt, vb = '0 0 120 120') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
const F = 'fill="var(--fuell, transparent)"';

export const PRODUKT = {
  tamper: s(`<path ${F} d="M38 82c0-6 10-9 22-9s22 3 22 9v8c0 3-10 6-22 6s-22-3-22-6z"/><path d="M38 82c0 4 10 7 22 7s22-3 22-7"/><path ${F} d="M52 73V58c0-3 3-5 8-5s8 2 8 5v15"/><path ${F} d="M47 53c-2-12 3-27 13-28 10 1 15 16 13 28z"/>`),
  shirt: s(`<path ${F} d="M44 26c4 6 9 8 16 8s12-2 16-8l20 10 8 22-14 5-4-8v47H34V55l-4 8-14-5 8-22z"/><path d="M50 27c2 5 6 7 10 7s8-2 10-7"/>`),
  licht: s(`<rect ${F} x="44" y="28" width="32" height="62" rx="12"/><path d="M52 44h16M52 56h16M52 68h16"/><path d="M60 90v14M50 104h20"/><path d="M84 40l10-6M86 59h12M84 78l10 6"/>`),
  buch: s(`<path ${F} d="M26 34c12-4 24-3 34 4v58c-10-7-22-8-34-4z"/><path ${F} d="M94 34c-12-4-24-3-34 4v58c10-7 22-8 34-4z"/><path d="M68 50c6-2 12-2 18-1M68 61c6-2 12-2 18-1"/>`),
  karte: s(`<rect ${F} x="20" y="34" width="80" height="52" rx="9"/><path d="M34 74l12-20 8 11 6-7 12 16"/><circle cx="80" cy="50" r="5"/><path d="M28 34v-4M92 34v-4"/>`),
  muehle: s(`<path ${F} d="M40 52h40l-4 46H44z"/><path ${F} d="M36 44h48v8H36z"/><path d="M60 44V30h22"/><circle ${F} cx="88" cy="30" r="5"/><path d="M48 70h24"/>`),
  kopfhoerer: s(`<path d="M28 74V60c0-18 14-32 32-32s32 14 32 32v14"/><rect ${F} x="20" y="68" width="18" height="28" rx="8"/><rect ${F} x="82" y="68" width="18" height="28" rx="8"/>`),
  spiel: s(`<rect ${F} x="22" y="40" width="76" height="50" rx="8"/><path d="M22 56h76"/><circle cx="44" cy="74" r="4"/><circle cx="60" cy="74" r="4"/><circle cx="76" cy="74" r="4"/><path d="M50 40l4-12h12l4 12"/>`),
  glasur: s(`<path ${F} d="M34 50h22v40c0 4-5 6-11 6s-11-2-11-6z"/><path ${F} d="M64 58h22v32c0 4-5 6-11 6s-11-2-11-6z"/><path d="M34 50c0-6 5-8 11-8s11 2 11 8M64 58c0-6 5-8 11-8s11 2 11 8"/><path d="M40 70c3 3 8 3 11 0"/>`),
  vase: s(`<path ${F} d="M48 28h24v8c0 6 12 12 12 30s-10 30-24 30-24-12-24-30 12-24 12-30z"/><path d="M44 62c10 4 22 4 32 0"/>`),
  box: s(`<path ${F} d="M26 50h68v42H26z"/><path ${F} d="M22 38h76v12H22z"/><path d="M60 38v54M60 38c-6-12-20-14-20-4 0 4 8 4 20 4zM60 38c6-12 20-14 20-4 0 4-8 4-20 4z"/>`),
};

/* Zeichen der Arten (klein, für Filter und Einträge). */
export const ART = {
  herz: s(`<path ${F} d="M60 96C36 80 22 66 22 48c0-11 8-19 18-19 9 0 15 5 20 13 5-8 11-13 20-13 10 0 18 8 18 19 0 18-14 32-38 48z"/>`),
  nein: s(`<circle ${F} cx="60" cy="60" r="36"/><path d="M44 50h8M68 50h8M46 80c8-6 20-6 28 0"/>`),
  spross: s(`<path d="M60 98V58"/><path ${F} d="M60 62C58 44 44 34 26 36c0 18 14 28 34 26z"/><path ${F} d="M60 54c2-16 14-26 32-24 0 16-12 26-32 24z"/>`),
  blase: s(`<path ${F} d="M24 34c0-6 4-10 10-10h52c6 0 10 4 10 10v34c0 6-4 10-10 10H52L34 94V78c-6 0-10-4-10-10z"/><path d="M42 46h36M42 58h24"/>`),
  berg: s(`<path ${F} d="M14 92l30-46 16 22 12-16 34 40z"/><circle cx="84" cy="32" r="8"/>`),
  geschenk: s(`<path ${F} d="M28 54h64v40H28z"/><path ${F} d="M24 42h72v12H24z"/><path d="M60 42v52M60 42c-6-12-20-14-20-4 0 4 8 4 20 4zM60 42c6-12 20-14 20-4 0 4-8 4-20 4z"/>`),
  feder: s(`<path ${F} d="M90 24C58 28 38 50 34 86l8-2c8-26 24-42 48-60z"/><path d="M30 96l12-12"/>`),
  frei: s(`<circle ${F} cx="60" cy="60" r="10"/>`),
};

/* Schmuck: kleine Zeichnungen für leere Stellen und Momente (Schleife beim Reservieren). */
export const SCHMUCK = {
  schleife: s(`<path ${F} d="M60 60c-14-18-38-22-38-6 0 12 22 10 38 6zM60 60c14-18 38-22 38-6 0 12-22 10-38 6z"/><path d="M60 60l-14 30M60 60l14 30"/><circle ${F} cx="60" cy="60" r="6"/>`),
  stern: s(`<path ${F} d="M60 20l9 27h28l-23 17 9 27-23-17-23 17 9-27-23-17h28z"/>`),
  kuchen: s(`<path ${F} d="M26 62h68v30H26z"/><path d="M26 74c8 6 14 6 22 0s14-6 22 0 14 6 24 0"/><path d="M44 62V48M60 62V44M76 62V48"/><path d="M44 42c-3-4 0-8 0-8s3 4 0 8M60 38c-3-4 0-8 0-8s3 4 0 8M76 42c-3-4 0-8 0-8s3 4 0 8"/>`),
};
