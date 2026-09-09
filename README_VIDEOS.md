# 動画ページ追加分(既存Supabaseプロジェクトに統合版)

`videos`テーブルは、既存のミュージカルクイズ用Supabaseプロジェクト(NotreDameProject)に追加しました。
新しい環境変数は不要です。既存の`NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_ANON_KEY`・`SUPABASE_SERVICE_ROLE_KEY`をそのまま使います。

## 展開方法

このZIPの中身を`musical-quiz-main/`直下に展開してください。既存ファイルは上書きしません(すべて新規ファイルです)。

- `app/videos/page.tsx` — 新規
- `app/videos/upload/page.tsx` — 新規
- `app/videos/upload/actions.ts` — 新規
- `lib/drive.ts` — 新規

`lib/supabase/client.ts`・`admin.ts`はそのまま使うので、今回は含めていません。

## 前回作った別プロジェクトについて

前回作成した「personal-videos」というSupabaseプロジェクトは、今回作った`videos`テーブルを引っ越したので、もう使いません。
Vercelにさっき登録した3つの環境変数(`NEXT_PUBLIC_VIDEOS_SUPABASE_URL`など)も不要になったので、削除してもらってOKです(残しておいても動作に影響はありません)。

「personal-videos」プロジェクト自体の削除は、こちらのツールからはできない操作でした。もし消したい場合は、Supabaseダッシュボードの該当プロジェクト → Project Settings → General → 一番下の「Delete Project」から手動で削除してください。

## セットアップ手順

1. ZIPの中身を`musical-quiz-main/`直下に展開する
2. 動画をGoogleドライブにアップロードし、共有設定を「リンクを知っている全員が閲覧可」に変更する
3. `npm run dev`で起動し、`/videos/upload`からタイトル+ドライブの共有リンクを登録
4. `/videos`で一覧・再生を確認
5. Vercelにデプロイする場合、環境変数は既存のものがそのまま使えるので追加登録は不要です

## 今後について

- 鍵(パスワード保護)は未実装です
- `/videos/upload`は現状誰でもアクセスできます
