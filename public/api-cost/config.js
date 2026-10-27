// 公開情報のみを設定します。APIキー・秘密情報は置かないでください。
export const CONFIG = {
  siteUrl: 'https://zinsei-lab.com/api-cost/', // API料金メーターの公開URL。
  siteRootUrl: 'https://zinsei-lab.com/', // サイトのホームURL。
  csv: {
    providers: 'data/live/providers.csv', models: 'data/live/models.csv', prices: 'data/live/prices.csv', image_prices: 'data/live/image_prices.csv', features: 'data/live/features.csv', params: 'data/live/params.csv', param_map: 'data/live/param_map.csv', meta: 'data/live/meta.csv',
  },
  fetchTimeoutMs: 8000,
  ga4MeasurementId: '', // G-XXXXXXXXXX。空欄ならGoogleへ通信しません。
  adsense: { client: '', slots: { top: '', result: '', bottom: '' } },
};
