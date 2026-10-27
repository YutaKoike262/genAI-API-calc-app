# Google Drive 運用ファイル

このアプリのデータと公開設定は、接続済みのGoogle Driveで管理します。

## フォルダ

- [zinsei-lab](https://drive.google.com/drive/folders/1Kxl_r4emTF885kuTQq6Z8SzOUM7m3_pC) — 公開料金・API仕様マスターの現在の保存先（2026-10-28に移動）。
- [API料金メーター](https://drive.google.com/drive/folders/1llyxPCHyDCgoD-118gu1CllVwXjApU_C)
- [01_公開データ](https://drive.google.com/drive/folders/1EX5nmuYWeXTctbPbGIJ_DXnqIksJv6yl)
- [02_運用設定](https://drive.google.com/drive/folders/1vbmec0cupaC3AB0xqAZjs2S6F_MqzOVO)

## スプレッドシート

- [料金・API仕様マスター](https://docs.google.com/spreadsheets/d/11nU1ZoJz_E1NDNOCJKPDMj-RJGhjL4Yud3QQC-rMkKg/edit) — `providers`, `models`, `prices`, `features`, `params`, `param_map`, `meta` の7タブ。アプリの料金・仕様データを管理します。
- [運用設定・計測ID](https://docs.google.com/spreadsheets/d/1nkJy1XgKOfjmdQdQZsX1yM1gE8IVnCea3lXpdnm6Gpg/edit) — サイトURL、GA4測定ID、AdSense ID、公開CSV URL、運用方針を管理します。価格データとは別に保管します。

どちらもGoogleスプレッドシート形式で、タイムゾーンは `Asia/Tokyo` です。計測IDなどの実値は未提供のため未入力です。公開料金データはモック由来の参考値で、公式情報による照合が済んでいません。

公開サイトURL: https://yutakoike262.github.io/genAI-API-calc-app/ （GitHub Pages）

## 公開CSVを接続する

公開データシートの各タブをGoogle Sheetsの「ファイル → 共有 → ウェブに公開」で個別にCSV公開し、URLを運用設定シートの「公開CSV」タブに記録してください。各URLをサイトの `public/api-cost/config.js` の `csv` に転記すると、アプリが読み込みます。データを確認・更新してから公開してください。

2026-10-28に7タブをウェブ公開しました。公開リンクは閲覧専用で、編集用シートの権限は所有者のみです。変更時の自動再公開を有効にしています。日付列の表示形式はCSV読み込みに対応する `yyyy-mm-dd` に統一しました。Googleの公開CSVへの更新反映には遅延が生じる場合があります。

[閲覧専用の公開ページ](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pubhtml)

料金・仕様は未照合の参考データです。アプリの `public/api-cost/config.js` と運用設定シートのCSV URL欄は未設定です。計測ID、広告ID、運営者情報も取得後に入力してください。秘密のAPIキーはこのシートにも `config.js` にも保存しないでください。

7本のCSVは認証なしで取得できることを確認済みです。日付書式の変更直後の取得では一部に旧形式が残っており、アプリ接続前に更新の反映と `normalizeTables` による検証を再確認してください。

### 公開CSV URL

| タブ | 閲覧専用CSV |
| --- | --- |
| providers | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=352290556&single=true&output=csv) |
| models | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=310809832&single=true&output=csv) |
| prices | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=1840063554&single=true&output=csv) |
| features | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=249243574&single=true&output=csv) |
| params | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=1380295079&single=true&output=csv) |
| param_map | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=918052018&single=true&output=csv) |
| meta | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=708055760&single=true&output=csv) |
