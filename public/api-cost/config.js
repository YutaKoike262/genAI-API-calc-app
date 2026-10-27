// 公開情報のみを設定します。APIキー・秘密情報は置かないでください。
export const CONFIG = {
  siteUrl: 'https://jinsei-lab.com/api-cost/', // API料金メーターの公開URL。
  siteRootUrl: 'https://jinsei-lab.com/', // サイトのホームURL。
  csv: {
    providers: '', models: '', prices: '', features: '', params: '', param_map: '', meta: '',
  },
  fetchTimeoutMs: 8000,
  ga4MeasurementId: '', // G-XXXXXXXXXX。空欄ならGoogleへ通信しません。
  adsense: { client: '', slots: { top: '', result: '', bottom: '' } },
  operator: { name: '', contactUrl: '' },
};
