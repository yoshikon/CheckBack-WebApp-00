# 制作物レビュー＆フィードバック管理Webアプリ（MVP・変換なし前提）要件定義書（Markdown版）

- 文書名：制作物レビュー＆フィードバック管理Webアプリ 要件定義書（MVP / 変換なし）
- 版：v1.0
- 作成日：2026-01-21
- 前提技術スタック：Next.js（React/TypeScript） + Node.js（Route Handlers） + Supabase（Postgres/Auth/Storage）
- 方針：**変換なし**（画像はそのまま表示、PDFはブラウザ表示、OfficeはDLのみ）

---

## 0. 技術スタック（本要件の前提）

### 0.1 フロントエンド
- Next.js（App Router） / React
- TypeScript
- UI：Tailwind CSS（推奨）

### 0.2 バックエンド
- Node.js（Next.js Route Handlers / Server Actions）
- 共有リンク（ゲスト）向けAPIは **Service Role** にて実行（Supabaseに匿名アクセスさせない）

### 0.3 データベース / 認証 / ストレージ
- Supabase PostgreSQL（Free枠を起点）
- Supabase Auth（社内ユーザー認証）
- Supabase Storage（`assets` バケット。private運用 + Signed URL）

### 0.4 ホスティング / 実行基盤
- Vercel（Next.js）
- （将来）変換・プレビュー生成等の重処理は別Worker/コンテナで分離（フェーズ2以降）


## 1. 目的・背景

### 1.1 目的
- Webデザイナーの制作物（画像/PDF等）について、**レビュー（指示・コメント）→対応→再確認→承認**をWebアプリ内で完結させる。
- 指示を「対象箇所（座標/ページ）」に紐づけ、修正コミュニケーションの再説明コストを削減する。
- “確認待ち”の滞留を減らし、制作進行のスピードと品質を向上させる。

### 1.2 成功指標（例）
- 修正往復回数（平均）を削減
- “確認待ち”滞留時間を削減
- 共有リンク閲覧→初回コメントまでの時間を短縮

---

## 2. スコープ（MVP）

### 2.1 対象ファイル（変換なし）
- 画像：png / jpg（プレビュー可）
- PDF：ブラウザのPDFビューアでプレビュー可
- Adobe Photoshop：psd（MVPはプレビュー無し：アップロード・ダウンロード、コメントはファイル単位）
- Adobe Illustrator：ai（MVPはプレビュー無し：アップロード・ダウンロード、コメントはファイル単位）
- Office（docx/pptx/xlsx等）：**MVPではプレビュー無し**（アップロード・ダウンロードのみ）

### 2.2 共有リンク（ゲスト）
- ゲストは **Supabaseへ匿名アクセスしない**（DB/Storageへの直アクセスは禁止）
- 共有リンクは **Next.js API（Service Role）でゲート**し、ファイルは **Signed URL** で配布する

### 2.3 機能（MVP必須）
- 社内ログイン（Supabase Auth）
- プロジェクト（案件）管理
- ファイルアップロード（Storage）
- レビュー画面（プレビュー + コメント + ステータス）
- 共有リンク発行（token / 期限 / DL可否 / コメント権限）
- ゲストレビュー（共有リンクで閲覧、コメント閲覧/投稿は権限次第）

---

## 3. 画面設計（MVP）

### 3.1 社内画面（ログイン必須）
1. ログイン
2. ダッシュボード（最近のプロジェクト/ファイル）
3. プロジェクト一覧 / 詳細（ファイル一覧）
4. ファイルレビュー画面
   - 左：プレビュー（画像/PDF）
   - 右：コメント一覧（フィルタ：ステータス/投稿者/担当など）
   - コメント投稿（座標/ページ紐づけ）
   - コメントステータス更新（open / in_progress / resolved）
   - 共有リンク作成（モーダル）

- 注：psd/ai/Office等「プレビュー無し」対象は、MVPでは**ピン（座標/ページ）指定コメントは不可**とし、コメントはファイル単位（アンカー無し）で扱う。

5. 共有リンク設定モーダル
   - expires_at（有効期限）
   - allow_download（DL可否）
   - perm_comment_read / perm_comment_write（コメント閲覧/投稿）
   - password（任意：MVPでは未実装でも可）

### 3.2 ゲスト画面（共有リンク）
6. 共有リンクページ `/s/[token]`
   - ファイルプレビュー（画像/PDF）
   - コメント一覧（perm_comment_read=true の場合）
   - コメント投稿（perm_comment_write=true の場合）
   - ダウンロード（allow_download=true の場合のみUI表示）

> **注意（DL禁止の限界）**  
> ブラウザで閲覧できる以上、完全に保存を防ぐことは困難。MVPでは「DLボタン非表示＋DL用URLを発行しない」までを要件化し、厳密対策（透かし等）はフェーズ2で検討する。

---

## 4. API設計（Next.js Route Handlers）

### 4.1 社内API（JWT認証）
- `GET /api/projects`：自分が所属するプロジェクト一覧
- `POST /api/projects`：プロジェクト作成（workspaceのmanager以上）
- `GET /api/projects/:projectId`：プロジェクト詳細＋ファイル一覧
- `POST /api/projects/:projectId/files`：ファイルメタ作成（DB INSERT）
- `POST /api/files/:fileId/upload-url`：Signed Upload URL 発行
- `POST /api/files/:fileId/publish`：アップロード完了確定（storage_path反映）
- `GET /api/files/:fileId`：ファイル情報、コメント一覧
- `POST /api/files/:fileId/comments`：コメント作成（社内）
- `PATCH /api/comments/:commentId`：コメントステータス更新
- `POST /api/files/:fileId/share-links`：共有リンク作成（token/期限/権限/DL可否）

### 4.2 共有リンクAPI（tokenアクセス / Service Role）
- `GET /api/share/:token`：token検証（期限切れ/失効）＋ファイル/権限情報取得
- `GET /api/share/:token/signed-url`：Storage Signed Read URL 発行（短時間）
- `GET /api/share/:token/comments`：perm_comment_read=true の場合のみコメント一覧返却
- `POST /api/share/:token/comments`：perm_comment_write=true の場合のみゲストコメント作成

---

## 5. DB設計（Supabase Postgres）

### 5.1 Enum型
```sql
create type public.member_role as enum ('admin', 'manager', 'creator', 'viewer');
create type public.comment_status as enum ('open', 'in_progress', 'resolved');
create type public.author_type as enum ('internal', 'guest');
create type public.anchor_type as enum ('point', 'rect');
```

### 5.2 テーブル定義（DDL）

#### 5.2.1 workspaces / workspace_members
```sql
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null, -- auth.users.id（FKは運用次第）
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
```

#### 5.2.2 projects / project_members
```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  client_name text,
  due_date date,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
```

#### 5.2.3 files（変換なしMVP：1ファイル=1レコード）
```sql
create table public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  storage_bucket text not null default 'assets',
  storage_path text, -- upload完了後に確定
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```



**mime_type 運用例（参考）**
- `image/png`, `image/jpeg`, `application/pdf`
- `application/vnd.adobe.photoshop`（psd）
- `application/postscript` など（ai：環境により異なるため拡張子も併用して判定）

#### 5.2.4 share_links（共有リンク）
```sql
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  token text not null unique, -- 32-48 chars のランダム（URL-safe）
  expires_at timestamptz not null,
  allow_download boolean not null default true,
  perm_comment_read boolean not null default true,
  perm_comment_write boolean not null default true,
  is_revoked boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
```

#### 5.2.5 comments / comment_anchors（社内・ゲスト共通）
```sql
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade, -- スレッド（1段）
  author_type public.author_type not null,
  author_user_id uuid,           -- internal の場合のみ
  guest_name text,               -- guest の場合のみ
  body text not null,
  status public.comment_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comment_anchors (
  comment_id uuid primary key references public.comments(id) on delete cascade,
  anchor_type public.anchor_type not null default 'point',
  page_no int,         -- PDF用（画像はnull可）
  x float8, y float8,  -- 0-1 正規化（推奨）
  w float8, h float8   -- rect のとき使用
);
```

---

## 6. RLS（Row Level Security）設計（社内ユーザー向け）

### 6.1 方針
- 社内は `auth.uid()` に基づくRLSで完全統制
- 共有リンク（ゲスト）は **DBに匿名公開しない**  
  → 共有リンク閲覧・コメントは Next.js API（Service Role）経由で実行

### 6.2 ヘルパー関数
```sql
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql stable as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql stable as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_manager(p_project_id uuid)
returns boolean
language sql stable as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin','manager')
  );
$$;
```

### 6.3 ポリシー（例）

#### 6.3.1 workspaces / workspace_members
```sql
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy "workspaces_select_member"
on public.workspaces for select
using (public.is_workspace_member(id));

create policy "workspace_members_select_self"
on public.workspace_members for select
using (user_id = auth.uid());

create policy "workspace_members_manage_admin"
on public.workspace_members for all
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);
```

#### 6.3.2 projects / project_members
```sql
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "projects_select_member"
on public.projects for select
using (public.is_project_member(id));

create policy "projects_insert_workspace_manager"
on public.projects for insert
with check (
  public.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = projects.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin','manager')
  )
);

create policy "projects_update_manager"
on public.projects for update
using (public.is_project_manager(id))
with check (public.is_project_manager(id));

create policy "projects_delete_manager"
on public.projects for delete
using (public.is_project_manager(id));

create policy "project_members_select_member"
on public.project_members for select
using (public.is_project_member(project_id));

create policy "project_members_manage_manager"
on public.project_members for all
using (public.is_project_manager(project_id))
with check (public.is_project_manager(project_id));
```

#### 6.3.3 files
```sql
alter table public.files enable row level security;

create policy "files_select_project_member"
on public.files for select
using (public.is_project_member(project_id));

create policy "files_insert_project_member"
on public.files for insert
with check (
  public.is_project_member(project_id)
  and created_by = auth.uid()
);

create policy "files_update_owner_or_manager"
on public.files for update
using (
  created_by = auth.uid()
  or public.is_project_manager(project_id)
)
with check (
  created_by = auth.uid()
  or public.is_project_manager(project_id)
);

create policy "files_delete_manager"
on public.files for delete
using (public.is_project_manager(project_id));
```

#### 6.3.4 comments / comment_anchors
```sql
alter table public.comments enable row level security;
alter table public.comment_anchors enable row level security;

create policy "comments_select_project_member"
on public.comments for select
using (
  exists (
    select 1
    from public.files f
    where f.id = comments.file_id
      and public.is_project_member(f.project_id)
  )
);

create policy "comments_insert_internal_only"
on public.comments for insert
with check (
  author_type = 'internal'
  and author_user_id = auth.uid()
  and exists (
    select 1
    from public.files f
    where f.id = comments.file_id
      and public.is_project_member(f.project_id)
  )
);

create policy "comments_update_owner_or_manager"
on public.comments for update
using (
  (author_type = 'internal' and author_user_id = auth.uid())
  or exists (
    select 1
    from public.files f
    where f.id = comments.file_id
      and public.is_project_manager(f.project_id)
  )
)
with check (true);

create policy "anchors_select_project_member"
on public.comment_anchors for select
using (
  exists (
    select 1
    from public.comments c
    join public.files f on f.id = c.file_id
    where c.id = comment_anchors.comment_id
      and public.is_project_member(f.project_id)
  )
);

create policy "anchors_insert_internal_only"
on public.comment_anchors for insert
with check (
  exists (
    select 1
    from public.comments c
    where c.id = comment_anchors.comment_id
      and c.author_type = 'internal'
      and c.author_user_id = auth.uid()
  )
);
```

#### 6.3.5 share_links（社内のみ）
```sql
alter table public.share_links enable row level security;

create policy "share_links_select_project_member"
on public.share_links for select
using (
  exists (
    select 1
    from public.files f
    where f.id = share_links.file_id
      and public.is_project_member(f.project_id)
  )
);

create policy "share_links_manage_manager"
on public.share_links for all
using (
  exists (
    select 1
    from public.files f
    where f.id = share_links.file_id
      and public.is_project_manager(f.project_id)
  )
)
with check (
  exists (
    select 1
    from public.files f
    where f.id = share_links.file_id
      and public.is_project_manager(f.project_id)
  )
);
```

---

## 7. Storage設計（Supabase Storage）

### 7.1 バケット
- `assets`（private推奨）

### 7.2 オブジェクトパス規約（例）
- `workspaces/{workspace_id}/projects/{project_id}/files/{file_id}/{original_filename}`

### 7.3 アップロード/閲覧方式
- 社内アップロード：Signed Upload URL（サーバ発行）→ クライアントPUT
- ゲスト閲覧：共有リンクAPIがSigned Read URL（短時間）を返却 → ブラウザ表示

---

## 8. 共有リンク仕様（token + 期限 + DL可否）

### 8.1 token
- 32〜48文字のURL-safeランダム
- DBに `unique` 制約

### 8.2 有効性判定（API）
- `is_revoked = false`
- `expires_at > now()`

### 8.3 権限
- `perm_comment_read`：コメント閲覧可否
- `perm_comment_write`：コメント投稿可否
- `allow_download`：DL用リンク発行可否（UI表示可否）

---

## 9. 受入基準（MVP）

- 社内ユーザーがログインし、プロジェクトを作成・閲覧できる
- プロジェクトにファイルをアップロードし、画像/PDFをレビュー画面で表示できる
- コメントを対象箇所（座標/ページ）に紐づけて投稿できる
- コメントにステータス（open/in_progress/resolved）を付与し更新できる
- 共有リンクを発行でき、token/期限/DL可否/コメント権限が保存される
- ゲストが共有リンクでアクセスし、権限に応じて閲覧/コメント/（DL）できる
- DBはRLSにより社内ユーザーのプロジェクト範囲外データが参照できない

---

## 10. 次フェーズ（参考）
- PDF/Officeのページ画像化（プレビュー強化）
- バージョン管理、見比べ
- CSV出力
- 動画レビュー（タイムコード）
- 監査ログの拡張、SSO、IP制限
