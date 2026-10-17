# API料金メーター 設計書

- 版: 0.2（2026-10-17）共有URLを追加
- 目的: GA4と広告運用の実験用サイト。Claude・ChatGPT・GeminiのAPI料金を見積もり、そのまま動くコードを生成する
- 方針: 料金とAPI仕様はGoogleスプレッドシートで管理し、サイトはそれを読むだけにする。データ更新でデプロイしない

---

## 1. 全体構成

```
Googleスプレッドシート（データの正本）
   │  「ウェブに公開」→ シートごとのCSV URL
   ▼
静的サイト（HTML / JS）
   ├─ 料金計算     … prices / features / meta を使う
   ├─ 入力フォーム … params / param_map から自動生成
   └─ コード生成   … param_map でリクエストの中身を組み、言語別に整形
   ▼
GA4（イベント計測） / AdSense（広告枠）
```

- GASは使わない。公開CSVをブラウザから `fetch` で直接読む
- 読み込みに失敗したときに備え、最後に読めたデータをサイトに同梱する（フォールバック用JSON）
- ホスティングは Cloudflare Pages または GitHub Pages を想定

---

## 2. 設計の基本方針: パラメーターは「意味」と「書き方」を分ける

同じ意味のパラメーターでも、会社ごとに名前・位置・選べる値が違う。

| 意味 | Claude | OpenAI | Gemini |
|---|---|---|---|
| 推論の強さ | `output_config.effort` | `reasoning.effort` | `generation_config.thinking_level` |
| システムプロンプト | `system` | `instructions` | `system_instruction` |
| 出力の上限 | `max_tokens` | `max_output_tokens` | `generation_config.max_output_tokens` |
| Web検索 | `tools[]` に `web_search_20260318` | `tools[]` に `web_search` | `tools[]` に `google_search` |

そこで次の2枚に分ける。

- **params**: パラメーターの意味（UIでどう見せるか、料金に効くか）
- **param_map**: 会社・モデルごとの書き方（JSON上の位置、値、コードに出す条件）

これで、モデル追加やAPI仕様変更はシートの行の追加・修正だけで済む。

---

## 3. シート定義

### 3.1 providers（会社）

| 列 | 型 | 例 | 説明 |
|---|---|---|---|
| provider_id | text | `anthropic` | 主キー |
| name | text | `Claude` | UI表示名 |
| vendor | text | `Anthropic` | 会社名 |
| api_style | enum | `messages` / `responses` / `interactions` | コードの外枠テンプレートの選択に使う |
| endpoint | url | `https://api.anthropic.com/v1/messages` | 通常リクエストの送り先 |
| batch_endpoint | url | `https://api.anthropic.com/v1/messages/batches` | バッチの送り先 |
| auth_header | text | `x-api-key: $ANTHROPIC_API_KEY` | curl用 |
| extra_headers | text | `anthropic-version: 2023-06-01` | 改行区切り |
| env_var | text | `ANTHROPIC_API_KEY` | コード内コメント用 |
| pricing_url | url | 公式料金ページ | 出典表示・監視対象 |
| color | text | `#c2582f` | UIのアクセント |
| sort | number | `1` | 表示順 |

### 3.2 models（モデル）

| 列 | 型 | 例 | 説明 |
|---|---|---|---|
| model_id | text | `claude-sonnet-5-5` | 主キー。APIに渡す文字列そのもの |
| provider_id | text | `anthropic` | providers への参照 |
| label | text | `Claude Sonnet 5.5` | UI表示名 |
| status | enum | `current` / `legacy` / `preview` / `hidden` | `hidden` はUIに出さない |
| context_window | number | `1000000` | |
| max_output | number | `128000` | コード生成時の上限値の上限 |
| long_threshold | number | `100000` | この入力トークン数を超えると長文料金。なければ空 |
| sort | number | `3` | 会社内の表示順 |
| doc_url | url | モデルの公式ページ | |

### 3.3 prices（料金）

1行 = 1モデル × 料金区分 × 処理モード × 適用期間。単価はすべて USD / 100万トークン。

| 列 | 型 | 例 | 説明 |
|---|---|---|---|
| model_id | text | `gemini-4-argon` | |
| tier | enum | `base` / `long` | `long` は models.long_threshold 超 |
| mode | enum | `standard` / `batch` | |
| input | number | `2` | |
| output | number | `10` | 思考トークンを含む |
| cache_read | number | `0.10` | |
| cache_write | number | `` | 任意。現状は計算に使わない |
| effective_from | date | `2026-10-01` | 適用開始日 |
| effective_to | date | `2026-11-30` | 空なら無期限 |
| checked_at | date | `2026-10-17` | 公式ページで最後に確認した日 |
| source_url | url | | |

値上げ予定の表し方（Gemini 4 Argon）:

| model_id | tier | mode | input | output | cache_read | effective_from | effective_to |
|---|---|---|---|---|---|---|---|
| gemini-4-argon | base | standard | 2 | 10 | 0.10 | | 2026-11-30 |
| gemini-4-argon | base | standard | 4 | 20 | 0.20 | 2026-12-01 | |

- ページは「今日」に該当する行で計算する。予定日になれば自動で新料金に切り替わる
- 未来の行がある場合は「○月○日以降は月額いくら」も並べて表示する
- バッチ行がないモデルはバッチを選べないようにする（各社の割引率の違いを行で吸収できる）

### 3.4 features（機能ごとの課金）

| 列 | 型 | 例 | 説明 |
|---|---|---|---|
| provider_id | text | `google` | |
| feature | text | `web_search` | params.param_id と対応 |
| unit | enum | `per_1k_calls` | |
| price | number | `14` | USD |
| free_per_month | number | `5000` | なければ 0 |
| effective_from / effective_to / checked_at / source_url | | | prices と同じ |

### 3.5 params（パラメーターの意味）

| 列 | 型 | 例 | 説明 |
|---|---|---|---|
| param_id | text | `effort` | 主キー |
| label | text | `推論の強さ` | |
| ui_type | enum | `select` / `number` / `text` / `textarea` / `toggle` | 入力部品の種類 |
| group | enum | `basic` / `advanced` | `advanced` は詳細設定に畳む |
| sort | number | | 表示順 |
| unit | text | `回` | 数値の単位 |
| affects_cost | enum | `none` / `input_tokens` / `output_tokens` / `cache_ratio` / `feature` / `mode` | 料金計算のどこに効くか |
| help | text | | 入力欄の下の説明 |
| share_key | text | `out` | 共有URLでのキー。空ならURLに含めない（9章） |
| share_optin | bool | `TRUE` | TRUE なら、利用者が選んだときだけURLに含める |

初期の行:

| param_id | label | ui_type | group | affects_cost | share_key | share_optin |
|---|---|---|---|---|---|---|
| prompt | プロンプト | textarea | basic | input_tokens | p | TRUE |
| max_output | 出力トークン / 回 | number | basic | output_tokens | out | FALSE |
| requests_per_day | 1日のリクエスト数 | number | basic | （計算専用） | rpd | FALSE |
| system | システムプロンプト | textarea | advanced | input_tokens | sys | TRUE |
| effort | 推論の強さ | select | advanced | none | effort | FALSE |
| extra_input | その他の入力トークン | number | advanced | input_tokens | ctx | FALSE |
| cache | キャッシュヒット率 | number | advanced | cache_ratio | cache | FALSE |
| web_search | Web検索回数 / 回 | number | advanced | feature | ws | FALSE |
| batch | バッチ処理 | toggle | advanced | mode | batch | FALSE |

- `requests_per_day` と `extra_input` は料金計算専用で、コードには出さない（param_map に行を作らない）
- `effort` は単価には効かないが、出力トークン数には効く。思考量の目安は公表値がないため、自動補正はしない

### 3.6 param_map（各社での書き方）

| 列 | 型 | 例 | 説明 |
|---|---|---|---|
| scope | text | `provider:openai` / `model:gpt-6-luna` | 適用範囲。モデル指定が会社指定より優先 |
| param_id | text | `effort` | |
| path | text | `reasoning.effort` | リクエストJSON上の位置。ドット区切り。`tools[]` は配列に追加 |
| values | text | `low\|medium\|high\|xhigh\|max` | select の選択肢 |
| default | text | `medium` | 初期値 |
| min / max | number | | 数値の範囲 |
| emit | enum | `always` / `if_set` / `if_positive` / `never` | コードに出す条件 |
| template | text(JSON) | `{"type":"web_search","max_uses":{value}}` | 値をそのまま入れない場合の書き方。`{value}` を差し込む |
| transform | enum | `none` / `round_up_256` / `cap_model_max` | 値の加工 |
| note | text | | コード内にコメントとして出す注記 |
| verified_at | date | `2026-10-17` | 公式ドキュメントで確認した日 |
| doc_url | url | | 確認したページ。監視対象になる |

初期の行（抜粋）:

| scope | param_id | path | values / template | emit |
|---|---|---|---|---|
| provider:anthropic | effort | `output_config.effort` | low\|medium\|high\|xhigh\|max | always |
| provider:openai | effort | `reasoning.effort` | low\|medium\|high\|xhigh\|max | always |
| model:gpt-6-luna | effort | `reasoning.effort` | none\|low\|medium\|high | always |
| provider:google | effort | `generation_config.thinking_level` | low\|medium\|high | always |
| model:gemini-3.5-flash-lite | effort | `generation_config.thinking_level` | minimal\|low\|medium\|high | always |
| provider:anthropic | system | `system` | | if_set |
| provider:openai | system | `instructions` | | if_set |
| provider:google | system | `system_instruction` | | if_set |
| provider:anthropic | max_output | `max_tokens` | transform: round_up_256, cap_model_max | always |
| provider:openai | max_output | `max_output_tokens` | 同上 | always |
| provider:google | max_output | `generation_config.max_output_tokens` | 同上 | always |
| provider:anthropic | web_search | `tools[]` | `{"type":"web_search_20260318","name":"web_search","max_uses":{value}}` | if_positive |
| provider:openai | web_search | `tools[]` | `{"type":"web_search"}` | if_positive |
| provider:google | web_search | `tools[]` | `{"type":"google_search"}` | if_positive |
| provider:anthropic | cache | `cache_control` | `{"type":"ephemeral"}` | if_positive |
| provider:openai | cache | — | note: 自動キャッシュのためコード変更不要 | if_positive |
| provider:google | cache | — | note: 暗黙キャッシュは自動 | if_positive |
| provider:anthropic | prompt | `messages[]` | `{"role":"user","content":{value}}` | always |
| provider:openai | prompt | `input` | | always |
| provider:google | prompt | `input` | | always |

path が `—` の行はJSONを変えず、note だけをコメントとして出す。

### 3.7 meta

| key | value | 説明 |
|---|---|---|
| dataset_version | `2026-10-17.1` | 更新のたびに上げる。GA4のパラメーターにも送る |
| updated_at | `2026-10-17` | UIの「料金データ確認日」に表示 |
| fx_usdjpy | `=GOOGLEFINANCE("CURRENCY:USDJPY")` | 為替。自動更新 |
| fx_updated_at | `=NOW()` 相当 | 為替の取得時刻 |

---

## 4. コード生成の流れ

1. 選択中のモデルについて、param_map から行を集める（`model:` の行が `provider:` の行を上書き）
2. 入力値を `transform` で加工する
3. `emit` 条件を満たす行だけ、`path` の位置に値（または `template`）を差し込み、リクエストJSONを組む
4. `api_style` × 処理モード（通常 / バッチ）の外枠テンプレートにJSONをはめ、Python・curl・JS に整形する
5. `note` をコード先頭のコメントに入れる

外枠テンプレート（6種類 = 3 api_style × 2モード）はサイトのコード側に持つ。クライアントの初期化と呼び出し部分なので、変更頻度が低い。

コード生成はボタンを押したときだけ行う。生成後に設定が変わったら「設定が変わりました」と表示して再生成を促す。

### 未対応・未確認

- Gemini のバッチは generateContent 形式（`contents`）のため、Interactions 形式の param_map がそのまま使えない。当面は Python のみ生成し、他言語は公式ガイドへ案内する
- 外枠テンプレートを将来シート化するかは、運用してから判断する

---

## 5. 料金計算

1リクエストあたり:

```
入力トークン   = プロンプト概算 + システムプロンプト概算 + その他の入力
料金区分       = 入力トークン > long_threshold なら long、それ以外は base
キャッシュ分   = 入力トークン × キャッシュヒット率
入力料金       = (入力トークン − キャッシュ分) × input / 1,000,000
キャッシュ料金 = キャッシュ分 × cache_read / 1,000,000
出力料金       = 出力トークン × output / 1,000,000
```

月額:

```
月額 = (入力料金 + キャッシュ料金 + 出力料金) × 1日のリクエスト数 × 30
     + max(0, 検索回数 × 月のリクエスト数 − 無料枠) × 単価 / 1,000
```

- 文字数からのトークン概算は「ASCII 4文字 ≒ 1、それ以外 1文字 ≒ 1」の目安。UIに目安と明記する
- 含めないもの: 税、為替手数料、ボリューム割引、データ所在地オプション、キャッシュ書き込み料金、Gemini のキャッシュ保存料

---

## 6. 運用

### データ更新

1. 監視で差分が見つかる、または自分で気づく
2. シートを修正し、`checked_at` / `verified_at` と meta の `dataset_version` を更新
3. サイトは次の読み込みで反映（デプロイ不要）

### 監視（スケジュールタスク）

- 週1回、providers.pricing_url と param_map.doc_url を読み、シートの値と比べて差分を報告する
- 報告だけ行い、シートは自動で書き換えない（誤反映を防ぐ）
- 対象: 単価、新モデル・廃止予定、パラメーター名や選べる値の変更、検索ツールのバージョン名

### 鮮度の表示

- UIに「料金データ確認日」を常に表示（meta.updated_at）
- prices.checked_at が30日以上前のモデルには「要確認」の印を出す

---

## 7. UI（Apple のヒューマンインターフェイスガイドラインに準拠）

### 原則

- **明瞭さ**: 1画面の主役は「月額の予想」。数字は大きく、単位と補足は小さく
- **控えめさ**: 装飾は最小限。色はアクセント1色と意味色（警告・成功）のみ
- **奥行き**: 詳細設定は開閉式。見積もりは半透明のサマリーバーとして常に見える

### 部品

| 要素 | 実装 |
|---|---|
| 文字 | システムフォント（`-apple-system`, `system-ui`, 日本語はヒラギノ）。大きな見出しで階層を作る |
| 会社の切り替え | セグメンテッドコントロール |
| モデル選択 | 選択肢がタップで開くポップアップボタン（`select`） |
| フォーム | 「設定」アプリ風のグループ化リスト（左にラベル、右に値）。params から自動生成 |
| 詳細設定 | 開閉式のグループ。閉じた状態でも現在値を1行で表示 |
| 見積もり | スクロールしても見えるサマリーバー（背景ぼかし） |
| コード | 言語はセグメンテッドコントロール。生成ボタンは主要アクションとして1つだけ強調 |
| タップ領域 | 44pt 以上 |
| 配色 | ライト・ダーク両対応。アクセントはシステムブルー系 |
| 動き | 控えめ。`prefers-reduced-motion` を尊重 |

### 広告枠

- 上部バナー、見積もり直下のレクタングル、最下部バナーの3か所
- 高さを先に確保し、読み込み時にレイアウトがずれないようにする（CLS対策）
- 操作部品と隣接させない（誤タップ防止）

---

## 8. GA4 イベント

| イベント | タイミング | 主なパラメーター |
|---|---|---|
| select_provider | 会社を切り替えた | provider |
| select_model | モデルを選んだ | provider, model |
| change_param | パラメーターを変えた | param, value |
| open_advanced | 詳細設定を開いた | model |
| view_estimate | 見積もりが表示された（1.2秒の待ち合わせ後） | model, monthly_usd, mode |
| generate_code | コードを生成した | provider, model, lang, mode, system, cache, search |
| switch_lang | 言語タブを切り替えた | lang, model |
| copy_snippet | コードをコピーした | provider, model, lang, mode |
| share_estimate | 共有URLをコピー・共有した | model, monthly_usd, with_prompt |
| open_shared | 共有URLから開いた | model, restored_count, ignored_count |

- 全イベントに `dataset_version` を付け、料金データの版ごとに比較できるようにする
- 広告のコンバージョン候補: `copy_snippet`（強い意図）、`generate_code`（中程度）

---

## 9. 共有URL

見積もりの条件をURLのクエリパラメーターに入れ、他の人がそのURLを開くと同じ条件で見積もりが再現されるようにする。

### URLの形

```
https://example.com/?m=claude-sonnet-5-5&out=800&rpd=500&effort=high&cache=50&batch=1
```

| キー | 中身 | 出典 |
|---|---|---|
| m | モデルID | models.model_id |
| その他 | 各パラメーターの値 | params.share_key |
| utm_source / utm_medium | 流入元の計測用（`share` / `referral`） | 固定値 |

- 初期値と同じ値はURLに入れない（URLを短く保つ）
- 真偽値は `1` / `0`
- `share_optin` が TRUE の項目（プロンプト、システムプロンプト）は、共有時に「プロンプトも含める」を選んだときだけ入れる。値は UTF-8 を base64url にしたもの。1,000文字を超える場合は含めない

### 開いたときの復元

1. `m` が models に存在し、`status` が `hidden` 以外ならそのモデルを選ぶ。なければ既定のモデル
2. 各 `share_key` の値を、param_map の `values`・`min`・`max` で検証する。合わない値は無視して初期値を使う
3. 復元できた数と無視した数を `open_shared` で GA4 に送る
4. 料金は開いた時点の prices で計算し直す。URLには金額を入れない

### 共有の操作

- 見積もりカードに「この見積もりを共有」ボタンを置く
- スマホでは OS の共有シート（Web Share API）、PC ではURLをクリップボードにコピー
- 共有の直前に、URLに含まれる項目を一覧で見せる。プロンプトを含めるかはそこで選ぶ

### 注意点

- URLは GA4 の `page_location` にそのまま記録される。プロンプトを含めたURLは、その内容が GA4 にも送られる。このため、プロンプトは既定で含めない
- GA4 に送る `page_location` から `p` と `sys` を取り除く処理を入れ、オプトインしたときも GA4 には残さない
- 共有した人と受け取った人で料金データの版が違うと金額が変わる。版が違う場合は「料金データ更新済み」と表示する（共有URLに `v`=dataset_version を入れて比較）

### 将来の拡張

- LINE や X で貼ったときに、金額入りのプレビュー画像（OGP）を出す。画像の生成にはサーバー処理が必要なため、Cloudflare Workers の無料枠で実装する

---

## 10. 今後の論点

- 為替: シートの GOOGLEFINANCE で足りるか、反映頻度をどうするか
- 日本語版・英語版の出し分け（同じシートで label 列を言語ごとに持つ）
- モデル追加の優先順位と、旧モデルを `legacy` として残すか
- 公開CSVのキャッシュ（Googleの反映遅延は数分程度）をUIでどう扱うか
