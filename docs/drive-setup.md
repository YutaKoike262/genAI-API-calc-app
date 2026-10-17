# Google Drive 運用ファイル

このアプリのデータと公開設定は、接続済みのGoogle Driveで管理します。

## フォルダ

- [API料金メーター](https://drive.google.com/drive/folders/1llyxPCHyDCgoD-118gu1CllVwXjApU_C)
- [01_公開データ](https://drive.google.com/drive/folders/1EX5nmuYWeXTctbPbGIJ_DXnqIksJv6yl)
- [02_運用設定](https://drive.google.com/drive/folders/1vbmec0cupaC3AB0xqAZjs2S6F_MqzOVO)

## スプレッドシート

- [料金・API仕様マスター](https://docs.google.com/spreadsheets/d/11nU1ZoJz_E1NDNOCJKPDMj-RJGhjL4Yud3QQC-rMkKg/edit) — `providers`, `models`, `prices`, `features`, `params`, `param_map`, `meta` の7タブ。アプリの料金・仕様データを管理します。
- [運用設定・計測ID](https://docs.google.com/spreadsheets/d/1nkJy1XgKOfjmdQdQZsX1yM1gE8IVnCea3lXpdnm6Gpg/edit) — サイトURL、GA4測定ID、AdSense ID、公開CSV URL、運用方針を管理します。価格データとは別に保管します。

どちらもGoogleスプレッドシート形式で、タイムゾーンは `Asia/Tokyo` です。計測IDなどの実値は未提供のため未入力です。公開料金データはモック由来の参考値で、公式情報による照合が済んでいません。

## 公開CSVを接続する

公開データシートの各タブをGoogle Sheetsの「ファイル → 共有 → ウェブに公開」で個別にCSV公開し、URLを運用設定シートの「公開CSV」タブに記録してください。各URLをサイトの `public/config.js` の `csv` に転記すると、アプリが読み込みます。データを確認・更新してから公開してください。

現在、Googleの本人確認が必要な画面になったため、CSVのウェブ公開URLは作成していません。運用設定シートのURL欄と `public/config.js` は空欄のままです。計測ID、広告ID、運営者情報も取得後に入力してください。秘密のAPIキーはこのシートにも `config.js` にも保存しないでください。
