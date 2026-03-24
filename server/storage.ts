import { randomUUID } from "crypto";
import { supabase } from "./db";
import bcrypt from "bcryptjs";
import type {
  User, InsertUser,
  Project, InsertProject, ProjectWithFiles,
  File, InsertFile, FileWithComments,
  Comment, InsertComment, CommentWithAnchor,
  CommentAnchor, InsertCommentAnchor,
  ShareLink, InsertShareLink, ShareLinkWithFile,
  PaintAnnotation, InsertPaintAnnotation,
  CommentReply, InsertCommentReply, CommentReplyWithAuthor,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, updates: Partial<Pick<User, 'displayName'>>): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;

  getProjects(userId: string): Promise<ProjectWithFiles[]>;
  getProject(id: string): Promise<ProjectWithFiles | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  getFile(id: string): Promise<FileWithComments | undefined>;
  getFilesByProject(projectId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, updates: Partial<File>): Promise<File | undefined>;
  deleteFile(id: string): Promise<void>;

  getCommentsByFile(fileId: string): Promise<CommentWithAnchor[]>;
  createComment(comment: InsertComment, anchor?: InsertCommentAnchor): Promise<CommentWithAnchor>;
  updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined>;
  updateCommentAnchor(commentId: string, x: number, y: number): Promise<CommentAnchor | undefined>;
  deleteComment(id: string): Promise<void>;

  getShareLinkByToken(token: string): Promise<ShareLinkWithFile | undefined>;
  createShareLink(shareLink: InsertShareLink): Promise<ShareLink>;
  revokeShareLink(id: string): Promise<void>;

  getQuickCheckFiles(userId: string): Promise<File[]>;
  createQuickCheckFile(params: {
    name: string;
    url: string;
    mimeType: string;
    size: number;
    createdBy: string;
    sourceUrl?: string;
    previewPath?: string | null;
    previewUrl?: string | null;
  }): Promise<File>;

  getPaintAnnotation(fileId: string): Promise<PaintAnnotation | undefined>;
  savePaintAnnotation(annotation: InsertPaintAnnotation): Promise<PaintAnnotation>;

  getRepliesByComment(commentId: string): Promise<CommentReplyWithAuthor[]>;
  createReply(reply: InsertCommentReply): Promise<CommentReplyWithAuthor>;
  deleteReply(id: string): Promise<void>;
}

function toUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    email: row.email ?? null,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    createdAt: new Date(row.created_at),
  };
}

function toProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    clientName: row.client_name ?? null,
    dueDate: row.due_date ?? null,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toFile(row: any): File {
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    name: row.name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes ?? 0,
    storagePath: row.storage_path ?? null,
    url: row.url ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    previewPath: row.preview_path ?? null,
    versionNumber: row.version_number ?? 1,
    parentFileId: row.parent_file_id ?? null,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toComment(row: any): Comment {
  return {
    id: row.id,
    fileId: row.file_id,
    parentId: row.parent_id ?? null,
    authorType: row.author_type,
    authorUserId: row.author_user_id ?? null,
    guestName: row.guest_name ?? null,
    body: row.body,
    status: row.status ?? "open",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toCommentAnchor(row: any): CommentAnchor {
  return {
    commentId: row.comment_id,
    anchorType: row.anchor_type ?? "point",
    pageNo: row.page_no ?? null,
    x: row.x ?? null,
    y: row.y ?? null,
    w: row.w ?? null,
    h: row.h ?? null,
    videoTimestamp: row.video_timestamp ?? null,
  };
}

function toShareLink(row: any): ShareLink {
  return {
    id: row.id,
    fileId: row.file_id,
    token: row.token,
    expiresAt: new Date(row.expires_at),
    allowDownload: row.allow_download ?? true,
    permCommentRead: row.perm_comment_read ?? true,
    permCommentWrite: row.perm_comment_write ?? true,
    isRevoked: row.is_revoked ?? false,
    passwordHash: row.password_hash ?? null,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  };
}

function toPaintAnnotation(row: any): PaintAnnotation {
  return {
    id: row.id,
    fileId: row.file_id,
    strokesData: row.strokes_data,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toReply(row: any): CommentReply {
  return {
    id: row.id,
    commentId: row.comment_id,
    authorUserId: row.author_user_id ?? null,
    guestName: row.guest_name ?? null,
    body: row.body ?? null,
    attachmentUrl: row.attachment_url ?? null,
    attachmentName: row.attachment_name ?? null,
    attachmentType: row.attachment_type ?? null,
    createdAt: new Date(row.created_at),
  };
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.seedData().catch(console.error);
  }

  private async cleanupLocalPathRecords() {
    try {
      const { data: brokenFiles } = await supabase
        .from("files")
        .select("id")
        .or("url.like./uploads/%,url.like.http://localhost%");
      if (!brokenFiles || brokenFiles.length === 0) return;
      for (const { id: fileId } of brokenFiles) {
        const { data: comments } = await supabase.from("comments").select("id").eq("file_id", fileId);
        if (comments && comments.length > 0) {
          const commentIds = (comments as any[]).map((c) => c.id);
          await supabase.from("comment_replies").delete().in("comment_id", commentIds);
          await supabase.from("comment_anchors").delete().in("comment_id", commentIds);
        }
        await supabase.from("comments").delete().eq("file_id", fileId);
        await supabase.from("paint_annotations").delete().eq("file_id", fileId);
        await supabase.from("share_links").delete().eq("file_id", fileId);
        await supabase.from("files").delete().eq("id", fileId);
      }
    } catch (e) {
      console.error("cleanupLocalPathRecords error:", e);
    }
  }

  private async seedData() {
    await this.cleanupLocalPathRecords();
    const { data: existingUsers } = await supabase.from("users").select("id").limit(1);
    if (existingUsers && existingUsers.length > 0) return;

    const hashedPassword = await bcrypt.hash("demo", 10);
    await supabase.from("users").insert({
      id: "demo-user-id",
      username: "demo",
      password: hashedPassword,
      email: "demo@example.com",
      display_name: "Demo User",
      avatar_url: null,
    });

    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await supabase.from("projects").insert({
      id: "sample-project-id",
      name: "ウェブサイトリニューアル",
      description: "モダンなUI/UXを取り入れた企業サイトの全面リニューアル",
      client_name: "株式会社サンプル",
      due_date: dueDate,
      created_by: "demo-user-id",
    });

    await supabase.from("files").insert([
      {
        id: "sample-file-id",
        project_id: "sample-project-id",
        name: "トップページデザイン.png",
        mime_type: "image/png",
        size_bytes: 245000,
        storage_path: null,
        url: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&h=800&fit=crop",
        thumbnail_url: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=300&fit=crop",
        version_number: 1,
        parent_file_id: null,
        created_by: "demo-user-id",
      },
      {
        id: "sample-file-v2-id",
        project_id: "sample-project-id",
        name: "トップページデザイン.png",
        mime_type: "image/png",
        size_bytes: 267000,
        storage_path: null,
        url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop",
        thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
        version_number: 2,
        parent_file_id: "sample-file-id",
        created_by: "demo-user-id",
      },
    ]);

    await supabase.from("comments").insert([
      {
        id: "comment-1",
        file_id: "sample-file-id",
        parent_id: null,
        author_type: "internal",
        author_user_id: "demo-user-id",
        guest_name: null,
        body: "ヘッダーナビゲーションの項目間のスペースをもう少し広げてください",
        status: "open",
      },
      {
        id: "comment-2",
        file_id: "sample-file-id",
        parent_id: null,
        author_type: "internal",
        author_user_id: "demo-user-id",
        guest_name: null,
        body: "このボタンをもっと目立たせることはできますか？",
        status: "in_progress",
      },
      {
        id: "comment-3",
        file_id: "sample-file-id",
        parent_id: null,
        author_type: "guest",
        author_user_id: null,
        guest_name: "クライアント",
        body: "配色がとても良いですね！承認します。",
        status: "resolved",
      },
    ]);

    await supabase.from("comment_anchors").insert([
      { comment_id: "comment-1", anchor_type: "point", page_no: null, x: 0.15, y: 0.08, w: null, h: null, video_timestamp: null },
      { comment_id: "comment-2", anchor_type: "point", page_no: null, x: 0.65, y: 0.45, w: null, h: null, video_timestamp: null },
      { comment_id: "comment-3", anchor_type: "point", page_no: null, x: 0.80, y: 0.75, w: null, h: null, video_timestamp: null },
    ]);
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
    return data ? toUser(data) : undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("username", username).maybeSingle();
    return data ? toUser(data) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const { data, error } = await supabase.from("users").insert({
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email ?? null,
      display_name: insertUser.displayName ?? null,
      avatar_url: insertUser.avatarUrl ?? null,
    }).select("*").single();
    if (error) throw error;
    return toUser(data);
  }

  async updateUserProfile(id: string, updates: Partial<Pick<User, 'displayName'>>): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .update({ display_name: updates.displayName })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toUser(data);
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    const { error } = await supabase.from("users").update({ password: hashedPassword }).eq("id", id);
    if (error) throw error;
  }

  async getProjects(userId: string): Promise<ProjectWithFiles[]> {
    const { data: rows, error } = await supabase
      .from("projects")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!rows) return [];

    return Promise.all(
      rows.map(async (row) => {
        const project = toProject(row);
        const projectFiles = await this.getFilesByProject(project.id);
        const allComments = await Promise.all(projectFiles.map((f) => this.getCommentsByFile(f.id)));
        return {
          ...project,
          files: projectFiles,
          fileCount: projectFiles.length,
          commentCount: allComments.flat().length,
        };
      })
    );
  }

  async getProject(id: string): Promise<ProjectWithFiles | undefined> {
    const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
    if (!data) return undefined;
    const project = toProject(data);
    const projectFiles = await this.getFilesByProject(project.id);
    const allComments = await Promise.all(projectFiles.map((f) => this.getCommentsByFile(f.id)));
    return {
      ...project,
      files: projectFiles,
      fileCount: projectFiles.length,
      commentCount: allComments.flat().length,
    };
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const { data, error } = await supabase.from("projects").insert({
      id,
      name: insertProject.name,
      description: insertProject.description ?? null,
      client_name: insertProject.clientName ?? null,
      due_date: insertProject.dueDate ?? null,
      created_by: insertProject.createdBy,
    }).select("*").single();
    if (error) throw error;
    return toProject(data);
  }

  async deleteProject(id: string): Promise<void> {
    const projectFiles = await this.getFilesByProject(id);
    for (const file of projectFiles) {
      await this.deleteFile(file.id);
    }
    await supabase.from("projects").delete().eq("id", id);
  }

  async getFile(id: string): Promise<FileWithComments | undefined> {
    const { data } = await supabase.from("files").select("*").eq("id", id).maybeSingle();
    if (!data) return undefined;
    const file = toFile(data);
    const fileComments = await this.getCommentsByFile(file.id);
    const { data: projectData } = file.projectId
      ? await supabase.from("projects").select("*").eq("id", file.projectId).maybeSingle()
      : { data: null };
    const paintAnnotation = await this.getPaintAnnotation(file.id);
    return {
      ...file,
      comments: fileComments,
      project: projectData ? toProject(projectData) : undefined,
      paintAnnotation,
    };
  }

  async getFilesByProject(projectId: string): Promise<File[]> {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(toFile);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const { data, error } = await supabase.from("files").insert({
      id,
      project_id: insertFile.projectId ?? null,
      name: insertFile.name,
      mime_type: insertFile.mimeType,
      size_bytes: insertFile.sizeBytes ?? 0,
      storage_path: insertFile.storagePath ?? null,
      url: insertFile.url ?? null,
      thumbnail_url: insertFile.thumbnailUrl ?? null,
      preview_path: insertFile.previewPath ?? null,
      version_number: insertFile.versionNumber ?? 1,
      parent_file_id: insertFile.parentFileId ?? null,
      created_by: insertFile.createdBy,
    }).select("*").single();
    if (error) throw error;
    return toFile(data);
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File | undefined> {
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.thumbnailUrl !== undefined) patch.thumbnail_url = updates.thumbnailUrl;
    if (updates.previewPath !== undefined) patch.preview_path = updates.previewPath;
    if (updates.url !== undefined) patch.url = updates.url;

    const { data, error } = await supabase.from("files").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? toFile(data) : undefined;
  }

  async deleteFile(id: string): Promise<void> {
    const fileComments = await this.getCommentsByFile(id);
    for (const comment of fileComments) {
      await this.deleteComment(comment.id);
    }
    await supabase.from("share_links").delete().eq("file_id", id);
    await supabase.from("paint_annotations").delete().eq("file_id", id);
    await supabase.from("files").delete().eq("id", id);
  }

  async getCommentsByFile(fileId: string): Promise<CommentWithAnchor[]> {
    const { data: rows, error } = await supabase
      .from("comments")
      .select("*")
      .eq("file_id", fileId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!rows) return [];

    return Promise.all(
      rows.map(async (row) => {
        const comment = toComment(row);
        const { data: anchorRow } = await supabase
          .from("comment_anchors")
          .select("*")
          .eq("comment_id", comment.id)
          .maybeSingle();
        const { data: authorRow } = comment.authorUserId
          ? await supabase.from("users").select("*").eq("id", comment.authorUserId).maybeSingle()
          : { data: null };
        const replies = await this.getRepliesByComment(comment.id);
        return {
          ...comment,
          anchor: anchorRow ? toCommentAnchor(anchorRow) : undefined,
          author: authorRow ? toUser(authorRow) : undefined,
          replies,
        };
      })
    );
  }

  async createComment(insertComment: InsertComment, anchor?: InsertCommentAnchor): Promise<CommentWithAnchor> {
    const id = randomUUID();
    const { data, error } = await supabase.from("comments").insert({
      id,
      file_id: insertComment.fileId,
      parent_id: insertComment.parentId ?? null,
      author_type: insertComment.authorType,
      author_user_id: insertComment.authorUserId ?? null,
      guest_name: insertComment.guestName ?? null,
      body: insertComment.body,
      status: insertComment.status ?? "open",
      created_at: insertComment.createdAt ? new Date(insertComment.createdAt as any).toISOString() : undefined,
    }).select("*").single();
    if (error) throw error;
    const comment = toComment(data);

    let savedAnchor: CommentAnchor | undefined;
    if (anchor) {
      const { data: anchorData } = await supabase.from("comment_anchors").insert({
        comment_id: id,
        anchor_type: anchor.anchorType ?? "point",
        page_no: anchor.pageNo ?? null,
        x: anchor.x ?? null,
        y: anchor.y ?? null,
        w: anchor.w ?? null,
        h: anchor.h ?? null,
        video_timestamp: anchor.videoTimestamp ?? null,
      }).select("*").single();
      if (anchorData) savedAnchor = toCommentAnchor(anchorData);
    }

    const { data: authorRow } = comment.authorUserId
      ? await supabase.from("users").select("*").eq("id", comment.authorUserId).maybeSingle()
      : { data: null };

    return { ...comment, anchor: savedAnchor, author: authorRow ? toUser(authorRow) : undefined };
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined> {
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.body !== undefined) patch.body = updates.body;
    const { data, error } = await supabase.from("comments").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? toComment(data) : undefined;
  }

  async updateCommentAnchor(commentId: string, x: number, y: number): Promise<CommentAnchor | undefined> {
    const { data, error } = await supabase
      .from("comment_anchors")
      .update({ x, y })
      .eq("comment_id", commentId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? toCommentAnchor(data) : undefined;
  }

  async deleteComment(id: string): Promise<void> {
    await supabase.from("comment_replies").delete().eq("comment_id", id);
    await supabase.from("comment_anchors").delete().eq("comment_id", id);
    await supabase.from("comments").delete().eq("id", id);
  }

  async getShareLinkByToken(token: string): Promise<ShareLinkWithFile | undefined> {
    const { data } = await supabase
      .from("share_links")
      .select("*")
      .eq("token", token)
      .eq("is_revoked", false)
      .maybeSingle();
    if (!data) return undefined;
    const shareLink = toShareLink(data);
    if (shareLink.expiresAt < new Date()) return undefined;
    const file = await this.getFile(shareLink.fileId);
    if (!file) return undefined;
    return { ...shareLink, file };
  }

  async createShareLink(insertShareLink: InsertShareLink): Promise<ShareLink> {
    const id = randomUUID();
    const { data, error } = await supabase.from("share_links").insert({
      id,
      file_id: insertShareLink.fileId,
      token: insertShareLink.token,
      expires_at: new Date(insertShareLink.expiresAt as any).toISOString(),
      allow_download: insertShareLink.allowDownload ?? true,
      perm_comment_read: insertShareLink.permCommentRead ?? true,
      perm_comment_write: insertShareLink.permCommentWrite ?? true,
      is_revoked: insertShareLink.isRevoked ?? false,
      password_hash: insertShareLink.passwordHash ?? null,
      created_by: insertShareLink.createdBy,
    }).select("*").single();
    if (error) throw error;
    return toShareLink(data);
  }

  async revokeShareLink(id: string): Promise<void> {
    await supabase.from("share_links").update({ is_revoked: true }).eq("id", id);
  }

  async getQuickCheckFiles(userId: string): Promise<File[]> {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("created_by", userId)
      .is("project_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []).map(toFile);
  }

  async createQuickCheckFile(params: {
    name: string;
    url: string;
    mimeType: string;
    size: number;
    createdBy: string;
    sourceUrl?: string;
    previewPath?: string | null;
    previewUrl?: string | null;
  }): Promise<File> {
    const id = randomUUID();
    const { data, error } = await supabase.from("files").insert({
      id,
      project_id: null,
      name: params.name,
      mime_type: params.mimeType,
      size_bytes: params.size,
      url: params.url,
      thumbnail_url: params.previewUrl || params.url,
      preview_path: params.previewPath || null,
      version_number: 1,
      parent_file_id: null,
      created_by: params.createdBy,
    }).select("*").single();
    if (error) throw error;
    return toFile(data);
  }

  async getPaintAnnotation(fileId: string): Promise<PaintAnnotation | undefined> {
    const { data } = await supabase
      .from("paint_annotations")
      .select("*")
      .eq("file_id", fileId)
      .maybeSingle();
    return data ? toPaintAnnotation(data) : undefined;
  }

  async savePaintAnnotation(annotation: InsertPaintAnnotation): Promise<PaintAnnotation> {
    const existing = await this.getPaintAnnotation(annotation.fileId);
    if (existing) {
      const { data, error } = await supabase
        .from("paint_annotations")
        .update({ strokes_data: annotation.strokesData, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return toPaintAnnotation(data);
    } else {
      const id = randomUUID();
      const { data, error } = await supabase.from("paint_annotations").insert({
        id,
        file_id: annotation.fileId,
        strokes_data: annotation.strokesData,
        created_by: annotation.createdBy,
      }).select("*").single();
      if (error) throw error;
      return toPaintAnnotation(data);
    }
  }

  async getRepliesByComment(commentId: string): Promise<CommentReplyWithAuthor[]> {
    const { data: rows, error } = await supabase
      .from("comment_replies")
      .select("*")
      .eq("comment_id", commentId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!rows) return [];

    return Promise.all(
      rows.map(async (row) => {
        const reply = toReply(row);
        const { data: authorRow } = reply.authorUserId
          ? await supabase.from("users").select("*").eq("id", reply.authorUserId).maybeSingle()
          : { data: null };
        return { ...reply, author: authorRow ? toUser(authorRow) : undefined };
      })
    );
  }

  async createReply(insertReply: InsertCommentReply): Promise<CommentReplyWithAuthor> {
    const id = randomUUID();
    const { data, error } = await supabase.from("comment_replies").insert({
      id,
      comment_id: insertReply.commentId,
      author_user_id: insertReply.authorUserId ?? null,
      guest_name: insertReply.guestName ?? null,
      body: insertReply.body ?? null,
      attachment_url: insertReply.attachmentUrl ?? null,
      attachment_name: insertReply.attachmentName ?? null,
      attachment_type: insertReply.attachmentType ?? null,
    }).select("*").single();
    if (error) throw error;
    const reply = toReply(data);
    const { data: authorRow } = reply.authorUserId
      ? await supabase.from("users").select("*").eq("id", reply.authorUserId).maybeSingle()
      : { data: null };
    return { ...reply, author: authorRow ? toUser(authorRow) : undefined };
  }

  async deleteReply(id: string): Promise<void> {
    await supabase.from("comment_replies").delete().eq("id", id);
  }
}

export const storage = new DatabaseStorage();
