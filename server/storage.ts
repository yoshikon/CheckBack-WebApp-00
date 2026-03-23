import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  users, projects, files, comments, commentAnchors, shareLinks, paintAnnotations, commentReplies,
  type User, type InsertUser,
  type Project, type InsertProject, type ProjectWithFiles,
  type File, type InsertFile, type FileWithComments,
  type Comment, type InsertComment, type CommentWithAnchor,
  type CommentAnchor, type InsertCommentAnchor,
  type ShareLink, type InsertShareLink, type ShareLinkWithFile,
  type PaintAnnotation, type InsertPaintAnnotation,
  type CommentReply, type InsertCommentReply, type CommentReplyWithAuthor,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, updates: Partial<Pick<User, 'displayName'>>): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;

  // Projects
  getProjects(userId: string): Promise<ProjectWithFiles[]>;
  getProject(id: string): Promise<ProjectWithFiles | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Files
  getFile(id: string): Promise<FileWithComments | undefined>;
  getFilesByProject(projectId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, updates: Partial<File>): Promise<File | undefined>;
  deleteFile(id: string): Promise<void>;

  // Comments
  getCommentsByFile(fileId: string): Promise<CommentWithAnchor[]>;
  createComment(comment: InsertComment, anchor?: InsertCommentAnchor): Promise<CommentWithAnchor>;
  updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined>;
  updateCommentAnchor(commentId: string, x: number, y: number): Promise<CommentAnchor | undefined>;
  deleteComment(id: string): Promise<void>;

  // Share Links
  getShareLinkByToken(token: string): Promise<ShareLinkWithFile | undefined>;
  createShareLink(shareLink: InsertShareLink): Promise<ShareLink>;
  revokeShareLink(id: string): Promise<void>;

  // Quick Check
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

  // Paint Annotations
  getPaintAnnotation(fileId: string): Promise<PaintAnnotation | undefined>;
  savePaintAnnotation(annotation: InsertPaintAnnotation): Promise<PaintAnnotation>;

  // Comment Replies
  getRepliesByComment(commentId: string): Promise<CommentReplyWithAuthor[]>;
  createReply(reply: InsertCommentReply): Promise<CommentReplyWithAuthor>;
  deleteReply(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.seedData();
  }

  private async seedData() {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) return;

    const hashedPassword = await bcrypt.hash("demo", 10);
    const demoUser = {
      id: "demo-user-id",
      username: "demo",
      password: hashedPassword,
      email: "demo@example.com",
      displayName: "Demo User",
      avatarUrl: null,
      createdAt: new Date(),
    };
    await db.insert(users).values(demoUser);

    const sampleProject = {
      id: "sample-project-id",
      name: "ウェブサイトリニューアル",
      description: "モダンなUI/UXを取り入れた企業サイトの全面リニューアル",
      clientName: "株式会社サンプル",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdBy: demoUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(projects).values(sampleProject);

    const sampleFile = {
      id: "sample-file-id",
      projectId: sampleProject.id,
      name: "トップページデザイン.png",
      mimeType: "image/png",
      sizeBytes: 245000,
      storagePath: null,
      url: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&h=800&fit=crop",
      thumbnailUrl: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=300&fit=crop",
      versionNumber: 1,
      parentFileId: null,
      createdBy: demoUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(files).values(sampleFile);
    
    const sampleFileV2 = {
      id: "sample-file-v2-id",
      projectId: sampleProject.id,
      name: "トップページデザイン.png",
      mimeType: "image/png",
      sizeBytes: 267000,
      storagePath: null,
      url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop",
      thumbnailUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
      versionNumber: 2,
      parentFileId: "sample-file-id",
      createdBy: demoUser.id,
      createdAt: new Date(Date.now() + 1000 * 60 * 60),
      updatedAt: new Date(Date.now() + 1000 * 60 * 60),
    };
    await db.insert(files).values(sampleFileV2);

    const commentsData = [
      {
        id: "comment-1",
        fileId: sampleFile.id,
        parentId: null,
        authorType: "internal" as const,
        authorUserId: demoUser.id,
        guestName: null,
        body: "ヘッダーナビゲーションの項目間のスペースをもう少し広げてください",
        status: "open" as const,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: "comment-2",
        fileId: sampleFile.id,
        parentId: null,
        authorType: "internal" as const,
        authorUserId: demoUser.id,
        guestName: null,
        body: "このボタンをもっと目立たせることはできますか？",
        status: "in_progress" as const,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        id: "comment-3",
        fileId: sampleFile.id,
        parentId: null,
        authorType: "guest" as const,
        authorUserId: null,
        guestName: "クライアント",
        body: "配色がとても良いですね！承認します。",
        status: "resolved" as const,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    ];
    await db.insert(comments).values(commentsData);

    const anchorsData = [
      { commentId: "comment-1", anchorType: "point" as const, pageNo: null, x: 0.15, y: 0.08, w: null, h: null, videoTimestamp: null },
      { commentId: "comment-2", anchorType: "point" as const, pageNo: null, x: 0.65, y: 0.45, w: null, h: null, videoTimestamp: null },
      { commentId: "comment-3", anchorType: "point" as const, pageNo: null, x: 0.80, y: 0.75, w: null, h: null, videoTimestamp: null },
    ];
    await db.insert(commentAnchors).values(anchorsData);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const [user] = await db.insert(users).values({ ...insertUser, id }).returning();
    return user;
  }

  async updateUserProfile(id: string, updates: Partial<Pick<User, 'displayName'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  // Projects
  async getProjects(userId: string): Promise<ProjectWithFiles[]> {
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.createdBy, userId))
      .orderBy(desc(projects.createdAt));

    return Promise.all(
      userProjects.map(async (project) => {
        const projectFiles = await this.getFilesByProject(project.id);
        const allComments = await Promise.all(
          projectFiles.map((f) => this.getCommentsByFile(f.id))
        );
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
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    const projectFiles = await this.getFilesByProject(project.id);
    const allComments = await Promise.all(
      projectFiles.map((f) => this.getCommentsByFile(f.id))
    );

    return {
      ...project,
      files: projectFiles,
      fileCount: projectFiles.length,
      commentCount: allComments.flat().length,
    };
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const [project] = await db.insert(projects).values({ ...insertProject, id }).returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    const projectFiles = await this.getFilesByProject(id);
    for (const file of projectFiles) {
      await this.deleteFile(file.id);
    }
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Files
  async getFile(id: string): Promise<FileWithComments | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    if (!file) return undefined;

    const fileComments = await this.getCommentsByFile(file.id);
    const [project] = await db.select().from(projects).where(eq(projects.id, file.projectId));
    const paintAnnotation = await this.getPaintAnnotation(file.id);

    return {
      ...file,
      comments: fileComments,
      project,
      paintAnnotation,
    };
  }

  async getFilesByProject(projectId: string): Promise<File[]> {
    return db
      .select()
      .from(files)
      .where(eq(files.projectId, projectId))
      .orderBy(desc(files.createdAt));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const [file] = await db.insert(files).values({ ...insertFile, id }).returning();
    return file;
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File | undefined> {
    const [updated] = await db
      .update(files)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return updated;
  }

  async deleteFile(id: string): Promise<void> {
    const fileComments = await this.getCommentsByFile(id);
    for (const comment of fileComments) {
      await this.deleteComment(comment.id);
    }

    await db.delete(shareLinks).where(eq(shareLinks.fileId, id));
    await db.delete(paintAnnotations).where(eq(paintAnnotations.fileId, id));
    await db.delete(files).where(eq(files.id, id));
  }

  // Comments
  async getCommentsByFile(fileId: string): Promise<CommentWithAnchor[]> {
    const fileComments = await db
      .select()
      .from(comments)
      .where(eq(comments.fileId, fileId))
      .orderBy(comments.createdAt); // Ascending order to show conversation flow

    return Promise.all(
      fileComments.map(async (comment) => {
        const [anchor] = await db
          .select()
          .from(commentAnchors)
          .where(eq(commentAnchors.commentId, comment.id));
        
        const [author] = comment.authorUserId
          ? await db.select().from(users).where(eq(users.id, comment.authorUserId))
          : [undefined];

        const replies = await this.getRepliesByComment(comment.id);

        return {
          ...comment,
          anchor,
          author,
          replies,
        };
      })
    );
  }

  async createComment(
    insertComment: InsertComment,
    anchor?: InsertCommentAnchor
  ): Promise<CommentWithAnchor> {
    const id = randomUUID();
    const [comment] = await db.insert(comments).values({ ...insertComment, id }).returning();

    let savedAnchor: CommentAnchor | undefined;
    if (anchor) {
      [savedAnchor] = await db
        .insert(commentAnchors)
        .values({ ...anchor, commentId: id })
        .returning();
    }

    const [author] = comment.authorUserId
      ? await db.select().from(users).where(eq(users.id, comment.authorUserId))
      : [undefined];

    return {
      ...comment,
      anchor: savedAnchor,
      author,
    };
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined> {
    const [updated] = await db
      .update(comments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return updated;
  }

  async updateCommentAnchor(commentId: string, x: number, y: number): Promise<CommentAnchor | undefined> {
    const [updated] = await db
      .update(commentAnchors)
      .set({ x, y })
      .where(eq(commentAnchors.commentId, commentId))
      .returning();
    return updated;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(commentReplies).where(eq(commentReplies.commentId, id));
    await db.delete(commentAnchors).where(eq(commentAnchors.commentId, id));
    await db.delete(comments).where(eq(comments.id, id));
  }

  // Share Links
  async getShareLinkByToken(token: string): Promise<ShareLinkWithFile | undefined> {
    const [shareLink] = await db
      .select()
      .from(shareLinks)
      .where(and(eq(shareLinks.token, token), eq(shareLinks.isRevoked, false)));

    if (!shareLink) return undefined;

    if (new Date(shareLink.expiresAt as unknown as string) < new Date()) {
      return undefined;
    }

    const file = await this.getFile(shareLink.fileId);
    if (!file) return undefined;

    return {
      ...shareLink,
      file,
    };
  }

  async createShareLink(insertShareLink: InsertShareLink): Promise<ShareLink> {
    const id = randomUUID();
    const [shareLink] = await db.insert(shareLinks).values({ ...insertShareLink, id }).returning();
    return shareLink;
  }

  async revokeShareLink(id: string): Promise<void> {
    await db.update(shareLinks).set({ isRevoked: true }).where(eq(shareLinks.id, id));
  }

  // Quick Check
  async getQuickCheckFiles(userId: string): Promise<File[]> {
    // files with no projectId
    return db
      .select()
      .from(files)
      .where(and(eq(files.createdBy, userId), isNull(files.projectId)))
      .orderBy(desc(files.createdAt))
      .limit(20);
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
    const [file] = await db.insert(files).values({
      id,
      projectId: null,
      name: params.name,
      mimeType: params.mimeType,
      sizeBytes: params.size,
      url: params.url,
      thumbnailUrl: params.previewUrl || params.url,
      previewPath: params.previewPath || null,
      versionNumber: 1,
      parentFileId: null,
      createdBy: params.createdBy,
    }).returning();
    return file;
  }

  // Paint Annotations
  async getPaintAnnotation(fileId: string): Promise<PaintAnnotation | undefined> {
    const [annotation] = await db
      .select()
      .from(paintAnnotations)
      .where(eq(paintAnnotations.fileId, fileId));
    return annotation;
  }

  async savePaintAnnotation(annotation: InsertPaintAnnotation): Promise<PaintAnnotation> {
    const existing = await this.getPaintAnnotation(annotation.fileId);
    
    if (existing) {
      const [updated] = await db
        .update(paintAnnotations)
        .set({ strokesData: annotation.strokesData, updatedAt: new Date() })
        .where(eq(paintAnnotations.id, existing.id))
        .returning();
      return updated;
    } else {
      const id = randomUUID();
      const [newAnnotation] = await db
        .insert(paintAnnotations)
        .values({ ...annotation, id })
        .returning();
      return newAnnotation;
    }
  }

  // Comment Replies
  async getRepliesByComment(commentId: string): Promise<CommentReplyWithAuthor[]> {
    const replies = await db
      .select()
      .from(commentReplies)
      .where(eq(commentReplies.commentId, commentId))
      .orderBy(commentReplies.createdAt);

    return Promise.all(
      replies.map(async (reply) => {
        const [author] = reply.authorUserId
          ? await db.select().from(users).where(eq(users.id, reply.authorUserId))
          : [undefined];
        return { ...reply, author };
      })
    );
  }

  async createReply(insertReply: InsertCommentReply): Promise<CommentReplyWithAuthor> {
    const id = randomUUID();
    const [reply] = await db.insert(commentReplies).values({ ...insertReply, id }).returning();
    
    const [author] = reply.authorUserId
      ? await db.select().from(users).where(eq(users.id, reply.authorUserId))
      : [undefined];
      
    return { ...reply, author };
  }

  async deleteReply(id: string): Promise<void> {
    await db.delete(commentReplies).where(eq(commentReplies.id, id));
  }
}

export const storage = new DatabaseStorage();
