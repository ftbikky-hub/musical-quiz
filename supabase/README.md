# スケジュール機能の削除

対象DBでの削除は **未実施**。この作業環境にはSQLを実行するDB接続情報・管理用認証情報がなく、設定されている公開anonキーでのREST接続もHTTP 401だったため、既存DBの実スキーマは確認できていません。

## 参照調査と保持するもの

| 対象 | リポジトリ内の参照元 | 対応 |
| --- | --- | --- |
| `shiki_schedules` | `/schedule` 専用の取得処理・型・画面、旧 `seed.sql` | アプリから削除。既存DBは `remove-schedule.sql` で削除 |
| `shiki_ticket_releases` | `/schedule` のチケット発売予定、旧 `seed.sql`。`schedule_id` が `shiki_schedules` を参照 | アプリから削除。既存DBでは先に削除 |
| `shiki_works` | `lib/supabase/queries.ts` と `cast-queries.ts`、観劇記録の候補取得・自動配役取得 | テーブル・データ・共有型・マスタ取得処理を維持 |
| `shiki_theaters` | 過去キャスト検索、観劇記録の候補取得、YouTubeの劇場絞り込み・同期 | テーブル・データ・共有型・マスタ取得処理を維持 |
| `cast_*`、`theater_*`、動画・メディア関連テーブル | 過去キャスト、観劇記録、YouTube、メディア | 変更なし |
| `archive_*` と `schedule_text` | 公演アーカイブの過去の日程情報 | 変更なし |
| `fmtYMD` | 過去キャストの検索結果・公演詳細・出演者詳細 | 維持 |
| Vercelの `/api/yt-sync` 定期実行 | YouTube同期 | 維持 |

削除する画面は `/schedule` と `components/schedule/` の6コンポーネントです。専用の地域フィルター、日程・色表示ユーティリティ、Leaflet依存も削除しました。`/schedule` は404になります。

`seed.sql` は共有マスタ2テーブルの定義・RLS・シードを残し、スケジュールのテーブル定義・索引・RLS・シードを除去しています。**既存DBの削除には `seed.sql` を使いません**。共有マスタのシードはID以外の一意制約がないため、既存DBへの再投入で重複が生じる可能性があります。

## 既存DBでの実行手順

1. 対象DBのバックアップを取得する。
2. Supabase SQL Editor、またはSQL実行権限のある接続で `check-schedule-dependencies.sql` を実行する。未知の外部キー・ビュー・関数参照があれば用途を調べる。`pg_cron` を使用していれば同ファイル末尾のジョブ確認も実行し、外部の同期・インポート処理がないことも確認する。既知の子テーブルの外部キーと、削除対象テーブル自身の制約・索引・RLSポリシーは削除に含まれる。
3. スケジュール機能を削除したアプリを反映し、旧アプリからのアクセスを止める。
4. `remove-schedule.sql` を実行する。削除対象は `public.shiki_ticket_releases` と `public.shiki_schedules` の2テーブルだけ。`RESTRICT` とトランザクションにより、未知の依存が残っている場合は削除を中止する。`CASCADE` に変更しない。
5. SQL末尾の結果で、削除対象2テーブルが `null`、共有マスタ2テーブルが存在することを確認する。過去キャスト検索、観劇記録、YouTube一覧も確認する。

psqlを使用する場合（`DATABASE_URL` は対象DBの接続情報）：

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/check-schedule-dependencies.sql
# 上記の結果とアプリの反映を確認してから実行
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/remove-schedule.sql
```

削除SQLは再実行可能です。DDL実行時に未知の依存やロック待ちで失敗した場合は、接続を終了してロールバックするか、SQL Editorで `ROLLBACK;` を実行してから原因を調べてください。
