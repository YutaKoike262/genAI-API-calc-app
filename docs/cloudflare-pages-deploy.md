# Cloudflare Pages 公開手順

このサイトは静的サイトです。Cloudflare Pagesのプロジェクト名は `jinsei-lab`、公開フォルダは `public/` です。`/` に人生ラボのホーム、`/api-cost/` にAPI料金メーターを公開します。GitHub Actionsの `Deploy Cloudflare Pages` を手動実行すると、テストと静的チェックの後にデプロイします。

## 初回設定

1. Cloudflareアカウントのメール確認と支払い方法の登録を済ませます。Pagesの静的ファイル配信は無料枠で利用できますが、独自ドメインの登録料・更新料は別途かかります。
2. CloudflareでPagesプロジェクト `jinsei-lab` を作り、直接アップロードを選びます。GitHub Actionsが初回デプロイします。
3. CloudflareのAccount IDと、Pagesにデプロイできる権限のAPIトークンを用意します。
4. GitHubリポジトリの **Settings → Secrets and variables → Actions** に `CLOUDFLARE_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN` を登録します。
5. GitHubの **Actions → Deploy Cloudflare Pages → Run workflow** を実行します。初回実行でPagesプロジェクトを作成し、その後も同じ操作で手動デプロイできます。

## 独自ドメイン

`jinsei-lab.com` をCloudflare Registrarで取得後、Cloudflare Pagesのプロジェクトで **Custom domains → Set up a custom domain** を開き、`jinsei-lab.com` を追加します。GitHub ActionsのCloudflareデプロイは `siteRootUrl` の `https://jinsei-lab.com/` を使い、ホームとアプリのcanonical、OGP URL、robots.txt、sitemap.xml、アプリ内の共有URLを作ります。GitHub Pages用ビルドは別のプロジェクトURLを生成するので、既存の確認用サイトもそのまま動作します。

## 自動デプロイ

初回デプロイと独自ドメインの動作確認後、`.github/workflows/cloudflare-pages.yml` の `on` に `push`（対象ブランチ `main`）を追加すると、mainへのpushごとに自動デプロイできます。移行確認中は既存のGitHub Pagesをフォールバックとして維持します。

## ローカル検証

```sh
npm test
npm run check
npm run prepare:site -- https://your-domain/
```

運営者情報と公開CSVが揃うまで `npm run check -- --production` は成功しません。料金表は公式情報を照合するまで参考値として扱ってください。
