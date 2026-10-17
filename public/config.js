// 公開情報のみを設定します。APIキー・秘密情報は置かないでください。
export const CONFIG = {
  siteUrl: 'https://yutakoike262.github.io/genAI-API-calc-app/', // GitHub PagesのプロジェクトサイトURL。
  csv: {
    providers: '', models: '', prices: '', features: '', params: '', param_map: '', meta: '',
  },
  fetchTimeoutMs: 8000,
  ga4MeasurementId: '', // G-XXXXXXXXXX。空欄ならGoogleへ通信しません。
  adsense: { client: '', slots: { top: '', result: '', bottom: '' } },
  operator: { name: '', contactUrl: '' },
};
