import test from 'node:test';
import assert from 'node:assert/strict';
import { csvUrlsFromPublishedSheetsUrl } from '../scripts/published-sheets.js';

const publishedUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pubhtml';

test('published Google Sheets URL becomes seven CSV URLs', () => {
  const urls = csvUrlsFromPublishedSheetsUrl(publishedUrl);
  assert.equal(Object.keys(urls).length, 7);
  assert.equal(urls.providers, 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=352290556&single=true&output=csv');
  assert.match(urls.meta, /gid=708055760/);
});

test('published Google Sheets URL rejects non-published or unrelated links', () => {
  assert.throws(() => csvUrlsFromPublishedSheetsUrl('https://docs.google.com/spreadsheets/d/example/edit'), /pubhtml/);
  assert.throws(() => csvUrlsFromPublishedSheetsUrl('https://example.com/pubhtml'), /pubhtml/);
  assert.throws(() => csvUrlsFromPublishedSheetsUrl(`${publishedUrl}?usp=sharing`), /pubhtml/);
});
