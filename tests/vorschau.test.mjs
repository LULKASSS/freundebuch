/* Preislesung der Link-Vorschau (supabase/functions/vorschau) mit erfundenen Seitenausschnitten.
 * Der Preis soll der der Variante im Link sein, nicht der „ab“-Preis; bei Amazon der Preis, den man zahlt. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.Deno ??= { env: { get: () => 'x' }, serve: () => {}, resolveDns: async () => [] };
const { amazon, jsonLd } = await import('../supabase/functions/vorschau/index.ts');

const ld = (daten) => `<script type="application/ld+json">${JSON.stringify(daten)}</script>`;

test('JSON-LD: Angebot der Variante im Link, nicht das erste', () => {
  const html = ld({
    '@type': 'Product', name: 'Radhose',
    offers: [
      { '@type': 'Offer', price: '115.00', url: 'https://shop.invalid/products/radhose?variant=111', sku: '111' },
      { '@type': 'Offer', price: '149.00', url: 'https://shop.invalid/products/radhose?variant=222', sku: '222' },
    ],
  });
  assert.equal(jsonLd(html, '222').preis, 149);
  assert.equal(jsonLd(html, '111').preis, 115);
});

test('JSON-LD: verschiedene Preise ohne Variante ergeben keinen Preis statt eines falschen', () => {
  const html = ld({ '@type': 'Product', name: 'Jacke', offers: [{ price: 140 }, { price: 179 }] });
  assert.equal(jsonLd(html, '').preis, null);
  const eins = ld({ '@type': 'Product', name: 'Tasse', offers: { '@type': 'Offer', price: '12,50' } });
  assert.equal(jsonLd(eins, '').preis, 12.5);
});

test('JSON-LD: ProductGroup mit Varianten', () => {
  const html = ld({
    '@type': 'ProductGroup', name: 'Trikot',
    hasVariant: [
      { '@type': 'Product', sku: 'S-1', offers: { price: 90 } },
      { '@type': 'Product', sku: 'M-2', offers: { price: 109 } },
    ],
  });
  assert.equal(jsonLd(html, 'M-2').preis, 109);
});

test('Amazon: Preis aus dem Kasten „priceToPay“, auch wenn die versteckte Zeile leer ist', () => {
  const html = `<span class="a-price a-text-price"><span class="a-offscreen">199,00 €</span></span>
    <span class="a-price aok-align-center priceToPay apex-pricetopay-value"><span class="a-offscreen"> </span>
    <span aria-hidden="true"><span class="a-price-whole">1.154<span class="a-price-decimal">,</span></span><span class="a-price-fraction">50</span></span></span>`;
  assert.equal(amazon(html).preis, 1154.5);
});
