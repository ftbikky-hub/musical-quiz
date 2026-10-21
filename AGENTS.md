<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## SupabaseのData API権限（必須）

2026-10-30以降の既存プロジェクトを含め、新しい `public` テーブルへの自動GRANTに依存しないこと。SupabaseのDDL・migrationを扱う前に [supabase/AGENTS.md](supabase/AGENTS.md) と [権限・再構築の方針](supabase/permissions.md) を読むこと。

- CREATE TABLEと同じmigrationで、用途別の明示的GRANT、RLS有効化、必要なPolicyを実装する。
- `anon` / `authenticated` / `service_role` を個別に検討し、不要なINSERT / UPDATE / DELETEを与えない。一括GRANTや広範なALTER DEFAULT PRIVILEGESで済ませない。
- 既存テーブルの権限は必要な理由がある場合以外変更しない。`IF NOT EXISTS` の後で無条件にACLを置き換えない。
- SQLを変更したら `npm run test:supabase` を実行し、空のDB・自動GRANTなし・許可操作・拒否操作・RLSを確認する。新しいSQLやmigrationは検証対象にも追加する。
- 現状は完全なDB baselineがない。スキーマの不足を推測で埋めず、`supabase db reset` / 新規環境 / Preview Branchが全機能で動いたと未検証のまま報告しない。
