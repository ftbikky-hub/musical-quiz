# 動画ページ追加分(musical-quiz-main用に調整済み)

いただいたプロジェクト構成を確認し、既存ファイルと衝突しないように調整しました。
このZIPは、プロジェクトのルート(`musical-quiz-main/`の中)に**そのまま展開して上書きして問題ありません**。
既存ファイルは一切上書きしません(すべて新規ファイルです)。

## 何が起きるか

- `app/videos/page.tsx` — 新規(既存に`app/videos`なし)
- `app/videos/upload/page.tsx` — 新規
- `app/videos/upload/actions.ts` — 新規
- `lib/supabase/videos-client.ts` — 新規。既存の`lib/supabase/client.ts`(ミュージカルクイズ用DB)とは別ファイル・別名にしています
- `lib/supabase/videos-admin.ts` — 新規。既存の`lib/supabase/admin.ts`とは別ファイル・別名にしています
- `lib/drive.ts` — 新規

`@supabase/supabase-js`は既にpackage.jsonに入っているので、追加インストールは不要です。

## なぜファイル名・環境変数名を変えたか

既存の`lib/supabase/client.ts`と`admin.ts`は、`NEXT_PUBLIC_SUPABASE_URL`と`SUPABASE_SERVICE_ROLE_KEY`を使ってミュージカルクイズ用のSupabaseプロジェクトに繋いでいました。
動画機能は別のSupabaseプロジェクト(personal-videos)なので、同じ名前を使うと既存の接続を壊してしまいます。そのため動画機能専用に以下の名前を使っています。

- `NEXT_PUBLIC_VIDEOS_SUPABASE_URL`
- `NEXT_PUBLIC_VIDEOS_SUPABASE_ANON_KEY`
- `VIDEOS_SUPABASE_SERVICE_ROLE_KEY`

## セットアップ手順

1. このZIPの中身を`musical-quiz-main/`直下に展開する(上書きしてOK、衝突なし)
2. `ENV_VARS_TO_ADD.txt`の中身を、既存の`.env.local`に**追記**する
   - `VIDEOS_SUPABASE_SERVICE_ROLE_KEY`だけは、Supabaseダッシュボードの`personal-videos`プロジェクト → Project Settings → API Keys → service_role から自分でコピーして貼り付けてください
3. 動画をGoogleドライブにアップロードし、共有設定を「リンクを知っている全員が閲覧可」に変更する
4. `npm run dev`で起動し、`/videos/upload`からタイトル+ドライブの共有リンクを登録
5. `/videos`で一覧・再生を確認

## 今後について

- 鍵(パスワード保護)は未実装です
- `/videos/upload`は現状誰でもアクセスできます。ナビゲーションへのリンク追加なども今回は行っていません(依頼範囲外のため)
