# Cloudflare Pages 公開手順

このサイトは静的サイトです。Cloudflare Pagesのプロジェクト名は `zinsei-lab`、公開フォルダは `public/` です。`/` にツール一覧、`/api-cost/` にAPI料金メーターを公開します。GitHub Actionsの `Deploy Cloudflare Pages` を手動実行すると、テストと静的チェックの後にデプロイします。

## 初回設定

1. Cloudflareアカウントのメール確認を済ませます。独自ドメイン `zinsei-lab.com` はCloudflareのドメイン一覧に表示されています。Pagesの静的ファイル配信は無料枠で利用できます。
2. Cloudflareの **Workers & Pages → Create application → Pages → Upload assets** からPagesプロジェクト `zinsei-lab` を作ります。GitHub Actionsからデプロイするための入れ物です。
3. CloudflareのAccount IDと、Pagesにデプロイできる権限のAPIトークンを用意します。
4. GitHubリポジトリの **Settings → Secrets and variables → Actions → Secrets** に `CLOUDFLARE_API_TOKEN` を登録します。
5. 同じ画面の **Variables** に `CLOUDFLARE_ACCOUNT_ID`、`PUBLISHED_SHEETS_URL`、`GA4_MEASUREMENT_ID`、`CONTACT_EMAIL` を登録します。Account ID、公開シートURL、GA4測定IDはいずれも公開情報なのでSecretではなくRepository variableにします。測定IDは `G-` で始まる形式で、未設定なら計測しません。デプロイ時に公開用 `config.js` と全ページの問い合わせリンクに反映されます。公開シートURLは9タブ分のCSV URLに変換します。
6. GitHubの **Actions → Deploy Cloudflare Pages → Run workflow** を実行します。初回実行でPagesプロジェクトを作成し、その後も同じ操作で手動デプロイできます。

## 独自ドメイン

Pagesプロジェクト作成後、**Custom domains → Set up a custom domain** を開き、`zinsei-lab.com` を追加します。GitHub ActionsのCloudflareデプロイは `siteRootUrl` の `https://zinsei-lab.com/` を使い、ホームとアプリのcanonical、OGP URL、robots.txt、sitemap.xml、アプリ内の共有URLを作ります。GitHub Pages用ビルドは別のプロジェクトURLを生成するので、既存の確認用サイトもそのまま動作します。

## 自動デプロイ

初回デプロイと独自ドメインの動作確認後、`.github/workflows/cloudflare-pages.yml` の `on` に `push`（対象ブランチ `main`）を追加すると、mainへのpushごとに自動デプロイできます。移行確認中は既存のGitHub Pagesをフォールバックとして維持します。

## ローカル検証

```sh
npm test
npm run check
PUBLISHED_SHEETS_URL='https://docs.google.com/spreadsheets/d/e/.../pubhtml' GA4_MEASUREMENT_ID='G-XXXXXXXXXX' npm run prepare:site -- https://your-domain/
```

公開CSVが設定済みかを `npm run check -- --production` で確認します。料金表は公式情報を照合するまで参考値として扱ってください。
