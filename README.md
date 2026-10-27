# API料金メーター

同梱の設計書・モックを基にした、ビルド不要の静的サイトです。ルートの `public/` にツール一覧ホーム、`public/api-cost/` にAPI料金メーターを置きます。フレームワーク、サーバー処理、実行時のnpm依存はありません。

## 起動・検証

```sh
npm run dev
# http://127.0.0.1:4173
npm test
npm run check
```

テストには Node.js 24以上、Python 3、bash を使います。Node.jsのメジャーバージョンは `.nvmrc` とGitHub Actionsで24に揃えています。サイト自体はES Modules・fetch対応のブラウザで動作します。ファイルを直接開く `file://` ではなくHTTPでプレビューしてください。

## 実装済み

- 7枚の公開CSVの読み込み、厳密なCSV解析、参照・日付・数値・重複検証、一括フォールバック
- 通常／バッチの独立した料金、長文料金、無料検索枠、将来料金、確認から30日経過したデータの表示
- `param_map` のモデル優先、emit、template、変換規則によるコード生成
- Claude・OpenAI・Gemini × 通常／バッチ × Python・curl・JS
- 共有URLのオプトイン、UTF-8 base64url、1,000文字制限、範囲検証、データ版の比較
- 明示的な生成と、設定変更時の再生成案内。言語切替は最後に生成した設定を維持
- GA4イベント、同意の既定拒否、入力本文の除去、デバッグ表示
- AdSenseの3枠、プライバシー・運営者・使い方、ライト／ダーク、390pxの固定サマリーバー
- OGP画像、robots、sitemapとcanonicalの準備スクリプト

## データを接続する

Google Driveに作成した管理フォルダ・スプレッドシートの場所と役割は [`docs/drive-setup.md`](docs/drive-setup.md) に記録しています。

1. `docs/sheets/` の7ファイルをGoogleスプレッドシートにインポートし、シート名をファイル名に合わせます。
2. 同梱データはモック由来の参考値です。価格・対応モデル・機能の組み合わせを公式情報と照合し、各行の `checked_at` / `verified_at` を更新します。`meta.data_note` はデータ品質に応じて更新してください。
3. 各シートを「ファイル → 共有 → ウェブに公開」でCSVとして公開します。ファイル全体の編集URLや、ログインが必要なURLは使いません。
4. GitHubリポジトリの **Settings → Secrets and variables → Actions → Variables** に `PUBLISHED_SHEETS_URL` を作成し、公開ページの `.../pubhtml` URLを設定します。これは公開URLなのでSecretではなくRepository variableを使います。デプロイ時に7タブのCSV URLへ変換し、公開用 `config.js` を生成します。
5. サイトを再読み込みし、公開CSVから読み込んだ表示を確認します。料金または `param_map` を変更して再読み込みし、反映を確認してください。Google側の公開CSV反映には遅延が生じる場合があります。

データの適用日は日本時間の当日、開始・終了日は両端を含みます。期限切れで通常料金のないモデルは選択肢に出しません。重複期間・長文料金の欠落・無効なデータは全シートを予備データに切り替え、混在する版で計算しません。

`data/fallback.json` は7シートを配列で保持した同じ正規化前スキーマです。オンラインデータを自動で端末に保存する仕様ではありません。運営者が確認済みのスナップショットに置き換え、公開時に同梱してください。CSV雛形は `node scripts/export-csv.mjs` で再出力できます。

パラメーターの初期数値は `assets/data.js` の `BASE` にあります。コードに出すパラメーターは `param_map.default` / `min` / `max` で上書きできます。`transform` は `round_up_256,cap_model_max` のようなカンマ区切りです。新しいUI項目は `params` から生成されますが、新しい種類の課金機能・APIの外枠を追加する場合は計算／テンプレートの拡張が必要です。

## GA4・広告

- `api-cost/config.js` に `ga4MeasurementId` を設定します。空欄ではGA4へ通信しません。
- GA4管理画面の拡張計測機能をOFFにし、このアプリの手動イベントで計測します。Googleシグナルと広告パーソナライズはGA4側で無効にしています。
- 利用者が分析に同意するまでGoogleタグは読み込みません。本文を含む `change_param.value` は送信しません。`p` / `sys` は復元後のアドレスと計測URLから除外し、参照元も同様に処理します。同意前の操作は後から送信しません。
- `?debug=1` で開くと画面内ログが現れ、同意後のイベントには `debug_mode` が付きます。計測IDを設定し、同意した状態で設計書8章の10イベントをDebugViewで確認してください。コピー／共有イベントは成功時のみ送ります。
- AdSense承認後に `adsense.client` と3つの `slots` を設定します。広告への同意後にユニットを読み込みます。未設定でも枠の高さは維持します。
- 広告配信地域によってGoogle認定CMPが必要な場合は公開前に導入してください。本実装の設定ダイアログは認定CMPではありません。
- 実際の送信先、配信事業者、運営者の情報に合わせて `privacy.html` を確認してください。参照されていた別の「構築手順書」はリポジトリにありませんでした。

## 公開する

GitHub Pagesへの現行公開手順は [`docs/github-pages-deploy.md`](docs/github-pages-deploy.md)、Cloudflare Pagesへの移行手順は [`docs/cloudflare-pages-deploy.md`](docs/cloudflare-pages-deploy.md) に記録しています。

1. 公開CSVは `PUBLISHED_SHEETS_URL` Repository variableからデプロイ時に設定します。運営者情報 (`operator.name` / `operator.contactUrl`) は `public/api-cost/config.js` で設定します。
2. 次を実行します。SEOのURLを書き込む準備であり、アプリのビルドはありません。

   ```sh
   npm run prepare:site
   npm run check -- --production
   npm test
   ```

3. GitHub Pagesの現行公開先、またはCloudflare Pagesの移行手順に従って `public` をデプロイします。
4. 公開後、実際のCSV、GA4 DebugView、AdSense、共有URL、OGPを確認します。

GitHub PagesはGitHub Actionsのカスタムワークフローから静的成果物を公開します。公式確認の記録は `docs/verification.md` を参照してください。

現行公開URLは [GitHub Pages](https://yutakoike262.github.io/genAI-API-calc-app/) です。独自ドメインを取得後、Cloudflare Pagesを本番公開先に切り替える予定です。現在、公開CSV・計測ID・広告ID・運営者情報は未設定で、同梱の参考データを表示します。運営者名と連絡先が揃うまで `npm run check -- --production` は失敗します。

## 構成

- `public/index.html`, `public/assets/home.css`: ツール一覧ホーム
- `public/api-cost/index.html`, `public/api-cost/assets/app.js`: API料金メーターの画面・操作
- `public/api-cost/assets/data.js`: CSV・検証・期間選択・フォールバック
- `public/api-cost/assets/core.js`: 計算・コード生成・共有URL（DOM非依存）
- `public/api-cost/assets/telemetry.js`: 同意・GA4・AdSense
- `public/api-cost/config.js`: API料金メーターの公開設定
- `public/api-cost/data/fallback.json`: 予備データ
- `tests/`: 金額・共有・外部データ・18種類のコード生成を検証

生成コードのAPIへの実行は行っていません。APIキーはサイトに置かず、実行環境の環境変数へ設定してください。OpenAIのcurlバッチはアップロード結果のfile IDを手動で差し替える、モックと同じ手順です。モデルによる検索・バッチ・推論の組み合わせ制約は公式仕様を確認してください。
