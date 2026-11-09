import { readdir } from 'node:fs/promises';

export async function sitePages() {
  const entries = await readdir('public', { recursive: true });
  return entries.filter(file => file.endsWith('.html') && file !== 'api-cost/privacy.html').sort().map(file => ({
    file,
    url: file.replace(/index\.html$/, '') || './',
    image: file.startsWith('api-cost/') ? 'api-cost/assets/og.png' : 'assets/tools-og.png',
  }));
}
