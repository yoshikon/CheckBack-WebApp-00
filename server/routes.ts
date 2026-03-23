import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomBytes } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { insertPaintAnnotationSchema } from "@shared/schema";
import { needsPreviewGeneration, generatePreview } from "./preview-generator";
import {
  extractLayers,
  extractLayerImages,
  canExtractLayers,
} from "./layer-extractor";
import bcrypt from "bcryptjs";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const normalizedName = normalizeUploadedFilename(file.originalname);
      cb(null, uniqueSuffix + "-" + normalizedName);
    },
  }),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB for large design files (PSD, AI, etc.)
  },
});

function normalizeUploadedFilename(fileName: string): string {
  const source = (fileName || "").normalize("NFC");
  const latin1Decoded = Buffer.from(source, "latin1")
    .toString("utf8")
    .normalize("NFC");
  const uriDecoded = (() => {
    try {
      return decodeURIComponent(source).normalize("NFC");
    } catch {
      return source;
    }
  })();

  const scoreReadableFilename = (value: string): number => {
    if (!value) return -999;
    const replacementCharPenalty = (value.match(/�/g) || []).length * 10;
    const mojibakePenalty =
      (value.match(/[ÃÂâã¤¥¦§¨ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/g) || []).length * 3;
    const controlCharPenalty =
      (value.match(/[\u0000-\u001f\u007f]/g) || []).length * 10;
    const multilingualReward = (
      value.match(/[\u3040-\u30ff\u3400-\u9fff\uff01-\uff60]/g) || []
    ).length;
    return (
      multilingualReward -
      replacementCharPenalty -
      mojibakePenalty -
      controlCharPenalty
    );
  };

  const candidates = [source, latin1Decoded, uriDecoded];
  const picked = candidates.reduce((best, current) => {
    return scoreReadableFilename(current) > scoreReadableFilename(best)
      ? current
      : best;
  }, source);

  const safeBase = path.basename(picked).replace(/\0/g, "").trim();
  return safeBase || "unnamed-file";
}

function normalizeFileRecordName<T extends { name: string }>(record: T): T {
  return {
    ...record,
    name: normalizeUploadedFilename(record.name),
  };
}

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

function getHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, email, displayName } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "ユーザー名とパスワードは必須です" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "パスワードは6文字以上で入力してください" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res
          .status(409)
          .json({ error: "このユーザー名は既に使用されています" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        displayName: displayName || username,
      });

      const { password: _, ...safeUser } = user;
      return res.status(201).json({ user: safeUser });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ error: "ユーザー登録に失敗しました" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "ユーザー名とパスワードを入力してください" });
      }

      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res
          .status(401)
          .json({ error: "ユーザー名またはパスワードが正しくありません" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ error: "ユーザー名またはパスワードが正しくありません" });
      }

      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "ログインに失敗しました" });
    }
  });

  app.put("/api/user/profile", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { displayName } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "認証が必要です" });
      }

      const updatedUser = await storage.updateUserProfile(userId, {
        displayName,
      });
      const { password: _, ...safeUser } = updatedUser;
      return res.json(safeUser);
    } catch (error) {
      console.error("Update profile error:", error);
      return res
        .status(500)
        .json({ error: "プロフィールの更新に失敗しました" });
    }
  });

  app.put("/api/user/password", async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "認証が必要です" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: "現在のパスワードと新しいパスワードを入力してください",
        });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "パスワードは6文字以上で入力してください" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "ユーザーが見つかりません" });
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ error: "現在のパスワードが正しくありません" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(userId, hashedPassword);

      return res.json({ message: "パスワードを更新しました" });
    } catch (error) {
      console.error("Update password error:", error);
      return res.status(500).json({ error: "パスワードの更新に失敗しました" });
    }
  });

  // Projects routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "demo-user-id";
      const projects = await storage.getProjects(userId);
      return res.json(projects);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      return res.json({
        ...project,
        files: (project.files || []).map((file) =>
          normalizeFileRecordName(file),
        ),
      });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "demo-user-id";
      const { name, description, clientName, dueDate } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Project name required" });
      }

      const project = await storage.createProject({
        name,
        description,
        clientName,
        dueDate,
        createdBy: userId,
      });

      return res.status(201).json(project);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteProject(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Files routes
  app.get("/api/files/recent", async (req: Request, res: Response) => {
    try {
      const idsParam = req.query.ids as string;
      if (!idsParam) {
        return res.json([]);
      }

      const ids = idsParam.split(",").filter((id) => id.trim());
      if (ids.length === 0) {
        return res.json([]);
      }

      const files = await Promise.all(
        ids.map(async (id) => {
          const file = await storage.getFile(id.trim());
          if (file) {
            const project = await storage.getProject(file.projectId);
            return { ...file, project };
          }
          return null;
        }),
      );

      return res.json(files.filter(Boolean));
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/files/:id", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    try {
      const file = await storage.getFile(req.params.id);

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      return res.json(normalizeFileRecordName(file));
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const updates: Record<string, any> = {};

      if (name) {
        updates.name = name;
      }

      const file = await storage.updateFile(req.params.id as string, updates);

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      return res.json(normalizeFileRecordName(file));
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post(
    "/api/projects/:projectId/files",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const userId = (req.headers["x-user-id"] as string) || "demo-user-id";
        const { projectId } = req.params;
        const { parentFileId } = req.body;

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "File required" });
        }
        const originalName = normalizeUploadedFilename(req.file.originalname);

        const fileUrl = `/uploads/${req.file.filename}`;

        let versionNumber = 1;
        let resolvedParentFileId: string | null = null;

        if (parentFileId) {
          const parentFile = await storage.getFile(parentFileId);
          if (parentFile && parentFile.projectId === projectId) {
            resolvedParentFileId = parentFile.parentFileId || parentFileId;
            const allFiles = await storage.getFilesByProject(projectId);
            const siblingVersions = allFiles.filter(
              (f) =>
                f.id === resolvedParentFileId ||
                f.parentFileId === resolvedParentFileId,
            );
            versionNumber =
              Math.max(...siblingVersions.map((f) => f.versionNumber), 0) + 1;
          }
        } else {
          const allFiles = await storage.getFilesByProject(projectId);
          const sameNameFiles = allFiles.filter((f) => f.name === originalName);
          if (sameNameFiles.length > 0) {
            const latestVersion = sameNameFiles.reduce(
              (max, f) => (f.versionNumber > max.versionNumber ? f : max),
              sameNameFiles[0],
            );
            resolvedParentFileId =
              latestVersion.parentFileId || latestVersion.id;
            versionNumber = latestVersion.versionNumber + 1;
          }
        }

        let previewPath: string | null = null;
        let previewUrl: string | null = null;

        if (needsPreviewGeneration(req.file.mimetype, originalName)) {
          const previewResult = await generatePreview(
            req.file.path,
            req.file.mimetype,
            originalName,
          );
          if (
            previewResult.success &&
            previewResult.previewPath &&
            previewResult.previewUrl
          ) {
            previewPath = previewResult.previewPath;
            previewUrl = previewResult.previewUrl;
          }
        }

        // For Adobe files (PSD/AI), use preview URL for thumbnail; for regular images, use original file URL
        const isAdobeFile = needsPreviewGeneration(
          req.file.mimetype,
          originalName,
        );
        let thumbnailUrl: string | null = null;
        if (isAdobeFile && previewUrl) {
          thumbnailUrl = previewUrl;
        } else if (req.file.mimetype.startsWith("image/")) {
          thumbnailUrl = fileUrl;
        }

        const file = await storage.createFile({
          projectId,
          name: originalName,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          storagePath: req.file.path,
          url: fileUrl,
          thumbnailUrl: thumbnailUrl,
          previewPath: previewPath,
          versionNumber,
          parentFileId: resolvedParentFileId,
          createdBy: userId,
        });

        return res.status(201).json(file);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/files/:fileId/paint-images",
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        const file = await storage.getFile(req.params.fileId);
        if (!file) {
          return res.status(404).json({ error: "File not found" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "Image required" });
        }

        if (!req.file.mimetype.startsWith("image/")) {
          return res
            .status(400)
            .json({ error: "Only image files are allowed" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        return res.status(201).json({ url: imageUrl });
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.delete("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const fileId = req.params.id;
      if (typeof fileId !== "string") {
        return res.status(400).json({ error: "Invalid file ID" });
      }

      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // 1. Delete main file
      if (file.storagePath && fs.existsSync(file.storagePath)) {
        try {
          fs.unlinkSync(file.storagePath);
        } catch (e) {
          console.error(`Failed to delete file ${file.storagePath}:`, e);
        }
      }

      // 2. Delete thumbnail if it's a local file and different from main file
      if (
        file.thumbnailUrl &&
        file.thumbnailUrl.startsWith("/uploads/") &&
        file.thumbnailUrl !== file.url
      ) {
        const thumbPath = path.join(process.cwd(), file.thumbnailUrl);
        if (fs.existsSync(thumbPath)) {
          try {
            fs.unlinkSync(thumbPath);
          } catch (e) {
            console.error(`Failed to delete thumbnail ${thumbPath}:`, e);
          }
        }
      }

      // 3. Delete preview file if exists
      if (file.previewPath && fs.existsSync(file.previewPath)) {
        try {
          fs.unlinkSync(file.previewPath);
        } catch (e) {
          console.error(`Failed to delete preview ${file.previewPath}:`, e);
        }
      }

      // 4. Delete reply attachments
      if (file.comments) {
        for (const comment of file.comments) {
          const replies = await storage.getRepliesByComment(comment.id);
          for (const reply of replies) {
            if (
              reply.attachmentUrl &&
              reply.attachmentUrl.startsWith("/uploads/")
            ) {
              const attachmentPath = path.join(
                process.cwd(),
                reply.attachmentUrl,
              );
              if (fs.existsSync(attachmentPath)) {
                try {
                  fs.unlinkSync(attachmentPath);
                } catch (e) {
                  console.error(
                    `Failed to delete attachment ${attachmentPath}:`,
                    e,
                  );
                }
              }
            }
          }
        }
      }

      // 5. Delete paint annotation images
      const paintAnnotation = await storage.getPaintAnnotation(fileId);
      if (paintAnnotation && paintAnnotation.strokesData) {
        try {
          const strokes = JSON.parse(paintAnnotation.strokesData);
          if (Array.isArray(strokes)) {
            for (const stroke of strokes) {
              if (
                stroke.tool === "image" &&
                stroke.imageUrl &&
                stroke.imageUrl.startsWith("/uploads/")
              ) {
                const imagePath = path.join(process.cwd(), stroke.imageUrl);
                if (fs.existsSync(imagePath)) {
                  try {
                    fs.unlinkSync(imagePath);
                  } catch (e) {
                    console.error(
                      `Failed to delete paint image ${imagePath}:`,
                      e,
                    );
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse strokes data for deletion:", e);
        }
      }

      // 6. Delete file and related data from DB
      await storage.deleteFile(fileId);

      return res.status(204).send();
    } catch (error) {
      console.error("Delete file error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // On-demand preview generation for PSD/AI files
  app.post(
    "/api/files/:id/generate-preview",
    async (req: Request, res: Response) => {
      try {
        const file = await storage.getFile(req.params.id);
        if (!file) {
          return res.status(404).json({ error: "File not found" });
        }

        if (file.thumbnailUrl && file.thumbnailUrl !== file.url) {
          return res.json({ previewUrl: file.thumbnailUrl });
        }

        if (!file.storagePath || !fs.existsSync(file.storagePath)) {
          return res.status(404).json({ error: "File storage not found" });
        }

        if (!needsPreviewGeneration(file.mimeType, file.name)) {
          return res.status(400).json({
            error: "Preview generation not supported for this file type",
          });
        }

        const previewResult = await generatePreview(
          file.storagePath,
          file.mimeType,
          file.name,
        );
        if (
          previewResult.success &&
          previewResult.previewPath &&
          previewResult.previewUrl
        ) {
          await storage.updateFile(file.id, {
            thumbnailUrl: previewResult.previewUrl,
            previewPath: previewResult.previewPath,
          });
          return res.json({ previewUrl: previewResult.previewUrl });
        }

        return res
          .status(500)
          .json({ error: previewResult.error || "Preview generation failed" });
      } catch (error) {
        console.error("On-demand preview generation error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Layer extraction route for PSD/AI files
  app.get("/api/files/:id/layers", async (req: Request, res: Response) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      if (!file.storagePath || !fs.existsSync(file.storagePath)) {
        return res.status(404).json({ error: "File storage not found" });
      }

      if (!canExtractLayers(file.mimeType, file.name)) {
        return res
          .status(400)
          .json({ error: "Layer extraction not supported for this file type" });
      }

      const result = await extractLayers(
        file.storagePath,
        file.mimeType,
        file.name,
      );

      if (!result.success) {
        return res
          .status(500)
          .json({ error: result.error || "Layer extraction failed" });
      }

      return res.json({
        layers: result.layers,
        documentWidth: result.documentWidth,
        documentHeight: result.documentHeight,
      });
    } catch (error) {
      console.error("Layer extraction error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Layer images extraction endpoint for PSD files
  app.post(
    "/api/files/:id/layer-images",
    async (req: Request, res: Response) => {
      try {
        const file = await storage.getFile(req.params.id);
        if (!file) {
          return res.status(404).json({ error: "File not found" });
        }

        if (!file.storagePath || !fs.existsSync(file.storagePath)) {
          return res.status(404).json({ error: "File storage not found" });
        }

        if (!canExtractLayers(file.mimeType, file.name)) {
          return res.status(400).json({
            error: "Layer image extraction not supported for this file type",
          });
        }

        const result = await extractLayerImages(
          file.storagePath,
          file.id,
          file.mimeType,
          file.name,
        );

        if (!result.success) {
          return res
            .status(500)
            .json({ error: result.error || "Layer image extraction failed" });
        }

        // Convert Maps to objects for JSON response
        const layerImagesObj: Record<number, string> = {};
        if (result.layerImages) {
          result.layerImages.forEach((url, id) => {
            layerImagesObj[id] = url;
          });
        }

        const maskImagesObj: Record<number, string> = {};
        if (result.maskImages) {
          result.maskImages.forEach((url, id) => {
            maskImagesObj[id] = url;
          });
        }

        return res.json({
          layerImages: layerImagesObj,
          maskImages: maskImagesObj,
        });
      } catch (error) {
        console.error("Layer image extraction error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Comments routes
  app.post(
    "/api/files/:fileId/comments",
    async (req: Request, res: Response) => {
      try {
        const userId =
          getHeaderValue(req.headers["x-user-id"]) || "demo-user-id";
        const userName = getHeaderValue(req.headers["x-user-name"]);
        const userDisplayName = getHeaderValue(
          req.headers["x-user-display-name"],
        );
        const internalAuthorNameFromHeader = (
          userDisplayName ||
          userName ||
          ""
        ).trim();
        const userRecord = await storage.getUserById(userId);
        const internalAuthorName = (
          internalAuthorNameFromHeader ||
          userRecord?.displayName ||
          userRecord?.username ||
          ""
        ).trim();
        const { fileId } = req.params;
        const { body, x, y, pageNo, videoTimestamp, compareKey, createdAt } =
          req.body;

        const file = await storage.getFile(fileId);
        if (!file) {
          return res.status(404).json({ error: "File not found" });
        }

        if (!body) {
          return res.status(400).json({ error: "Comment body required" });
        }

        const anchor =
          x !== undefined && y !== undefined
            ? {
                commentId: "",
                anchorType: "point" as const,
                x,
                y,
                pageNo: pageNo ?? null,
                w: null,
                h: null,
                videoTimestamp: videoTimestamp ?? null,
              }
            : undefined;

        const comment = await storage.createComment(
          {
            fileId,
            parentId:
              typeof compareKey === "string" && compareKey.length > 0
                ? `reply-image:${compareKey}`
                : null,
            authorType: "internal",
            authorUserId: userId,
            guestName: internalAuthorName || null,
            body,
            status: "open",
            createdAt: createdAt ? new Date(createdAt) : undefined,
          },
          anchor,
        );

        return res.status(201).json(comment);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch("/api/comments/:id", async (req: Request, res: Response) => {
    try {
      const { status, body } = req.body;

      const updates: Record<string, string> = {};
      if (status) updates.status = status;
      if (body) updates.body = body;

      const comment = await storage.updateComment(req.params.id, updates);

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      return res.json(comment);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/comments/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteComment(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update comment anchor position (for moving pins)
  app.patch("/api/comments/:id/anchor", async (req: Request, res: Response) => {
    try {
      const { x, y } = req.body;

      if (typeof x !== "number" || typeof y !== "number") {
        return res
          .status(400)
          .json({ error: "x and y coordinates are required" });
      }

      const anchor = await storage.updateCommentAnchor(req.params.id, x, y);

      if (!anchor) {
        return res.status(404).json({ error: "Comment anchor not found" });
      }

      return res.json(anchor);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Comment Replies routes
  app.get(
    "/api/comments/:commentId/replies",
    async (req: Request, res: Response) => {
      try {
        const replies = await storage.getRepliesByComment(req.params.commentId);
        return res.json(replies);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/comments/:commentId/replies",
    upload.single("attachment"),
    async (req: Request, res: Response) => {
      try {
        const userId =
          getHeaderValue(req.headers["x-user-id"]) || "demo-user-id";
        const userName = getHeaderValue(req.headers["x-user-name"]);
        const userDisplayName = getHeaderValue(
          req.headers["x-user-display-name"],
        );
        const internalAuthorNameFromHeader = (
          userDisplayName ||
          userName ||
          ""
        ).trim();
        const userRecord = await storage.getUserById(userId);
        const internalAuthorName = (
          internalAuthorNameFromHeader ||
          userRecord?.displayName ||
          userRecord?.username ||
          ""
        ).trim();
        const { commentId } = req.params;
        const body =
          typeof req.body.body === "string"
            ? req.body.body
            : Array.isArray(req.body.body)
              ? req.body.body[0]
              : undefined;

        let attachmentUrl: string | null = null;
        let attachmentName: string | null = null;
        let attachmentType: string | null = null;

        if (req.file) {
          attachmentUrl = `/uploads/${req.file.filename}`;
          attachmentType = req.file.mimetype;

          const originalName = normalizeUploadedFilename(req.file.originalname);
          const isImageAttachment = attachmentType.startsWith("image/");

          if (isImageAttachment) {
            const existingReplies =
              await storage.getRepliesByComment(commentId);
            const existingImageCount = existingReplies.filter((reply) => {
              return (
                !!reply.attachmentUrl &&
                !!reply.attachmentType &&
                reply.attachmentType.startsWith("image/")
              );
            }).length;
            const newVersion = existingImageCount + 1;
            const ext = path.extname(originalName);
            const baseName = ext
              ? originalName.slice(0, -ext.length)
              : originalName;
            attachmentName =
              newVersion > 1
                ? `${baseName} ver${newVersion}${ext}`
                : originalName;
          } else {
            attachmentName = originalName;
          }
        }

        const trimmedBody = body?.trim();
        if (!trimmedBody && !attachmentUrl) {
          return res
            .status(400)
            .json({ error: "Reply body or attachment required" });
        }

        const reply = await storage.createReply({
          commentId,
          authorUserId: userId,
          guestName: internalAuthorName || null,
          body: trimmedBody || undefined,
          attachmentUrl,
          attachmentName,
          attachmentType,
        });

        return res.status(201).json(reply);
      } catch (error) {
        console.error("Error creating reply:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.delete("/api/replies/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteReply(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Share Links routes
  app.post(
    "/api/files/:fileId/share-links",
    async (req: Request, res: Response) => {
      try {
        const userId = (req.headers["x-user-id"] as string) || "demo-user-id";
        const { fileId } = req.params;
        const {
          expiresAt,
          allowDownload,
          permCommentRead,
          permCommentWrite,
          password,
        } = req.body;

        const file = await storage.getFile(fileId);
        if (!file) {
          return res.status(404).json({ error: "File not found" });
        }

        if (!expiresAt) {
          return res.status(400).json({ error: "Expiration date is required" });
        }

        const expirationDate = new Date(expiresAt);
        if (isNaN(expirationDate.getTime())) {
          return res.status(400).json({ error: "Invalid expiration date" });
        }

        const token = generateToken();

        let passwordHash: string | null = null;
        if (password && password.length > 0) {
          const crypto = await import("crypto");
          passwordHash = crypto
            .createHash("sha256")
            .update(password)
            .digest("hex");
        }

        const shareLink = await storage.createShareLink({
          fileId,
          token,
          expiresAt: expirationDate,
          allowDownload: allowDownload ?? true,
          permCommentRead: permCommentRead ?? true,
          permCommentWrite: permCommentWrite ?? true,
          isRevoked: false,
          passwordHash,
          createdBy: userId,
        });

        return res.status(201).json(shareLink);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Guest/Share routes - metadata only (check if password required)
  app.get("/api/share/:token/info", async (req: Request, res: Response) => {
    try {
      const shareLink = await storage.getShareLinkByToken(req.params.token);

      if (!shareLink) {
        return res
          .status(404)
          .json({ error: "Share link not found or expired" });
      }

      const hasPassword = !!shareLink.passwordHash;
      return res.json({
        id: shareLink.id,
        token: shareLink.token,
        hasPassword,
        expiresAt: shareLink.expiresAt,
        allowDownload: shareLink.allowDownload,
        permCommentRead: shareLink.permCommentRead,
        permCommentWrite: shareLink.permCommentWrite,
      });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Full share link data (file included) - returns file data only for non-password protected links
  app.get("/api/share/:token", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    try {
      const shareLink = await storage.getShareLinkByToken(req.params.token);

      if (!shareLink) {
        return res
          .status(404)
          .json({ error: "Share link not found or expired" });
      }

      const hasPassword = !!shareLink.passwordHash;

      if (hasPassword) {
        return res
          .status(401)
          .json({ error: "Password required", hasPassword: true });
      }

      const sharedComments = shareLink.permCommentRead
        ? shareLink.file.comments
        : [];
      return res.json({
        ...shareLink,
        file: {
          ...normalizeFileRecordName(shareLink.file),
          comments: sharedComments.map((c) => ({
            ...c,
            author: c.author
              ? {
                  username: c.author.username,
                  displayName: c.author.displayName,
                }
              : undefined,
            replies: (c.replies || []).map((reply) => ({
              ...reply,
              author: reply.author
                ? {
                    username: reply.author.username,
                    displayName: reply.author.displayName,
                  }
                : undefined,
            })),
          })),
        },
        hasPassword,
        passwordHash: undefined,
      });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Full share link data with password - POST for password protected links
  app.post("/api/share/:token/access", async (req: Request, res: Response) => {
    try {
      const shareLink = await storage.getShareLinkByToken(req.params.token);

      if (!shareLink) {
        return res
          .status(404)
          .json({ error: "Share link not found or expired" });
      }

      const hasPassword = !!shareLink.passwordHash;

      if (hasPassword) {
        const { password } = req.body;
        if (!password) {
          return res
            .status(401)
            .json({ error: "Password required", hasPassword: true });
        }

        const crypto = await import("crypto");
        const inputHash = crypto
          .createHash("sha256")
          .update(password)
          .digest("hex");
        if (inputHash !== shareLink.passwordHash) {
          return res
            .status(401)
            .json({ error: "Invalid password", hasPassword: true });
        }
      }

      const sharedComments = shareLink.permCommentRead
        ? shareLink.file.comments
        : [];
      return res.json({
        ...shareLink,
        file: {
          ...normalizeFileRecordName(shareLink.file),
          comments: sharedComments.map((c) => ({
            ...c,
            author: c.author
              ? {
                  username: c.author.username,
                  displayName: c.author.displayName,
                }
              : undefined,
            replies: (c.replies || []).map((reply) => ({
              ...reply,
              author: reply.author
                ? {
                    username: reply.author.username,
                    displayName: reply.author.displayName,
                  }
                : undefined,
            })),
          })),
        },
        hasPassword,
        passwordHash: undefined,
      });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post(
    "/api/share/:token/verify-password",
    async (req: Request, res: Response) => {
      try {
        const shareLink = await storage.getShareLinkByToken(req.params.token);

        if (!shareLink) {
          return res
            .status(404)
            .json({ error: "Share link not found or expired" });
        }

        if (!shareLink.passwordHash) {
          return res.json({ valid: true });
        }

        const { password } = req.body;
        if (!password) {
          return res.status(400).json({ error: "Password required" });
        }

        const crypto = await import("crypto");
        const inputHash = crypto
          .createHash("sha256")
          .update(password)
          .digest("hex");

        if (inputHash !== shareLink.passwordHash) {
          return res.status(401).json({ error: "Invalid password" });
        }

        return res.json({ valid: true });
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/share/:token/comments",
    async (req: Request, res: Response) => {
      try {
        const shareLink = await storage.getShareLinkByToken(req.params.token);

        if (!shareLink) {
          return res
            .status(404)
            .json({ error: "Share link not found or expired" });
        }

        if (!shareLink.permCommentWrite) {
          return res
            .status(403)
            .json({ error: "Comments not allowed on this link" });
        }

        const { body, guestName, x, y, pageNo, videoTimestamp, compareKey } = req.body;

        if (!body || !guestName) {
          return res
            .status(400)
            .json({ error: "Comment body and guest name required" });
        }

        const anchor =
          x !== undefined && y !== undefined
            ? {
                commentId: "",
                anchorType: "point" as const,
                x,
                y,
                pageNo: pageNo ?? null,
                w: null,
                h: null,
                videoTimestamp: videoTimestamp ?? null,
              }
            : undefined;

        const parentId =
          typeof compareKey === "string" && compareKey.length > 0
            ? `reply-image:${compareKey}`
            : null;

        const comment = await storage.createComment(
          {
            fileId: shareLink.fileId,
            authorType: "guest",
            guestName,
            body,
            status: "open",
            parentId,
          },
          anchor,
        );

        return res.status(201).json(comment);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/share/:token/comments/:commentId/replies",
    async (req: Request, res: Response) => {
      try {
        const shareLink = await storage.getShareLinkByToken(req.params.token);

        if (!shareLink) {
          return res
            .status(404)
            .json({ error: "Share link not found or expired" });
        }

        if (!shareLink.permCommentWrite) {
          return res
            .status(403)
            .json({ error: "Comments not allowed on this link" });
        }

        const { commentId } = req.params;
        const body =
          typeof req.body.body === "string" ? req.body.body.trim() : "";
        const guestName =
          typeof req.body.guestName === "string"
            ? req.body.guestName.trim()
            : "";

        if (!body || !guestName) {
          return res
            .status(400)
            .json({ error: "Reply body and guest name required" });
        }

        const targetComment = (shareLink.file.comments || []).find(
          (comment) => comment.id === commentId,
        );

        if (!targetComment) {
          return res.status(404).json({ error: "Comment not found" });
        }

        const reply = await storage.createReply({
          commentId,
          guestName,
          body,
        });

        return res.status(201).json(reply);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/share/:token/comments/:commentId",
    async (req: Request, res: Response) => {
      try {
        const shareLink = await storage.getShareLinkByToken(req.params.token);

        if (!shareLink) {
          return res
            .status(404)
            .json({ error: "Share link not found or expired" });
        }

        if (!shareLink.permCommentWrite) {
          return res
            .status(403)
            .json({ error: "Comments not allowed on this link" });
        }

        const { commentId } = req.params;
        const body =
          typeof req.body.body === "string" ? req.body.body.trim() : "";
        const statusInput =
          typeof req.body.status === "string"
            ? req.body.status.trim().toLowerCase()
            : "";
        const status =
          statusInput === "in-progress" ||
          statusInput === "inprogress" ||
          statusInput === "in progress" ||
          statusInput === "対応中"
            ? "in_progress"
            : statusInput === "未対応"
              ? "open"
              : statusInput === "解決済み"
                ? "resolved"
                : statusInput;
        const allowedStatuses = ["open", "in_progress", "resolved"] as const;
        const isValidStatus = (allowedStatuses as readonly string[]).includes(
          status,
        );

        if (!body && !isValidStatus) {
          return res
            .status(400)
            .json({ error: "Comment body or valid status required" });
        }

        const targetComment = (shareLink.file.comments || []).find(
          (comment) => comment.id === commentId,
        );

        if (!targetComment) {
          return res.status(404).json({ error: "Comment not found" });
        }

        const updatePayload: { body?: string; status?: typeof allowedStatuses[number] } = {};
        if (body) {
          updatePayload.body = body;
        }
        if (isValidStatus) {
          updatePayload.status = status as typeof allowedStatuses[number];
        }

        const updated = await storage.updateComment(commentId, updatePayload);
        if (!updated) {
          return res.status(404).json({ error: "Comment not found" });
        }

        return res.json(updated);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Paint Annotations routes
  app.get(
    "/api/files/:fileId/paint-annotations",
    async (req: Request, res: Response) => {
      try {
        const { fileId } = req.params;

        const file = await storage.getFile(fileId);
        if (!file) {
          return res.status(404).json({ error: "File not found" });
        }

        const annotation = await storage.getPaintAnnotation(fileId);
        if (!annotation) {
          return res.json({ strokesData: "[]" });
        }

        return res.json(annotation);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Zod schema for paint annotation request with JSON validation
  const paintAnnotationRequestSchema = insertPaintAnnotationSchema.extend({
    strokesData: z.string().refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "strokesData must be valid JSON" },
    ),
  });

  app.post(
    "/api/files/:fileId/paint-annotations",
    async (req: Request, res: Response) => {
      try {
        const userId = (req.headers["x-user-id"] as string) || "demo-user-id";
        const { fileId } = req.params;

        const file = await storage.getFile(fileId);
        if (!file) {
          return res.status(404).json({ error: "File not found" });
        }

        // Validate request body using Zod schema
        // Only extract strokesData to avoid validation errors with extra fields
        const validationResult = paintAnnotationRequestSchema.safeParse({
          strokesData: req.body.strokesData,
          fileId,
          createdBy: userId,
        });

        if (!validationResult.success) {
          console.error("Validation failed:", validationResult.error.errors);
          return res.status(400).json({
            error: "Validation failed",
            details: validationResult.error.errors,
          });
        }

        const annotation = await storage.savePaintAnnotation(
          validationResult.data,
        );

        return res.status(201).json(annotation);
      } catch (error) {
        console.error("Save paint annotation error:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Quick Check routes
  app.get("/api/quick-check/recent", async (req: Request, res: Response) => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "demo-user-id";
      const files = await storage.getQuickCheckFiles(userId);
      return res.json(files);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post(
    "/api/quick-check/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const userId = (req.headers["x-user-id"] as string) || "demo-user-id";
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const fileUrl = `/uploads/${file.filename}`;
        const mimeType = file.mimetype;
        const originalName = normalizeUploadedFilename(file.originalname);

        let previewPath: string | null = null;
        let previewUrl: string | null = null;

        if (needsPreviewGeneration(mimeType, originalName)) {
          const previewResult = await generatePreview(
            file.path,
            mimeType,
            originalName,
          );
          if (
            previewResult.success &&
            previewResult.previewPath &&
            previewResult.previewUrl
          ) {
            previewPath = previewResult.previewPath;
            previewUrl = previewResult.previewUrl;
          }
        }

        const savedFile = await storage.createQuickCheckFile({
          name: originalName,
          url: fileUrl,
          mimeType,
          size: file.size,
          createdBy: userId,
          previewPath,
          previewUrl,
        });

        return res.status(201).json(savedFile);
      } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post("/api/quick-check/capture", async (req: Request, res: Response) => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "demo-user-id";
      const { url, name, viewport, basicAuth } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const puppeteer = await import("puppeteer");

      const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;

      const browser = await puppeteer.default.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
      });

      try {
        const page = await browser.newPage();

        const viewportConfig =
          viewport === "mobile"
            ? { width: 375, height: 812 }
            : { width: 1440, height: 900 };

        await page.setViewport(viewportConfig);

        if (basicAuth && basicAuth.username && basicAuth.password) {
          await page.authenticate({
            username: basicAuth.username,
            password: basicAuth.password,
          });
        }

        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // Wait for fonts to load
        await page.evaluate(async () => {
          await document.fonts.ready;
        });

        // Additional wait for web fonts to render
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Auto-scroll to trigger lazy-loaded content
        await page.evaluate(async () => {
          await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                // Scroll back to top for clean screenshot
                window.scrollTo(0, 0);
                resolve();
              }
            }, 100);
          });
        });

        // Wait for any remaining lazy-loaded images to finish
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});

        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `capture-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
        const filePath = path.join(uploadDir, filename);

        await page.screenshot({
          path: filePath,
          fullPage: true,
        });

        const stats = fs.statSync(filePath);
        const fileUrl = `/uploads/${filename}`;

        const savedFile = await storage.createQuickCheckFile({
          name: name || new URL(url).hostname,
          url: fileUrl,
          mimeType: "image/png",
          size: stats.size,
          createdBy: userId,
          sourceUrl: url,
        });

        return res.status(201).json(savedFile);
      } finally {
        await browser.close();
      }
    } catch (error: any) {
      console.error("Web capture error:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to capture web page" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    const decodedPath = decodeURIComponent(req.path);
    const filePath = path.join(uploadDir, decodedPath);

    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    return res.status(404).json({ error: "File not found" });
  });

  // Error handler for multer file upload errors
  app.use((err: any, req: Request, res: Response, next: any) => {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error:
          "ファイルサイズが大きすぎます。200MB以下のファイルをアップロードしてください。",
        message: "File too large. Maximum file size is 200MB.",
      });
    }
    if (err.name === "MulterError") {
      return res.status(400).json({
        error: "ファイルのアップロードに失敗しました。",
        message: err.message,
      });
    }
    next(err);
  });

  return httpServer;
}
