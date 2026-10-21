# Data API権限とDB再構築

2026-10-30以降の既存プロジェクトを含む、自動GRANTがない環境に対応する開発方針。作成SQLの明示的GRANTとRLSを検証する。**この対応で既存・本番DBの権限を変更する必要はなく、実際のDB変更も実行していない。**

## 調査した設計と最小権限

`lib/supabase/client.ts` / `server.ts` は公開用クライアント（anon）、`admin.ts` はサーバー専用service_role。名前選択CookieはSupabase Authセッションではない。anonのアクセスをauthenticatedだけに替えると図書室等が読めなくなる。

| 新規作成対象 | anon / authenticated | service_role | 根拠 |
| --- | --- | --- | --- |
| shiki_works / shiki_theaters | SELECT | SELECT | 公開マスタ取得、YouTube同期時のマスタ照会。アプリから書き込まない |
| theater_logs | SELECT | SELECT / INSERT / UPDATE / DELETE | 観劇記録の作成・編集・削除 |
| theater_log_casts | SELECT | SELECT / INSERT / DELETE | 編集時は削除・再登録。UPDATEは呼ばない |
| theater_log_photos | SELECT | SELECT / INSERT / UPDATE / DELETE | 写真の登録・キャプション編集・削除 |
| theater_log_companions | SELECT | SELECT / INSERT / DELETE | 同行者は削除・再登録。UPDATEは呼ばない |
| 現行のarchive_runs / archive_cast / archive_staff / archive_works / archive_venues | SELECT | なし | 図書室と観劇記録の入力候補。投入はTable Editor等の管理操作 |
| 旧版archive_cast（履歴SQLのみ） | authenticatedのみSELECT | なし | 旧設計を保持。現在のスキーマとして使わない |

RLSは全対象表で有効。読み取りPolicyを維持し、公開用の書き込みPolicyを作らない。service_roleはBYPASSRLSだがACLは必要。cast_performersはDDLが欠けている既存の依存先で、観劇記録SQLに既存のSELECT / INSERT付与がある。採番に必要な対象シーケンスのUSAGEも明示する。

## 変更箇所と既存環境への影響

- `seed.sql` / `theater-log.sql` / `theater-log-social.sql`: 表が存在しない場合だけCREATE・RLS有効化・初期ACLのREVOKEと最小GRANTを行う。既存表のACLを置き換えない。従来の広い既定GRANTがあっても、新規作成分は最小権限に揃う。
- `archive-runs-cast-staff.sql` / `archive-works-venues.sql`: CREATEと同じファイルに表・ビュー・RPCの読み取り権限とanon用Policyを定義。以前に適用済みの `archive-name-selection-read.sql` の方針を、作成元にも反映する。
- `archive-cast.sql`: 履歴の単独テーブルも、新規作成時の既定ACLを除去してauthenticatedのSELECTだけ明示する。
- `theater-log.sql`: 空テーブルでもsetvalが失敗しないようにし、IDENTITYの再追加を防ぐ。既存IDは変えない。
- 本番にこれらの履歴SQLを再投入しない。seedの重複投入や旧DDLとの衝突を避ける。
- `ALTER DEFAULT PRIVILEGES` や `ALL TABLES` による運用DBへの一括権限変更は行わない。

## 検証

```sh
npm ci
npm run test:supabase
```

PGlite（PostgreSQLのWASM版）上で、作成SQLを実際に実行する。単なるSQL文字列の検査ではない。

- 自動GRANTがない空DB / 従来の広い自動GRANTがある空DBの双方から、新規表の実効ACLとRLSを確認。
- anon / authenticatedの読取成功、書込拒否、service_roleの必要操作の成功と不要操作の拒否を確認。
- RLSの読み取りPolicyがなければ、SELECT権限があっても行を返さないことを確認。
- アーカイブのsecurity_invokerビュー6個とRPC10個を両公開ロールで呼び出す。
- IF NOT EXISTS相当の再実行が既存表の独自ACLを変更しないこと、空表からの採番を確認。
- 新しいSQLやmigrationを未登録のまま追加すると検証が失敗する。登録時には期待ACL・操作テストも追加する。
- GitHub Actionsの `Supabase permissions` でも同じ検証を行う。

テスト用のauth.users、profiles、cast_performers、storage.bucketsは既存依存先の最小fixture。これらの本番DDLやRLSを復元したものではない。PGliteではpgcrypto拡張の作成だけ省略し、UUIDはPostgreSQL組み込み関数を使う。

## 完全なdb reset / 新規環境 / Preview Branchについて

**現在のリポジトリにCLI用のmigration履歴・完全なbaselineはない。今回検証できたのは上記の作成SQLと依存fixtureであり、全機能のData API再構築完了ではない。**

DDLのない対象をアプリの参照から確認した：

- `profiles`、`cast_performers` / `cast_roles` / `cast_performances` / `cast_appearances`
- `media`、`yt_works` / `yt_performers` / `yt_videos` / `yt_video_performers` / `yt_sync_cursor`
- クイズの `questions` / `choices` / `players` / `question_progress` / `quiz_answer_log`
- `leaderboard`ビュー、cast集計RPC、Auth→profiles同期トリガー等

これらの制約・RLSを推測で再作成すると、データ破損や公開範囲変更につながるため行わない。完全再構築には、管理接続から取得した構造のみのdumpが必要。例（データを含めない）：

```sh
pg_dump "$DATABASE_URL" --schema-only --schema=public --no-owner \
  --file=work/public-schema.sql
```

dumpのGRANT・RLS・Policy・FK・関数・ビュー・シーケンスを確認し、`auth.users`上のプロフィール同期トリガーやStorage設定などpublic以外の必要な定義も別途取得する。秘密鍵やAuth利用者データはコミットしない。

その後、次の順序で完成させる：

1. 取得した現行DDLを時刻付きbaseline migrationにまとめ、既存DBでは内容の一致とmigration履歴だけを慎重に整合させる。空DB向けbaselineを運用中DBへそのまま実行しない。
2. 表ごとの上記の権限方針と、クイズの実際の書き込み等を個別に検証。新しい変更もCREATEと同じmigrationに権限・RLSを定義する。
3. 破棄可能なローカルSupabaseで `supabase db reset` を実行。続いてPostgREST経由の匿名・認証・サービス用キーで許可操作・拒否操作を確認する。
4. 新規環境・Preview Branchでも同様に確認する。

作業環境にはDB管理接続がなく、スキーマ全体の取得と上記の完全再構築 / PostgREST検証は未実施。本番の権限を一括変更するmigrationや、再構築できたように見せる不完全なbaselineは追加しない。

## 既存DBの読み取り専用監査

`check-data-api-privileges.sql` はSQL Editorで実行できる。表ごとの3ロールの実効権限、RLS、Policy、シーケンスUSAGEだけを表示し、データ・権限を変更しない。既存表の権限変更が必要かは、この結果と実際の用途を比較して判断する。
