# API料金メーター

同梱の設計書・モックを基にした、ビルド不要の静的アプリです。公開するファイルは `public/` だけです。フレームワーク、サーバー処理、実行時のnpm依存はありません。

## 起動・検証

```sh
npm run dev
# http://127.0.0.1:4173
npm test
npm run check
```

テストには Node.js 22以上、Python 3、bash を使います。サイト自体はES Modules・fetch対応のブラウザで動作します。ファイルを直接開く `file://` ではなくHTTPでプレビューしてください。

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
4. `public/config.js` の `csv` に7枚の公開CSV URLを設定します。
5. サイトを再読み込みし、公開CSVから読み込んだ表示を確認します。料金または `param_map` を変更して再読み込みし、反映を確認してください。Google側の公開CSV反映には遅延が生じる場合があります。

データの適用日は日本時間の当日、開始・終了日は両端を含みます。期限切れで通常料金のないモデルは選択肢に出しません。重複期間・長文料金の欠落・無効なデータは全シートを予備データに切り替え、混在する版で計算しません。

`data/fallback.json` は7シートを配列で保持した同じ正規化前スキーマです。オンラインデータを自動で端末に保存する仕様ではありません。運営者が確認済みのスナップショットに置き換え、公開時に同梱してください。CSV雛形は `node scripts/export-csv.mjs` で再出力できます。

パラメーターの初期数値は `assets/data.js` の `BASE` にあります。コードに出すパラメーターは `param_map.default` / `min` / `max` で上書きできます。`transform` は `round_up_256,cap_model_max` のようなカンマ区切りです。新しいUI項目は `params` から生成されますが、新しい種類の課金機能・APIの外枠を追加する場合は計算／テンプレートの拡張が必要です。

## GA4・広告

- `config.js` に `ga4MeasurementId` を設定します。空欄ではGA4へ通信しません。
- GA4管理画面の拡張計測機能をOFFにし、このアプリの手動イベントで計測します。Googleシグナルと広告パーソナライズはGA4側で無効にしています。
- 利用者が分析に同意するまでGoogleタグは読み込みません。本文を含む `change_param.value` は送信しません。`p` / `sys` は復元後のアドレスと計測URLから除外し、参照元も同様に処理します。同意前の操作は後から送信しません。
- `?debug=1` で開くと画面内ログが現れ、同意後のイベントには `debug_mode` が付きます。計測IDを設定し、同意した状態で設計書8章の10イベントをDebugViewで確認してください。コピー／共有イベントは成功時のみ送ります。
- AdSense承認後に `adsense.client` と3つの `slots` を設定します。広告への同意後にユニットを読み込みます。未設定でも枠の高さは維持します。
- 広告配信地域によってGoogle認定CMPが必要な場合は公開前に導入してください。本実装の設定ダイアログは認定CMPではありません。
- 実際の送信先、配信事業者、運営者の情報に合わせて `privacy.html` を確認してください。参照されていた別の「構築手順書」はリポジトリにありませんでした。

## 公開する

GitHub PagesとGitHub Actionsの設定、公開URL、GA4測定IDの設定順は [`docs/github-pages-deploy.md`](docs/github-pages-deploy.md) に記録しています。

1. `public/config.js` の `siteUrl`（末尾 `/`）と `operator.name` / `operator.contactUrl` を設定します。
2. 次を実行します。SEOのURLを書き込む準備であり、アプリのビルドはありません。

   ```sh
   npm run prepare:site
   npm run check -- --production
   npm test
   ```

3. GitHub Pages: リポジトリの Settings → Pages で Source を GitHub Actions にし、`main` に反映します。Actionsがテストを実行し `public` をデプロイします。
4. 公開後、実際のCSV、GA4 DebugView、AdSense、共有URL、OGPを確認します。

GitHub PagesはGitHub Actionsのカスタムワークフローから静的成果物を公開します。公式確認の記録は `docs/verification.md` を参照してください。

現在、公開CSV・計測ID・広告ID・本番ドメイン・運営者情報は未設定です。sitemapは空の雛形で、`prepare:site` が本番URLを生成します。公開先を勝手に作成・デプロイする処理はありません。

## 構成

- `public/index.html`, `assets/app.css`, `assets/app.js`: モック準拠の画面・状態・操作
- `assets/data.js`: CSV・検証・期間選択・フォールバック
- `assets/core.js`: 計算・コード生成・共有URL（DOM非依存）
- `assets/telemetry.js`: 同意・GA4・AdSense
- `public/config.js`: サイトごとの公開設定
- `public/data/fallback.json`: 予備データ
- `tests/`: 金額・共有・外部データ・18種類のコード生成を検証

生成コードのAPIへの実行は行っていません。APIキーはサイトに置かず、実行環境の環境変数へ設定してください。OpenAIのcurlバッチはアップロード結果のfile IDを手動で差し替える、モックと同じ手順です。モデルによる検索・バッチ・推論の組み合わせ制約は公式仕様を確認してください。
