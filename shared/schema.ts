import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Enums as string literals for TypeScript
export const memberRoles = ["admin", "manager", "creator", "viewer"] as const;
export type MemberRole = (typeof memberRoles)[number];

export const commentStatuses = ["open", "in_progress", "resolved"] as const;
export type CommentStatus = (typeof commentStatuses)[number];

export const authorTypes = ["internal", "guest"] as const;
export type AuthorType = (typeof authorTypes)[number];

export const anchorTypes = ["point", "rect"] as const;
export type AnchorType = (typeof anchorTypes)[number];

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Projects table
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  clientName: text("client_name"),
  dueDate: text("due_date"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Files table
export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  storagePath: text("storage_path"),
  url: text("url"),
  thumbnailUrl: text("thumbnail_url"),
  previewPath: text("preview_path"), // Path to generated preview image for PSD/AI files
  versionNumber: integer("version_number").notNull().default(1),
  parentFileId: text("parent_file_id"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// Comments table
export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  parentId: text("parent_id"),
  authorType: text("author_type").$type<AuthorType>().notNull(),
  authorUserId: text("author_user_id"),
  guestName: text("guest_name"),
  body: text("body").notNull(),
  status: text("status").$type<CommentStatus>().notNull().default("open"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  updatedAt: true,
});
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Comment Anchors table (for pin positions)
export const commentAnchors = sqliteTable("comment_anchors", {
  commentId: text("comment_id").primaryKey(),
  anchorType: text("anchor_type")
    .$type<AnchorType>()
    .notNull()
    .default("point"),
  pageNo: integer("page_no"),
  x: real("x"),
  y: real("y"),
  w: real("w"),
  h: real("h"),
  videoTimestamp: real("video_timestamp"),
});

export const insertCommentAnchorSchema = createInsertSchema(commentAnchors);
export type InsertCommentAnchor = z.infer<typeof insertCommentAnchorSchema>;
export type CommentAnchor = typeof commentAnchors.$inferSelect;

// Share Links table
export const shareLinks = sqliteTable("share_links", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  allowDownload: integer("allow_download", { mode: "boolean" })
    .notNull()
    .default(true),
  permCommentRead: integer("perm_comment_read", { mode: "boolean" })
    .notNull()
    .default(true),
  permCommentWrite: integer("perm_comment_write", { mode: "boolean" })
    .notNull()
    .default(true),
  isRevoked: integer("is_revoked", { mode: "boolean" })
    .notNull()
    .default(false),
  passwordHash: text("password_hash"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const insertShareLinkSchema = createInsertSchema(shareLinks).omit({
  id: true,
  createdAt: true,
});
export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;
export type ShareLink = typeof shareLinks.$inferSelect;

// Paint Annotations table (for storing paint strokes)
export const paintAnnotations = sqliteTable("paint_annotations", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  strokesData: text("strokes_data").notNull(), // JSON string of paint strokes
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const insertPaintAnnotationSchema = createInsertSchema(
  paintAnnotations,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaintAnnotation = z.infer<typeof insertPaintAnnotationSchema>;
export type PaintAnnotation = typeof paintAnnotations.$inferSelect;

// Comment Replies table
export const commentReplies = sqliteTable("comment_replies", {
  id: text("id").primaryKey(),
  commentId: text("comment_id").notNull(),
  authorUserId: text("author_user_id"),
  guestName: text("guest_name"),
  body: text("body"),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

export const insertCommentReplySchema = createInsertSchema(commentReplies).omit(
  {
    id: true,
    createdAt: true,
  },
);
export type InsertCommentReply = z.infer<typeof insertCommentReplySchema>;
export type CommentReply = typeof commentReplies.$inferSelect;

export interface CommentReplyWithAuthor extends CommentReply {
  author?: User;
}

// Extended types with relations
export interface FileWithComments extends File {
  comments: CommentWithAnchor[];
  project?: Project;
  paintAnnotation?: PaintAnnotation;
}

export interface CommentWithAnchor extends Comment {
  anchor?: CommentAnchor;
  author?: User;
  replies?: CommentReplyWithAuthor[];
}

export interface ProjectWithFiles extends Project {
  files: File[];
  fileCount: number;
  commentCount: number;
  // TODO: Fix this type in ProjectWithFiles
  // commentCount: number;
}

export interface ShareLinkWithFile extends ShareLink {
  file: FileWithComments;
}
