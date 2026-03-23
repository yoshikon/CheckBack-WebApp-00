-- Create Review App Database Schema
-- This migration creates all tables required for the review application

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id varchar(36) PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id varchar(36) PRIMARY KEY,
  name text NOT NULL,
  description text,
  client_name text,
  due_date text,
  created_by varchar(36) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id varchar(36) PRIMARY KEY,
  project_id varchar(36) NOT NULL,
  name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  storage_path text,
  url text,
  thumbnail_url text,
  preview_path text,
  version_number integer NOT NULL DEFAULT 1,
  parent_file_id varchar(36),
  created_by varchar(36) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id varchar(36) PRIMARY KEY,
  file_id varchar(36) NOT NULL,
  parent_id varchar(36),
  author_type text NOT NULL,
  author_user_id varchar(36),
  guest_name text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Comment Anchors table
CREATE TABLE IF NOT EXISTS comment_anchors (
  comment_id varchar(36) PRIMARY KEY,
  anchor_type text NOT NULL DEFAULT 'point',
  page_no integer,
  x double precision,
  y double precision,
  w double precision,
  h double precision,
  video_timestamp double precision
);

-- Share Links table
CREATE TABLE IF NOT EXISTS share_links (
  id varchar(36) PRIMARY KEY,
  file_id varchar(36) NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  allow_download boolean NOT NULL DEFAULT true,
  perm_comment_read boolean NOT NULL DEFAULT true,
  perm_comment_write boolean NOT NULL DEFAULT true,
  is_revoked boolean NOT NULL DEFAULT false,
  password_hash text,
  created_by varchar(36) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Paint Annotations table
CREATE TABLE IF NOT EXISTS paint_annotations (
  id varchar(36) PRIMARY KEY,
  file_id varchar(36) NOT NULL,
  strokes_data text NOT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Comment Replies table
CREATE TABLE IF NOT EXISTS comment_replies (
  id varchar(36) PRIMARY KEY,
  comment_id varchar(36) NOT NULL,
  author_user_id varchar(36),
  guest_name text,
  body text NOT NULL,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE paint_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (true);

-- RLS Policies for projects table
CREATE POLICY "Users can view all projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Users can insert projects" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (true);

-- RLS Policies for files table
CREATE POLICY "Users can view all files" ON files
  FOR SELECT USING (true);

CREATE POLICY "Users can insert files" ON files
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update files" ON files
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete files" ON files
  FOR DELETE USING (true);

-- RLS Policies for comments table
CREATE POLICY "Users can view all comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert comments" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update comments" ON comments
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete comments" ON comments
  FOR DELETE USING (true);

-- RLS Policies for comment_anchors table
CREATE POLICY "Users can view comment anchors" ON comment_anchors
  FOR SELECT USING (true);

CREATE POLICY "Users can insert comment anchors" ON comment_anchors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update comment anchors" ON comment_anchors
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete comment anchors" ON comment_anchors
  FOR DELETE USING (true);

-- RLS Policies for share_links table
CREATE POLICY "Users can view all share links" ON share_links
  FOR SELECT USING (true);

CREATE POLICY "Users can insert share links" ON share_links
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update share links" ON share_links
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete share links" ON share_links
  FOR DELETE USING (true);

-- RLS Policies for paint_annotations table
CREATE POLICY "Users can view paint annotations" ON paint_annotations
  FOR SELECT USING (true);

CREATE POLICY "Users can insert paint annotations" ON paint_annotations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update paint annotations" ON paint_annotations
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete paint annotations" ON paint_annotations
  FOR DELETE USING (true);

-- RLS Policies for comment_replies table
CREATE POLICY "Users can view comment replies" ON comment_replies
  FOR SELECT USING (true);

CREATE POLICY "Users can insert comment replies" ON comment_replies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update comment replies" ON comment_replies
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete comment replies" ON comment_replies
  FOR DELETE USING (true);