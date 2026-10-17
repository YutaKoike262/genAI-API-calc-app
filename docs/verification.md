# 仕様確認と検証記録

2026-10-17に公式ドキュメントを確認。

- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna): reasoning.effortは none / low / medium / high / xhigh / max、既定medium。モックの選択肢と既定値を更新。
- [Gemini Interactions](https://ai.google.dev/api/interactions-api): max_output_tokensはgeneration_config内。モックの配置を維持。レスポンスは仕様差異のあるoutput_textに依存せず、interactionオブジェクトを表示。
- [Gemini Batch](https://ai.google.dev/gemini-api/docs/batch-api): generateContent形式で送信。Python/JSのinline requestsとRESTのbatch.input_config.requests.requestsを確認。通常リクエストのparam_mapからプロンプト・システム指示・出力上限・推論・検索を変換して3言語を実装。
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): GitHub Actionsのカスタムワークフローで静的成果物を公開。`public/` のみをartifactにする。
- [Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent): タグ読み込み前に4種類の同意をdenied、選択時にupdateを発行するbasic方式。
- [Googleのパートナーサイト情報利用](https://policies.google.com/technologies/partner-sites): 外部送信の案内からリンク。

予備データの全価格・全モデルのAPI仕様を再監査したものではありません。モック由来の価格・将来価格・バッチ単価を保持し、画面に参考データである旨を表示します。

自動テストはCSVの引用符・改行、料金式、長文境界、バッチ独立単価、未来の適用日、無料枠、共有URLの検証・Unicode・機密情報除去、モデル別マッピング、CSVの更新反映・失敗時の切替、18パターンの生成コードのPython/JS/bash構文とシェル引用を対象としています。

未実施: 実APIへの課金を伴う実行、実公開CSVの更新、実GA4 DebugView到達、実広告配信、GitHub Pages公開。これらは運用者のURL・ID・アカウント設定後に確認する項目です。

ブラウザ確認（2026-10-17）: 初期計算、設定変更時の再生成案内、GeminiバッチのJS表示、390pxの横スクロールなし、固定サマリーバー、ライト／ダーク、共有リンクの本文復元とアドレスからの除去、不正値の初期化、コピー／共有の成功、全10イベントの画面内ログ、同意設定、付随ページへの遷移を確認。コンソールエラーなし。
