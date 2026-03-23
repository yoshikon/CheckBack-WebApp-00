import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Send,
  X,
  Circle,
  CircleCheck as CheckCircle,
  Clock,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  LockKeyhole,
  FileImage,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { PptxPreview } from "@/components/pptx-preview";
import type { ShareLinkWithFile, CommentWithAnchor } from "@shared/schema";

interface CommentPinProps {
  comment: CommentWithAnchor;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

function CommentPin({ comment, index, isSelected, onClick }: CommentPinProps) {
  const anchor = comment.anchor;
  if (!anchor || anchor.x === null || anchor.y === null) return null;

  const statusColors = {
    open: "bg-amber-500",
    in_progress: "bg-blue-500",
    resolved: "bg-green-500",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute z-10 flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold transition-all",
        statusColors[comment.status],
        isSelected &&
          "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110",
      )}
      style={{
        left: `${anchor.x * 100}%`,
        top: `${anchor.y * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
      data-testid={`guest-pin-comment-${comment.id}`}
    >
      {index + 1}
    </button>
  );
}

interface GuestCommentItemProps {
  comment: CommentWithAnchor;
  index: number;
  isSelected: boolean;
  canReply: boolean;
  canUpdateStatus: boolean;
  isStatusUpdating: boolean;
  onClick: () => void;
  onReply: (commentId: string) => void;
  onStatusChange: (
    commentId: string,
    status: "open" | "in_progress" | "resolved",
  ) => void;
}

function GuestCommentItem({
  comment,
  index,
  isSelected,
  canReply,
  canUpdateStatus,
  isStatusUpdating,
  onClick,
  onReply,
  onStatusChange,
}: GuestCommentItemProps) {
  const statusConfig = {
    open: { label: "未対応", icon: Circle, color: "text-amber-500" },
    in_progress: { label: "対応中", icon: Clock, color: "text-blue-500" },
    resolved: { label: "解決済み", icon: CheckCircle, color: "text-green-500" },
  };

  const status = statusConfig[comment.status];
  const StatusIcon = status.icon;

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border-b cursor-pointer transition-colors",
        isSelected ? "bg-accent" : "hover:bg-muted/50",
      )}
      data-testid={`guest-comment-item-${comment.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0",
            comment.status === "open" && "bg-amber-500",
            comment.status === "in_progress" && "bg-blue-500",
            comment.status === "resolved" && "bg-green-500",
          )}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {comment.authorType === "internal"
                ? comment.guestName ||
                  comment.author?.displayName ||
                  comment.author?.username ||
                  "チームメンバー"
                : comment.guestName || "ゲスト"}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(comment.createdAt)}
            </span>
          </div>
          {canReply && (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(comment.id);
                }}
              >
                返信
              </Button>
            </div>
          )}
          <p className="text-sm text-foreground/90 break-words">
            {comment.body}
          </p>
          {!!comment.replies?.length && (
            <div className="space-y-2 pt-1">
              {comment.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="rounded-md border bg-muted/40 px-2 py-1.5 text-xs"
                >
                  <div className="font-medium text-foreground/90">
                    {reply.author?.displayName ||
                      reply.author?.username ||
                      reply.guestName ||
                      "ゲスト"}
                  </div>
                  <div className="text-foreground/80 break-words">
                    {reply.body}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs">
            <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
            <span className="text-muted-foreground">{status.label}</span>
          </div>
          {canUpdateStatus && (
            <div className="pt-1">
              <Select
                value={comment.status}
                onValueChange={(value) =>
                  onStatusChange(
                    comment.id,
                    value as "open" | "in_progress" | "resolved",
                  )
                }
                disabled={isStatusUpdating}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">未対応</SelectItem>
                  <SelectItem value="in_progress">対応中</SelectItem>
                  <SelectItem value="resolved">解決済み</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ShareLinkWithPassword extends ShareLinkWithFile {
  hasPassword?: boolean;
}

type PaintTool =
  | "brush"
  | "eraser"
  | "line"
  | "arrow"
  | "rectangle"
  | "circle"
  | "highlighter"
  | "text"
  | "select"
  | "image"
  | "number";

interface PaintStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: PaintTool;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  text?: string;
  textPosition?: { x: number; y: number };
  fontSize?: number;
  imageUrl?: string;
  imageElement?: HTMLImageElement;
  imagePosition?: { x: number; y: number };
  imageSize?: { width: number; height: number };
  opacity?: number;
}

export default function GuestReviewPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const canvasRef = useRef<HTMLDivElement>(null);
  const paintCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawRetryRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null,
  );
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentPos, setNewCommentPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [statusUpdatingCommentId, setStatusUpdatingCommentId] = useState<
    string | null
  >(null);
  const [guestName, setGuestName] = useState("");
  const [paintStrokes, setPaintStrokes] = useState<PaintStroke[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [passwordInput, setPasswordInput] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Guest Preview States (Moved to top level to avoid conditional hook errors)
  const [guestPsdPreviewUrl, setGuestPsdPreviewUrl] = useState<string | null>(
    null,
  );
  const [isGuestGeneratingPreview, setIsGuestGeneratingPreview] =
    useState(false);
  const [guestPreviewAttempted, setGuestPreviewAttempted] = useState(false);

  interface ShareInfo {
    id: string;
    token: string;
    hasPassword: boolean;
    expiresAt: string;
    allowDownload: boolean;
    permCommentRead: boolean;
    permCommentWrite: boolean;
  }

  const {
    data: shareInfo,
    isLoading: isLoadingInfo,
    error: infoError,
  } = useQuery<ShareInfo>({
    queryKey: ["/api/share", token, "info"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const {
    data: shareData,
    isLoading,
    error,
  } = useQuery<ShareLinkWithPassword>({
    queryKey: ["/api/share", token],
    enabled: !!shareInfo && !shareInfo.hasPassword,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const [passwordShareData, setPasswordShareData] =
    useState<ShareLinkWithPassword | null>(null);
  const [passwordAccessError, setPasswordAccessError] = useState<Error | null>(
    null,
  );

  const accessWithPasswordMutation = useMutation({
    mutationFn: async (pwd: string) => {
      return await apiRequest<ShareLinkWithPassword>(
        "POST",
        `/api/share/${token}/access`,
        { password: pwd },
      );
    },
    onSuccess: (data, pwd) => {
      setPasswordShareData(data);
      setVerifiedPassword(pwd);
    },
    onError: (err: Error) => {
      setPasswordAccessError(err);
      toast({
        title: "エラー",
        description: "パスワードが正しくありません。",
        variant: "destructive",
      });
    },
  });

  const actualShareData = shareInfo?.hasPassword
    ? passwordShareData
    : shareData;
  const actualIsLoading = shareInfo?.hasPassword
    ? accessWithPasswordMutation.isPending
    : isLoading;
  const actualError = shareInfo?.hasPassword ? passwordAccessError : error;

  // Derive file/type info safely for hooks
  const effectFile = actualShareData?.file;
  const effectIsPsd = effectFile
    ? effectFile.mimeType === "image/vnd.adobe.photoshop" ||
      effectFile.mimeType === "application/x-photoshop" ||
      effectFile.name.endsWith(".psd")
    : false;
  const effectIsAi = effectFile
    ? effectFile.mimeType === "application/postscript" ||
      effectFile.mimeType === "application/illustrator" ||
      effectFile.name.endsWith(".ai")
    : false;
  const effectIsAdobeFile = effectIsPsd || effectIsAi;

  // Load paint strokes from share data
  useEffect(() => {
    if (actualShareData?.file?.paintAnnotation?.strokesData) {
      try {
        const loadedStrokes = JSON.parse(
          actualShareData.file.paintAnnotation.strokesData,
        );
        // Recreate image elements for image strokes
        const processedStrokes = loadedStrokes.map((stroke: PaintStroke) => {
          if (stroke.tool === "image" && stroke.imageUrl) {
            const img = new window.Image();
            img.src = stroke.imageUrl;
            return { ...stroke, imageElement: img };
          }
          return stroke;
        });
        setPaintStrokes(processedStrokes);
      } catch (e) {
        console.error("Failed to parse paint annotations:", e);
      }
    }
  }, [actualShareData?.file?.paintAnnotation?.strokesData]);

  // Generate preview for guest if needed (Moved to top level)
  useEffect(() => {
    if (!effectFile) return;
    const hasThumbnail =
      effectFile.thumbnailUrl && effectFile.thumbnailUrl !== effectFile.url;
    if (
      !effectIsAdobeFile ||
      hasThumbnail ||
      isGuestGeneratingPreview ||
      guestPsdPreviewUrl ||
      guestPreviewAttempted
    )
      return;

    const generateOnDemand = async () => {
      setIsGuestGeneratingPreview(true);
      setGuestPreviewAttempted(true);
      try {
        const resp = await fetch(
          `/api/files/${effectFile.id}/generate-preview`,
          { method: "POST" },
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.previewUrl) {
            setGuestPsdPreviewUrl(data.previewUrl);
          }
        }
      } catch (e) {
        console.error("Preview generation failed:", e);
      }
      setIsGuestGeneratingPreview(false);
    };
    generateOnDemand();
  }, [
    effectFile,
    effectIsAdobeFile,
    isGuestGeneratingPreview,
    guestPsdPreviewUrl,
    guestPreviewAttempted,
  ]);

  // Draw paint strokes on canvas
  const drawPaintStrokes = useCallback(() => {
    const canvas = paintCanvasRef.current;
    const container = canvasRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get actual image/content dimensions
    const mediaElement = container.querySelector("img, video, iframe");
    const width = Math.round(
      mediaElement?.clientWidth || container.clientWidth || 0,
    );
    const height = Math.round(
      mediaElement?.clientHeight || container.clientHeight || 0,
    );

    if (width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Helper function to convert normalized coordinates (0-1) to pixel coordinates
    const toPixelX = (normalizedX: number) => normalizedX * width;
    const toPixelY = (normalizedY: number) => normalizedY * height;

    paintStrokes.forEach((stroke) => {
      ctx.save();

      // Apply common styles
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = stroke.opacity ?? 1;

      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(255,255,255,1)";
        ctx.lineWidth = stroke.size * 2;
      } else if (stroke.tool === "highlighter") {
        ctx.globalCompositeOperation = "multiply";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size * 3;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
      }

      if (stroke.tool === "text" && stroke.textPosition && stroke.text) {
        const textPosition = stroke.textPosition;
        const fontSize = stroke.fontSize || Math.max(16, stroke.size * 4);
        const lineHeight = fontSize * 1.3;
        ctx.font = `${fontSize}px "Noto Sans JP", sans-serif`;
        ctx.fillStyle = stroke.color;
        ctx.textBaseline = "top"; // Consistent with file-review
        stroke.text.split("\n").forEach((line, index) => {
          ctx.fillText(
            line,
            toPixelX(textPosition.x),
            toPixelY(textPosition.y) + lineHeight * index,
          );
        });
      } else if (
        stroke.tool === "image" &&
        stroke.imageElement &&
        stroke.imagePosition &&
        stroke.imageSize
      ) {
        if (stroke.imageElement.complete) {
          ctx.drawImage(
            stroke.imageElement,
            toPixelX(stroke.imagePosition.x),
            toPixelY(stroke.imagePosition.y),
            stroke.imageSize.width * width,
            stroke.imageSize.height * height,
          );
        } else {
          stroke.imageElement.onload = () => drawPaintStrokes();
        }
      } else if (
        stroke.tool === "rectangle" &&
        stroke.startPoint &&
        stroke.endPoint
      ) {
        const startX = toPixelX(stroke.startPoint.x);
        const startY = toPixelY(stroke.startPoint.y);
        const endX = toPixelX(stroke.endPoint.x);
        const endY = toPixelY(stroke.endPoint.y);
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
      } else if (
        stroke.tool === "circle" &&
        stroke.startPoint &&
        stroke.endPoint
      ) {
        const startX = toPixelX(stroke.startPoint.x);
        const startY = toPixelY(stroke.startPoint.y);
        const endX = toPixelX(stroke.endPoint.x);
        const endY = toPixelY(stroke.endPoint.y);

        const radiusX = Math.abs(endX - startX) / 2;
        const radiusY = Math.abs(endY - startY) / 2;
        const centerX = startX + (endX - startX) / 2;
        const centerY = startY + (endY - startY) / 2;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (
        (stroke.tool === "line" || stroke.tool === "arrow") &&
        stroke.startPoint &&
        stroke.endPoint
      ) {
        const startX = toPixelX(stroke.startPoint.x);
        const startY = toPixelY(stroke.startPoint.y);
        const endX = toPixelX(stroke.endPoint.x);
        const endY = toPixelY(stroke.endPoint.y);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrowhead for arrow tool
        if (stroke.tool === "arrow") {
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLength = stroke.size * 4;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle - Math.PI / 6),
            endY - headLength * Math.sin(angle - Math.PI / 6),
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle + Math.PI / 6),
            endY - headLength * Math.sin(angle + Math.PI / 6),
          );
          ctx.stroke();
        }
      } else if (
        (stroke.tool === "brush" ||
          stroke.tool === "highlighter" ||
          stroke.tool === "eraser") &&
        stroke.points.length > 0
      ) {
        ctx.beginPath();
        ctx.moveTo(toPixelX(stroke.points[0].x), toPixelY(stroke.points[0].y));
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(
            toPixelX(stroke.points[i].x),
            toPixelY(stroke.points[i].y),
          );
        }
        ctx.stroke();
      } else if (stroke.tool === "number" && stroke.textPosition) {
        // Draw number pin (numbered marker)
        const pinSize = 24;
        ctx.beginPath();
        ctx.arc(
          toPixelX(stroke.textPosition.x),
          toPixelY(stroke.textPosition.y),
          pinSize / 2,
          0,
          2 * Math.PI,
        );
        ctx.fillStyle = stroke.color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Draw the number text
        if (stroke.text) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            stroke.text,
            toPixelX(stroke.textPosition.x),
            toPixelY(stroke.textPosition.y),
          );
        }
      }

      ctx.restore();
    });
  }, [paintStrokes]);

  // Redraw when strokes change
  useEffect(() => {
    if (drawRetryRef.current) {
      cancelAnimationFrame(drawRetryRef.current);
      drawRetryRef.current = null;
    }
    drawPaintStrokes();
    if (
      paintStrokes.length > 0 &&
      paintCanvasRef.current &&
      (paintCanvasRef.current.width === 0 ||
        paintCanvasRef.current.height === 0)
    ) {
      drawRetryRef.current = requestAnimationFrame(() => {
        drawPaintStrokes();
        drawRetryRef.current = null;
      });
    }
    return () => {
      if (drawRetryRef.current) {
        cancelAnimationFrame(drawRetryRef.current);
        drawRetryRef.current = null;
      }
    };
  }, [drawPaintStrokes]);

  // Redraw on window resize
  useEffect(() => {
    const handleResize = () => drawPaintStrokes();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawPaintStrokes]);

  useEffect(() => {
    if (!actualShareData?.file) return;
    const timer = window.setTimeout(() => drawPaintStrokes(), 0);
    return () => window.clearTimeout(timer);
  }, [actualShareData?.file?.id, actualShareData?.file?.url, drawPaintStrokes]);

  // Redraw when image loads (to ensure correct dimensions)
  useEffect(() => {
    const container = canvasRef.current;
    if (!container || paintStrokes.length === 0) return;

    const img = container.querySelector("img");
    if (img) {
      if (img.complete) {
        drawPaintStrokes();
      } else {
        img.onload = () => drawPaintStrokes();
      }
    }
  }, [actualShareData, paintStrokes, drawPaintStrokes]);

  const handleVerifyPassword = async () => {
    if (!passwordInput.trim()) return;
    accessWithPasswordMutation.mutate(passwordInput);
  };

  const refreshShareDataAfterWrite = async () => {
    if (shareInfo?.hasPassword) {
      const pwd = (verifiedPassword || passwordInput).trim();
      if (!pwd) return;
      try {
        const data = await apiRequest<ShareLinkWithPassword>(
          "POST",
          `/api/share/${token}/access`,
          { password: pwd },
        );
        setPasswordShareData(data);
      } catch {
        queryClient.invalidateQueries({ queryKey: ["/api/share", token] });
      }
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["/api/share", token] });
  };

  const addCommentMutation = useMutation({
    mutationFn: async (data: {
      body: string;
      guestName: string;
      x: number;
      y: number;
      compareKey?: string | null;
      videoTimestamp?: number;
    }) => {
      return await apiRequest("POST", `/api/share/${token}/comments`, data);
    },
    onSuccess: () => {
      void refreshShareDataAfterWrite();
      setNewCommentPos(null);
      setNewCommentText("");
      setIsAddingComment(false);
      toast({
        title: "コメント追加完了",
        description: "フィードバックが送信されました。",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "コメントの追加に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const addReplyMutation = useMutation({
    mutationFn: async (data: {
      commentId: string;
      body: string;
      guestName: string;
    }) => {
      return await apiRequest(
        "POST",
        `/api/share/${token}/comments/${data.commentId}/replies`,
        { body: data.body, guestName: data.guestName },
      );
    },
    onSuccess: () => {
      void refreshShareDataAfterWrite();
      setReplyingCommentId(null);
      setReplyText("");
      toast({
        title: "返信追加完了",
        description: "返信内容を追加しました。",
      });
    },
    onError: (error: any) => {
      console.error("Reply addition failed:", error);
      toast({
        title: "エラー",
        description: `返信の追加に失敗しました: ${error.message || "不明なエラー"}`,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      commentId: string;
      status: "open" | "in_progress" | "resolved";
    }) => {
      try {
        return await apiRequest(
          "PATCH",
          `/api/share/${token}/comments/${data.commentId}`,
          { status: data.status },
        );
      } catch (error: any) {
        const message = String(error?.message || "");
        if (message.includes("Comment body required")) {
          return await apiRequest("PATCH", `/api/comments/${data.commentId}`, {
            status: data.status,
          });
        }
        throw error;
      }
    },
    onSuccess: () => {
      void refreshShareDataAfterWrite();
      setStatusUpdatingCommentId(null);
      toast({
        title: "ステータス更新完了",
        description: "コメントステータスを更新しました。",
      });
    },
    onError: (error: any) => {
      setStatusUpdatingCommentId(null);
      toast({
        title: "エラー",
        description: `ステータスの更新に失敗しました: ${error.message || "不明なエラー"}`,
        variant: "destructive",
      });
    },
  });

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingComment || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setNewCommentPos({ x, y });
  };

  const handleAddComment = () => {
    if (!newCommentPos || !newCommentText.trim() || !guestName.trim()) return;

    const searchParams = new URLSearchParams(window.location.search);
    const selectedCompareKey =
      searchParams.get("compareKey") || searchParams.get("compareUrl");

    const commentData: {
      body: string;
      guestName: string;
      x: number;
      y: number;
      videoTimestamp?: number;
      compareKey?: string | null;
    } = {
      body: newCommentText.trim(),
      guestName: guestName.trim(),
      x: newCommentPos.x,
      y: newCommentPos.y,
      compareKey: selectedCompareKey,
    };
    if (shareData?.file.mimeType.startsWith("video/")) {
      commentData.videoTimestamp = videoRef.current?.currentTime ?? currentTime;
    }
    addCommentMutation.mutate(commentData);
  };

  const handleStartReplyComment = (commentId: string) => {
    setReplyingCommentId(commentId);
    setReplyText("");
    if (!guestName.trim()) {
      setGuestName("ゲスト");
    }
  };

  const handleAddReply = () => {
    if (!replyingCommentId || !replyText.trim()) return;
    addReplyMutation.mutate({
      commentId: replyingCommentId,
      body: replyText.trim(),
      guestName: guestName.trim() || "ゲスト",
    });
  };

  const handleChangeCommentStatus = (
    commentId: string,
    status: "open" | "in_progress" | "resolved",
  ) => {
    if (statusUpdatingCommentId) return;
    const normalizedStatus = (() => {
      const input = String(status).trim().toLowerCase();
      if (
        input === "in-progress" ||
        input === "inprogress" ||
        input === "in progress" ||
        input === "対応中"
      ) {
        return "in_progress" as const;
      }
      if (input === "未対応") return "open" as const;
      if (input === "解決済み") return "resolved" as const;
      if (input === "open" || input === "in_progress" || input === "resolved") {
        return input as "open" | "in_progress" | "resolved";
      }
      return null;
    })();
    if (!normalizedStatus) return;
    setStatusUpdatingCommentId(commentId);
    updateStatusMutation.mutate({ commentId, status: normalizedStatus });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, videoRef.current.currentTime + seconds),
      );
    }
  };

  if (isLoadingInfo || actualIsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b px-4 py-3">
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="flex h-[calc(100vh-57px)]">
          <div className="flex-1 p-4">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
          <div className="w-80 border-l">
            <Skeleton className="h-full" />
          </div>
        </div>
      </div>
    );
  }

  if (infoError || !shareInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">リンクが利用できません</h1>
          <p className="text-muted-foreground mb-6">
            この共有リンクは期限切れ、無効化、または存在しない可能性があります。
            リンクを共有した方にお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  if (shareInfo.hasPassword && verifiedPassword === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <LockKeyhole className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Password Required</h1>
          <p className="text-muted-foreground mb-6">
            このファイルはパスワードで保護されています。アクセスするにはパスワードを入力してください。
          </p>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="パスワードを入力"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
              data-testid="input-guest-password"
            />
            <Button
              className="w-full"
              onClick={handleVerifyPassword}
              disabled={isVerifying || !passwordInput.trim()}
              data-testid="button-verify-password"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  確認中...
                </>
              ) : (
                "Unlock"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (actualError || !actualShareData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Error Loading Data</h1>
          <p className="text-muted-foreground mb-6">
            ファイルの読み込み中にエラーが発生しました。再度お試しください。
          </p>
        </div>
      </div>
    );
  }

  const canRead = actualShareData.permCommentRead;
  const canWrite = actualShareData.permCommentWrite;
  const canDownload = actualShareData.allowDownload;
  const file = actualShareData.file;
  const searchParams = new URLSearchParams(window.location.search);
  const selectedCompareKey = searchParams.get("compareKey");
  const selectedCompareUrl = searchParams.get("compareUrl");
  const scopedReplyImagePrefix = "reply-image:";
  const buildScopeCandidates = (value: string) => {
    const candidates = new Set<string>();
    const queue = [value];
    for (const item of queue) {
      if (!item) continue;
      const trimmed = item.trim();
      if (!trimmed || candidates.has(trimmed)) continue;
      candidates.add(trimmed);
      const decoded = decodeURIComponent(trimmed);
      if (decoded !== trimmed) queue.push(decoded);
      if (trimmed.startsWith(scopedReplyImagePrefix)) {
        queue.push(trimmed.slice(scopedReplyImagePrefix.length));
      } else {
        queue.push(`${scopedReplyImagePrefix}${trimmed}`);
      }
      if (trimmed.startsWith("reply:")) {
        queue.push(trimmed.slice("reply:".length));
      }
      try {
        const url = new URL(trimmed, window.location.origin);
        const pathname = url.pathname.replace(/\/+$/, "");
        if (pathname) {
          queue.push(pathname);
          const segments = pathname.split("/").filter(Boolean);
          const basename = segments[segments.length - 1];
          if (basename) queue.push(basename);
        }
      } catch {}
    }
    return candidates;
  };
  const selectedScopedParentIds = new Set<string>();
  if (selectedCompareKey) {
    for (const candidate of buildScopeCandidates(selectedCompareKey)) {
      selectedScopedParentIds.add(candidate);
    }
  }
  if (selectedCompareUrl) {
    for (const candidate of buildScopeCandidates(selectedCompareUrl)) {
      selectedScopedParentIds.add(candidate);
    }
  }
  const allComments = canRead ? file.comments || [] : [];
  const nonScopedComments = allComments.filter(
    (comment) =>
      !comment.parentId || !comment.parentId.startsWith(scopedReplyImagePrefix),
  );
  const scopedMatchedComments = allComments.filter((comment) => {
    if (!comment.parentId) return false;
    for (const candidate of buildScopeCandidates(comment.parentId)) {
      if (selectedScopedParentIds.has(candidate)) return true;
    }
    return false;
  });
  const comments =
    !selectedCompareKey && !selectedCompareUrl
      ? nonScopedComments
      : scopedMatchedComments.length > 0
        ? scopedMatchedComments
        : nonScopedComments;

  const isPsd =
    file.mimeType === "image/vnd.adobe.photoshop" ||
    file.mimeType === "application/x-photoshop" ||
    file.name.endsWith(".psd");
  const isAi =
    file.mimeType === "application/postscript" ||
    file.mimeType === "application/illustrator" ||
    file.name.endsWith(".ai");
  const isAdobeFile = isPsd || isAi;
  const isVideo = file.mimeType.startsWith("video/");
  const isImage =
    file.mimeType.startsWith("image/") &&
    !isAdobeFile &&
    !file.name.endsWith(".psd");
  const isPdf = file.mimeType === "application/pdf";
  const isPptx =
    file.mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    file.name.trim().toLowerCase().endsWith(".pptx");
  const pptxDataUrl = isPptx ? file.url : null;

  // guestPsdPreviewUrl and others are now at the top of the component

  const guestResolvedPreviewUrl =
    file.thumbnailUrl && file.thumbnailUrl !== file.url
      ? file.thumbnailUrl
      : guestPsdPreviewUrl;
  const activeSharedImageUrl = selectedCompareUrl || null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold" data-testid="text-guest-file-title">
              {file.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              レビュー用に共有されています
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              data-testid="button-guest-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              data-testid="button-guest-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(1)}
              data-testid="button-guest-zoom-reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {canDownload && file.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                // If it's an image or adobe file with drawn paints, try to merge them before download
                const hasPaints = paintStrokes && paintStrokes.length > 0;
                const activeNormalImageUrl =
                  guestResolvedPreviewUrl || file.url;

                if (
                  (isImage || isAdobeFile) &&
                  hasPaints &&
                  activeNormalImageUrl
                ) {
                  try {
                    // Create a temporary canvas to composite the image and the paint strokes
                    const tempCanvas = document.createElement("canvas");
                    const ctx = tempCanvas.getContext("2d");
                    if (!ctx) throw new Error("Could not get 2d context");

                    // Load the base image
                    const img = new Image();
                    img.crossOrigin = "anonymous"; // Needed if image is on a different origin
                    await new Promise((resolve, reject) => {
                      img.onload = resolve;
                      img.onerror = reject;
                      img.src = activeNormalImageUrl;
                    });

                    tempCanvas.width = img.naturalWidth;
                    tempCanvas.height = img.naturalHeight;

                    // Draw base image
                    ctx.drawImage(img, 0, 0);

                    // Draw paint strokes from actualShareData.paints
                    if (paintStrokes && paintStrokes.length > 0) {
                      const tempPaintCanvas = document.createElement("canvas");
                      tempPaintCanvas.width = img.naturalWidth;
                      tempPaintCanvas.height = img.naturalHeight;
                      const paintCtx = tempPaintCanvas.getContext("2d");

                      if (paintCtx) {
                        // Note: drawPaintStrokes might not be directly imported in this file.
                        // If it's not, we'll need to draw the strokes manually or import it.
                        // Let's assume we can draw them using the existing paint canvas if it exists in DOM,
                        // or we just use the paintCanvasRef which contains all drawn strokes for this file.
                        if (paintCanvasRef.current) {
                          ctx.drawImage(paintCanvasRef.current, 0, 0);
                        }
                      }
                    }

                    // Convert to blob and download
                    tempCanvas.toBlob((blob) => {
                      if (!blob) return;
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `edited_${file.name}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }, file.mimeType || "image/png");

                    return;
                  } catch (error) {
                    console.error(
                      "Failed to generate combined image for download:",
                      error,
                    );
                    // Fallback to normal download if merging fails
                  }
                }

                // Normal download fallback for non-images or if no paints
                const a = document.createElement("a");
                a.href = file.url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              data-testid="button-guest-download"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}

          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div
            ref={canvasRef}
            className={cn(
              "relative mx-auto bg-card rounded-lg shadow-lg overflow-hidden",
              isAddingComment && "cursor-crosshair",
            )}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center top",
            }}
            onClick={handleCanvasClick}
          >
            {(activeSharedImageUrl || (isImage && file.url)) && (
              <img
                src={activeSharedImageUrl || file.url}
                alt={file.name}
                className="max-w-full"
                draggable={false}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (paintCanvasRef.current) {
                    paintCanvasRef.current.width = img.naturalWidth;
                    paintCanvasRef.current.height = img.naturalHeight;
                  }
                  drawPaintStrokes();
                }}
              />
            )}
            {!activeSharedImageUrl && isPdf && file.url && (
              <iframe
                src={file.url}
                className="w-full h-[800px]"
                title={file.name}
              />
            )}
            {!activeSharedImageUrl && isPptx && pptxDataUrl && (
              <div className="w-full">
                <PptxPreview
                  src={pptxDataUrl}
                  title={file.name}
                  fallbackImageUrl={guestResolvedPreviewUrl}
                />
              </div>
            )}
            {!activeSharedImageUrl && isVideo && file.url && (
              <video
                ref={videoRef}
                src={file.url}
                className="max-w-full"
                onTimeUpdate={() =>
                  videoRef.current &&
                  setCurrentTime(videoRef.current.currentTime)
                }
                onLoadedMetadata={() =>
                  videoRef.current && setDuration(videoRef.current.duration)
                }
                onCanPlay={drawPaintStrokes}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                data-testid="guest-video-player"
              />
            )}
            {/* Adobe file preview (PSD/AI with generated preview) */}
            {!activeSharedImageUrl &&
              isAdobeFile &&
              guestResolvedPreviewUrl && (
                <img
                  src={guestResolvedPreviewUrl}
                  alt={file.name}
                  className="max-w-full"
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (paintCanvasRef.current) {
                      paintCanvasRef.current.width = img.naturalWidth;
                      paintCanvasRef.current.height = img.naturalHeight;
                    }
                    drawPaintStrokes();
                  }}
                />
              )}
            {/* Fallback placeholder for unsupported files */}
            {!activeSharedImageUrl &&
              !isImage &&
              !isPdf &&
              !isPptx &&
              !isVideo &&
              !(isAdobeFile && guestResolvedPreviewUrl) && (
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <FileImage className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-lg mb-2">
                    {isPsd
                      ? "Photoshop ファイル (.psd)"
                      : isAi
                        ? "Illustrator ファイル (.ai)"
                        : file.name.split(".").pop()?.toUpperCase() ||
                          "ファイル"}
                  </p>
                  <p className="text-muted-foreground max-w-md">
                    このファイル形式はブラウザでプレビューできませんが、コメントピンを追加してフィードバックを残すことができます。
                  </p>
                </div>
              )}

            {/* Paint annotations overlay canvas */}
            <canvas
              ref={paintCanvasRef}
              className={cn(
                "absolute top-0 left-0 pointer-events-none",
                activeSharedImageUrl && "hidden",
              )}
              style={{ zIndex: 5 }}
            />

            {canRead &&
              comments.map((comment, index) => (
                <CommentPin
                  key={comment.id}
                  comment={comment}
                  index={index}
                  isSelected={selectedCommentId === comment.id}
                  onClick={() => setSelectedCommentId(comment.id)}
                />
              ))}

            {newCommentPos && (
              <div
                className="absolute z-20 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold animate-pulse"
                style={{
                  left: `${newCommentPos.x * 100}%`,
                  top: `${newCommentPos.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                +
              </div>
            )}
          </div>

          {isVideo && (
            <div className="flex-shrink-0 bg-card border-t p-4">
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    data-testid="guest-video-timeline"
                  />
                  {comments
                    .filter((c) => c.anchor?.videoTimestamp != null)
                    .map((comment, idx) => {
                      const timestamp = comment.anchor?.videoTimestamp ?? 0;
                      const position =
                        duration > 0 ? (timestamp / duration) * 100 : 0;
                      return (
                        <div
                          key={comment.id}
                          className="absolute top-0 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2 cursor-pointer"
                          style={{ left: `${position}%` }}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = timestamp;
                            }
                            setSelectedCommentId(comment.id);
                          }}
                          title={`コメント ${idx + 1}: ${formatTime(timestamp)}`}
                        />
                      );
                    })}
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => skipTime(-10)}
                      aria-label="10秒戻る"
                      data-testid="guest-video-skip-back"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="default"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "一時停止" : "再生"}
                      data-testid="guest-video-play-pause"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => skipTime(10)}
                      aria-label="10秒進む"
                      data-testid="guest-video-skip-forward"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleMute}
                      aria-label={isMuted ? "ミュート解除" : "ミュート"}
                      data-testid="guest-video-mute"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                コメント
                {canRead && (
                  <Badge variant="secondary" className="text-xs">
                    {comments.length}
                  </Badge>
                )}
              </h2>
              {canWrite && (
                <Button
                  size="sm"
                  variant={isAddingComment ? "secondary" : "default"}
                  onClick={() => {
                    setIsAddingComment(!isAddingComment);
                    setNewCommentPos(null);
                    setNewCommentText("");
                  }}
                  data-testid="button-guest-toggle-add-comment"
                >
                  {isAddingComment ? (
                    <>
                      <X className="mr-1 h-4 w-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-1 h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {!canRead && !canWrite && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <LockKeyhole className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                この共有リンクではコメント機能が有効になっていません。
              </p>
            </div>
          )}

          {canWrite && isAddingComment && newCommentPos && (
            <div className="p-4 border-b bg-accent/50 space-y-3">
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="お名前"
                data-testid="input-guest-name"
              />
              <Textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="フィードバックを入力..."
                className="resize-none"
                rows={3}
                data-testid="textarea-guest-comment"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={
                  !newCommentText.trim() ||
                  !guestName.trim() ||
                  addCommentMutation.isPending
                }
                className="w-full"
                data-testid="button-guest-submit-comment"
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Feedback
              </Button>
            </div>
          )}

          {canWrite && isAddingComment && !newCommentPos && (
            <div className="p-4 border-b bg-accent/50">
              <p className="text-sm text-muted-foreground">
                画像上の任意の場所をクリックしてコメントピンを配置してください。
              </p>
            </div>
          )}

          {canWrite && replyingCommentId && (
            <div className="p-4 border-b bg-accent/50 space-y-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="返信を入力..."
                className="resize-none"
                rows={3}
                data-testid="textarea-guest-reply-comment"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddReply}
                  disabled={!replyText.trim() || addReplyMutation.isPending}
                  className="flex-1"
                  data-testid="button-guest-add-reply"
                >
                  {addReplyMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  返信を送信
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReplyingCommentId(null);
                    setReplyText("");
                  }}
                  data-testid="button-guest-cancel-reply"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          {canRead && (
            <ScrollArea className="flex-1">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    コメントがありません。
                    {canWrite &&
                      "「Add」をクリックしてフィードバックを残してください。"}
                  </p>
                </div>
              ) : (
                comments.map((comment, index) => (
                  <GuestCommentItem
                    key={comment.id}
                    comment={comment}
                    index={index}
                    isSelected={selectedCommentId === comment.id}
                    canReply={canWrite}
                    canUpdateStatus={canWrite}
                    isStatusUpdating={statusUpdatingCommentId === comment.id}
                    onClick={() => setSelectedCommentId(comment.id)}
                    onReply={handleStartReplyComment}
                    onStatusChange={handleChangeCommentStatus}
                  />
                ))
              )}
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
