# Google Drive 運用ファイル

このアプリのデータと公開設定は、接続済みのGoogle Driveで管理します。

## フォルダ

- [zinsei-lab](https://drive.google.com/drive/folders/1Kxl_r4emTF885kuTQq6Z8SzOUM7m3_pC) — 公開料金・API仕様マスターの現在の保存先（2026-10-28に移動）。
- [API料金メーター](https://drive.google.com/drive/folders/1llyxPCHyDCgoD-118gu1CllVwXjApU_C)
- [01_公開データ](https://drive.google.com/drive/folders/1EX5nmuYWeXTctbPbGIJ_DXnqIksJv6yl)
- [02_運用設定](https://drive.google.com/drive/folders/1vbmec0cupaC3AB0xqAZjs2S6F_MqzOVO)

## スプレッドシート

- [料金・API仕様マスター](https://docs.google.com/spreadsheets/d/11nU1ZoJz_E1NDNOCJKPDMj-RJGhjL4Yud3QQC-rMkKg/edit) — `providers`, `models`, `prices`, `image_prices`, `video_prices`, `features`, `params`, `param_map`, `meta` の9タブ。アプリの料金・仕様データを管理します。
- [運用設定・計測ID](https://docs.google.com/spreadsheets/d/1nkJy1XgKOfjmdQdQZsX1yM1gE8IVnCea3lXpdnm6Gpg/edit) — サイトURL、GA4測定ID、AdSense ID、公開CSV URL、運用方針を管理します。価格データとは別に保管します。

どちらもGoogleスプレッドシート形式で、タイムゾーンは `Asia/Tokyo` です。計測IDなどの実値は未提供のため未入力です。公開料金データはモック由来の参考値で、公式情報による照合が済んでいません。

公開サイトURL: https://yutakoike262.github.io/genAI-API-calc-app/ （GitHub Pages）

## 公開CSVを接続する

公開データシートの各タブをGoogle Sheetsの「ファイル → 共有 → ウェブに公開」で個別にCSV公開し、URLを運用設定シートの「公開CSV」タブに記録してください。各URLをサイトの `public/api-cost/config.js` の `csv` に転記すると、アプリが読み込みます。データを確認・更新してから公開してください。

2026-10-28に9タブをウェブ公開しました。`image_prices` はNano Bananaの解像度・処理方式別の画像単価、`video_prices` はGemini Omni Flashの720p動画秒単価と入力文単価を記録します。音声TTSの単価は `prices` に記録します。公開リンクは閲覧専用で、編集用シートの権限は所有者のみです。変更時の自動再公開を有効にしています。日付列はCSV読み込みに対応する `yyyy-mm-dd` 形式です。Googleの公開CSVへの更新反映には遅延が生じる場合があります。

[閲覧専用の公開ページ](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pubhtml)

既存モデルの料金・仕様には未照合の参考データが残ります。Gemini Omni FlashとGemini TTSの単価はGoogleの公式料金表に基づきます。公開CSVはデプロイ時に取得して同一オリジンから配信します。秘密のAPIキーはこのシートにも `config.js` にも保存しないでください。

9本のCSVは認証なしで取得できること、および `normalizeTables` で画像・動画・音声を含むモデルデータを読み込めることを確認済みです。

### 公開CSV URL

| タブ | 閲覧専用CSV |
| --- | --- |
| providers | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=352290556&single=true&output=csv) |
| models | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=310809832&single=true&output=csv) |
| prices | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=1840063554&single=true&output=csv) |
| image_prices | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=978297325&single=true&output=csv) |
| video_prices | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=1965804420&single=true&output=csv) |
| features | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=249243574&single=true&output=csv) |
| params | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=1380295079&single=true&output=csv) |
| param_map | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=918052018&single=true&output=csv) |
| meta | [CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vTOgbkzGX_NqGF2ibphUL-AcXxbRW3xmUNvzP3Etq7PfF1wj9BRH4rtUD3VGWh8kOc_zZoQhw8GfCBd/pub?gid=708055760&single=true&output=csv) |
