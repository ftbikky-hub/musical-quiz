# Supabase開発の必須ルール

## migrationと権限

- 新規・再作成する `public` テーブルは、同じmigration内で必要なGRANTを明示する。RLSのPolicyとテーブルACLは別物で、両方が必要。
- `anon` / `authenticated` / `service_role` のそれぞれについて、実際の呼び出しコードを調べて必要な操作だけ許可する。BYPASSRLSはテーブル権限の代わりにならない。
- 読み取り専用表に書き込み権限を付けない。メール等のサンプルのCRUDを全表へコピーしない。
- RLS対象の表は作成時にRLSを有効にし、既存の方針に合わせた役割・操作別のPolicyを同じmigrationで定義する。サービス経由の書き込みだけなら公開書き込みPolicyは作らない。
- 新規作成した表にのみ、必要なら既定ACLをREVOKEしてから最小GRANTを設定する。既存表・既存データへの無条件REVOKE / GRANT / RLS変更は禁止。変更が必要な場合は理由と影響を明示した専用migrationにする。
- `CREATE TABLE IF NOT EXISTS` を使う場合、既存表のACLを巻き込まないよう、存在確認からCREATE・初期ACLまでを同じ条件分岐に置く。
- IDENTITY / SERIALでINSERTする役割には、そのシーケンスのUSAGEも検討する。不要なUPDATEや全シーケンスへのGRANTを与えない。
- VIEWも個別にSELECTを付与し、RLSを引き継ぐ場合は `security_invoker = true` を維持する。RPCのEXECUTE、実行時の下位表のACL/RLSも確認する。
- 関数を新規作成する場合も、既定のPUBLIC EXECUTEに依存せず意図した役割を明示する。既存関数の権限変更は別途影響を調査する。
- 名前選択CookieはSupabase Authではない。アーカイブと観劇記録は現行設計でanon読み取り。`authenticated`だけにすると画面から読めない。公開範囲を変更する場合は本人認証の導入を含め別途設計する。

## 配置と検証

- 運用中のスキーマ定義を得た後の新しい変更は、時刻付き `supabase/migrations/*.sql` にする。SQL Editorだけで完結させない。
- 現在のルートSQLは履歴・手動適用用であり、CLIのmigration履歴ではない。現状と不足は [permissions.md](permissions.md) を読む。過去SQLを本番へ再投入しない。
- `tests/supabase-permissions.test.mjs` のSQL登録一覧に新しいSQLを追加し、許可・拒否の両方をテストする。未登録SQLがあればテストは失敗する。
- `npm run test:supabase` で自動GRANTがない空DBと、旧来の広い既定GRANTがあるDBの両方から検証する。既存表のACLを変更しないこともテストする。
- 完全なbaselineが整ったら、破棄可能なローカル環境の `supabase db reset` とPostgREST経由の匿名・認証・サービス用キーでの操作も検証する。共有・本番・既存データのあるDBにresetを実行しない。
- スキーマ定義が不足している場合は勝手に業務制約やRLSを創作しない。構造のみのdump（データ・秘密鍵を含めない）を取得してからbaselineを確定する。
