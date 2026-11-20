/* Kleinste ZIP-Datei ohne Bibliothek: Dateien unverpackt (store), mit CRC-32. Reicht für JSON und Bilder. */

const TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (d) => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < d.length; i++) c = TABELLE[(c ^ d[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};

/** dateien: [{ name, daten: Uint8Array | string }] → Blob */
export function zip(dateien) {
  const teile = [], verzeichnis = [];
  let versatz = 0;
  const jetzt = new Date();
  const zeit = (jetzt.getHours() << 11) | (jetzt.getMinutes() << 5) | (jetzt.getSeconds() >> 1);
  const tag = ((jetzt.getFullYear() - 1980) << 9) | ((jetzt.getMonth() + 1) << 5) | jetzt.getDate();
  const kodierer = new TextEncoder();
  for (const d of dateien) {
    const name = kodierer.encode(d.name);
    const daten = typeof d.daten === 'string' ? kodierer.encode(d.daten) : d.daten;
    const crc = crc32(daten);
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true); kopf.setUint16(4, 20, true); kopf.setUint16(6, 0x0800, true);
    kopf.setUint16(8, 0, true); kopf.setUint16(10, zeit, true); kopf.setUint16(12, tag, true);
    kopf.setUint32(14, crc, true); kopf.setUint32(18, daten.length, true); kopf.setUint32(22, daten.length, true);
    kopf.setUint16(26, name.length, true); kopf.setUint16(28, 0, true);
    teile.push(kopf, name, daten);
    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true);
    z.setUint16(10, 0, true); z.setUint16(12, zeit, true); z.setUint16(14, tag, true);
    z.setUint32(16, crc, true); z.setUint32(20, daten.length, true); z.setUint32(24, daten.length, true);
    z.setUint16(28, name.length, true); z.setUint32(42, versatz, true);
    verzeichnis.push(z, name);
    versatz += 30 + name.length + daten.length;
  }
  const groesse = verzeichnis.reduce((s, t) => s + (t.byteLength ?? t.length), 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true); ende.setUint16(8, dateien.length, true); ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesse, true); ende.setUint32(16, versatz, true);
  return new Blob([...teile, ...verzeichnis, ende], { type: 'application/zip' });
}
