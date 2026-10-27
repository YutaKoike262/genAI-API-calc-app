const gids = {
  providers: '352290556',
  models: '310809832',
  prices: '1840063554',
  image_prices: '978297325',
  features: '249243574',
  params: '1380295079',
  param_map: '918052018',
  meta: '708055760',
};

export function csvUrlsFromPublishedSheetsUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('PUBLISHED_SHEETS_URL にGoogleスプレッドシートの公開URLを設定してください'); }
  const match = url.protocol === 'https:' && url.hostname === 'docs.google.com'
    && url.pathname.match(/^\/spreadsheets\/d\/e\/([^/]+)\/pubhtml\/?$/);
  if (!match || url.search || url.hash || url.username || url.password) {
    throw Error('PUBLISHED_SHEETS_URL は https://docs.google.com/spreadsheets/d/e/.../pubhtml の形式にしてください');
  }
  if (!/^[A-Za-z0-9_-]+$/.test(match[1])) throw Error('PUBLISHED_SHEETS_URL の公開IDが不正です');
  const base = `https://docs.google.com/spreadsheets/d/e/${match[1]}/pub`;
  return Object.fromEntries(Object.entries(gids).map(([name, gid]) => [name, `${base}?gid=${gid}&single=true&output=csv`]));
}
