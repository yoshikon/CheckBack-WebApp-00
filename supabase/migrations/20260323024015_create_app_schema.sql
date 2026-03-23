/*
  # アプリケーションスキーマの作成

  ## 概要
  SQLiteから移行したレビューアプリのスキーマをPostgreSQLで作成します。

  ## 新規テーブル
  - `users` - ユーザー情報（ID、ユーザー名、パスワード、メール等）
  - `projects` - プロジェクト情報（名前、説明、クライアント名、納期等）
  - `files` - アップロードされたファイル情報（プロジェクトID、URL、バージョン等）
  - `comments` - コメント情報（ファイルID、作成者タイプ、本文、ステータス等）
  - `comment_anchors` - コメントのピン位置情報（座標等）
  - `share_links` - 共有リンク情報（トークン、有効期限、権限等）
  - `paint_annotations` - ペイントアノテーション（ストロークデータ等）
  - `comment_replies` - コメント返信情報

  ## セキュリティ
  - 全テーブルにRLSを有効化
  - サーバーサイドのみのアクセスのため、認証済みユーザーのみアクセス可能なポリシーを設定

  ## 注意事項
  1. SQLiteのINTEGER timestampをTimestamptzに変換
  2. SQLiteのREAL型をDOUBLE PRECISIONに変換
  3. SQLiteのBOOLEAN integerをNATIVE BOOLEANに変換
*/

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  client_name text,
  due_date text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS files (
  id text PRIMARY KEY,
  project_id text,
  name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  storage_path text,
  url text,
  thumbnail_url text,
  preview_path text,
  version_number integer NOT NULL DEFAULT 1,
  parent_file_id text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage files"
  ON files
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  file_id text NOT NULL,
  parent_id text,
  author_type text NOT NULL,
  author_user_id text,
  guest_name text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS comment_anchors (
  comment_id text PRIMARY KEY,
  anchor_type text NOT NULL DEFAULT 'point',
  page_no integer,
  x double precision,
  y double precision,
  w double precision,
  h double precision,
  video_timestamp double precision
);

ALTER TABLE comment_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage comment_anchors"
  ON comment_anchors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS share_links (
  id text PRIMARY KEY,
  file_id text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  allow_download boolean NOT NULL DEFAULT true,
  perm_comment_read boolean NOT NULL DEFAULT true,
  perm_comment_write boolean NOT NULL DEFAULT true,
  is_revoked boolean NOT NULL DEFAULT false,
  password_hash text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage share_links"
  ON share_links
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS paint_annotations (
  id text PRIMARY KEY,
  file_id text NOT NULL,
  strokes_data text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE paint_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage paint_annotations"
  ON paint_annotations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS comment_replies (
  id text PRIMARY KEY,
  comment_id text NOT NULL,
  author_user_id text,
  guest_name text,
  body text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage comment_replies"
  ON comment_replies
  FOR SELECT
  TO authenticated
  USING (true);
