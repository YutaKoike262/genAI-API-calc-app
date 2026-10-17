# GitHub Pages 公開手順

このアプリは静的サイトなので、GitHub PagesとGitHub Actionsで公開します。`main` に反映すると、テスト後に `public/` をデプロイします。サイトURLは `https://yutakoike262.github.io/genAI-API-calc-app/` です。

初回デプロイは完了し、トップページ、各案内ページ、JS、フォールバックデータ、robots.txt、sitemap.xmlがHTTP 200を返すことを確認済みです。

## GitHub側の初期設定

1. リポジトリの **Settings → Pages** を開きます。
2. **Build and deployment → Source** で **GitHub Actions** を選びます。
3. `.github/workflows/pages.yml` を `main` に反映します。以後、`main` へのpushごとに自動でテストとデプロイが走ります。

GitHub Pagesのサイトはインターネットで公開されます。リポジトリも現在Publicです。秘密情報をコミットしないでください。GA4などの計測IDは公開情報なので `public/config.js` に設定できますが、APIキーは置きません。

## ローカル検証

```sh
npm test
npm run prepare:site
npm run check -- --production
```

`prepare:site` は設定済みの `siteUrl` からcanonical、OGP URL、robots.txt、sitemap.xmlを作成します。GitHub Actionsでも同じ順で実行します。運営者名と問い合わせ先が未設定の間は `npm run check -- --production` が失敗します。GA4測定IDと料金CSVも現在未設定なので、最初の公開URLは開発・動作確認用として扱い、運営者情報とデータを整えてから本番利用してください。

## GA4を設定する

公開URLを使ってGA4ウェブデータストリームを作成し、測定ID (`G-...`) を運用設定スプレッドシートの「設定項目」に記録します。そのIDを `public/config.js` の `ga4MeasurementId` に設定して `main` に反映すると、テスト後に再デプロイされます。空欄の間はGA4へ通信しません。公開後は同意を許可した状態でDebugViewのイベントを確認してください。

運営者情報、問い合わせ先、プライバシー表示は実際の運用内容に合わせてから公開してください。料金表は公式情報の確認が済むまで参考値として扱います。
