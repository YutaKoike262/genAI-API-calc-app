# GitHub Pages 公開手順

この静的サイトはGitHub PagesとGitHub Actionsで公開します。`main` に反映すると、テスト後に `public/` をデプロイします。ホームは `https://yutakoike262.github.io/genAI-API-calc-app/`、API料金メーターはその下の `api-cost/` にあります。Cloudflare Pagesへ移行後は `https://zinsei-lab.com/` をホーム、`https://zinsei-lab.com/api-cost/` をアプリにする予定です。

初回デプロイは完了し、トップページ、各案内ページ、JS、フォールバックデータ、robots.txt、sitemap.xmlがHTTP 200を返すことを確認済みです。

## GitHub側の初期設定

1. リポジトリの **Settings → Pages** を開きます。
2. **Build and deployment → Source** で **GitHub Actions** を選びます。
3. `.github/workflows/pages.yml` を `main` に反映します。以後、`main` へのpushごとに自動でテストとデプロイが走ります。

GitHub Pagesのサイトはインターネットで公開されます。リポジトリも現在Publicです。秘密情報をコミットしないでください。GA4などの計測IDは公開情報なので `public/api-cost/config.js` に設定できますが、APIキーは置きません。

料金データと問い合わせ先は、リポジトリの **Settings → Secrets and variables → Actions → Variables** に作成した `PUBLISHED_SHEETS_URL` と `CONTACT_EMAIL` からデプロイ時に設定します。値はスプレッドシートの `.../pubhtml` URLです。公開URLなのでRepository variableを使い、Secretにはしません。デプロイ時に各タブのCSV URLへ変換して公開用 `config.js` を生成します。

## ローカル検証

```sh
npm test
npm run prepare:site
npm run check -- --production
```

`prepare:site` は公開ルートURLからホームとアプリのcanonical、OGP URL、robots.txt、sitemap.xmlを作成し、アプリの共有リンク用URLも合わせます。GitHub Pagesのワークフローは現在のプロジェクトサイトURLを渡し、Cloudflare Pagesのワークフローは `zinsei-lab.com` を使います。問い合わせ先メールアドレスは `CONTACT_EMAIL` から各ページへ差し込みます。

## GA4を設定する

公開URLを使ってGA4ウェブデータストリームを作成し、測定ID (`G-...`) を運用設定スプレッドシートの「設定項目」に記録します。そのIDを `public/api-cost/config.js` の `ga4MeasurementId` に設定して `main` に反映すると、テスト後に再デプロイされます。空欄の間はGA4へ通信しません。公開後は同意を許可した状態でDebugViewのイベントを確認してください。

運営者情報、問い合わせ先、プライバシー表示は実際の運用内容に合わせてから公開してください。料金表は公式情報の確認が済むまで参考値として扱います。
