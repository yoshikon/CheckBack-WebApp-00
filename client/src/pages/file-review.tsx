import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { PptxPreview } from "@/components/pptx-preview";
import {
  ArrowLeft,
  MessageSquare,
  Share2,
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
  Copy,
  Check,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  LockKeyhole,
  Eye,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Paintbrush,
  Pencil,
  Eraser,
  Chrome as Home,
  Minus,
  MoveRight,
  Square,
  Circle as CircleIcon,
  Highlighter,
  Undo2,
  Redo2,
  Trash2,
  CreditCard as Edit2,
  Type,
  MousePointer2,
  Paperclip,
  ImagePlus,
  Hash,
  Layers,
  ChevronDown,
  ChevronUp,
  EyeOff,
  FolderOpen,
  Folder,
  Lock,
  Clock as Unlock,
  GitCompare,
  RefreshCcw,
  Reply,
  File as FileIcon,
  CornerDownRight,
  Image as ImageIcon,
  Upload,
  History,
  Plus,
  FileUp,
  CornerDownLeft,
  ArrowUpFromLine,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type {
  FileWithComments,
  CommentWithAnchor,
  CommentStatus,
  ShareLink,
  CommentReplyWithAuthor,
} from "@shared/schema";
import type { LayerInfo, LayerExtractionResult } from "@shared/layer-types";

// Removed local interface definitions for LayerInfo, MaskInfo, LayerEffectInfo as they are now imported from @shared/layer-types

interface LayersApiResponse {
  layers: LayerInfo[];
  documentWidth?: number;
  documentHeight?: number;
}

interface CommentPinProps {
  comment: CommentWithAnchor;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  isDraggable?: boolean;
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
  onDragStart?: (e: React.MouseEvent, commentId: string) => void;
}

function CommentPin({
  comment,
  index,
  isSelected,
  onClick,
  isDraggable,
  isDragging,
  dragOffset,
  onDragStart,
}: CommentPinProps) {
  const anchor = comment.anchor;
  if (!anchor || anchor.x === null || anchor.y === null) return null;

  const statusColors = {
    open: "bg-amber-500",
    in_progress: "bg-blue-500",
    resolved: "bg-green-500",
  };

  // Calculate position (apply drag offset if dragging this pin)
  const posX = isDragging && dragOffset ? anchor.x + dragOffset.x : anchor.x;
  const posY = isDragging && dragOffset ? anchor.y + dragOffset.y : anchor.y;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (!isDraggable) onClick();
      }}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseDown={(e) => {
        if (isDraggable && onDragStart) {
          e.stopPropagation();
          onDragStart(e, comment.id);
        }
      }}
      className={cn(
        "absolute z-10 flex items-center justify-center aspect-square rounded-full text-white text-xs font-bold",
        !isDragging && "transition-all",
        statusColors[comment.status],
        isSelected &&
          "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110",
        isDraggable ? "cursor-move" : "cursor-pointer",
        isDragging && "opacity-80 scale-105",
      )}
      style={{
        left: `${posX * 100}%`,
        top: `${posY * 100}%`,
        transform: "translate(-50%, -50%)",
        width: "1.75rem",
      }}
      data-testid={`pin-comment-${comment.id}`}
      aria-label={`コメント ${index + 1}`}
    >
      {index + 1}
      {isSelected && !isDragging && (
        <span
          className="absolute aspect-square rounded-full animate-ping-slow bg-inherit opacity-75"
          style={{ width: "1.75rem" }}
        />
      )}
    </div>
  );
}

interface LayerItemProps {
  layer: LayerInfo;
  expandedGroups: Set<number>;
  onToggleGroup: (id: number) => void;
  layerVisibility: Map<number, boolean>;
  layerLocks: Map<number, boolean>;
  onToggleVisibility: (id: number) => void;
  onToggleLock: (id: number) => void;
}

function LayerItem({
  layer,
  expandedGroups,
  onToggleGroup,
  layerVisibility,
  layerLocks,
  onToggleVisibility,
  onToggleLock,
}: LayerItemProps) {
  const isGroup = layer.type === "group" || layer.type === "folder";
  const isExpanded = expandedGroups.has(layer.id);
  const hasChildren = layer.children && layer.children.length > 0;

  const isVisible = layerVisibility.has(layer.id)
    ? layerVisibility.get(layer.id)
    : layer.visible;
  const isLocked = layerLocks.has(layer.id)
    ? layerLocks.get(layer.id)
    : layer.locked || false;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs hover-elevate cursor-default",
          isGroup && "font-medium",
          isLocked && "bg-muted/50",
        )}
        style={{ paddingLeft: `${layer.depth * 12 + 8}px` }}
        data-testid={`layer-item-${layer.id}`}
      >
        {isGroup && hasChildren ? (
          <button
            onClick={() => onToggleGroup(layer.id)}
            className="p-0.5 hover:bg-muted rounded"
            data-testid={`button-toggle-group-${layer.id}`}
          >
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-amber-500" />
            )}
          </button>
        ) : isGroup ? (
          <Folder className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <div className="w-3.5 h-3.5 border border-muted-foreground/30 rounded-sm bg-muted/50" />
        )}

        <button
          onClick={() => onToggleVisibility(layer.id)}
          className="p-0.5 hover:bg-muted rounded"
          data-testid={`button-toggle-visibility-${layer.id}`}
          title={isVisible ? "非表示にする" : "表示する"}
        >
          {isVisible ? (
            <Eye className="h-3 w-3 text-muted-foreground" />
          ) : (
            <EyeOff className="h-3 w-3 text-muted-foreground/50" />
          )}
        </button>

        <button
          onClick={() => onToggleLock(layer.id)}
          className="p-0.5 hover:bg-muted rounded"
          data-testid={`button-toggle-lock-${layer.id}`}
          title={isLocked ? "ロック解除" : "ロック"}
        >
          {isLocked ? (
            <Lock className="h-3 w-3 text-amber-500" />
          ) : (
            <Unlock className="h-3 w-3 text-muted-foreground/50" />
          )}
        </button>

        <span
          className={cn(
            "truncate flex-1",
            !isVisible && "text-muted-foreground/50",
            isLocked && "italic",
          )}
        >
          {layer.name}
        </span>

        {layer.blendMode &&
          layer.blendMode !== "normal" &&
          layer.blendMode !== "passThrough" && (
            <span
              className="text-[9px] px-1 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded"
              title={`描画モード: ${layer.blendMode}`}
            >
              {layer.blendMode.replace(/-/g, " ")}
            </span>
          )}

        {layer.isClippingMask && (
          <span
            className="text-[9px] px-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded"
            title="クリッピングマスク"
          >
            Clip
          </span>
        )}
        {layer.mask && !layer.mask.disabled && (
          <span
            className="text-[9px] px-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded"
            title="レイヤーマスク"
          >
            Mask
          </span>
        )}
        {layer.hasVectorMask && (
          <span
            className="text-[9px] px-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded"
            title="ベクターマスク"
          >
            Vec
          </span>
        )}
        {layer.hasEffects && (
          <span
            className="text-[9px] px-1 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded"
            title="レイヤー効果"
          >
            fx
          </span>
        )}
        {layer.isTextLayer && (
          <span
            className="text-[9px] px-1 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded"
            title={
              layer.textContent
                ? `テキスト: ${layer.textContent.substring(0, 30)}`
                : "テキストレイヤー"
            }
          >
            T
          </span>
        )}
        {layer.isSmartObject && (
          <span
            className="text-[9px] px-1 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded"
            title="スマートオブジェクト"
          >
            SO
          </span>
        )}
        {layer.isAdjustmentLayer && (
          <span
            className="text-[9px] px-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded"
            title="調整レイヤー"
          >
            Adj
          </span>
        )}

        <span className="text-muted-foreground/70 text-[10px] flex-shrink-0">
          {layer.opacity < 100 && `${layer.opacity}%`}
          {layer.fillOpacity !== undefined && layer.fillOpacity < 100 && (
            <span className="ml-0.5" title="塗りの不透明度">
              F:{layer.fillOpacity}%
            </span>
          )}
        </span>
      </div>

      {isGroup && isExpanded && hasChildren && (
        <div>
          {layer.children!.map((child) => (
            <LayerItem
              key={child.id}
              layer={child}
              expandedGroups={expandedGroups}
              onToggleGroup={onToggleGroup}
              layerVisibility={layerVisibility}
              layerLocks={layerLocks}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: CommentWithAnchor;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onStatusChange: (status: CommentStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  fileUrl?: string | null;
  paintStrokes?: PaintStroke[];
}

function CommentItem({
  comment,
  index,
  isSelected,
  onClick,
  onStatusChange,
  onEdit,
  onDelete,
  fileUrl,
  paintStrokes,
}: CommentItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const storedUser = getStoredAuthUser();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [compareImageUrl, setCompareImageUrl] = useState<string | null>(null);
  const [compareImages, setCompareImages] = useState<string[]>([]);
  const [currentCompareIndex, setCurrentCompareIndex] = useState(0);

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
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const addReplyMutation = useMutation({
    mutationFn: async ({
      body,
      attachment,
    }: {
      body: string;
      attachment: File | null;
    }) => {
      const formData = new FormData();
      formData.append("body", body);
      if (attachment) {
        formData.append("attachment", attachment);
      }
      const headers: Record<string, string> = {};
      const savedUser = localStorage.getItem("checkback_user");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user?.id) {
            headers["x-user-id"] = user.id;
          }
        } catch {}
      }
      const res = await fetch(`/api/comments/${comment.id}/replies`, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to add reply");
      return res.json();
    },
    onSuccess: () => {
      setReplyText("");
      setReplyAttachment(null);
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
    onError: () => {
      toast({ title: "返信の追加に失敗しました", variant: "destructive" });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      await apiRequest("DELETE", `/api/replies/${replyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  const handleSendReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim() && !replyAttachment) return;
    addReplyMutation.mutate({
      body: replyText.trim() || (replyAttachment ? replyAttachment.name : ""),
      attachment: replyAttachment,
    });
  };

  const handleReplyAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setReplyAttachment(file);
    e.target.value = "";
  };

  const replies = comment.replies || [];
  const isImage = (type: string | null) => type?.startsWith("image/");

  return (
    <>
      <div
        onClick={onClick}
        className={cn(
          "p-4 border-b cursor-pointer transition-colors hover-elevate group",
          isSelected && "bg-accent",
        )}
        data-testid={`comment-item-${comment.id}`}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div
            className={cn(
              "flex items-center justify-center aspect-square rounded-full text-white text-xs font-bold flex-shrink-0",
              comment.status === "open" && "bg-amber-500",
              comment.status === "in_progress" && "bg-blue-500",
              comment.status === "resolved" && "bg-green-500",
            )}
            style={{ width: "1.5rem" }}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">
                {comment.authorType === "internal"
                  ? comment.author?.username ||
                    comment.author?.displayName ||
                    (comment.authorUserId === storedUser?.id
                      ? storedUser.username || storedUser.displayName
                      : undefined) ||
                    "チームメンバー"
                  : comment.guestName || "ゲスト"}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground">
                  {formatTime(comment.createdAt)}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    data-testid={`button-edit-comment-${comment.id}`}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    data-testid={`button-delete-comment-${comment.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap">
              {comment.body}
            </p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Select
                value={comment.status}
                onValueChange={(value) =>
                  onStatusChange(value as CommentStatus)
                }
              >
                <SelectTrigger className="w-auto text-xs gap-1.5 border-0 bg-transparent focus:ring-0">
                  <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <div className="flex items-center gap-2">
                      <Circle className="h-3.5 w-3.5 text-amber-500" />
                      未対応
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      対応中
                    </div>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      解決済み
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                {replies.some(
                  (r) => r.attachmentUrl && isImage(r.attachmentType),
                ) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 gap-1 text-xs text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          const imageReplies = replies
                            .filter(
                              (r) =>
                                r.attachmentUrl && isImage(r.attachmentType),
                            )
                            .map((r) => r.attachmentUrl!);
                          if (imageReplies.length > 0) {
                            setCompareImages(imageReplies);
                            setCurrentCompareIndex(0);
                            setCompareImageUrl(imageReplies[0]);
                          }
                        }}
                        data-testid={`button-compare-images-${comment.id}`}
                      >
                        <GitCompare className="h-3 w-3" />
                        見比べ
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">返信画像と元画像を比較</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Button
                  size="sm"
                  variant={showReplies ? "secondary" : "ghost"}
                  className={cn(
                    "h-6 px-2 gap-1 text-xs",
                    replies.length > 0 && !showReplies && "text-primary",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReplies(!showReplies);
                  }}
                  data-testid={`button-toggle-replies-${comment.id}`}
                >
                  <MessageSquare className="h-3 w-3" />
                  {replies.length > 0 ? (
                    <span>{replies.length}</span>
                  ) : (
                    <span>返信</span>
                  )}
                </Button>
              </div>
            </div>

            {showReplies && (
              <div
                className="mt-3 rounded-lg border border-border/60 bg-muted/30 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/50">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      返信 {replies.length > 0 && `(${replies.length})`}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReplies(false);
                    }}
                    data-testid={`button-close-replies-${comment.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {replies.length > 0 && (
                  <div className="divide-y divide-border/30">
                    {replies.map((reply) => {
                      const replyAuthorName =
                        reply.author?.username ||
                        reply.author?.displayName ||
                        (reply.authorUserId === storedUser?.id
                          ? storedUser.username || storedUser.displayName
                          : undefined) ||
                        reply.guestName ||
                        "ユーザー";
                      const replyInitial = replyAuthorName
                        .charAt(0)
                        .toUpperCase();
                      return (
                        <div
                          key={reply.id}
                          className="px-3 py-2.5 hover:bg-muted/40 transition-colors group/reply"
                          data-testid={`reply-item-${reply.id}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold mt-0.5">
                              {replyInitial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">
                                    {replyAuthorName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatTime(reply.createdAt)}
                                  </span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 opacity-0 group-hover/reply:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("この返信を削除しますか？")) {
                                      deleteReplyMutation.mutate(reply.id);
                                    }
                                  }}
                                  data-testid={`button-delete-reply-${reply.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {reply.body && (
                                <p className="text-xs leading-relaxed text-foreground/85 break-words whitespace-pre-wrap">
                                  {reply.body}
                                </p>
                              )}
                              {reply.attachmentUrl && (
                                <div className="mt-2">
                                  {isImage(reply.attachmentType) ? (
                                    <button
                                      className="group/img block rounded-lg overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer max-w-[180px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCompareImages([
                                          reply.attachmentUrl!,
                                        ]);
                                        setCurrentCompareIndex(0);
                                        setCompareImageUrl(reply.attachmentUrl);
                                      }}
                                      data-testid={`button-compare-attachment-${reply.id}`}
                                    >
                                      <div className="relative">
                                        <img
                                          src={reply.attachmentUrl}
                                          alt={
                                            reply.attachmentName || "添付画像"
                                          }
                                          className="w-full max-h-28 object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                                          <div className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-white/90 dark:bg-black/70 rounded-full px-2.5 py-1 flex items-center gap-1">
                                            <GitCompare className="h-3 w-3" />
                                            <span className="text-[10px] font-medium">
                                              比較表示
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  ) : (
                                    <a
                                      href={reply.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline bg-primary/5 rounded-md px-2.5 py-1.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FileIcon className="h-3.5 w-3.5" />
                                      <span className="truncate max-w-[140px]">
                                        {reply.attachmentName || "添付ファイル"}
                                      </span>
                                      <Download className="h-3 w-3 text-muted-foreground" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  className="p-2.5 border-t border-border/40 bg-background"
                  data-testid={`reply-input-area-${comment.id}`}
                >
                  {replyAttachment && (
                    <div className="flex items-center gap-2 text-xs bg-muted/60 rounded-lg px-3 py-2 mb-2 border border-border/40">
                      {isImage(replyAttachment.type) ? (
                        <ImagePlus className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      ) : (
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 text-foreground/80">
                        {replyAttachment.name}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => setReplyAttachment(null)}
                        data-testid={`button-remove-reply-attachment-${comment.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="返信を入力..."
                        className="min-h-[36px] max-h-[120px] text-xs resize-none rounded-lg border-border/60 bg-muted/30 focus:bg-background transition-colors px-3 py-2 leading-relaxed"
                        rows={1}
                        data-testid={`input-reply-${comment.id}`}
                      />
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <input
                        type="file"
                        ref={replyFileInputRef}
                        className="hidden"
                        onChange={handleReplyAttachment}
                        data-testid={`input-reply-file-${comment.id}`}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => replyFileInputRef.current?.click()}
                            data-testid={`button-reply-attach-file-${comment.id}`}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          ファイルを添付
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              if (replyFileInputRef.current) {
                                replyFileInputRef.current.accept = "image/*";
                                replyFileInputRef.current.click();
                                setTimeout(() => {
                                  if (replyFileInputRef.current)
                                    replyFileInputRef.current.accept = "";
                                }, 100);
                              }
                            }}
                            data-testid={`button-reply-attach-image-${comment.id}`}
                          >
                            <ImagePlus className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          画像を添付
                        </TooltipContent>
                      </Tooltip>
                      <Button
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        disabled={
                          (!replyText.trim() && !replyAttachment) ||
                          addReplyMutation.isPending
                        }
                        onClick={handleSendReply}
                        data-testid={`button-send-reply-${comment.id}`}
                      >
                        {addReplyMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {compareImageUrl && (
        <CompareDialog
          originalUrl={fileUrl}
          compareUrls={
            compareImages.length > 0 ? compareImages : [compareImageUrl]
          }
          currentIndex={currentCompareIndex}
          onIndexChange={setCurrentCompareIndex}
          onClose={() => {
            setCompareImageUrl(null);
            setCompareImages([]);
            setCurrentCompareIndex(0);
          }}
          paintStrokes={paintStrokes}
        />
      )}
    </>
  );
}

interface CompareDialogProps {
  originalUrl: string | null | undefined;
  compareUrls: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onUploadNew?: (file: File) => void;
  paintStrokes?: PaintStroke[];
}

function CompareImageWithStrokes({
  src,
  alt,
  strokes,
  zoom,
  className,
  style,
}: {
  src: string;
  alt?: string;
  strokes?: PaintStroke[];
  zoom: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (canvas && img && strokes && strokes.length > 0) {
      if (img.naturalWidth === 0) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPaintStrokes(ctx, strokes, canvas.width, canvas.height);
      }
    }
  };

  useEffect(() => {
    draw();
  }, [strokes]);

  return (
    <div
      className="relative inline-block"
      style={{ width: `${zoom}%`, ...style }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn("w-full h-auto block", className)}
        onLoad={draw}
      />
      {strokes && strokes.length > 0 && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}
    </div>
  );
}

function CompareDialog({
  originalUrl,
  compareUrls,
  currentIndex,
  onIndexChange,
  onClose,
  onUploadNew,
  paintStrokes,
}: CompareDialogProps) {
  const [compareMode, setCompareMode] = useState<"side-by-side" | "overlay">(
    "side-by-side",
  );
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);

  const currentCompareUrl = compareUrls[currentIndex] || compareUrls[0];
  const compareNewVersionInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                画像比較ツール
              </DialogTitle>
              <DialogDescription className="mt-1">
                元の画像と修正後の画像を比較・検証できます
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Tabs
                value={compareMode}
                onValueChange={(v) => setCompareMode(v as typeof compareMode)}
              >
                <TabsList className="grid w-[240px] grid-cols-2">
                  <TabsTrigger value="side-by-side" className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <MoveRight className="h-3.5 w-3.5" />
                      並べて表示
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="overlay" className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      重ねて表示
                    </div>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  ズーム:
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setZoom(Math.max(50, zoom - 25))}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-sm font-medium w-12 text-center">
                    {zoom}%
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setZoom(Math.min(400, zoom + 25))}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setZoom(100)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    リセット
                  </Button>
                </div>
              </div>

              {compareMode === "overlay" && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    透過度:
                  </label>
                  <Slider
                    value={[overlayOpacity]}
                    onValueChange={(v) => setOverlayOpacity(v[0])}
                    min={0}
                    max={100}
                    step={5}
                    className="w-32"
                  />
                  <span className="text-sm font-medium w-10 text-center">
                    {overlayOpacity}%
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                  id="grid-toggle"
                />
                <label
                  htmlFor="grid-toggle"
                  className="text-sm font-medium text-muted-foreground cursor-pointer"
                >
                  グリッド表示
                </label>
              </div>
            </div>

            {compareUrls.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                </Button>
                <span className="text-sm font-medium">
                  {currentIndex + 1} / {compareUrls.length}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() =>
                    onIndexChange(
                      Math.min(compareUrls.length - 1, currentIndex + 1),
                    )
                  }
                  disabled={currentIndex === compareUrls.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </Button>
              </div>
            )}
          </div>

          {compareMode === "side-by-side" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 py-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-semibold">元の画像</h3>
                </div>
                <div
                  className={cn(
                    "relative border-2 border-blue-200 dark:border-blue-800 rounded-lg overflow-auto bg-muted/30 flex items-center justify-center",
                    showGrid &&
                      "bg-[linear-gradient(rgba(0,0,0,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.05)_1px,transparent_1px)] bg-[size:20px_20px]",
                  )}
                  style={{ height: "calc(95vh - 280px)" }}
                >
                  {originalUrl ? (
                    <CompareImageWithStrokes
                      src={originalUrl}
                      alt="元の画像"
                      strokes={paintStrokes}
                      zoom={zoom}
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileImage className="h-12 w-12" />
                      <p className="text-sm">元ファイルが見つかりません</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 py-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <h3 className="text-sm font-semibold">修正後の画像</h3>
                </div>
                <div
                  className={cn(
                    "relative border-2 border-green-200 dark:border-green-800 rounded-lg overflow-auto bg-muted/30 flex items-center justify-center",
                    showGrid &&
                      "bg-[linear-gradient(rgba(0,0,0,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.05)_1px,transparent_1px)] bg-[size:20px_20px]",
                  )}
                  style={{ height: "calc(95vh - 280px)" }}
                >
                  <img
                    src={currentCompareUrl}
                    alt="修正後の画像"
                    style={{ width: `${zoom}%`, height: "auto" }}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium">元の画像</span>
                </div>
                <div className="h-px w-8 bg-border" />
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium">
                    修正後（透過度 {overlayOpacity}%）
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "relative border-2 border-purple-200 dark:border-purple-800 rounded-lg overflow-auto bg-muted/30 flex items-center justify-center",
                  showGrid &&
                    "bg-[linear-gradient(rgba(0,0,0,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.05)_1px,transparent_1px)] bg-[size:20px_20px]",
                )}
                style={{ height: "calc(95vh - 280px)" }}
              >
                <div className="relative" style={{ width: `${zoom}%` }}>
                  {originalUrl && (
                    <CompareImageWithStrokes
                      src={originalUrl}
                      alt="元の画像"
                      strokes={paintStrokes}
                      zoom={100}
                      style={{ width: "100%" }}
                      className="object-contain"
                    />
                  )}
                  <img
                    src={currentCompareUrl}
                    alt="修正後の画像"
                    className="absolute inset-0 w-full h-auto object-contain"
                    style={{ opacity: overlayOpacity / 100 }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ShareLinkModalProps {
  fileId: string;
  selectedCompareKey?: string | null;
  selectedCompareUrl?: string | null;
  onClose: () => void;
}

function ShareLinkModal({
  fileId,
  selectedCompareKey,
  selectedCompareUrl,
  onClose,
}: ShareLinkModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState("7");
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowCommentRead, setAllowCommentRead] = useState(true);
  const [allowCommentWrite, setAllowCommentWrite] = useState(true);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));

      const response = await apiRequest(
        "POST",
        `/api/files/${fileId}/share-links`,
        {
          expiresAt: expiresAt.toISOString(),
          allowDownload,
          permCommentRead: allowCommentRead,
          permCommentWrite: allowCommentWrite,
          password: enablePassword ? password : undefined,
        },
      );
      return response as ShareLink;
    },
    onSuccess: (data) => {
      setShareLink(data);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "共有リンクの作成に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const shareUrl = shareLink
    ? (() => {
        const url = new URL(`/s/${shareLink.token}`, window.location.origin);
        if (selectedCompareKey) {
          url.searchParams.set("compareKey", selectedCompareKey);
        }
        if (selectedCompareUrl) {
          url.searchParams.set("compareUrl", selectedCompareUrl);
        }
        return url.toString();
      })()
    : null;

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "コピーしました！",
        description: "共有リンクがクリップボードにコピーされました。",
      });
    }
  };

  return (
    <DialogContent className="sm:max-w-md overflow-hidden">
      <DialogHeader>
        <DialogTitle>ファイルを共有</DialogTitle>
        <DialogDescription>
          外部レビュアー向けの共有リンクを作成
        </DialogDescription>
      </DialogHeader>

      {!shareLink ? (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">リンク有効期限</label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger data-testid="select-expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1日</SelectItem>
                <SelectItem value="7">7日</SelectItem>
                <SelectItem value="14">14日</SelectItem>
                <SelectItem value="30">30日</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Security</label>
            <div className="flex items-center justify-between gap-2 py-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                <span>パスワード保護</span>
              </div>
              <Switch
                checked={enablePassword}
                onCheckedChange={setEnablePassword}
                data-testid="switch-password"
              />
            </div>
            {enablePassword && (
              <Input
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
              />
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Permissions</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 py-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>ダウンロードを許可</span>
                </div>
                <Switch
                  checked={allowDownload}
                  onCheckedChange={setAllowDownload}
                  data-testid="switch-download"
                />
              </div>
              <div className="flex items-center justify-between gap-2 py-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>コメントの閲覧を許可</span>
                </div>
                <Switch
                  checked={allowCommentRead}
                  onCheckedChange={setAllowCommentRead}
                  data-testid="switch-comment-read"
                />
              </div>
              <div className="flex items-center justify-between gap-2 py-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
                  <span>コメントの追加を許可</span>
                </div>
                <Switch
                  checked={allowCommentWrite}
                  onCheckedChange={setAllowCommentWrite}
                  data-testid="switch-comment-write"
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending || (enablePassword && !password.trim())
            }
            data-testid="button-create-link"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Create Share Link
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 py-4 overflow-hidden">
          <div className="flex items-center gap-2 w-full">
            <div
              className="flex-1 min-w-0 p-3 bg-muted rounded-md text-sm font-mono break-all overflow-hidden"
              style={{ wordBreak: "break-all" }}
            >
              {shareUrl}
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="shrink-0"
              data-testid="button-copy-link"
              aria-label="リンクをコピー"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              有効期限:{" "}
              {new Date(shareLink.expiresAt).toLocaleDateString("ja-JP")}
            </p>
            <p>パスワード: {enablePassword ? "あり" : "なし"}</p>
            <p>ダウンロード: {shareLink.allowDownload ? "可" : "不可"}</p>
            <p>
              コメント:{" "}
              {shareLink.permCommentRead
                ? shareLink.permCommentWrite
                  ? "閲覧・書込可"
                  : "閲覧のみ"
                : "無効"}
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShareLink(null)}
          >
            別のリンクを作成
          </Button>
        </div>
      )}
    </DialogContent>
  );
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
  // For shapes (rectangle, circle, line, arrow)
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  // For text tool
  text?: string;
  textPosition?: { x: number; y: number };
  fontSize?: number;
  // For image overlay
  imageUrl?: string;
  imageElement?: HTMLImageElement;
  imagePosition?: { x: number; y: number };
  imageSize?: { width: number; height: number };
  opacity?: number;
}

const drawPaintStrokes = (
  ctx: CanvasRenderingContext2D,
  strokes: PaintStroke[],
  canvasWidth: number,
  canvasHeight: number,
) => {
  strokes.forEach((stroke) => {
    ctx.beginPath();
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

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
    }

    // Handle shape tools
    if (
      (stroke.tool === "line" ||
        stroke.tool === "arrow" ||
        stroke.tool === "rectangle" ||
        stroke.tool === "circle") &&
      stroke.startPoint &&
      stroke.endPoint
    ) {
      ctx.globalAlpha = stroke.opacity ?? 1;
      const startX = stroke.startPoint.x * canvasWidth;
      const startY = stroke.startPoint.y * canvasHeight;
      const endX = stroke.endPoint.x * canvasWidth;
      const endY = stroke.endPoint.y * canvasHeight;

      if (stroke.tool === "line") {
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      } else if (stroke.tool === "arrow") {
        // Draw line
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrowhead
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
      } else if (stroke.tool === "rectangle") {
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
      } else if (stroke.tool === "circle") {
        const radiusX = Math.abs(endX - startX) / 2;
        const radiusY = Math.abs(endY - startY) / 2;
        const centerX = startX + (endX - startX) / 2;
        const centerY = startY + (endY - startY) / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    } else if (stroke.tool === "text" && stroke.text && stroke.textPosition) {
      // Text rendering with multi-line support
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = stroke.opacity ?? 1;
      const fontSize = stroke.fontSize || Math.max(16, stroke.size * 4);
      ctx.font = `${fontSize}px "Noto Sans JP", sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.textBaseline = "top";
      const textX = stroke.textPosition.x * canvasWidth;
      const textY = stroke.textPosition.y * canvasHeight;
      const lineHeight = fontSize * 1.3;
      const lines = stroke.text.split("\n");
      lines.forEach((line, idx) => {
        ctx.fillText(line, textX, textY + idx * lineHeight);
      });
    } else if (
      stroke.tool === "image" &&
      stroke.imageElement &&
      stroke.imagePosition &&
      stroke.imageSize
    ) {
      // Image overlay rendering
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = stroke.opacity ?? 1;
      const imgX = stroke.imagePosition.x * canvasWidth;
      const imgY = stroke.imagePosition.y * canvasHeight;
      const imgWidth = stroke.imageSize.width * canvasWidth;
      const imgHeight = stroke.imageSize.height * canvasHeight;
      ctx.drawImage(stroke.imageElement, imgX, imgY, imgWidth, imgHeight);
    } else if (stroke.points.length >= 2) {
      // Freehand drawing (brush, eraser, highlighter)
      ctx.globalAlpha = stroke.opacity ?? 1;
      ctx.moveTo(
        stroke.points[0].x * canvasWidth,
        stroke.points[0].y * canvasHeight,
      );

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(
          stroke.points[i].x * canvasWidth,
          stroke.points[i].y * canvasHeight,
        );
      }

      ctx.stroke();
    }
  });

  ctx.globalCompositeOperation = "source-over";
};

// Generate unique ID for strokes
const generateStrokeId = () =>
  `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function getStoredAuthUser() {
  if (typeof window === "undefined") return null;
  const savedUser = localStorage.getItem("checkback_user");
  if (!savedUser) return null;
  try {
    const user = JSON.parse(savedUser);
    if (!user?.id) return null;
    return user as { id: string; username?: string; displayName?: string };
  } catch {
    return null;
  }
}

export default function FileReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canvasRef = useRef<HTMLDivElement>(null);
  const paintCanvasRef = useRef<HTMLCanvasElement>(null);
  const compareCanvasRef = useRef<HTMLCanvasElement>(null);
  const compareRightCanvasRef = useRef<HTMLCanvasElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const compareRightContainerRef = useRef<HTMLDivElement>(null);
  const compareLeftScrollRef = useRef<HTMLDivElement>(null);
  const compareRightScrollRef = useRef<HTMLDivElement>(null);
  const normalScrollRef = useRef<HTMLDivElement>(null);
  const newVersionInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  // Upload new version mutation
  const uploadNewVersionMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      // Pass current file ID as parent to establish version relationship
      formData.append("parentFileId", id!);

      const res = await fetch(`/api/projects/${file?.projectId}/files`, {
        method: "POST",
        body: formData,
        headers: {
          ...(getStoredAuthUser()?.id
            ? { "x-user-id": getStoredAuthUser()!.id }
            : {}),
        },
      });

      if (!res.ok) throw new Error("Failed to upload new version");
      return res.json();
    },
    onSuccess: (newFile) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", file?.projectId],
      });
      toast({
        title: "新しいバージョンをアップロードしました",
        description: `Ver${newFile.versionNumber} として保存されました。`,
      });
      // Optionally switch to the new file or open compare mode
      // For now, let's just notify
    },
    onError: () => {
      toast({
        title: "アップロードエラー",
        description: "新しいバージョンのアップロードに失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handleNewVersionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadNewVersionMutation.mutate(file);
    e.target.value = "";
  };
  const [zoom, setZoom] = useState(1);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null,
  );
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentPos, setNewCommentPos] = useState<{
    x: number;
    y: number;
    pane?: "left" | "right";
  } | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [liveInputDate, setLiveInputDate] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(480); // Default to previous max width
  const [isResizing, setIsResizing] = useState(false);

  // Use main sidebar toggle
  const { state: sidebarState, toggleSidebar } = useSidebar();

  // Right sidebar resize handling
  const MIN_SIDEBAR_WIDTH = 240; // min width
  const MAX_SIDEBAR_WIDTH = 576; // max width (previous 480 * 1.2)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setRightSidebarWidth(
        Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth)),
      );
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setLiveInputDate(new Date());
    }, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  // Paint mode state
  const [isPaintMode, setIsPaintMode] = useState(false);
  const [paintTool, setPaintTool] = useState<PaintTool>("brush");
  const [paintColor, setPaintColor] = useState("#ef4444");
  const [paintSize, setPaintSize] = useState(4);
  const [paintOpacity, setPaintOpacity] = useState(1);
  const [textFontSize, setTextFontSize] = useState(16);
  const [paintStrokes, setPaintStrokes] = useState<PaintStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<PaintStroke | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const snapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSnapped, setIsSnapped] = useState(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const [undoStack, setUndoStack] = useState<PaintStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<PaintStroke[][]>([]);
  const [showAllPaints, setShowAllPaints] = useState(true);

  // Text tool state
  const [isAddingText, setIsAddingText] = useState(false);
  const [textInputPos, setTextInputPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [textInputValue, setTextInputValue] = useState("");
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [editingTextStrokeId, setEditingTextStrokeId] = useState<string | null>(
    null,
  );

  // Selection tool state
  const [selectedStrokeIds, _setSelectedStrokeIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeSelectedStrokeId, setActiveSelectedStrokeId] = useState<
    string | null
  >(null);
  const selectedStrokeIdsRef = useRef<Set<string>>(new Set());
  const setSelectedStrokeIds = (value: Set<string>) => {
    selectedStrokeIdsRef.current = value;
    _setSelectedStrokeIds(value);
  };
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  // Shape resize handle state: 'nw', 'ne', 'sw', 'se' for corners, 'n', 's', 'e', 'w' for edges
  type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;
  const [activeResizeHandle, setActiveResizeHandle] =
    useState<ResizeHandle>(null);
  const [isShapeResizing, setIsShapeResizing] = useState(false);
  const [shapeResizeStart, setShapeResizeStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [originalShapeBounds, setOriginalShapeBounds] = useState<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null>(null);
  const originalStrokeDataRef = useRef<PaintStroke | null>(null);

  // File name edit state
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingFileName, setEditingFileName] = useState("");

  // Selection box state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionBoxCurrent, setSelectionBoxCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const compareHitCycleRef = useRef<{
    pane: "left" | "right";
    key: string;
    index: number;
    ids: string[];
  } | null>(null);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pdfFrameRef = useRef<HTMLIFrameElement>(null);

  // Layer panel state
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [layerVisibility, setLayerVisibility] = useState<Map<number, boolean>>(
    new Map(),
  );
  const [layerLocks, setLayerLocks] = useState<Map<number, boolean>>(new Map());
  const [isCustomLayerComposition, setIsCustomLayerComposition] =
    useState(false); // Track if user has modified layer visibility

  const getImageReplyUrls = useCallback(
    (comment?: CommentWithAnchor | null) => {
      if (!comment?.replies) return [];
      return comment.replies
        .filter(
          (reply) =>
            !!reply.attachmentUrl &&
            !!reply.attachmentType &&
            reply.attachmentType.startsWith("image/"),
        )
        .map((reply) => reply.attachmentUrl as string);
    },
    [],
  );

  // Define isLayerVisible inside component scope so it can access layerVisibility state
  const isLayerVisible = useCallback(
    (layer: LayerInfo): boolean => {
      // 1. Check direct visibility setting
      if (layerVisibility.has(layer.id)) {
        if (!layerVisibility.get(layer.id)) return false;
      } else if (!layer.visible) {
        return false;
      }

      // 2. Check parent visibility (recursive)
      // Note: Since we don't have parent reference in LayerInfo, we rely on the fact that
      // renderItems logic handles hierarchy. But for standalone check, we might need parent map.
      // For now, simple check is enough for the render loop which processes top-down or bottom-up.

      return true;
    },
    [layerVisibility],
  );

  // Compare mode state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareFileId, setCompareFileId] = useState<string | null>(null);
  const [compareReplyImageUrls, setCompareReplyImageUrls] = useState<string[]>(
    [],
  );
  const [compareReplyIndex, setCompareReplyIndex] = useState(0);
  const [compareActivePane, setCompareActivePane] = useState<"left" | "right">(
    "left",
  );
  const [compareLeftZoom, setCompareLeftZoom] = useState(1);
  const [compareRightZoom, setCompareRightZoom] = useState(1);
  const [comparePendingPinPane, setComparePendingPinPane] = useState<
    "left" | "right" | null
  >(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [isCompareSpacePressed, setIsCompareSpacePressed] = useState(false);
  const [isCompareSpacePanning, setIsCompareSpacePanning] = useState(false);
  const [compareLeftPaintStrokes, setCompareLeftPaintStrokes] = useState<
    PaintStroke[]
  >([]);
  const [compareRightPaintStrokes, setCompareRightPaintStrokes] = useState<
    PaintStroke[]
  >([]);
  const [compareLeftCurrentStroke, setCompareLeftCurrentStroke] =
    useState<PaintStroke | null>(null);
  const [compareRightCurrentStroke, setCompareRightCurrentStroke] =
    useState<PaintStroke | null>(null);
  const [compareLeftUndoStack, setCompareLeftUndoStack] = useState<
    PaintStroke[][]
  >([]);
  const [compareLeftRedoStack, setCompareLeftRedoStack] = useState<
    PaintStroke[][]
  >([]);
  const [compareRightUndoStack, setCompareRightUndoStack] = useState<
    PaintStroke[][]
  >([]);
  const [compareRightRedoStack, setCompareRightRedoStack] = useState<
    PaintStroke[][]
  >([]);
  const [selectedNormalThumbnailId, setSelectedNormalThumbnailId] = useState<
    string | null
  >(null);
  const [selectedNormalReplyImageUrl, setSelectedNormalReplyImageUrl] =
    useState<string | null>(null);
  const [normalPanLayoutTick, setNormalPanLayoutTick] = useState(0);
  const normalPaintCacheRef = useRef<Record<string, PaintStroke[]>>({});
  const normalPrevPaintScopeKeyRef = useRef<string | null>(null);
  const normalPaintStrokesRef = useRef<PaintStroke[]>([]);
  const comparePaintCacheRef = useRef<Record<string, PaintStroke[]>>({});
  const comparePrevLeftKeyRef = useRef<string | null>(null);
  const comparePrevRightKeyRef = useRef<string | null>(null);
  const compareLeftStrokesRef = useRef<PaintStroke[]>([]);
  const compareRightStrokesRef = useRef<PaintStroke[]>([]);
  const compareSpacePanRef = useRef<{
    pane: "left" | "right";
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const normalSpacePanRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [leftCompareReplyImageUrl, setLeftCompareReplyImageUrl] = useState<
    string | null
  >(null);

  const { data: file, isLoading } = useQuery<FileWithComments>({
    queryKey: ["/api/files", id],
  });

  // Fetch compare file data when compare mode is active
  const { data: compareFile } = useQuery<FileWithComments>({
    queryKey: ["/api/files", compareFileId],
    enabled: !!compareFileId && isCompareMode,
  });

  // Fetch project files for comparison dropdown
  const { data: projectFiles } = useQuery<{ files: FileWithComments[] }>({
    queryKey: ["/api/projects", file?.projectId],
    enabled: !!file?.projectId,
  });

  // Version Options Construction
  const scopedProjectFiles = useMemo(() => {
    if (!file) return [] as FileWithComments[];
    const allProjectFiles = projectFiles?.files || [];
    if (allProjectFiles.length === 0) {
      return [file];
    }

    const fileById = new Map(allProjectFiles.map((f) => [f.id, f]));
    const rootCache = new Map<string, string>();

    const resolveRootId = (target: {
      id: string;
      parentFileId?: string | null;
    }) => {
      const cached = rootCache.get(target.id);
      if (cached) return cached;

      let currentId: string = target.id;
      let currentParentId: string | null = target.parentFileId || null;
      const visited = new Set<string>([currentId]);

      while (currentParentId && !visited.has(currentParentId)) {
        visited.add(currentParentId);
        const parent = fileById.get(currentParentId);
        if (!parent) {
          currentId = currentParentId;
          break;
        }
        currentId = parent.id;
        currentParentId = parent.parentFileId || null;
      }

      visited.forEach((id) => rootCache.set(id, currentId));
      return currentId;
    };

    const currentRootId = resolveRootId(file);
    const scoped = allProjectFiles.filter((f) => {
      if (f.id === file.id) return true;
      const sameRoot = resolveRootId(f) === currentRootId;
      const directlyLinked =
        f.parentFileId === file.id || file.parentFileId === f.id;
      const sameName = f.name === file.name;
      return sameRoot || directlyLinked || sameName;
    });

    if (!scoped.some((f) => f.id === file.id)) {
      return [file, ...scoped];
    }
    return scoped;
  }, [file, projectFiles]);

  const versionOptions = useMemo(() => {
    const options: {
      id: string;
      type: "file" | "reply";
      label: string;
      subLabel: string;
      versionTag?: string;
      date: Date;
      url: string | null;
      mimeType?: string;
    }[] = [];

    // 1. Files (Current & Related)
    if (scopedProjectFiles.length > 0) {
      scopedProjectFiles.forEach((f: any) => {
        options.push({
          id: f.id,
          type: "file",
          label: f.name,
          subLabel: `Ver${f.versionNumber || 1}`,
          versionTag: undefined,
          date: new Date(f.createdAt),
          url: f.url,
          mimeType: f.mimeType,
        });
      });
    } else if (file) {
      // Fallback if projectFiles not loaded yet
      options.push({
        id: file.id,
        type: "file",
        label: file.name,
        subLabel: `Ver${file.versionNumber || 1}`,
        versionTag: undefined,
        date: new Date(file.createdAt),
        url: file.url,
        mimeType: file.mimeType,
      });
    }

    // 2. Reply Images
    if (file?.comments) {
      file.comments.forEach((c) => {
        const imageReplies = (c.replies || []).filter((r) => {
          return (
            !!r.attachmentUrl &&
            (r.attachmentType?.startsWith("image/") ||
              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(r.attachmentUrl))
          );
        });

        imageReplies.forEach((r, index) => {
          const version = index + 1;
          const originalName = r.attachmentName || "reply-image";
          const dotIndex = originalName.lastIndexOf(".");
          const hasExt = dotIndex > 0;
          const baseName = hasExt
            ? originalName.slice(0, dotIndex)
            : originalName;
          const ext = hasExt ? originalName.slice(dotIndex) : "";
          const hasVersionSuffix = /\sver\d+$/i.test(baseName);
          const versionedName =
            version > 1 && !hasVersionSuffix
              ? `${baseName} ver${version}${ext}`
              : originalName;

          options.push({
            id: r.id,
            type: "reply",
            label: versionedName,
            subLabel: "返信画像",
            versionTag: `ver${version}`,
            date: new Date(r.createdAt),
            url: r.attachmentUrl,
            mimeType: r.attachmentType || "image/png",
          });
        });
      });
    }

    return options.sort((a, b) => {
      const timeA = a.date instanceof Date ? a.date.getTime() : 0;
      const timeB = b.date instanceof Date ? b.date.getTime() : 0;
      return timeB - timeA;
    });
  }, [file, scopedProjectFiles]);

  // Helper to handle right side selection
  const handleRightCompareChange = (value: string) => {
    if (value === "upload-new") {
      newVersionInputRef.current?.click();
      return;
    }

    const selected = versionOptions.find((v) => v.id === value);
    if (!selected) return;

    if (selected.type === "file") {
      setCompareFileId(selected.id);
      setCompareReplyImageUrls([]);
      setCompareReplyIndex(0);
    } else {
      setCompareFileId(null);
      setCompareReplyImageUrls([selected.url!]);
      setCompareReplyIndex(0);
    }
  };

  const handleLeftCompareChange = (value: string) => {
    if (value === "upload-new") {
      newVersionInputRef.current?.click();
      return;
    }

    const selected = versionOptions.find((v) => v.id === value);
    if (!selected) return;

    if (selected.type === "file") {
      setLeftCompareReplyImageUrl(null);
      if (selected.id !== id) {
        setLocation(`/files/${selected.id}`);
      }
      return;
    }

    setLeftCompareReplyImageUrl(selected.url || null);
  };

  const currentLeftValue = useMemo(() => {
    if (leftCompareReplyImageUrl) {
      const found = versionOptions.find(
        (v) => v.type === "reply" && v.url === leftCompareReplyImageUrl,
      );
      return found?.id || "";
    }
    return id || "";
  }, [id, leftCompareReplyImageUrl, versionOptions]);

  // Helper to determine current right selection value
  const currentRightValue = useMemo(() => {
    if (compareFileId) return compareFileId;
    if (compareReplyImageUrls.length > 0) {
      // Find option with matching URL
      const found = versionOptions.find(
        (v) => v.type === "reply" && v.url === compareReplyImageUrls[0],
      );
      return found?.id || "";
    }
    return "";
  }, [compareFileId, compareReplyImageUrls, versionOptions]);

  const normalThumbnailOptions = useMemo(() => {
    return [...versionOptions].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [versionOptions]);

  const selectedNormalThumbnail = useMemo(() => {
    if (!selectedNormalThumbnailId) {
      return normalThumbnailOptions.find((option) => option.id === id) || null;
    }
    return (
      normalThumbnailOptions.find(
        (option) => option.id === selectedNormalThumbnailId,
      ) || null
    );
  }, [id, normalThumbnailOptions, selectedNormalThumbnailId]);

  const normalPaintScopeKey = useMemo(() => {
    if (selectedNormalReplyImageUrl) {
      return `reply:${selectedNormalThumbnailId || selectedNormalReplyImageUrl}`;
    }
    return `file:${id || "__none__"}`;
  }, [id, selectedNormalReplyImageUrl, selectedNormalThumbnailId]);

  useEffect(() => {
    setSelectedNormalThumbnailId(id || null);
    setSelectedNormalReplyImageUrl(null);
  }, [id]);

  useEffect(() => {
    normalPaintStrokesRef.current = paintStrokes;
  }, [paintStrokes]);

  useEffect(() => {
    if (!id) return;
    const prevScopeKey = normalPrevPaintScopeKeyRef.current;
    if (!prevScopeKey) {
      normalPrevPaintScopeKeyRef.current = normalPaintScopeKey;
      return;
    }
    if (prevScopeKey === normalPaintScopeKey) return;
    normalPaintCacheRef.current[prevScopeKey] = normalPaintStrokesRef.current;
    setPaintStrokes(normalPaintCacheRef.current[normalPaintScopeKey] || []);
    setCurrentStroke(null);
    setSelectedStrokeIds(new Set());
    setActiveSelectedStrokeId(null);
    normalPrevPaintScopeKeyRef.current = normalPaintScopeKey;
  }, [id, normalPaintScopeKey]);

  useEffect(() => {
    if (!id) return;
    normalPaintCacheRef.current[normalPaintScopeKey] = paintStrokes;
  }, [id, normalPaintScopeKey, paintStrokes]);

  const handleNormalThumbnailSelect = (thumbnailId: string) => {
    const selected = normalThumbnailOptions.find(
      (option) => option.id === thumbnailId,
    );
    if (!selected) return;
    setSelectedNormalThumbnailId(selected.id);
    if (selected.type === "file") {
      setSelectedNormalReplyImageUrl(null);
      if (selected.id !== id) {
        setLocation(`/files/${selected.id}`);
      }
      return;
    }
    setSelectedNormalReplyImageUrl(selected.url || null);
  };

  const getComparePaneCacheKey = useCallback(
    (pane: "left" | "right", value: string) => `${pane}:${value || "__none__"}`,
    [],
  );

  const currentLeftCompareCacheKey = useMemo(
    () => getComparePaneCacheKey("left", currentLeftValue),
    [getComparePaneCacheKey, currentLeftValue],
  );

  const currentRightCompareCacheKey = useMemo(
    () => getComparePaneCacheKey("right", currentRightValue),
    [getComparePaneCacheKey, currentRightValue],
  );

  const currentNormalLeftCompareCacheKey = useMemo(
    () => getComparePaneCacheKey("left", selectedNormalThumbnailId || id || ""),
    [getComparePaneCacheKey, id, selectedNormalThumbnailId],
  );

  const currentNormalRightCompareCacheKey = useMemo(
    () =>
      getComparePaneCacheKey("right", selectedNormalThumbnailId || id || ""),
    [getComparePaneCacheKey, id, selectedNormalThumbnailId],
  );

  useEffect(() => {
    setLeftCompareReplyImageUrl(null);
  }, [id]);

  useEffect(() => {
    compareLeftStrokesRef.current = compareLeftPaintStrokes;
  }, [compareLeftPaintStrokes]);

  useEffect(() => {
    compareRightStrokesRef.current = compareRightPaintStrokes;
  }, [compareRightPaintStrokes]);

  useEffect(() => {
    if (!isCompareMode) return;
    const isMainLeftImage =
      !leftCompareReplyImageUrl && currentLeftValue === id;
    const mainFileScopeKey = `file:${id || "__none__"}`;
    const mainFileStrokes =
      normalPaintCacheRef.current[mainFileScopeKey] ?? paintStrokes;
    const prevKey = comparePrevLeftKeyRef.current;
    if (prevKey && prevKey !== currentLeftCompareCacheKey) {
      comparePaintCacheRef.current[prevKey] = compareLeftStrokesRef.current;
    }
    if (isMainLeftImage) {
      setCompareLeftPaintStrokes(mainFileStrokes);
      comparePaintCacheRef.current[currentLeftCompareCacheKey] =
        mainFileStrokes;
    } else {
      const cached = comparePaintCacheRef.current[currentLeftCompareCacheKey];
      setCompareLeftPaintStrokes(cached ?? []);
    }
    setCompareLeftCurrentStroke(null);
    setCompareLeftUndoStack([]);
    setCompareLeftRedoStack([]);
    if (compareActivePane === "left") {
      setSelectedStrokeIds(new Set());
      setActiveSelectedStrokeId(null);
    }
    comparePrevLeftKeyRef.current = currentLeftCompareCacheKey;
  }, [
    compareActivePane,
    currentLeftCompareCacheKey,
    currentLeftValue,
    id,
    isCompareMode,
    leftCompareReplyImageUrl,
    paintStrokes,
  ]);

  useEffect(() => {
    if (isCompareMode) return;
    comparePaintCacheRef.current[currentNormalLeftCompareCacheKey] =
      paintStrokes;
    comparePaintCacheRef.current[currentNormalRightCompareCacheKey] =
      paintStrokes;
  }, [
    currentNormalLeftCompareCacheKey,
    currentNormalRightCompareCacheKey,
    isCompareMode,
    paintStrokes,
  ]);

  useEffect(() => {
    if (!isCompareMode) return;
    const isMainRightImage =
      compareReplyImageUrls.length === 0 && currentRightValue === id;
    const mainFileScopeKey = `file:${id || "__none__"}`;
    const mainFileStrokes =
      normalPaintCacheRef.current[mainFileScopeKey] ?? paintStrokes;
    const prevKey = comparePrevRightKeyRef.current;
    if (prevKey && prevKey !== currentRightCompareCacheKey) {
      comparePaintCacheRef.current[prevKey] = compareRightStrokesRef.current;
    }
    if (isMainRightImage) {
      setCompareRightPaintStrokes(mainFileStrokes);
      comparePaintCacheRef.current[currentRightCompareCacheKey] =
        mainFileStrokes;
    } else {
      const cached = comparePaintCacheRef.current[currentRightCompareCacheKey];
      if (cached !== undefined) {
        setCompareRightPaintStrokes(cached);
      } else if (compareFileId && compareFile?.id === compareFileId) {
        if (compareFile.paintAnnotation?.strokesData) {
          try {
            const loadedStrokes = JSON.parse(
              compareFile.paintAnnotation.strokesData,
            );
            const processedStrokes = loadedStrokes.map(
              (stroke: PaintStroke) => {
                if (stroke.tool === "image" && stroke.imageUrl) {
                  const img = new window.Image();
                  img.src = stroke.imageUrl;
                  return { ...stroke, imageElement: img };
                }
                return stroke;
              },
            );
            setCompareRightPaintStrokes(processedStrokes);
            comparePaintCacheRef.current[currentRightCompareCacheKey] =
              processedStrokes;
          } catch (e) {
            console.error("Failed to parse compare paint annotations:", e);
            setCompareRightPaintStrokes([]);
            comparePaintCacheRef.current[currentRightCompareCacheKey] = [];
          }
        } else {
          setCompareRightPaintStrokes([]);
          comparePaintCacheRef.current[currentRightCompareCacheKey] = [];
        }
      } else {
        setCompareRightPaintStrokes([]);
      }
    }
    setCompareRightCurrentStroke(null);
    setCompareRightUndoStack([]);
    setCompareRightRedoStack([]);
    if (compareActivePane === "right") {
      setSelectedStrokeIds(new Set());
      setActiveSelectedStrokeId(null);
    }
    comparePrevRightKeyRef.current = currentRightCompareCacheKey;
  }, [
    compareActivePane,
    compareReplyImageUrls.length,
    compareFile?.id,
    compareFile?.paintAnnotation?.strokesData,
    compareFileId,
    currentRightCompareCacheKey,
    currentRightValue,
    id,
    isCompareMode,
    paintStrokes,
  ]);

  useEffect(() => {
    if (!isCompareMode) return;
    comparePaintCacheRef.current[currentLeftCompareCacheKey] =
      compareLeftPaintStrokes;
  }, [compareLeftPaintStrokes, currentLeftCompareCacheKey, isCompareMode]);

  useEffect(() => {
    if (!isCompareMode) return;
    comparePaintCacheRef.current[currentRightCompareCacheKey] =
      compareRightPaintStrokes;
  }, [compareRightPaintStrokes, currentRightCompareCacheKey, isCompareMode]);

  const isCompareDrawableTool = useCallback(
    (tool: PaintTool) =>
      [
        "brush",
        "eraser",
        "highlighter",
        "line",
        "arrow",
        "rectangle",
        "circle",
      ].includes(tool),
    [],
  );

  const getComparePaneStrokes = useCallback(
    (pane: "left" | "right") =>
      pane === "left" ? compareLeftPaintStrokes : compareRightPaintStrokes,
    [compareLeftPaintStrokes, compareRightPaintStrokes],
  );

  const updateComparePaneStrokes = useCallback(
    (
      pane: "left" | "right",
      updater: (prev: PaintStroke[]) => PaintStroke[],
    ) => {
      if (pane === "left") {
        setCompareLeftPaintStrokes(updater);
      } else {
        setCompareRightPaintStrokes(updater);
      }
    },
    [],
  );

  function findStrokeCandidatesAtPosition(
    x: number,
    y: number,
    canvas: HTMLCanvasElement,
    strokes: PaintStroke[],
  ): PaintStroke[] {
    const candidates: PaintStroke[] = [];
    let remaining = [...strokes];
    while (remaining.length > 0) {
      const hit = findStrokeAtPosition(x, y, canvas, remaining);
      if (!hit) break;
      candidates.push(hit);
      remaining = remaining.filter((s) => s.id !== hit.id);
    }
    return candidates;
  }

  const handleComparePaintStart = (
    pane: "left" | "right",
    e: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (!isPaintMode) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCompareActivePane(pane);

    if (paintTool === "text") {
      const text = window.prompt("テキストを入力してください");
      if (text && text.trim()) {
        const newTextStroke: PaintStroke = {
          id: generateStrokeId(),
          points: [],
          color: paintColor,
          size: paintSize,
          tool: "text",
          text: text.trim(),
          textPosition: { x, y },
          fontSize: textFontSize,
        };
        updateComparePaneStrokes(pane, (prev) => [...prev, newTextStroke]);
      }
      return;
    }

    if (paintTool === "number") {
      setComparePendingPinPane(pane);
      setNewCommentPos({ x, y, pane });
      setIsAddingComment(true);
      return;
    }

    if (paintTool === "select") {
      const paneStrokes = getComparePaneStrokes(pane);
      if (selectedStrokeIds.size === 1) {
        const selectedId = Array.from(selectedStrokeIds)[0];
        const selectedStroke = paneStrokes.find((s) => s.id === selectedId);
        if (selectedStroke) {
          const handle = getResizeHandleAtPosition(
            x,
            y,
            selectedStroke,
            canvas,
          );
          if (handle) {
            if (pane === "left") {
              setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
              setCompareLeftRedoStack([]);
            } else {
              setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
              setCompareRightRedoStack([]);
            }
            setActiveResizeHandle(handle);
            setIsShapeResizing(true);
            setShapeResizeStart({ x, y });
            const bounds = getStrokeBounds(selectedStroke, canvas);
            if (bounds) {
              setOriginalShapeBounds(bounds);
            }
            originalStrokeDataRef.current = JSON.parse(
              JSON.stringify(selectedStroke),
            );
            return;
          }
        }
      }
      const hitCandidates = findStrokeCandidatesAtPosition(
        x,
        y,
        canvas,
        paneStrokes,
      );
      if (hitCandidates.length > 0) {
        const key = `${Math.round(x * 1000)}:${Math.round(y * 1000)}`;
        const prevCycle = compareHitCycleRef.current;
        const isSameCycle =
          prevCycle &&
          prevCycle.pane === pane &&
          prevCycle.key === key &&
          prevCycle.ids.join("|") === hitCandidates.map((s) => s.id).join("|");
        const nextIndex = isSameCycle
          ? (prevCycle.index + 1) % hitCandidates.length
          : 0;
        const target = hitCandidates[nextIndex];
        compareHitCycleRef.current = {
          pane,
          key,
          index: nextIndex,
          ids: hitCandidates.map((s) => s.id),
        };
        if (pane === "left") {
          setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
          setCompareLeftRedoStack([]);
        } else {
          setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
          setCompareRightRedoStack([]);
        }
        setSelectedStrokeIds(new Set([target.id]));
        setActiveSelectedStrokeId(target.id);
        setIsDragging(true);
        setDragStart({ x, y });
      } else {
        setSelectedStrokeIds(new Set());
        setActiveSelectedStrokeId(null);
        compareHitCycleRef.current = null;
      }
      return;
    }

    if (!isCompareDrawableTool(paintTool)) return;

    const newStroke: PaintStroke = isShapeTool(paintTool)
      ? {
          id: generateStrokeId(),
          points: [],
          color: paintColor,
          size: paintSize,
          tool: paintTool,
          startPoint: { x, y },
          endPoint: { x, y },
          opacity: paintOpacity,
        }
      : {
          id: generateStrokeId(),
          points: [{ x, y }],
          color: paintColor,
          size: paintSize,
          tool: paintTool,
          opacity: paintOpacity,
        };
    if (pane === "left") {
      setCompareLeftCurrentStroke(newStroke);
    } else {
      setCompareRightCurrentStroke(newStroke);
    }
  };

  const handleComparePaintMove = (
    pane: "left" | "right",
    e: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (!isPaintMode) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (paintTool === "select") {
      const paneStrokes = getComparePaneStrokes(pane);
      if (
        isShapeResizing &&
        selectedStrokeIds.size === 1 &&
        shapeResizeStart &&
        originalShapeBounds &&
        activeResizeHandle
      ) {
        const selectedId = Array.from(selectedStrokeIds)[0];
        const origStroke = originalStrokeDataRef.current;
        if (!origStroke) return;

        const { minX, minY, maxX, maxY } = originalShapeBounds;
        const dx = x - shapeResizeStart.x;
        const dy = y - shapeResizeStart.y;

        let newMinX = minX,
          newMinY = minY,
          newMaxX = maxX,
          newMaxY = maxY;

        switch (activeResizeHandle) {
          case "nw":
            newMinX = minX + dx;
            newMinY = minY + dy;
            break;
          case "ne":
            newMaxX = maxX + dx;
            newMinY = minY + dy;
            break;
          case "sw":
            newMinX = minX + dx;
            newMaxY = maxY + dy;
            break;
          case "se":
            newMaxX = maxX + dx;
            newMaxY = maxY + dy;
            break;
          case "n":
            newMinY = minY + dy;
            break;
          case "s":
            newMaxY = maxY + dy;
            break;
          case "w":
            newMinX = minX + dx;
            break;
          case "e":
            newMaxX = maxX + dx;
            break;
        }

        const minDimension = 0.02;
        if (newMaxX - newMinX < minDimension) {
          if (activeResizeHandle.includes("w"))
            newMinX = newMaxX - minDimension;
          else newMaxX = newMinX + minDimension;
        }
        if (newMaxY - newMinY < minDimension) {
          if (activeResizeHandle.includes("n"))
            newMinY = newMaxY - minDimension;
          else newMaxY = newMinY + minDimension;
        }
        if (newMinX >= newMaxX) newMinX = newMaxX - minDimension;
        if (newMinY >= newMaxY) newMinY = newMaxY - minDimension;

        const origWidth = Math.max(maxX - minX, 0.001);
        const origHeight = Math.max(maxY - minY, 0.001);
        const newWidth = newMaxX - newMinX;
        const newHeight = newMaxY - newMinY;

        updateComparePaneStrokes(pane, (prevStrokes) =>
          prevStrokes.map((stroke) => {
            if (stroke.id !== selectedId) return stroke;
            const updatedStroke = { ...stroke };

            if (
              origStroke.tool === "image" &&
              origStroke.imagePosition &&
              origStroke.imageSize
            ) {
              updatedStroke.imagePosition = { x: newMinX, y: newMinY };
              updatedStroke.imageSize = { width: newWidth, height: newHeight };
            } else if (
              (origStroke.tool === "line" ||
                origStroke.tool === "arrow" ||
                origStroke.tool === "rectangle" ||
                origStroke.tool === "circle") &&
              origStroke.startPoint &&
              origStroke.endPoint
            ) {
              const startXRatio = (origStroke.startPoint.x - minX) / origWidth;
              const startYRatio = (origStroke.startPoint.y - minY) / origHeight;
              const endXRatio = (origStroke.endPoint.x - minX) / origWidth;
              const endYRatio = (origStroke.endPoint.y - minY) / origHeight;
              updatedStroke.startPoint = {
                x: newMinX + startXRatio * newWidth,
                y: newMinY + startYRatio * newHeight,
              };
              updatedStroke.endPoint = {
                x: newMinX + endXRatio * newWidth,
                y: newMinY + endYRatio * newHeight,
              };
            } else if (origStroke.points.length > 0) {
              updatedStroke.points = origStroke.points.map((p) => ({
                x: newMinX + ((p.x - minX) / origWidth) * newWidth,
                y: newMinY + ((p.y - minY) / origHeight) * newHeight,
              }));
            } else if (origStroke.tool === "text" && origStroke.textPosition) {
              const scaleRatio = Math.max(
                0.25,
                Math.min(
                  4,
                  (newWidth / origWidth + newHeight / origHeight) / 2,
                ),
              );
              const baseFontSize = origStroke.fontSize || 16;
              updatedStroke.textPosition = { x: newMinX, y: newMinY };
              updatedStroke.fontSize = Math.max(
                8,
                Math.min(72, Math.round(baseFontSize * scaleRatio)),
              );
            }

            return updatedStroke;
          }),
        );
        return;
      }
      if (isDragging && dragStart && selectedStrokeIds.size > 0) {
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        updateComparePaneStrokes(pane, (prevStrokes) =>
          prevStrokes.map((stroke) => {
            if (!selectedStrokeIds.has(stroke.id)) return stroke;
            if (
              (stroke.tool === "line" ||
                stroke.tool === "arrow" ||
                stroke.tool === "rectangle" ||
                stroke.tool === "circle") &&
              stroke.startPoint &&
              stroke.endPoint
            ) {
              return {
                ...stroke,
                startPoint: {
                  x: stroke.startPoint.x + dx,
                  y: stroke.startPoint.y + dy,
                },
                endPoint: {
                  x: stroke.endPoint.x + dx,
                  y: stroke.endPoint.y + dy,
                },
              };
            }
            if (stroke.tool === "image" && stroke.imagePosition) {
              return {
                ...stroke,
                imagePosition: {
                  x: stroke.imagePosition.x + dx,
                  y: stroke.imagePosition.y + dy,
                },
              };
            }
            if (stroke.tool === "text" && stroke.textPosition) {
              return {
                ...stroke,
                textPosition: {
                  x: stroke.textPosition.x + dx,
                  y: stroke.textPosition.y + dy,
                },
              };
            }
            if (stroke.points.length > 0) {
              return {
                ...stroke,
                points: stroke.points.map((p) => ({
                  x: p.x + dx,
                  y: p.y + dy,
                })),
              };
            }
            return stroke;
          }),
        );
        setDragStart({ x, y });
      }
      if (selectedStrokeIds.size === 1 && !isDragging && !isShapeResizing) {
        const selectedId = Array.from(selectedStrokeIds)[0];
        const selectedStroke = paneStrokes.find((s) => s.id === selectedId);
        if (selectedStroke) {
          const handle = getResizeHandleAtPosition(
            x,
            y,
            selectedStroke,
            canvas,
          );
          if (handle) {
            canvas.style.cursor = getCursorForHandle(handle);
          } else {
            const isOverStroke = findStrokeAtPosition(
              x,
              y,
              canvas,
              paneStrokes,
            );
            canvas.style.cursor = isOverStroke ? "move" : "default";
          }
        } else {
          canvas.style.cursor = "default";
        }
      } else {
        const hitStroke = findStrokeAtPosition(x, y, canvas, paneStrokes);
        canvas.style.cursor = hitStroke ? "move" : "default";
      }
      return;
    }

    if (!isCompareDrawableTool(paintTool)) return;
    const current =
      pane === "left" ? compareLeftCurrentStroke : compareRightCurrentStroke;
    if (!current) return;

    if (isShapeTool(current.tool)) {
      const nextStroke = { ...current, endPoint: { x, y } };
      if (pane === "left") {
        setCompareLeftCurrentStroke(nextStroke);
      } else {
        setCompareRightCurrentStroke(nextStroke);
      }
      return;
    }

    const nextStroke = { ...current, points: [...current.points, { x, y }] };
    if (pane === "left") {
      setCompareLeftCurrentStroke(nextStroke);
    } else {
      setCompareRightCurrentStroke(nextStroke);
    }
  };

  const handleComparePaintEnd = (pane: "left" | "right") => {
    if (paintTool === "select") {
      if (isShapeResizing) {
        setIsShapeResizing(false);
        setActiveResizeHandle(null);
        setShapeResizeStart(null);
        setOriginalShapeBounds(null);
        originalStrokeDataRef.current = null;
        return;
      }
      setIsDragging(false);
      setDragStart(null);
      return;
    }
    const current =
      pane === "left" ? compareLeftCurrentStroke : compareRightCurrentStroke;
    if (!current) return;
    if (pane === "left") {
      setCompareLeftPaintStrokes((prev) => [...prev, current]);
      setCompareLeftCurrentStroke(null);
    } else {
      setCompareRightPaintStrokes((prev) => [...prev, current]);
      setCompareRightCurrentStroke(null);
    }
  };

  const handleCompareSpacePanStart = (
    pane: "left" | "right",
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!isCompareMode || !isCompareSpacePressed) return;
    const scrollEl =
      pane === "left"
        ? compareLeftScrollRef.current
        : compareRightScrollRef.current;
    if (!scrollEl) return;
    setCompareActivePane(pane);
    setIsCompareSpacePanning(true);
    compareSpacePanRef.current = {
      pane,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollEl.scrollLeft,
      scrollTop: scrollEl.scrollTop,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSpacePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCompareMode || !isSpacePressed || zoom <= 1) return;
    const scrollEl = normalScrollRef.current;
    if (!scrollEl) return;
    setIsSpacePanning(true);
    normalSpacePanRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollEl.scrollLeft,
      scrollTop: scrollEl.scrollTop,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (isCompareMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsSpacePanning(false);
        normalSpacePanRef.current = null;
      }
    };

    const handleWindowBlur = () => {
      setIsSpacePressed(false);
      setIsSpacePanning(false);
      normalSpacePanRef.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isCompareMode]);

  useEffect(() => {
    if (!isSpacePanning) return;
    const handleMouseMove = (e: MouseEvent) => {
      const pan = normalSpacePanRef.current;
      if (!pan) return;
      const scrollEl = normalScrollRef.current;
      if (!scrollEl) return;
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      scrollEl.scrollLeft = pan.scrollLeft - dx;
      scrollEl.scrollTop = pan.scrollTop - dy;
    };

    const handleMouseUp = () => {
      setIsSpacePanning(false);
      normalSpacePanRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSpacePanning]);

  useEffect(() => {
    if (isCompareMode) return;
    const target = canvasRef.current;
    if (!target || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setNormalPanLayoutTick((prev) => prev + 1);
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [isCompareMode, id, selectedNormalReplyImageUrl]);

  useEffect(() => {
    if (isCompareMode) return;
    const scrollEl = normalScrollRef.current;
    if (!scrollEl) return;
    const applyPanLayout = () => {
      const basePadding = 16;

      // Temporarily remove fixed dimensions to measure intrinsic size if needed
      // But we only want to measure it if we are at zoom=1 or if it's not locked yet
      if (zoom <= 1) {
        if (canvasRef.current) {
          canvasRef.current.style.width = "";
          canvasRef.current.style.height = "";
          canvasRef.current.style.minWidth = "";
          canvasRef.current.style.minHeight = "";
        }
      }

      const contentWidth = canvasRef.current?.offsetWidth || 0;
      const contentHeight = canvasRef.current?.offsetHeight || 0;

      if (zoom <= 1 || contentWidth === 0) {
        if (canvasRef.current) {
          canvasRef.current.style.margin = "0px";
        }
        scrollEl.style.paddingLeft = `${basePadding}px`;
        scrollEl.style.paddingRight = `${basePadding}px`;
        scrollEl.style.paddingTop = `${basePadding}px`;
        scrollEl.style.paddingBottom = `${basePadding}px`;
        scrollEl.scrollLeft = 0;
        scrollEl.scrollTop = 0;
        return;
      }

      // Lock the size to prevent shrinking when we add massive padding
      if (canvasRef.current && !canvasRef.current.style.width) {
        canvasRef.current.style.width = `${contentWidth}px`;
        canvasRef.current.style.height = `${contentHeight}px`;
        canvasRef.current.style.minWidth = `${contentWidth}px`;
        canvasRef.current.style.minHeight = `${contentHeight}px`;
      }

      // transform-origin is "center top"
      // Horizontal expansion is half on each side
      const extraHorizontalPadding = Math.max(
        0,
        (contentWidth * zoom - contentWidth) / 2,
      );
      // Vertical expansion is all downwards from the top
      const extraVerticalPaddingBottom = Math.max(
        0,
        contentHeight * zoom - contentHeight,
      );

      // Add extra padding to ensure all edges are reachable and can be panned to the center
      // This solves the issue of not being able to reach the left/top edges
      const viewportWidth = scrollEl.clientWidth;
      const viewportHeight = scrollEl.clientHeight;

      // Calculate the base visual margin we want on the edges.
      // This ensures the top/bottom margins match the "just right" left/right visual space.
      const visualMargin = Math.max(
        basePadding,
        viewportWidth / 2 - extraHorizontalPadding,
      );

      const horizontalPadding = extraHorizontalPadding + visualMargin;
      const verticalPaddingTop = visualMargin;
      const verticalPaddingBottom = extraVerticalPaddingBottom + visualMargin;

      // Instead of padding on the scroll container (which browsers sometimes clip at the bottom),
      // we apply margins to the canvas element itself to force the scroll container to expand.
      if (canvasRef.current) {
        canvasRef.current.style.marginLeft = `${horizontalPadding}px`;
        canvasRef.current.style.marginRight = `${horizontalPadding}px`;
        canvasRef.current.style.marginTop = `${verticalPaddingTop}px`;
        canvasRef.current.style.marginBottom = `${verticalPaddingBottom}px`;
      }

      scrollEl.style.padding = "0px";

      // Set scroll position to preserve the "top-middle" visual alignment behavior from before
      // Previous math effectively kept:
      // marginTop - scrollTop = viewportHeight / 2 - contentHeight / 2
      // marginLeft - scrollLeft = viewportWidth / 2 - contentWidth / 2
      const targetScrollTop =
        verticalPaddingTop - viewportHeight / 2 + contentHeight / 2;
      const targetScrollLeft =
        horizontalPadding - viewportWidth / 2 + contentWidth / 2;

      scrollEl.scrollTop = Math.max(0, targetScrollTop);
      scrollEl.scrollLeft = Math.max(0, targetScrollLeft);
    };
    requestAnimationFrame(() => {
      applyPanLayout();
      requestAnimationFrame(applyPanLayout);
    });
  }, [
    zoom,
    isCompareMode,
    id,
    selectedNormalReplyImageUrl,
    normalPanLayoutTick,
  ]);

  useEffect(() => {
    if (!isCompareMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsCompareSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsCompareSpacePressed(false);
        setIsCompareSpacePanning(false);
        compareSpacePanRef.current = null;
      }
    };

    const handleWindowBlur = () => {
      setIsCompareSpacePressed(false);
      setIsCompareSpacePanning(false);
      compareSpacePanRef.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isCompareMode]);

  useEffect(() => {
    if (!isCompareSpacePanning) return;
    const handleMouseMove = (e: MouseEvent) => {
      const pan = compareSpacePanRef.current;
      if (!pan) return;
      const scrollEl =
        pan.pane === "left"
          ? compareLeftScrollRef.current
          : compareRightScrollRef.current;
      if (!scrollEl) return;
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      scrollEl.scrollLeft = pan.scrollLeft - dx;
      scrollEl.scrollTop = pan.scrollTop - dy;
    };

    const handleMouseUp = () => {
      setIsCompareSpacePanning(false);
      compareSpacePanRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isCompareSpacePanning]);

  // Compare Mode View
  const renderCompareMode = () => {
    if (!isCompareMode) return null;
    const isLeftPdfFile =
      !leftCompareReplyImageUrl &&
      file?.mimeType === "application/pdf" &&
      !isAiFile;
    const isRightAiFile =
      compareFile?.mimeType === "application/illustrator" ||
      compareFile?.mimeType === "application/postscript" ||
      (compareFile?.mimeType === "application/pdf" &&
        compareFile?.name?.toLowerCase().endsWith(".ai")) ||
      compareFile?.name?.toLowerCase().endsWith(".ai");
    const isRightPdfFile =
      !!compareFile &&
      compareFile.mimeType === "application/pdf" &&
      !isRightAiFile;

    return (
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Left Panel - Current File */}
        <div
          className={cn(
            "flex-1 flex flex-col border rounded-lg bg-card overflow-hidden",
            compareActivePane === "left" &&
              "ring-2 ring-blue-500 border-blue-500",
          )}
          onMouseDown={() => setCompareActivePane("left")}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
            <Select
              value={currentLeftValue}
              onValueChange={handleLeftCompareChange}
            >
              <SelectTrigger className="flex-1" data-testid="select-left-file">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Left
                    </Badge>
                    <span className="truncate">
                      {leftCompareReplyImageUrl
                        ? (versionOptions.find((v) => v.id === currentLeftValue)
                            ?.label ?? "返信画像")
                        : file?.name}
                    </span>
                    {leftCompareReplyImageUrl ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {versionOptions.find((v) => v.id === currentLeftValue)
                            ?.versionTag || "ver1"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          返信画像
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {`Ver${file?.versionNumber || 1}`}
                      </Badge>
                    )}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  バージョンを選択
                </div>
                {versionOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="truncate max-w-[180px]">{v.label}</span>
                      <div className="ml-auto flex items-center gap-1">
                        {v.type === "reply" && v.versionTag && (
                          <Badge variant="outline" className="text-xs">
                            {v.versionTag}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {v.subLabel}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {v.date.toLocaleDateString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                <div className="h-px bg-muted my-1" />
                <SelectItem
                  value="upload-new"
                  className="text-primary focus:text-primary"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>新規画像をアップロード</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* ... Left Content (Video/Image) ... */}
          <div
            ref={compareLeftScrollRef}
            className={cn(
              "flex-1 overflow-auto flex items-start justify-start",
              isCompareSpacePressed &&
                (isCompareSpacePanning
                  ? "cursor-grabbing select-none"
                  : "cursor-grab"),
            )}
            onMouseDownCapture={(e) => handleCompareSpacePanStart("left", e)}
          >
            <div
              ref={compareContainerRef}
              className="relative bg-card rounded-lg shadow-lg overflow-hidden"
              style={{
                transform: `scale(${compareLeftZoom})`,
                transformOrigin: "left top",
              }}
            >
              {/* Reuse existing rendering logic for current file */}
              {leftCompareReplyImageUrl ? (
                <img
                  src={leftCompareReplyImageUrl}
                  alt="左側比較画像"
                  className="max-w-full max-h-full object-contain"
                  onLoad={(e) => updateCompareOverlayScale(e.currentTarget)}
                />
              ) : isVideo && file?.url ? (
                <div className="w-full">
                  <video
                    ref={videoRef}
                    src={file.url}
                    className="max-w-full"
                    onTimeUpdate={(e) => {
                      const video = e.target as HTMLVideoElement;
                      setCurrentTime(video.currentTime);
                      if (
                        isSyncEnabled &&
                        compareSyncMaster === "left" &&
                        compareVideoRef.current
                      ) {
                        compareVideoRef.current.currentTime = video.currentTime;
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      handleLoadedMetadata();
                      updateCompareOverlayScale(e.currentTarget);
                    }}
                    onPlay={() => {
                      setIsPlaying(true);
                      if (
                        isSyncEnabled &&
                        compareSyncMaster === "left" &&
                        compareVideoRef.current
                      ) {
                        compareVideoRef.current.play();
                      }
                    }}
                    onPause={() => {
                      setIsPlaying(false);
                      if (
                        isSyncEnabled &&
                        compareSyncMaster === "left" &&
                        compareVideoRef.current
                      ) {
                        compareVideoRef.current.pause();
                      }
                    }}
                    data-testid="video-player-left"
                  />
                  {/* Video Controls... reuse existing */}
                </div>
              ) : isImage && file?.url ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="max-w-full"
                  draggable={false}
                  onLoad={(e) => updateCompareOverlayScale(e.currentTarget)}
                />
              ) : isLeftPdfFile && file?.url ? (
                <iframe
                  src={file.url}
                  className="w-[900px] h-[900px] bg-white"
                  title={`${file.name}-left-pdf`}
                />
              ) : resolvedPreviewUrl ? (
                <img
                  src={resolvedPreviewUrl}
                  alt={file.name}
                  className="max-w-full"
                  draggable={false}
                  onLoad={(e) => updateCompareOverlayScale(e.currentTarget)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileImage className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              {/* Overlays... */}
              {canPaintOnCompareLeft && (
                <canvas
                  ref={compareCanvasRef}
                  className={cn(
                    "absolute inset-0 w-full h-full z-[5]",
                    isPaintMode && compareActivePane === "left"
                      ? "pointer-events-auto"
                      : "pointer-events-none",
                  )}
                  onMouseDown={(e) => handleComparePaintStart("left", e)}
                  onMouseMove={(e) => handleComparePaintMove("left", e)}
                  onMouseUp={() => handleComparePaintEnd("left")}
                  onMouseLeave={() => handleComparePaintEnd("left")}
                  onDoubleClick={(e) => {
                    if (paintTool !== "select") return;
                    const canvas = e.currentTarget;
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    const hitStroke = findStrokeAtPosition(
                      x,
                      y,
                      canvas,
                      compareLeftPaintStrokes,
                    );
                    if (hitStroke && hitStroke.tool === "text") {
                      const nextText = window.prompt(
                        "テキストを編集してください",
                        hitStroke.text || "",
                      );
                      if (nextText !== null) {
                        updateComparePaneStrokes("left", (prev) =>
                          prev.map((s) =>
                            s.id === hitStroke.id
                              ? { ...s, text: nextText }
                              : s,
                          ),
                        );
                      }
                    }
                  }}
                />
              )}
              {/* Pins... */}
              {compareDisplayLeftComments.map((comment, idx) => (
                <CommentPin
                  key={comment.id}
                  comment={comment}
                  index={idx}
                  isSelected={selectedCommentId === comment.id}
                  onClick={() => setSelectedCommentId(comment.id)}
                  isDraggable={isPaintMode && paintTool === "select"}
                  isDragging={draggingPinId === comment.id}
                  dragOffset={
                    draggingPinId === comment.id ? pinDragOffset : undefined
                  }
                  onDragStart={handleCompareLeftPinDragStart}
                />
              ))}
              {(newCommentPos?.pane === "left" ||
                (!newCommentPos?.pane && comparePendingPinPane === "left")) &&
                newCommentPos && (
                  <div
                    className="absolute z-20 flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold pointer-events-none transform -translate-x-1/2 -translate-y-1/2 bg-amber-500"
                    style={{
                      left: `${newCommentPos.x * 100}%`,
                      top: `${newCommentPos.y * 100}%`,
                    }}
                  >
                    +
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Right Panel - Compare Target */}
        <div
          className={cn(
            "flex-1 flex flex-col border rounded-lg bg-card overflow-hidden",
            compareActivePane === "right" &&
              "ring-2 ring-blue-500 border-blue-500",
          )}
          onMouseDown={() => setCompareActivePane("right")}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
            <Select
              value={currentRightValue}
              onValueChange={handleRightCompareChange}
            >
              <SelectTrigger className="flex-1" data-testid="select-right-file">
                <SelectValue placeholder="比較対象を選択">
                  {currentRightValue ? (
                    (() => {
                      const selected = versionOptions.find(
                        (v) => v.id === currentRightValue,
                      );
                      if (!selected) return <span>選択してください</span>;
                      return (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Right
                          </Badge>
                          <span className="truncate">{selected.label}</span>
                          {selected.type === "reply" && selected.versionTag && (
                            <Badge variant="outline" className="text-xs">
                              {selected.versionTag}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {selected.subLabel}
                          </Badge>
                        </div>
                      );
                    })()
                  ) : (
                    <span>比較対象を選択</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  比較対象を選択
                </div>
                {versionOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="truncate max-w-[120px]">{v.label}</span>
                      <div className="ml-auto flex items-center gap-1">
                        {v.type === "reply" && v.versionTag && (
                          <Badge variant="outline" className="text-xs">
                            {v.versionTag}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {v.subLabel}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {v.date.toLocaleDateString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                <div className="h-px bg-muted my-1" />
                <SelectItem
                  value="upload-new"
                  className="text-primary focus:text-primary"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>新規画像をアップロード</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            ref={compareRightScrollRef}
            className={cn(
              "flex-1 overflow-auto flex items-start justify-start",
              isCompareSpacePressed &&
                (isCompareSpacePanning
                  ? "cursor-grabbing select-none"
                  : "cursor-grab"),
            )}
            onMouseDownCapture={(e) => handleCompareSpacePanStart("right", e)}
          >
            <div
              ref={compareRightContainerRef}
              className="relative bg-card rounded-lg shadow-lg overflow-hidden"
              style={{
                transform: `scale(${compareRightZoom})`,
                transformOrigin: "left top",
              }}
            >
              {isReplyImageCompareMode ? (
                <img
                  src={compareReplyImageUrls[0]}
                  alt="返信比較画像"
                  className="max-w-full max-h-full object-contain"
                  onLoad={(e) =>
                    updateCompareRightOverlayScale(e.currentTarget)
                  }
                />
              ) : compareFile ? (
                <>
                  {compareFile.mimeType?.startsWith("video/") ? (
                    <video
                      ref={compareVideoRef}
                      src={compareFile.url || ""}
                      className="max-w-full"
                      onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        setCompareCurrentTime(video.currentTime);
                        if (
                          isSyncEnabled &&
                          compareSyncMaster === "right" &&
                          videoRef.current
                        ) {
                          videoRef.current.currentTime = video.currentTime;
                          setCurrentTime(video.currentTime);
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        setCompareDuration(e.currentTarget.duration);
                        updateCompareRightOverlayScale(e.currentTarget);
                      }}
                      onPlay={() => {
                        setCompareIsPlaying(true);
                        if (
                          isSyncEnabled &&
                          compareSyncMaster === "right" &&
                          videoRef.current
                        ) {
                          videoRef.current.play();
                        }
                      }}
                      onPause={() => {
                        setCompareIsPlaying(false);
                        if (
                          isSyncEnabled &&
                          compareSyncMaster === "right" &&
                          videoRef.current
                        ) {
                          videoRef.current.pause();
                        }
                      }}
                    />
                  ) : isRightPdfFile ? (
                    <iframe
                      src={compareFile.url || ""}
                      className="w-[900px] h-[900px] bg-white"
                      title={`${compareFile.name}-right-pdf`}
                    />
                  ) : (
                    <img
                      src={compareFile.url || compareFile.thumbnailUrl || ""}
                      alt={compareFile.name}
                      className="max-w-full max-h-full object-contain"
                      onLoad={(e) =>
                        updateCompareRightOverlayScale(e.currentTarget)
                      }
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <GitCompare className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    右上のドロップダウンから
                    <br />
                    比較するバージョンを選択してください
                  </p>
                </div>
              )}
              {canPaintOnCompareRight && (
                <canvas
                  ref={compareRightCanvasRef}
                  className={cn(
                    "absolute inset-0 w-full h-full z-[5]",
                    isPaintMode && compareActivePane === "right"
                      ? "pointer-events-auto"
                      : "pointer-events-none",
                  )}
                  onMouseDown={(e) => handleComparePaintStart("right", e)}
                  onMouseMove={(e) => handleComparePaintMove("right", e)}
                  onMouseUp={() => handleComparePaintEnd("right")}
                  onMouseLeave={() => handleComparePaintEnd("right")}
                  onDoubleClick={(e) => {
                    if (paintTool !== "select") return;
                    const canvas = e.currentTarget;
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    const hitStroke = findStrokeAtPosition(
                      x,
                      y,
                      canvas,
                      compareRightPaintStrokes,
                    );
                    if (hitStroke && hitStroke.tool === "text") {
                      const nextText = window.prompt(
                        "テキストを編集してください",
                        hitStroke.text || "",
                      );
                      if (nextText !== null) {
                        updateComparePaneStrokes("right", (prev) =>
                          prev.map((s) =>
                            s.id === hitStroke.id
                              ? { ...s, text: nextText }
                              : s,
                          ),
                        );
                      }
                    }
                  }}
                />
              )}
              {compareDisplayRightComments.map((comment, idx) => (
                <CommentPin
                  key={comment.id}
                  comment={comment}
                  index={idx}
                  isSelected={selectedCommentId === comment.id}
                  onClick={() => setSelectedCommentId(comment.id)}
                  isDraggable={isPaintMode && paintTool === "select"}
                  isDragging={draggingPinId === comment.id}
                  dragOffset={
                    draggingPinId === comment.id ? pinDragOffset : undefined
                  }
                  onDragStart={handleCompareRightPinDragStart}
                />
              ))}
              {(newCommentPos?.pane === "right" ||
                (!newCommentPos?.pane && comparePendingPinPane === "right")) &&
                newCommentPos && (
                  <div
                    className="absolute z-20 flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold pointer-events-none transform -translate-x-1/2 -translate-y-1/2 bg-amber-500"
                    style={{
                      left: `${newCommentPos.x * 100}%`,
                      top: `${newCommentPos.y * 100}%`,
                    }}
                  >
                    +
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  const [compareSourceCommentId, setCompareSourceCommentId] = useState<
    string | null
  >(null);
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);
  const [compareSyncMaster, setCompareSyncMaster] = useState<"left" | "right">(
    "left",
  );
  const compareVideoRef = useRef<HTMLVideoElement>(null);
  const [compareIsPlaying, setCompareIsPlaying] = useState(false);
  const [compareCurrentTime, setCompareCurrentTime] = useState(0);
  const [compareDuration, setCompareDuration] = useState(0);
  const [compareOverlayScale, setCompareOverlayScale] = useState(1);

  // Check if the file is an Adobe file that can have layers extracted
  const isPsdFile =
    file?.mimeType === "image/vnd.adobe.photoshop" ||
    file?.mimeType === "application/x-photoshop" ||
    (file?.mimeType === "application/octet-stream" &&
      file?.name?.endsWith(".psd")) ||
    file?.name?.toLowerCase().endsWith(".psd");

  const isAiFile =
    file?.mimeType === "application/illustrator" ||
    file?.mimeType === "application/postscript" ||
    (file?.mimeType === "application/pdf" &&
      file?.name?.toLowerCase().endsWith(".ai")) ||
    file?.name?.toLowerCase().endsWith(".ai");

  // Filter related versions from project files
  const relatedVersions = useMemo(() => {
    if (!file || !projectFiles?.files) return [];

    // Find files that share the same parentFileId, or are parent/child
    // Since the backend handles versioning by parentFileId or name matching,
    // we should use a robust way to group them.
    // For now, let's group by name as it's the most intuitive "same file" indicator
    // in addition to the parentFileId logic.
    return projectFiles.files
      .filter((f) => {
        if (f.id === file.id) return true; // Include self

        // Match by parent ID relationship
        const isRelatedByParent =
          (file.parentFileId && f.parentFileId === file.parentFileId) ||
          f.id === file.parentFileId ||
          file.id === f.parentFileId;

        // Match by name (fallback/supplementary)
        const isSameName = f.name === file.name;

        return isRelatedByParent || isSameName;
      })
      .sort((a, b) => b.versionNumber - a.versionNumber); // Newest first
  }, [file, projectFiles]);

  const isAdobeFile = isPsdFile || isAiFile;
  const isPptxFile =
    !!file &&
    (file.mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.name.toLowerCase().endsWith(".pptx"));
  const [psdPreviewUrl, setPsdPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewAttempted, setPreviewAttempted] = useState(false);

  useEffect(() => {
    if (!file || !id) return;
    const hasThumbnail = file.thumbnailUrl && file.thumbnailUrl !== file.url;
    if (
      (!isAdobeFile && !isPptxFile) ||
      hasThumbnail ||
      isGeneratingPreview ||
      psdPreviewUrl ||
      previewAttempted
    )
      return;

    const generateOnDemand = async () => {
      setIsGeneratingPreview(true);
      setPreviewAttempted(true);
      try {
        const resp = await fetch(`/api/files/${id}/generate-preview`, {
          method: "POST",
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.previewUrl) {
            setPsdPreviewUrl(data.previewUrl);
          }
        }
      } catch (e) {
        console.error("Preview generation failed:", e);
      }
      setIsGeneratingPreview(false);
    };
    generateOnDemand();
  }, [
    file,
    id,
    isAdobeFile,
    isPptxFile,
    isGeneratingPreview,
    psdPreviewUrl,
    previewAttempted,
  ]);

  // Resolved preview URL: use file.thumbnailUrl if available, else on-demand generated
  const resolvedPreviewUrl =
    file?.thumbnailUrl && file.thumbnailUrl !== file?.url
      ? file.thumbnailUrl
      : psdPreviewUrl;

  // Query for layers (only for PSD/AI files)
  const { data: layersData, isLoading: isLayersLoading } =
    useQuery<LayersApiResponse>({
      queryKey: ["/api/files", id, "layers"],
      enabled: !!id && isAdobeFile,
    });

  const layersInitializedForFileRef = useRef<string | null>(null);
  useEffect(() => {
    if (!layersData?.layers || !id) return;
    if (layersInitializedForFileRef.current === id) return;
    layersInitializedForFileRef.current = id;

    const visMap = new Map<number, boolean>();
    const groupIds = new Set<number>();
    const initLayers = (layers: LayerInfo[]) => {
      for (const layer of layers) {
        visMap.set(layer.id, layer.visible);
        if (
          (layer.type === "group" || layer.type === "folder") &&
          layer.children &&
          layer.children.length > 0
        ) {
          groupIds.add(layer.id);
          initLayers(layer.children);
        }
      }
    };
    initLayers(layersData.layers);
    setLayerVisibility(visMap);
    setExpandedGroups(groupIds);
  }, [layersData, id]);

  // State for layer images and mask images
  const [layerImages, setLayerImages] = useState<
    Record<number, HTMLImageElement | ImageBitmap>
  >({});
  const [maskImages, setMaskImages] = useState<
    Record<number, HTMLImageElement | ImageBitmap>
  >({});
  const [isLoadingLayerImages, setIsLoadingLayerImages] = useState(false);
  const [layerImagesLoaded, setLayerImagesLoaded] = useState(false);
  const layerCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerFetchAttemptedForFileRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAdobeFile || !id || isLoadingLayerImages) return;
    if (layerFetchAttemptedForFileRef.current === id) return;
    layerFetchAttemptedForFileRef.current = id;
    setLayerImages({});
    setMaskImages({});
    setLayerImagesLoaded(false);

    const fetchLayerImages = async () => {
      setIsLoadingLayerImages(true);

      try {
        const response = await fetch(`/api/files/${id}/layer-images`, {
          method: "POST",
        });
        if (!response.ok) {
          console.warn("Failed to fetch layer images");
          setIsLoadingLayerImages(false);
          return;
        }

        const data = await response.json();
        const images: Record<number, HTMLImageElement> = {};
        const masks: Record<number, HTMLImageElement> = {};

        const loadPromises: Promise<void>[] = [];
        for (const [layerId, url] of Object.entries(
          data.layerImages as Record<string, string>,
        )) {
          const promise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              images[parseInt(layerId)] = img;
              resolve();
            };
            img.onerror = () => {
              console.warn(`Failed to load layer image ${layerId}`);
              resolve();
            };
            img.src = url;
          });
          loadPromises.push(promise);
        }

        if (data.maskImages) {
          for (const [layerId, url] of Object.entries(
            data.maskImages as Record<string, string>,
          )) {
            const promise = new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                masks[parseInt(layerId)] = img;
                resolve();
              };
              img.onerror = () => {
                console.warn(`Failed to load mask image ${layerId}`);
                resolve();
              };
              img.src = url;
            });
            loadPromises.push(promise);
          }
        }

        await Promise.all(loadPromises);
        setLayerImages(images);
        setMaskImages(masks);
        setLayerImagesLoaded(true);
      } catch (error) {
        console.error("Error fetching layer images:", error);
        toast({
          variant: "destructive",
          title: "レイヤー画像の読み込みエラー",
          description:
            "レイヤー情報の取得に失敗しました。ページを再読み込みしてください。",
        });
      }
      setIsLoadingLayerImages(false);
    };

    fetchLayerImages();
  }, [isPsdFile, id, file]);

  // Helper function to get all layer IDs recursively (for visibility check)
  const getAllLayerIds = (layers: LayerInfo[]): number[] => {
    const ids: number[] = [];
    const traverse = (layerList: LayerInfo[]) => {
      for (const layer of layerList) {
        ids.push(layer.id);
        if (layer.children) {
          traverse(layer.children);
        }
      }
    };
    traverse(layers);
    return ids;
  };

  // Check if a layer is visible considering parent group visibility
  const isLayerEffectivelyVisible = useCallback(
    (layerId: number, layers: LayerInfo[]): boolean => {
      // Build parent chain for each layer
      const findLayerAndParents = (
        layerList: LayerInfo[],
        targetId: number,
        parents: LayerInfo[] = [],
      ): { layer: LayerInfo | null; parents: LayerInfo[] } => {
        for (const layer of layerList) {
          if (layer.id === targetId) {
            return { layer, parents };
          }
          if (layer.children) {
            const result = findLayerAndParents(layer.children, targetId, [
              ...parents,
              layer,
            ]);
            if (result.layer) return result;
          }
        }
        return { layer: null, parents: [] };
      };

      const { layer, parents } = findLayerAndParents(layers, layerId);
      if (!layer) return false;

      // Check if the layer itself is visible
      const layerVisible = layerVisibility.has(layer.id)
        ? layerVisibility.get(layer.id)
        : layer.visible;
      if (!layerVisible) return false;

      // Check if all parent groups are visible
      for (const parent of parents) {
        const parentVisible = layerVisibility.has(parent.id)
          ? layerVisibility.get(parent.id)
          : parent.visible;
        if (!parentVisible) return false;
      }

      return true;
    },
    [layerVisibility],
  );

  // Get all layers as flat array with visibility info
  const flattenLayersReverse = (layers: LayerInfo[]): LayerInfo[] => {
    const result: LayerInfo[] = [];
    const traverse = (layerList: LayerInfo[]) => {
      // Reverse order to draw bottom layers first
      for (let i = layerList.length - 1; i >= 0; i--) {
        const layer = layerList[i];
        if (layer.children) {
          traverse(layer.children);
        }
        if (layer.type === "layer") {
          result.push(layer);
        }
      }
    };
    traverse(layers);
    return result;
  };

  // Helper function to apply a layer mask to an image
  const applyLayerMask = useCallback(
    (
      layerImg: HTMLImageElement,
      maskImg: HTMLImageElement,
      layer: LayerInfo,
      docWidth: number,
      docHeight: number,
    ): HTMLCanvasElement => {
      // Create a canvas for the masked result
      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = docWidth;
      resultCanvas.height = docHeight;
      const resultCtx = resultCanvas.getContext("2d");
      if (!resultCtx) return resultCanvas;

      // Draw the layer image
      resultCtx.drawImage(layerImg, layer.left || 0, layer.top || 0);

      // Apply the mask using destination-in composite
      // The mask's grayscale values determine the opacity
      const mask = layer.mask;
      if (mask) {
        resultCtx.globalCompositeOperation = "destination-in";
        // Draw mask at its position (mask has its own bounds)
        resultCtx.drawImage(maskImg, mask.bounds.left, mask.bounds.top);
        resultCtx.globalCompositeOperation = "source-over";
      }

      return resultCanvas;
    },
    [],
  );

  // Map Photoshop blend modes to Canvas 2D globalCompositeOperation
  // Canvas 2D supports: source-over, multiply, screen, overlay, darken, lighten,
  // color-dodge, color-burn, hard-light, soft-light, difference, exclusion,
  // hue, saturation, color, luminosity, lighter
  // Modes without direct Canvas equivalent fall back to the closest match
  const getCanvasBlendMode = useCallback(
    (psBlendMode: string | undefined): GlobalCompositeOperation => {
      const modeMap: Record<string, GlobalCompositeOperation> = {
        normal: "source-over",
        multiply: "multiply",
        screen: "screen",
        overlay: "overlay",
        darken: "darken",
        lighten: "lighten",
        "color-dodge": "color-dodge",
        "color-burn": "color-burn",
        "hard-light": "hard-light",
        "soft-light": "soft-light",
        difference: "difference",
        exclusion: "exclusion",
        hue: "hue",
        saturation: "saturation",
        color: "color",
        luminosity: "luminosity",
        "linear-dodge": "lighter",
        "linear-burn": "multiply",
        "darker-color": "darken",
        "lighter-color": "lighten",
        "vivid-light": "hard-light",
        "linear-light": "hard-light",
        "pin-light": "hard-light",
        "hard-mix": "hard-light",
        subtract: "difference",
        divide: "screen",
        passThrough: "source-over",
        dissolve: "source-over",
      };
      return modeMap[psBlendMode || "normal"] || "source-over";
    },
    [],
  );

  // Render layer effects (drop shadow, outer glow, inner glow, inner shadow,
  // stroke, color overlay, gradient overlay) onto a canvas
  const renderLayerEffects = useCallback(
    (
      layerCanvas: HTMLCanvasElement,
      layer: LayerInfo,
      docWidth: number,
      docHeight: number,
    ): HTMLCanvasElement => {
      if (!layer.effects) return layerCanvas;

      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = docWidth;
      resultCanvas.height = docHeight;
      const resultCtx = resultCanvas.getContext("2d");
      if (!resultCtx) return layerCanvas;

      // 1. Drop shadows (behind the layer)
      if (layer.effects.dropShadow) {
        for (const ds of layer.effects.dropShadow) {
          if (!ds.enabled) continue;
          const angleRad = (ds.angle * Math.PI) / 180;
          const offsetX = Math.cos(angleRad) * ds.distance;
          const offsetY = -Math.sin(angleRad) * ds.distance;
          const { r, g, b } = ds.color;
          const blurRadius = Math.max(
            0,
            ds.size * (1 - (ds.spread || 0) / 100),
          );

          const shadowCanvas = document.createElement("canvas");
          shadowCanvas.width = docWidth;
          shadowCanvas.height = docHeight;
          const shadowCtx = shadowCanvas.getContext("2d");
          if (!shadowCtx) continue;

          if (blurRadius > 0) {
            shadowCtx.filter = `blur(${blurRadius}px)`;
          }
          shadowCtx.drawImage(layerCanvas, offsetX, offsetY);
          shadowCtx.globalCompositeOperation = "source-in";
          shadowCtx.filter = "none";
          shadowCtx.fillStyle = `rgba(${r},${g},${b},1)`;
          shadowCtx.fillRect(0, 0, docWidth, docHeight);

          resultCtx.globalAlpha = ds.opacity / 100;
          resultCtx.drawImage(shadowCanvas, 0, 0);
          resultCtx.globalAlpha = 1;
        }
      }

      // 2. Outer glow (behind the layer)
      if (layer.effects.outerGlow) {
        for (const og of layer.effects.outerGlow) {
          if (!og.enabled) continue;
          const { r, g, b } = og.color;
          const blurRadius = Math.max(
            0,
            og.size * (1 - (og.spread || 0) / 100),
          );

          const glowCanvas = document.createElement("canvas");
          glowCanvas.width = docWidth;
          glowCanvas.height = docHeight;
          const glowCtx = glowCanvas.getContext("2d");
          if (!glowCtx) continue;

          if (blurRadius > 0) {
            glowCtx.filter = `blur(${blurRadius}px)`;
          }
          glowCtx.drawImage(layerCanvas, 0, 0);
          glowCtx.globalCompositeOperation = "source-in";
          glowCtx.filter = "none";
          glowCtx.fillStyle = `rgba(${r},${g},${b},1)`;
          glowCtx.fillRect(0, 0, docWidth, docHeight);

          resultCtx.globalAlpha = og.opacity / 100;
          resultCtx.globalCompositeOperation = "screen";
          resultCtx.drawImage(glowCanvas, 0, 0);
          resultCtx.globalCompositeOperation = "source-over";
          resultCtx.globalAlpha = 1;
        }
      }

      // 3. Stroke (can be outside, inside, or center)
      if (layer.effects.stroke) {
        for (const s of layer.effects.stroke) {
          if (!s.enabled || s.size <= 0) continue;
          const { r, g, b } = s.color;

          const strokeCanvas = document.createElement("canvas");
          strokeCanvas.width = docWidth;
          strokeCanvas.height = docHeight;
          const strokeCtx = strokeCanvas.getContext("2d");
          if (!strokeCtx) continue;

          strokeCtx.filter = `blur(${Math.max(1, s.size / 2)}px)`;
          strokeCtx.drawImage(layerCanvas, 0, 0);
          strokeCtx.filter = "none";

          const expandedData = strokeCtx.getImageData(
            0,
            0,
            docWidth,
            docHeight,
          );
          const threshold = 128;
          for (let i = 3; i < expandedData.data.length; i += 4) {
            expandedData.data[i] = expandedData.data[i] > threshold ? 255 : 0;
          }
          strokeCtx.putImageData(expandedData, 0, 0);

          if (s.position === "outside") {
            strokeCtx.globalCompositeOperation = "destination-out";
            strokeCtx.drawImage(layerCanvas, 0, 0);
          } else if (s.position === "inside") {
            strokeCtx.globalCompositeOperation = "destination-in";
            strokeCtx.drawImage(layerCanvas, 0, 0);
          } else {
            // center: keep both inside and outside portions
          }

          strokeCtx.globalCompositeOperation = "source-in";
          strokeCtx.fillStyle = `rgba(${r},${g},${b},1)`;
          strokeCtx.fillRect(0, 0, docWidth, docHeight);

          resultCtx.globalAlpha = s.opacity / 100;
          resultCtx.drawImage(strokeCanvas, 0, 0);
          resultCtx.globalAlpha = 1;
        }
      }

      // 4. Draw the layer itself on top of behind-effects
      resultCtx.drawImage(layerCanvas, 0, 0);

      // 5. Inner glow (inside the layer)
      if (layer.effects.innerGlow) {
        for (const ig of layer.effects.innerGlow) {
          if (!ig.enabled) continue;
          const { r, g, b } = ig.color;
          const blurRadius = Math.max(0, ig.size * (1 - (ig.choke || 0) / 100));

          const innerCanvas = document.createElement("canvas");
          innerCanvas.width = docWidth;
          innerCanvas.height = docHeight;
          const innerCtx = innerCanvas.getContext("2d");
          if (!innerCtx) continue;

          // Create inverted shape (fill everything, subtract layer shape)
          innerCtx.fillStyle = `rgba(${r},${g},${b},1)`;
          innerCtx.fillRect(0, 0, docWidth, docHeight);
          innerCtx.globalCompositeOperation = "destination-out";
          innerCtx.drawImage(layerCanvas, 0, 0);
          innerCtx.globalCompositeOperation = "source-over";

          // Blur the inverted shape
          const blurredCanvas = document.createElement("canvas");
          blurredCanvas.width = docWidth;
          blurredCanvas.height = docHeight;
          const blurredCtx = blurredCanvas.getContext("2d");
          if (blurredCtx) {
            if (blurRadius > 0) {
              blurredCtx.filter = `blur(${blurRadius}px)`;
            }
            blurredCtx.drawImage(innerCanvas, 0, 0);
            blurredCtx.filter = "none";

            // Clip to layer shape
            blurredCtx.globalCompositeOperation = "destination-in";
            blurredCtx.drawImage(layerCanvas, 0, 0);

            resultCtx.globalAlpha = ig.opacity / 100;
            resultCtx.globalCompositeOperation = "screen";
            resultCtx.drawImage(blurredCanvas, 0, 0);
            resultCtx.globalCompositeOperation = "source-over";
            resultCtx.globalAlpha = 1;
          }
        }
      }

      // 6. Inner shadow (inside the layer)
      if (layer.effects.innerShadow) {
        for (const iShadow of layer.effects.innerShadow) {
          if (!iShadow.enabled) continue;
          const angleRad = (iShadow.angle * Math.PI) / 180;
          const offsetX = Math.cos(angleRad) * iShadow.distance;
          const offsetY = -Math.sin(angleRad) * iShadow.distance;
          const { r, g, b } = iShadow.color;
          const blurRadius = Math.max(
            0,
            iShadow.size * (1 - (iShadow.choke || 0) / 100),
          );

          const innerCanvas = document.createElement("canvas");
          innerCanvas.width = docWidth;
          innerCanvas.height = docHeight;
          const innerCtx = innerCanvas.getContext("2d");
          if (!innerCtx) continue;

          // Fill, cut out the offset layer shape
          innerCtx.fillRect(0, 0, docWidth, docHeight);
          innerCtx.globalCompositeOperation = "destination-out";
          innerCtx.drawImage(layerCanvas, offsetX, offsetY);
          innerCtx.globalCompositeOperation = "source-over";

          // Blur and colorize
          const blurredCanvas = document.createElement("canvas");
          blurredCanvas.width = docWidth;
          blurredCanvas.height = docHeight;
          const blurredCtx = blurredCanvas.getContext("2d");
          if (blurredCtx) {
            if (blurRadius > 0) {
              blurredCtx.filter = `blur(${blurRadius}px)`;
            }
            blurredCtx.drawImage(innerCanvas, 0, 0);
            blurredCtx.globalCompositeOperation = "source-in";
            blurredCtx.filter = "none";
            blurredCtx.fillStyle = `rgba(${r},${g},${b},1)`;
            blurredCtx.fillRect(0, 0, docWidth, docHeight);

            // Clip to layer shape
            blurredCtx.globalCompositeOperation = "destination-in";
            blurredCtx.drawImage(layerCanvas, 0, 0);

            resultCtx.globalAlpha = iShadow.opacity / 100;
            resultCtx.globalCompositeOperation = "multiply";
            resultCtx.drawImage(blurredCanvas, 0, 0);
            resultCtx.globalCompositeOperation = "source-over";
            resultCtx.globalAlpha = 1;
          }
        }
      }

      // 7. Color overlay (on top of the layer)
      if (layer.effects.colorOverlay) {
        for (const co of layer.effects.colorOverlay) {
          if (!co.enabled) continue;
          const { r, g, b } = co.color;

          const overlayCanvas = document.createElement("canvas");
          overlayCanvas.width = docWidth;
          overlayCanvas.height = docHeight;
          const overlayCtx = overlayCanvas.getContext("2d");
          if (!overlayCtx) continue;

          overlayCtx.fillStyle = `rgba(${r},${g},${b},1)`;
          overlayCtx.fillRect(0, 0, docWidth, docHeight);
          overlayCtx.globalCompositeOperation = "destination-in";
          overlayCtx.drawImage(layerCanvas, 0, 0);

          resultCtx.globalAlpha = co.opacity / 100;
          resultCtx.globalCompositeOperation = getCanvasBlendMode(co.blendMode);
          resultCtx.drawImage(overlayCanvas, 0, 0);
          resultCtx.globalCompositeOperation = "source-over";
          resultCtx.globalAlpha = 1;
        }
      }

      // 8. Gradient overlay (on top of the layer)
      if (layer.effects.gradientOverlay) {
        for (const go of layer.effects.gradientOverlay) {
          if (!go.enabled) continue;
          const angleRad = ((go.angle || 90) * Math.PI) / 180;

          const gradCanvas = document.createElement("canvas");
          gradCanvas.width = docWidth;
          gradCanvas.height = docHeight;
          const gradCtx = gradCanvas.getContext("2d");
          if (!gradCtx) continue;

          // Create a simple linear gradient based on angle
          const cx = docWidth / 2;
          const cy = docHeight / 2;
          const len = Math.max(docWidth, docHeight);
          const dx = Math.cos(angleRad) * len;
          const dy = -Math.sin(angleRad) * len;
          const gradient = gradCtx.createLinearGradient(
            cx - dx / 2,
            cy + dy / 2,
            cx + dx / 2,
            cy - dy / 2,
          );
          gradient.addColorStop(0, "rgba(0,0,0,1)");
          gradient.addColorStop(1, "rgba(255,255,255,1)");
          gradCtx.fillStyle = gradient;
          gradCtx.fillRect(0, 0, docWidth, docHeight);

          // Clip to layer shape
          gradCtx.globalCompositeOperation = "destination-in";
          gradCtx.drawImage(layerCanvas, 0, 0);

          resultCtx.globalAlpha = go.opacity / 100;
          resultCtx.globalCompositeOperation = getCanvasBlendMode(go.blendMode);
          resultCtx.drawImage(gradCanvas, 0, 0);
          resultCtx.globalCompositeOperation = "source-over";
          resultCtx.globalAlpha = 1;
        }
      }

      return resultCanvas;
    },
    [getCanvasBlendMode],
  );

  // Composite visible layers on canvas with blend modes, effects, masks, and clipping
  const compositeLayersOnCanvas = useCallback(() => {
    const canvas = layerCanvasRef.current;
    if (!canvas || !layersData || !layerImagesLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const docWidth = layersData.documentWidth || 800;
    const docHeight = layersData.documentHeight || 600;

    if (canvas.width !== docWidth || canvas.height !== docHeight) {
      canvas.width = docWidth;
      canvas.height = docHeight;
    }

    ctx.clearRect(0, 0, docWidth, docHeight);

    const isLayerVisible = (layer: LayerInfo): boolean => {
      return layerVisibility.has(layer.id)
        ? !!layerVisibility.get(layer.id)
        : layer.visible;
    };

    const renderSingleLayer = (layer: LayerInfo): HTMLCanvasElement | null => {
      const img = layerImages[layer.id];
      if (!img) return null;

      const lc = document.createElement("canvas");
      lc.width = docWidth;
      lc.height = docHeight;
      const lctx = lc.getContext("2d");
      if (!lctx) return null;

      const fillOp = (layer.fillOpacity ?? 100) / 100;
      lctx.globalAlpha = fillOp;
      lctx.drawImage(img, layer.left || 0, layer.top || 0);
      lctx.globalAlpha = 1;

      const mImg = maskImages[layer.id];
      // Even if no mask image exists, we must respect defaultColor (e.g. if default is black/transparent)
      const hasMask = layer.mask && !layer.mask.disabled;

      if (hasMask && layer.mask) {
        const mc = document.createElement("canvas");
        mc.width = docWidth;
        mc.height = docHeight;
        const mctx = mc.getContext("2d");
        if (mctx) {
          const dc = layer.mask.defaultColor ?? 255;
          // Initialize mask canvas based on default color
          if (dc === 255) {
            mctx.fillStyle = "#FFFFFF"; // White (Opaque)
            mctx.fillRect(0, 0, docWidth, docHeight);
          } else {
            mctx.clearRect(0, 0, docWidth, docHeight); // Transparent
          }

          // Draw mask image if available
          if (mImg) {
            mctx.drawImage(mImg, layer.mask.bounds.left, layer.mask.bounds.top);
          }

          // Convert luminance to alpha for proper masking
          // Photoshop masks are grayscale: White = Visible (Alpha 1), Black = Hidden (Alpha 0)
          const md = mctx.getImageData(0, 0, docWidth, docHeight);
          const data = md.data;
          const invert = layer.mask.invert;

          for (let p = 0; p < data.length; p += 4) {
            // Get luminance (using Red channel is enough for grayscale)
            let val = data[p];

            // If invert flag is set, invert the value
            if (invert) {
              val = 255 - val;
            }

            // Set Alpha to luminance value
            // Set RGB to White (so color doesn't affect blending, only Alpha matters)
            data[p] = 255;
            data[p + 1] = 255;
            data[p + 2] = 255;
            data[p + 3] = val;
          }
          mctx.putImageData(md, 0, 0);

          lctx.globalCompositeOperation = "destination-in";
          lctx.drawImage(mc, 0, 0);
          lctx.globalCompositeOperation = "source-over";
        }
      }

      if (layer.hasEffects && layer.effects) {
        return renderLayerEffects(lc, layer, docWidth, docHeight);
      }

      return lc;
    };

    const drawWithBlend = (
      targetCtx: CanvasRenderingContext2D,
      layer: LayerInfo,
      rendered: HTMLCanvasElement,
    ) => {
      const opacity = (layer.opacity ?? 100) / 100;
      const blendMode = getCanvasBlendMode(layer.blendMode);
      targetCtx.save();
      targetCtx.globalAlpha = opacity;
      targetCtx.globalCompositeOperation = blendMode;
      targetCtx.drawImage(rendered, 0, 0);
      targetCtx.restore();
    };

    const applyGroupMask = (
      groupCtx: CanvasRenderingContext2D,
      group: LayerInfo,
      w: number,
      h: number,
    ) => {
      const gMaskImg = maskImages[group.id];
      if (!group.mask || !gMaskImg || group.mask.disabled) return;
      const gmc = document.createElement("canvas");
      gmc.width = w;
      gmc.height = h;
      const gmctx = gmc.getContext("2d");
      if (!gmctx) return;
      const gdc = group.mask.defaultColor ?? 255;
      if (gdc === 255) {
        gmctx.fillStyle = "rgba(255, 255, 255, 1)";
        gmctx.fillRect(0, 0, w, h);
      }
      gmctx.drawImage(gMaskImg, group.mask.bounds.left, group.mask.bounds.top);
      if (group.mask.invert) {
        const md = gmctx.getImageData(0, 0, w, h);
        for (let p = 0; p < md.data.length; p += 4) {
          md.data[p] = 255 - md.data[p];
          md.data[p + 1] = 255 - md.data[p + 1];
          md.data[p + 2] = 255 - md.data[p + 2];
        }
        gmctx.putImageData(md, 0, 0);
      }
      groupCtx.globalCompositeOperation = "destination-in";
      groupCtx.drawImage(gmc, 0, 0);
      groupCtx.globalCompositeOperation = "source-over";
    };

    const renderItemToCanvas = (item: LayerInfo): HTMLCanvasElement | null => {
      if (item.type === "layer") {
        return renderSingleLayer(item);
      }
      if (!item.children || item.children.length === 0) return null;
      const gc = document.createElement("canvas");
      gc.width = docWidth;
      gc.height = docHeight;
      const gctx = gc.getContext("2d");
      if (!gctx) return null;
      renderItems(item.children, gctx);
      const hasGrpMask =
        item.mask && maskImages[item.id] && !item.mask.disabled;
      if (hasGrpMask) applyGroupMask(gctx, item, docWidth, docHeight);
      return gc;
    };

    const renderItems = (
      children: LayerInfo[],
      targetCtx: CanvasRenderingContext2D,
    ) => {
      interface StackItem {
        layer: LayerInfo;
        isGroup: boolean;
      }

      const items: StackItem[] = [];
      // Process children from bottom to top (Painter's Algorithm)
      // If ag-psd returns children from bottom-to-top (0 is bottom), we should iterate 0..length
      // If ag-psd returns top-to-bottom (0 is top), we should iterate length-1..0
      // Based on LayerPanel using reverse() to show top-first, children array is likely bottom-to-top.
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        // If layer is hidden, skip it
        if (!isLayerVisible(child)) continue;

        const isGroup = child.type !== "layer" && !!child.children;
        items.push({ layer: child, isGroup });
      }

      interface ClipGroup {
        base: StackItem;
        clipped: StackItem[];
      }

      const clipGroups: ClipGroup[] = [];
      let curBase: StackItem | null = null;
      let curClipped: StackItem[] = [];

      for (const item of items) {
        if (item.layer.isClippingMask) {
          curClipped.push(item);
        } else {
          if (curBase) clipGroups.push({ base: curBase, clipped: curClipped });
          curBase = item;
          curClipped = [];
        }
      }
      if (curBase) clipGroups.push({ base: curBase, clipped: curClipped });

      for (const cg of clipGroups) {
        const baseItem = cg.base;
        if (!isLayerVisible(baseItem.layer)) continue;

        if (baseItem.isGroup) {
          const isPassThrough =
            !baseItem.layer.blendMode ||
            baseItem.layer.blendMode === "passThrough";
          const grpOpacity = (baseItem.layer.opacity ?? 100) / 100;
          const hasGrpMask =
            baseItem.layer.mask &&
            maskImages[baseItem.layer.id] &&
            !baseItem.layer.mask.disabled;
          const needsTempBuf =
            !isPassThrough ||
            !!hasGrpMask ||
            grpOpacity < 1 ||
            cg.clipped.length > 0;

          if (!needsTempBuf) {
            renderItems(baseItem.layer.children!, targetCtx);
          } else {
            const gc = document.createElement("canvas");
            gc.width = docWidth;
            gc.height = docHeight;
            const gctx = gc.getContext("2d");
            if (!gctx) continue;

            renderItems(baseItem.layer.children!, gctx);

            if (hasGrpMask) {
              applyGroupMask(gctx, baseItem.layer, docWidth, docHeight);
            }

            if (isPassThrough) {
              targetCtx.save();
              targetCtx.globalAlpha = grpOpacity;
              targetCtx.drawImage(gc, 0, 0);
              targetCtx.restore();
            } else {
              drawWithBlend(targetCtx, baseItem.layer, gc);
            }

            if (cg.clipped.length > 0) {
              const clipCanvas = document.createElement("canvas");
              clipCanvas.width = docWidth;
              clipCanvas.height = docHeight;
              const clipCtx = clipCanvas.getContext("2d");
              if (clipCtx) {
                let hasClip = false;
                for (const cl of cg.clipped) {
                  if (!isLayerVisible(cl.layer)) continue;
                  const r = cl.isGroup
                    ? renderItemToCanvas(cl.layer)
                    : renderSingleLayer(cl.layer);
                  if (r) {
                    drawWithBlend(clipCtx, cl.layer, r);
                    hasClip = true;
                  }
                }
                if (hasClip) {
                  clipCtx.globalCompositeOperation = "destination-in";
                  clipCtx.globalAlpha = 1;
                  clipCtx.drawImage(gc, 0, 0);
                  clipCtx.globalCompositeOperation = "source-over";
                  targetCtx.globalAlpha = 1;
                  targetCtx.drawImage(clipCanvas, 0, 0);
                }
              }
            }
          }
        } else {
          const baseRendered = renderSingleLayer(baseItem.layer);
          if (!baseRendered) continue;

          drawWithBlend(targetCtx, baseItem.layer, baseRendered);

          if (cg.clipped.length > 0) {
            const cc = document.createElement("canvas");
            cc.width = docWidth;
            cc.height = docHeight;
            const cctx = cc.getContext("2d");
            if (!cctx) continue;
            let has = false;
            for (const cl of cg.clipped) {
              if (!isLayerVisible(cl.layer)) continue;
              const r = cl.isGroup
                ? renderItemToCanvas(cl.layer)
                : renderSingleLayer(cl.layer);
              if (r) {
                drawWithBlend(cctx, cl.layer, r);
                has = true;
              }
            }
            if (has) {
              cctx.globalCompositeOperation = "destination-in";
              cctx.globalAlpha = 1;
              cctx.drawImage(baseRendered, 0, 0);
              cctx.globalCompositeOperation = "source-over";
              targetCtx.globalAlpha = 1;
              targetCtx.drawImage(cc, 0, 0);
            }
          }
        }
      }
    };

    renderItems(layersData.layers, ctx);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, [
    layersData,
    layerImages,
    maskImages,
    layerImagesLoaded,
    layerVisibility,
    getCanvasBlendMode,
    renderLayerEffects,
    isLayerVisible,
  ]);

  // Redraw layer composite when visibility changes
  useEffect(() => {
    if (layerImagesLoaded && Object.keys(layerImages).length > 0) {
      compositeLayersOnCanvas();
      // Sync paint canvas size with layer canvas
      if (layerCanvasRef.current && paintCanvasRef.current) {
        paintCanvasRef.current.width = layerCanvasRef.current.width;
        paintCanvasRef.current.height = layerCanvasRef.current.height;
        redrawCanvas();
      }
    } else {
      // Force redraw even if layerImages are not fully loaded yet (maybe we just hid a layer)
      compositeLayersOnCanvas();
    }
  }, [
    layerVisibility,
    layerImagesLoaded,
    layerImages,
    compositeLayersOnCanvas,
    isCustomLayerComposition,
  ]);

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: number) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback(
    (layerId: number, defaultVisibility: boolean = true) => {
      setIsCustomLayerComposition(true);
      setLayerVisibility((prev) => {
        const newMap = new Map(prev);
        // If key exists, use it. If not, use defaultVisibility from the layer data.
        const currentVisibility = newMap.has(layerId)
          ? newMap.get(layerId)!
          : defaultVisibility;
        newMap.set(layerId, !currentVisibility);
        return newMap;
      });
    },
    [],
  );

  // Toggle layer lock
  const toggleLayerLock = (layerId: number) => {
    setLayerLocks((prev) => {
      const newMap = new Map(prev);
      const currentLock = newMap.has(layerId) ? newMap.get(layerId) : false;
      newMap.set(layerId, !currentLock);
      return newMap;
    });
  };

  // Load paint strokes from server when file data is available
  const lastLoadedFileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file?.id) return;

    // Load strokes if it's a new file or if we haven't loaded for this file yet
    if (lastLoadedFileIdRef.current !== file.id) {
      lastLoadedFileIdRef.current = file.id;

      if (file.paintAnnotation?.strokesData) {
        try {
          const loadedStrokes = JSON.parse(file.paintAnnotation.strokesData);
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
          setPaintStrokes([]);
        }
      } else {
        // No annotations for this file, clear previous strokes
        setPaintStrokes([]);
      }
    }
  }, [file?.id, file?.paintAnnotation?.strokesData]);

  // Save paint strokes mutation
  const savePaintStrokesMutation = useMutation({
    mutationFn: async (strokes: PaintStroke[]) => {
      // Prepare strokes for saving (remove non-serializable imageElement)
      const serializableStrokes = strokes.map((stroke) => {
        const { imageElement, ...rest } = stroke;
        return rest;
      });

      const payload = {
        strokesData: JSON.stringify(serializableStrokes),
      };

      // Check payload size roughly
      const payloadSize = new Blob([JSON.stringify(payload)]).size;
      if (payloadSize > 50 * 1024 * 1024) {
        // 50MB
        throw new Error("Payload too large");
      }

      return await apiRequest(
        "POST",
        `/api/files/${id}/paint-annotations`,
        payload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", id] });
    },
    onError: (error) => {
      console.error("Failed to save paint strokes:", error);
      const isSizeError =
        error instanceof Error && error.message === "Payload too large";

      toast({
        title: isSizeError ? "サイズエラー" : "保存エラー",
        description: isSizeError
          ? "ペイントデータが大きすぎます（50MB制限）。画像を小さくするか減らしてください。"
          : "ペイントの保存に失敗しました。",
        variant: "destructive",
      });
    },
  });

  // Auto-save paint strokes when they change (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const shouldPersistMainPaint = !selectedNormalReplyImageUrl;

  // Track when we've loaded annotations from the server
  useEffect(() => {
    if (file?.paintAnnotation?.strokesData) {
      hasLoadedRef.current = true;
    }
  }, [file?.paintAnnotation?.strokesData]);

  useEffect(() => {
    // Only save if we've loaded or have strokes (avoid saving empty on initial load)
    if (
      shouldPersistMainPaint &&
      id &&
      (paintStrokes.length > 0 || hasLoadedRef.current)
    ) {
      // Debounce the save to avoid too many API calls
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePaintStrokesMutation.mutate(paintStrokes);
      }, 1000); // Save after 1 second of inactivity
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [paintStrokes, id, shouldPersistMainPaint]);

  const addCommentMutation = useMutation({
    mutationFn: async (data: {
      body: string;
      x: number;
      y: number;
      videoTimestamp?: number;
      compareKey?: string;
      fileId: string;
    }) => {
      const { fileId, ...payload } = data;
      return await apiRequest("POST", `/api/files/${fileId}/comments`, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/files", variables.fileId],
      });
      setNewCommentPos(null);
      setComparePendingPinPane(null);
      setNewCommentText("");
      setIsAddingComment(false);
      toast({
        title: "コメント追加完了",
        description: "コメントが正常に追加されました。",
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      commentId,
      status,
    }: {
      commentId: string;
      status: CommentStatus;
    }) => {
      return await apiRequest("PATCH", `/api/comments/${commentId}`, {
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", id] });
    },
  });

  // Comment editing state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

  const updateCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      body,
    }: {
      commentId: string;
      body: string;
    }) => {
      return await apiRequest("PATCH", `/api/comments/${commentId}`, { body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", id] });
      setEditingCommentId(null);
      setEditingCommentBody("");
      toast({
        title: "コメント更新完了",
        description: "コメントが正常に更新されました。",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "コメントの更新に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", id] });
      setSelectedCommentId(null);
      toast({
        title: "コメント削除完了",
        description: "コメントとナンバーピンが削除されました。",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "コメントの削除に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handleEditComment = (comment: CommentWithAnchor) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const handleSaveEditComment = () => {
    if (editingCommentId && editingCommentBody.trim()) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        body: editingCommentBody.trim(),
      });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (
      confirm("このコメントを削除しますか？ナンバーピンも一緒に削除されます。")
    ) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const updateFileNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      // The id in apiRequest must be the file ID.
      // Make sure `id` from useParams is correctly used.
      // Also ensure the response type matches FileWithComments or at least File.
      return await apiRequest<FileWithComments>("PATCH", `/api/files/${id}`, {
        name: newName,
      });
    },
    onSuccess: (updatedFile) => {
      // Optimistically update the cache
      queryClient.setQueryData<FileWithComments>(
        ["/api/files", id],
        (oldData) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            name: updatedFile.name,
            updatedAt: updatedFile.updatedAt,
          };
        },
      );
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/files", id] });
      // Also invalidate project files list if project ID exists
      if (updatedFile.projectId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/projects", updatedFile.projectId],
        });
      }

      setIsEditingFileName(false);
      toast({
        title: "ファイル名を更新しました",
        description: "ファイル名が正常に変更されました。",
      });
    },
    onError: (error) => {
      console.error("Failed to update file name:", error);
      toast({
        title: "エラー",
        description: "ファイル名の更新に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handleEditFileName = () => {
    if (file) {
      setEditingFileName(file.name);
      setIsEditingFileName(true);
    }
  };

  const handleSaveFileName = () => {
    if (editingFileName.trim() && !updateFileNameMutation.isPending) {
      updateFileNameMutation.mutate(editingFileName.trim());
    }
  };

  const handleCancelEditFileName = () => {
    setIsEditingFileName(false);
    setEditingFileName("");
  };

  const handleKeyDownFileName = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveFileName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEditFileName();
    }
  };

  // Comment pin dragging state
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [pinDragStart, setPinDragStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pinOriginalPos, setPinOriginalPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pinDragSurface, setPinDragSurface] = useState<
    "main" | "compare-left" | "compare-right"
  >("main");
  const [pinDragFileId, setPinDragFileId] = useState<string | null>(null);
  const [pinDragOffset, setPinDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const pinDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const updateAnchorMutation = useMutation({
    mutationFn: async ({
      commentId,
      x,
      y,
      fileId,
    }: {
      commentId: string;
      x: number;
      y: number;
      fileId: string;
    }) => {
      return await apiRequest("PATCH", `/api/comments/${commentId}/anchor`, {
        x,
        y,
      });
    },
    onMutate: async ({ commentId, x, y, fileId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/files", fileId] });

      // Snapshot the previous value
      const previousFile = queryClient.getQueryData(["/api/files", fileId]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/files", fileId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          comments: old.comments?.map((c: any) =>
            c.id === commentId ? { ...c, anchor: { ...c.anchor, x, y } } : c,
          ),
        };
      });

      // Clear drag state immediately
      setDraggingPinId(null);
      setPinDragStart(null);
      setPinOriginalPos(null);
      setPinDragFileId(null);
      setPinDragOffset({ x: 0, y: 0 });
      pinDragOffsetRef.current = { x: 0, y: 0 };

      return { previousFile };
    },
    onError: (_err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousFile && variables?.fileId) {
        queryClient.setQueryData(
          ["/api/files", variables.fileId],
          context.previousFile,
        );
      }
      toast({
        title: "エラー",
        description: "ピンの移動に失敗しました。",
        variant: "destructive",
      });
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success
      if (variables?.fileId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/files", variables.fileId],
        });
      }
    },
  });

  const getPinDragContainer = (
    surface: "main" | "compare-left" | "compare-right",
  ) => {
    if (surface === "compare-left") return compareContainerRef.current;
    if (surface === "compare-right") return compareRightContainerRef.current;
    return canvasRef.current;
  };

  const getSurfaceComments = (
    surface: "main" | "compare-left" | "compare-right",
  ) => {
    if (surface === "compare-right")
      return compareFile?.comments || file?.comments || [];
    return file?.comments || [];
  };

  const startPinDrag = (
    e: React.MouseEvent,
    commentId: string,
    surface: "main" | "compare-left" | "compare-right",
    fileId: string | null | undefined,
  ) => {
    if (!fileId) return;
    const comment = getSurfaceComments(surface).find((c) => c.id === commentId);
    if (
      !comment?.anchor ||
      comment.anchor.x === null ||
      comment.anchor.y === null
    )
      return;

    const container = getPinDragContainer(surface);
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width;
    const mouseY = (e.clientY - rect.top) / rect.height;

    setDraggingPinId(commentId);
    setPinDragStart({ x: mouseX, y: mouseY });
    setPinOriginalPos({ x: comment.anchor.x, y: comment.anchor.y });
    setPinDragSurface(surface);
    setPinDragFileId(fileId);
    setPinDragOffset({ x: 0, y: 0 });
    pinDragOffsetRef.current = { x: 0, y: 0 };
  };

  const handlePinDragStart = (e: React.MouseEvent, commentId: string) => {
    startPinDrag(e, commentId, "main", id);
  };
  const handleCompareLeftPinDragStart = (
    e: React.MouseEvent,
    commentId: string,
  ) => {
    startPinDrag(e, commentId, "compare-left", id);
  };
  const handleCompareRightPinDragStart = (
    e: React.MouseEvent,
    commentId: string,
  ) => {
    startPinDrag(e, commentId, "compare-right", compareFile?.id || id);
  };

  // Handle pin drag in the container's mouse move
  useEffect(() => {
    if (!draggingPinId || !pinDragStart) return;

    let rafId: number | null = null;
    let lastMouseEvent: MouseEvent | null = null;

    const updatePosition = () => {
      if (!lastMouseEvent) return;

      const container = getPinDragContainer(pinDragSurface);
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = (lastMouseEvent.clientX - rect.left) / rect.width;
      const mouseY = (lastMouseEvent.clientY - rect.top) / rect.height;

      const dx = mouseX - pinDragStart.x;
      const dy = mouseY - pinDragStart.y;
      pinDragOffsetRef.current = { x: dx, y: dy };
      setPinDragOffset({ x: dx, y: dy });
      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMouseEvent = e;
      if (rafId === null) {
        rafId = requestAnimationFrame(updatePosition);
      }
    };

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (draggingPinId && pinOriginalPos) {
        const offset = pinDragOffsetRef.current;
        const newX = Math.max(0, Math.min(1, pinOriginalPos.x + offset.x));
        const newY = Math.max(0, Math.min(1, pinOriginalPos.y + offset.y));

        // Only update if position changed significantly
        if (Math.abs(offset.x) > 0.005 || Math.abs(offset.y) > 0.005) {
          if (pinDragFileId) {
            updateAnchorMutation.mutate({
              commentId: draggingPinId,
              x: newX,
              y: newY,
              fileId: pinDragFileId,
            });
          }
        } else {
          // Just a click, select the comment
          setSelectedCommentId(draggingPinId);
          setDraggingPinId(null);
          setPinDragStart(null);
          setPinOriginalPos(null);
          setPinDragFileId(null);
          setPinDragOffset({ x: 0, y: 0 });
          pinDragOffsetRef.current = { x: 0, y: 0 };
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    draggingPinId,
    pinDragFileId,
    pinDragStart,
    pinDragSurface,
    pinOriginalPos,
    updateAnchorMutation,
  ]);

  // Paint canvas drawing
  const redrawCanvas = useCallback(
    (targetCanvas?: HTMLCanvasElement) => {
      const canvas = targetCanvas || paintCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!showAllPaints) return;

      const allStrokes = currentStroke
        ? [...paintStrokes, currentStroke]
        : paintStrokes;

      drawPaintStrokes(ctx, allStrokes, canvas.width, canvas.height);

      // Draw bounding box for selected strokes
      if (selectedStrokeIds.size > 0 && paintTool === "select") {
        paintStrokes.forEach((stroke) => {
          if (!selectedStrokeIds.has(stroke.id)) return;

          const selectedStroke = stroke;
          // Apply current opacity to selected stroke context
          // Note: The bounding box itself should be opaque
          ctx.globalAlpha = 1;

          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

          // Calculate bounding box based on stroke type
          if (
            selectedStroke.tool === "image" &&
            selectedStroke.imagePosition &&
            selectedStroke.imageSize
          ) {
            minX = selectedStroke.imagePosition.x * canvas.width;
            minY = selectedStroke.imagePosition.y * canvas.height;
            maxX = minX + selectedStroke.imageSize.width * canvas.width;
            maxY = minY + selectedStroke.imageSize.height * canvas.height;
          } else if (
            selectedStroke.tool === "text" &&
            selectedStroke.textPosition &&
            selectedStroke.text
          ) {
            const fontSize =
              selectedStroke.fontSize || Math.max(16, selectedStroke.size * 4);
            ctx.font = `${fontSize}px "Noto Sans JP", sans-serif`;
            const lines = selectedStroke.text.split("\n");
            const lineHeight = fontSize * 1.3;
            let maxWidth = 0;
            lines.forEach((line) => {
              const metrics = ctx.measureText(line);
              maxWidth = Math.max(maxWidth, metrics.width);
            });
            minX = selectedStroke.textPosition.x * canvas.width;
            minY = selectedStroke.textPosition.y * canvas.height;
            maxX = minX + maxWidth;
            maxY = minY + lines.length * lineHeight;
          } else if (
            (selectedStroke.tool === "line" ||
              selectedStroke.tool === "arrow" ||
              selectedStroke.tool === "rectangle" ||
              selectedStroke.tool === "circle") &&
            selectedStroke.startPoint &&
            selectedStroke.endPoint
          ) {
            minX =
              Math.min(selectedStroke.startPoint.x, selectedStroke.endPoint.x) *
              canvas.width;
            minY =
              Math.min(selectedStroke.startPoint.y, selectedStroke.endPoint.y) *
              canvas.height;
            maxX =
              Math.max(selectedStroke.startPoint.x, selectedStroke.endPoint.x) *
              canvas.width;
            maxY =
              Math.max(selectedStroke.startPoint.y, selectedStroke.endPoint.y) *
              canvas.height;
          } else if (selectedStroke.points.length > 0) {
            selectedStroke.points.forEach((p) => {
              minX = Math.min(minX, p.x * canvas.width);
              minY = Math.min(minY, p.y * canvas.height);
              maxX = Math.max(maxX, p.x * canvas.width);
              maxY = Math.max(maxY, p.y * canvas.height);
            });
          }

          // Draw bounding box with padding
          if (minX !== Infinity) {
            const padding = 6;
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
              minX - padding,
              minY - padding,
              maxX - minX + padding * 2,
              maxY - minY + padding * 2,
            );
            ctx.setLineDash([]);

            // Only draw handles if single selection
            if (selectedStrokeIds.size === 1) {
              const handleSize = 8;
              ctx.fillStyle = "#3b82f6";

              // Draw corner handles (squares)
              const corners = [
                [minX - padding, minY - padding], // nw
                [maxX + padding, minY - padding], // ne
                [minX - padding, maxY + padding], // sw
                [maxX + padding, maxY + padding], // se
              ];
              corners.forEach(([cx, cy]) => {
                ctx.fillRect(
                  cx - handleSize / 2,
                  cy - handleSize / 2,
                  handleSize,
                  handleSize,
                );
              });

              // Draw edge handles (circles on midpoints)
              const midX = (minX + maxX) / 2;
              const midY = (minY + maxY) / 2;
              const edges = [
                [midX, minY - padding], // n
                [midX, maxY + padding], // s
                [minX - padding, midY], // w
                [maxX + padding, midY], // e
              ];
              ctx.fillStyle = "#ffffff";
              ctx.strokeStyle = "#3b82f6";
              ctx.lineWidth = 2;
              edges.forEach(([ex, ey]) => {
                ctx.beginPath();
                ctx.arc(ex, ey, handleSize / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              });
            }
          }
        });
      }

      // Draw selection box
      if (isBoxSelecting && selectionBoxStart && selectionBoxCurrent) {
        const minX = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
        const minY = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
        const width = Math.abs(selectionBoxCurrent.x - selectionBoxStart.x);
        const height = Math.abs(selectionBoxCurrent.y - selectionBoxStart.y);

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.fillStyle = "rgba(59, 130, 246, 0.1)"; // Light blue with opacity

        const x = minX * canvas.width;
        const y = minY * canvas.height;
        const w = width * canvas.width;
        const h = height * canvas.height;

        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      }
    },
    [
      paintStrokes,
      currentStroke,
      showAllPaints,
      selectedStrokeIds,
      paintTool,
      isBoxSelecting,
      selectionBoxStart,
      selectionBoxCurrent,
    ],
  );

  const syncPdfOverlaySize = useCallback(() => {
    const isPdfCanvasEnabled =
      !selectedNormalReplyImageUrl &&
      file?.mimeType === "application/pdf" &&
      !isAiFile;
    if (!isPdfCanvasEnabled) return;
    const iframe = pdfFrameRef.current;
    const canvas = paintCanvasRef.current;
    if (!iframe || !canvas) return;
    const width = Math.max(1, Math.round(iframe.clientWidth));
    const height = Math.max(1, Math.round(iframe.clientHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    redrawCanvas();
  }, [selectedNormalReplyImageUrl, file?.mimeType, isAiFile, redrawCanvas]);

  const redrawComparePaneCanvas = useCallback(
    (pane: "left" | "right") => {
      const canvas =
        pane === "left"
          ? compareCanvasRef.current
          : compareRightCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!showAllPaints) return;
      const paneStrokes =
        pane === "left" ? compareLeftPaintStrokes : compareRightPaintStrokes;
      const paneCurrentStroke =
        pane === "left" ? compareLeftCurrentStroke : compareRightCurrentStroke;
      const allStrokes = paneCurrentStroke
        ? [...paneStrokes, paneCurrentStroke]
        : paneStrokes;
      drawPaintStrokes(ctx, allStrokes, canvas.width, canvas.height);

      if (
        pane === compareActivePane &&
        selectedStrokeIds.size > 0 &&
        paintTool === "select"
      ) {
        paneStrokes.forEach((stroke) => {
          if (!selectedStrokeIds.has(stroke.id)) return;

          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

          if (
            stroke.tool === "image" &&
            stroke.imagePosition &&
            stroke.imageSize
          ) {
            minX = stroke.imagePosition.x * canvas.width;
            minY = stroke.imagePosition.y * canvas.height;
            maxX = minX + stroke.imageSize.width * canvas.width;
            maxY = minY + stroke.imageSize.height * canvas.height;
          } else if (
            stroke.tool === "text" &&
            stroke.textPosition &&
            stroke.text
          ) {
            const fontSize = stroke.fontSize || Math.max(16, stroke.size * 4);
            ctx.font = `${fontSize}px "Noto Sans JP", sans-serif`;
            const lines = stroke.text.split("\n");
            const lineHeight = fontSize * 1.3;
            let maxWidth = 0;
            lines.forEach((line) => {
              const metrics = ctx.measureText(line);
              maxWidth = Math.max(maxWidth, metrics.width);
            });
            minX = stroke.textPosition.x * canvas.width;
            minY = stroke.textPosition.y * canvas.height;
            maxX = minX + maxWidth;
            maxY = minY + lines.length * lineHeight;
          } else if (
            (stroke.tool === "line" ||
              stroke.tool === "arrow" ||
              stroke.tool === "rectangle" ||
              stroke.tool === "circle") &&
            stroke.startPoint &&
            stroke.endPoint
          ) {
            minX =
              Math.min(stroke.startPoint.x, stroke.endPoint.x) * canvas.width;
            minY =
              Math.min(stroke.startPoint.y, stroke.endPoint.y) * canvas.height;
            maxX =
              Math.max(stroke.startPoint.x, stroke.endPoint.x) * canvas.width;
            maxY =
              Math.max(stroke.startPoint.y, stroke.endPoint.y) * canvas.height;
          } else if (stroke.points.length > 0) {
            stroke.points.forEach((p) => {
              minX = Math.min(minX, p.x * canvas.width);
              minY = Math.min(minY, p.y * canvas.height);
              maxX = Math.max(maxX, p.x * canvas.width);
              maxY = Math.max(maxY, p.y * canvas.height);
            });
          }

          if (minX !== Infinity) {
            const padding = 6;
            const isActive = activeSelectedStrokeId === stroke.id;
            ctx.strokeStyle = isActive ? "#f59e0b" : "#3b82f6";
            ctx.lineWidth = isActive ? 3 : 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
              minX - padding,
              minY - padding,
              maxX - minX + padding * 2,
              maxY - minY + padding * 2,
            );
            ctx.setLineDash([]);

            if (selectedStrokeIds.size === 1) {
              const handleSize = 8;
              ctx.fillStyle = "#3b82f6";

              const corners = [
                [minX - padding, minY - padding],
                [maxX + padding, minY - padding],
                [minX - padding, maxY + padding],
                [maxX + padding, maxY + padding],
              ];
              corners.forEach(([cx, cy]) => {
                ctx.fillRect(
                  cx - handleSize / 2,
                  cy - handleSize / 2,
                  handleSize,
                  handleSize,
                );
              });

              const midX = (minX + maxX) / 2;
              const midY = (minY + maxY) / 2;
              const edges = [
                [midX, minY - padding],
                [midX, maxY + padding],
                [minX - padding, midY],
                [maxX + padding, midY],
              ];
              ctx.fillStyle = "#ffffff";
              ctx.strokeStyle = "#3b82f6";
              ctx.lineWidth = 2;
              edges.forEach(([ex, ey]) => {
                ctx.beginPath();
                ctx.arc(ex, ey, handleSize / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              });
            }
          }
        });
      }
    },
    [
      activeSelectedStrokeId,
      compareActivePane,
      compareLeftCurrentStroke,
      compareLeftPaintStrokes,
      compareRightCurrentStroke,
      compareRightPaintStrokes,
      paintTool,
      selectedStrokeIds,
      showAllPaints,
    ],
  );

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (!isCompareMode) return;
    redrawComparePaneCanvas("left");
  }, [isCompareMode, redrawComparePaneCanvas]);

  useEffect(() => {
    if (!isCompareMode) return;
    redrawComparePaneCanvas("right");
  }, [isCompareMode, redrawComparePaneCanvas]);

  // Track recently viewed files
  useEffect(() => {
    if (id && file) {
      const stored = localStorage.getItem("checkback-recently-viewed");
      let recentlyViewed: { fileId: string; viewedAt: string }[] = [];

      try {
        recentlyViewed = stored ? JSON.parse(stored) : [];
      } catch {
        recentlyViewed = [];
      }

      // Remove duplicate if exists
      recentlyViewed = recentlyViewed.filter((r) => r.fileId !== id);

      // Add to beginning
      recentlyViewed.unshift({
        fileId: id,
        viewedAt: new Date().toISOString(),
      });

      // Keep only last 20
      recentlyViewed = recentlyViewed.slice(0, 20);

      localStorage.setItem(
        "checkback-recently-viewed",
        JSON.stringify(recentlyViewed),
      );
    }
  }, [id, file]);

  const isShapeTool = (tool: PaintTool) =>
    ["line", "arrow", "rectangle", "circle"].includes(tool);

  const getActivePaintCanvas = useCallback(() => {
    if (!isCompareMode) return paintCanvasRef.current;
    return compareActivePane === "left"
      ? compareCanvasRef.current
      : compareRightCanvasRef.current;
  }, [isCompareMode, compareActivePane]);

  // Hit testing for selection tool
  const findStrokeAtPosition = useCallback(
    (
      x: number,
      y: number,
      targetCanvas?: HTMLCanvasElement,
      targetStrokes?: PaintStroke[],
    ): PaintStroke | null => {
      const canvas = targetCanvas || getActivePaintCanvas();
      if (!canvas) return null;
      const strokes = targetStrokes || paintStrokes;

      const threshold = 0.02; // 2% of canvas size

      // Check strokes in reverse order (top-most first)
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];

        if (
          stroke.tool === "image" &&
          stroke.imagePosition &&
          stroke.imageSize
        ) {
          // Image overlay hit testing
          const padding = 0.01;
          if (
            x >= stroke.imagePosition.x - padding &&
            x <= stroke.imagePosition.x + stroke.imageSize.width + padding &&
            y >= stroke.imagePosition.y - padding &&
            y <= stroke.imagePosition.y + stroke.imageSize.height + padding
          ) {
            return stroke;
          }
        } else if (
          stroke.tool === "text" &&
          stroke.textPosition &&
          stroke.text
        ) {
          // Text hit testing with multi-line support using measureText
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          const fontSize = stroke.fontSize || Math.max(16, stroke.size * 4);
          ctx.font = `${fontSize}px "Noto Sans JP", sans-serif`;
          const lines = stroke.text.split("\n");
          const lineHeight = fontSize * 1.3;

          // Find the maximum line width using measureText
          let maxWidthPx = 0;
          lines.forEach((line) => {
            const metrics = ctx.measureText(line);
            maxWidthPx = Math.max(maxWidthPx, metrics.width);
          });

          // Convert to normalized coordinates
          const maxLineWidth = maxWidthPx / canvas.width;
          const totalHeight = (lines.length * lineHeight) / canvas.height;

          // Add some padding for easier selection
          const padding = 0.015;

          if (
            x >= stroke.textPosition.x - padding &&
            x <= stroke.textPosition.x + maxLineWidth + padding &&
            y >= stroke.textPosition.y - padding &&
            y <= stroke.textPosition.y + totalHeight + padding
          ) {
            return stroke;
          }
        } else if (
          (stroke.tool === "line" || stroke.tool === "arrow") &&
          stroke.startPoint &&
          stroke.endPoint
        ) {
          // Line/arrow hit testing
          const dist = pointToLineDistance(
            x,
            y,
            stroke.startPoint.x,
            stroke.startPoint.y,
            stroke.endPoint.x,
            stroke.endPoint.y,
          );
          if (dist < threshold) return stroke;
        } else if (
          stroke.tool === "rectangle" &&
          stroke.startPoint &&
          stroke.endPoint
        ) {
          // Rectangle hit testing (check inside or near edges)
          const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x);
          const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x);
          const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y);
          const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y);

          const isInside =
            x >= minX - threshold &&
            x <= maxX + threshold &&
            y >= minY - threshold &&
            y <= maxY + threshold;
          if (isInside) return stroke;
        } else if (
          stroke.tool === "circle" &&
          stroke.startPoint &&
          stroke.endPoint
        ) {
          // Ellipse hit testing (check inside or near edge)
          const centerX = (stroke.startPoint.x + stroke.endPoint.x) / 2;
          const centerY = (stroke.startPoint.y + stroke.endPoint.y) / 2;
          const radiusX = Math.abs(stroke.endPoint.x - stroke.startPoint.x) / 2;
          const radiusY = Math.abs(stroke.endPoint.y - stroke.startPoint.y) / 2;

          if (radiusX > 0 && radiusY > 0) {
            const normalized =
              Math.pow((x - centerX) / radiusX, 2) +
              Math.pow((y - centerY) / radiusY, 2);
            if (normalized <= 1.3) return stroke;
          }
        } else if (stroke.points.length >= 2) {
          // Freehand path hit testing
          for (let j = 0; j < stroke.points.length - 1; j++) {
            const dist = pointToLineDistance(
              x,
              y,
              stroke.points[j].x,
              stroke.points[j].y,
              stroke.points[j + 1].x,
              stroke.points[j + 1].y,
            );
            if (dist < threshold) return stroke;
          }
        }
      }
      return null;
    },
    [paintStrokes, getActivePaintCanvas],
  );

  // Helper function for line distance
  const pointToLineDistance = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
  };

  // Calculate bounding box for a stroke (normalized coordinates)
  const getStrokeBounds = useCallback(
    (
      stroke: PaintStroke,
      targetCanvas?: HTMLCanvasElement,
    ): { minX: number; minY: number; maxX: number; maxY: number } | null => {
      const canvas = targetCanvas || paintCanvasRef.current;
      if (!canvas) return null;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      if (stroke.tool === "image" && stroke.imagePosition && stroke.imageSize) {
        minX = stroke.imagePosition.x;
        minY = stroke.imagePosition.y;
        maxX = minX + stroke.imageSize.width;
        maxY = minY + stroke.imageSize.height;
      } else if (stroke.tool === "text" && stroke.textPosition && stroke.text) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        const fontSize = stroke.fontSize || Math.max(16, stroke.size * 4);
        ctx.font = `${fontSize}px "Noto Sans JP", sans-serif`;
        const lines = stroke.text.split("\n");
        const lineHeight = fontSize * 1.3;
        let maxWidth = 0;
        lines.forEach((line) => {
          const metrics = ctx.measureText(line);
          maxWidth = Math.max(maxWidth, metrics.width);
        });
        minX = stroke.textPosition.x;
        minY = stroke.textPosition.y;
        maxX = minX + maxWidth / canvas.width;
        maxY = minY + (lines.length * lineHeight) / canvas.height;
      } else if (
        (stroke.tool === "line" ||
          stroke.tool === "arrow" ||
          stroke.tool === "rectangle" ||
          stroke.tool === "circle") &&
        stroke.startPoint &&
        stroke.endPoint
      ) {
        minX = Math.min(stroke.startPoint.x, stroke.endPoint.x);
        minY = Math.min(stroke.startPoint.y, stroke.endPoint.y);
        maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x);
        maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y);
      } else if (stroke.points.length > 0) {
        stroke.points.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      }

      if (minX === Infinity) return null;
      return { minX, minY, maxX, maxY };
    },
    [],
  );

  // Detect which resize handle is at position (returns handle type or null)
  type HandleType = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;
  const getResizeHandleAtPosition = useCallback(
    (
      x: number,
      y: number,
      stroke: PaintStroke,
      targetCanvas?: HTMLCanvasElement,
    ): HandleType => {
      const bounds = getStrokeBounds(stroke, targetCanvas);
      if (!bounds) return null;

      const handleSize = 0.015; // Normalized handle hit area
      const { minX, minY, maxX, maxY } = bounds;

      // Corner handles
      if (Math.abs(x - minX) < handleSize && Math.abs(y - minY) < handleSize)
        return "nw";
      if (Math.abs(x - maxX) < handleSize && Math.abs(y - minY) < handleSize)
        return "ne";
      if (Math.abs(x - minX) < handleSize && Math.abs(y - maxY) < handleSize)
        return "sw";
      if (Math.abs(x - maxX) < handleSize && Math.abs(y - maxY) < handleSize)
        return "se";

      // Edge handles (middle of edges)
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      if (Math.abs(x - midX) < handleSize && Math.abs(y - minY) < handleSize)
        return "n";
      if (Math.abs(x - midX) < handleSize && Math.abs(y - maxY) < handleSize)
        return "s";
      if (Math.abs(x - minX) < handleSize && Math.abs(y - midY) < handleSize)
        return "w";
      if (Math.abs(x - maxX) < handleSize && Math.abs(y - midY) < handleSize)
        return "e";

      return null;
    },
    [getStrokeBounds],
  );

  // Get cursor style for handle type
  const getCursorForHandle = (handle: HandleType): string => {
    switch (handle) {
      case "nw":
      case "se":
        return "nwse-resize";
      case "ne":
      case "sw":
        return "nesw-resize";
      case "n":
      case "s":
        return "ns-resize";
      case "e":
      case "w":
        return "ew-resize";
      default:
        return "move";
    }
  };

  const handlePaintStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaintMode) return;

    const canvas = e.currentTarget;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Reset snap state
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    setIsSnapped(false);
    startPointRef.current = { x, y };

    // Handle select tool
    if (paintTool === "select") {
      // First check if clicking on a resize handle of already selected stroke (only if single selection)
      if (selectedStrokeIds.size === 1) {
        const selectedId = Array.from(selectedStrokeIds)[0];
        const selectedStroke = paintStrokes.find((s) => s.id === selectedId);
        if (selectedStroke) {
          const handle = getResizeHandleAtPosition(x, y, selectedStroke);
          if (handle) {
            setActiveResizeHandle(handle);
            setIsShapeResizing(true);
            setShapeResizeStart({ x, y });
            const bounds = getStrokeBounds(selectedStroke);
            if (bounds) {
              setOriginalShapeBounds(bounds);
            }
            originalStrokeDataRef.current = JSON.parse(
              JSON.stringify(selectedStroke),
            );
            // Save undo state
            setUndoStack([...undoStack, paintStrokes]);
            setRedoStack([]);
            return;
          }
        }
      }

      // Check if clicking on a stroke
      const hitStroke = findStrokeAtPosition(x, y, canvas);
      if (hitStroke) {
        if (e.shiftKey) {
          const newSelection = new Set(selectedStrokeIds);
          if (newSelection.has(hitStroke.id)) {
            newSelection.delete(hitStroke.id);
          } else {
            newSelection.add(hitStroke.id);
          }
          setSelectedStrokeIds(newSelection);
        } else {
          // Normal click
          if (!selectedStrokeIds.has(hitStroke.id)) {
            // New selection
            setSelectedStrokeIds(new Set([hitStroke.id]));
          }
          // If already selected, keep selection (allows dragging group)
        }
        setActiveSelectedStrokeId(hitStroke.id);

        setPaintColor(hitStroke.color);
        setPaintSize(hitStroke.size);
        setPaintOpacity(hitStroke.opacity ?? 1);
        if (hitStroke.tool === "text") {
          setTextFontSize(
            hitStroke.fontSize || Math.max(16, hitStroke.size * 4),
          );
        }
        setIsDragging(true);
        setDragStart({ x, y });
        // Save undo state for drag
        setUndoStack([...undoStack, paintStrokes]);
        setRedoStack([]);
      } else {
        if (!e.shiftKey) {
          // Start box selection if clicking empty space without shift
          setSelectedStrokeIds(new Set());
          setActiveSelectedStrokeId(null);
          setIsBoxSelecting(true);
          setSelectionBoxStart({ x, y });
          setSelectionBoxCurrent({ x, y });
        }
      }
      return;
    }

    // Handle text tool - show input field
    if (paintTool === "text") {
      setIsAddingText(true);
      setTextInputPos({ x, y });
      setTextInputValue("");
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    // Handle number tool - add comment pin
    if (paintTool === "number") {
      setComparePendingPinPane(null);
      setNewCommentPos({ x, y });
      setIsAddingComment(true);
      return;
    }

    setIsPainting(true);

    if (isShapeTool(paintTool)) {
      setCurrentStroke({
        id: generateStrokeId(),
        points: [],
        color: paintColor,
        size: paintSize,
        tool: paintTool,
        startPoint: { x, y },
        endPoint: { x, y },
        opacity: paintOpacity,
      });
    } else {
      setCurrentStroke({
        id: generateStrokeId(),
        points: [{ x, y }],
        color: paintColor,
        size: paintSize,
        tool: paintTool,
        opacity: paintOpacity,
      });
    }
  };

  const handleTextSubmit = () => {
    if (textInputValue.trim() && textInputPos) {
      if (isCompareMode) {
        const applyToCompare = (prevStrokes: PaintStroke[]) => {
          if (editingTextStrokeId) {
            return prevStrokes.map((stroke) =>
              stroke.id === editingTextStrokeId
                ? {
                    ...stroke,
                    text: textInputValue.trim(),
                    fontSize: textFontSize,
                  }
                : stroke,
            );
          }
          const newTextStroke: PaintStroke = {
            id: generateStrokeId(),
            points: [],
            color: paintColor,
            size: paintSize,
            tool: "text",
            text: textInputValue.trim(),
            textPosition: textInputPos,
            fontSize: textFontSize,
          };
          return [...prevStrokes, newTextStroke];
        };

        if (compareActivePane === "left") {
          setCompareLeftPaintStrokes(applyToCompare);
        } else {
          setCompareRightPaintStrokes(applyToCompare);
        }
      } else {
        setUndoStack([...undoStack, paintStrokes]);
        setRedoStack([]);

        if (editingTextStrokeId) {
          setPaintStrokes((prevStrokes) =>
            prevStrokes.map((stroke) =>
              stroke.id === editingTextStrokeId
                ? {
                    ...stroke,
                    text: textInputValue.trim(),
                    fontSize: textFontSize,
                  }
                : stroke,
            ),
          );
        } else {
          const newTextStroke: PaintStroke = {
            id: generateStrokeId(),
            points: [],
            color: paintColor,
            size: paintSize,
            tool: "text",
            text: textInputValue.trim(),
            textPosition: textInputPos,
            fontSize: textFontSize,
          };
          setPaintStrokes([...paintStrokes, newTextStroke]);
        }
      }
    }
    setIsAddingText(false);
    setTextInputPos(null);
    setTextInputValue("");
    setEditingTextStrokeId(null);
  };

  // Handle overlay image upload
  const handleOverlayImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast({
        title: "エラー",
        description: "画像ファイルのみアップロードできます。",
        variant: "destructive",
      });
      return;
    }

    try {
      const addOverlayImageStroke = (
        imageUrl: string,
        imageElement: HTMLImageElement,
      ) => {
        const targetCanvas = isCompareMode
          ? compareActivePane === "left"
            ? compareCanvasRef.current
            : compareRightCanvasRef.current
          : paintCanvasRef.current;
        if (!targetCanvas) return;

        const maxWidth = 0.3;
        const aspectRatio = imageElement.height / imageElement.width;
        const width = maxWidth;
        const height =
          (maxWidth * aspectRatio * targetCanvas.width) / targetCanvas.height;
        const x = 0.35;
        const y = 0.35;

        const newImageStroke: PaintStroke = {
          id: generateStrokeId(),
          points: [],
          color: "#000000",
          size: 1,
          tool: "image",
          imageUrl,
          imageElement,
          imagePosition: { x, y },
          imageSize: { width, height },
        };

        if (isCompareMode) {
          if (compareActivePane === "left") {
            setCompareLeftPaintStrokes((prev) => [...prev, newImageStroke]);
          } else {
            setCompareRightPaintStrokes((prev) => [...prev, newImageStroke]);
          }
        } else {
          setUndoStack([...undoStack, paintStrokes]);
          setRedoStack([]);
          setPaintStrokes([...paintStrokes, newImageStroke]);
        }

        toast({
          title: "画像を追加しました",
          description: "選択ツールで移動できます。",
        });
      };

      const formData = new FormData();
      formData.append("image", file);
      const authUser = getStoredAuthUser();

      const response = await fetch(`/api/files/${id}/paint-images`, {
        method: "POST",
        body: formData,
        headers: authUser?.id ? { "x-user-id": authUser.id } : undefined,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "画像アップロードに失敗しました。");
      }

      const createCompressedDataUrl = async (input: File): Promise<string> => {
        const readAsDataUrl = () =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () =>
              reject(new Error("画像の読み込みに失敗しました。"));
            reader.readAsDataURL(input);
          });

        const src = await readAsDataUrl();
        const sourceImage = await new Promise<HTMLImageElement>(
          (resolve, reject) => {
            const image = new window.Image();
            image.onload = () => resolve(image);
            image.onerror = () =>
              reject(new Error("画像のデコードに失敗しました。"));
            image.src = src;
          },
        );

        const maxDimension = 1600;
        const scale = Math.min(
          1,
          maxDimension / Math.max(sourceImage.width, sourceImage.height),
        );
        const targetWidth = Math.max(1, Math.round(sourceImage.width * scale));
        const targetHeight = Math.max(
          1,
          Math.round(sourceImage.height * scale),
        );

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("画像処理に失敗しました。");
        }

        ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
        return canvas.toDataURL("image/jpeg", 0.82);
      };

      const data = (await response.json()) as { url?: string };
      const imageSourceUrl = data.url || (await createCompressedDataUrl(file));

      const img = new window.Image();
      img.onload = () => {
        addOverlayImageStroke(imageSourceUrl, img);
      };
      img.src = imageSourceUrl;
    } catch (_error) {
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const img = new window.Image();
          img.onload = () => {
            const targetCanvas = isCompareMode
              ? compareActivePane === "left"
                ? compareCanvasRef.current
                : compareRightCanvasRef.current
              : paintCanvasRef.current;
            if (!targetCanvas) return;

            const maxWidth = 0.3;
            const aspectRatio = img.height / img.width;
            const width = maxWidth;
            const height =
              (maxWidth * aspectRatio * targetCanvas.width) /
              targetCanvas.height;
            const x = 0.35;
            const y = 0.35;

            const newImageStroke: PaintStroke = {
              id: generateStrokeId(),
              points: [],
              color: "#000000",
              size: 1,
              tool: "image",
              imageUrl: dataUrl,
              imageElement: img,
              imagePosition: { x, y },
              imageSize: { width, height },
            };

            if (isCompareMode) {
              if (compareActivePane === "left") {
                setCompareLeftPaintStrokes((prev) => [...prev, newImageStroke]);
              } else {
                setCompareRightPaintStrokes((prev) => [
                  ...prev,
                  newImageStroke,
                ]);
              }
            } else {
              setUndoStack([...undoStack, paintStrokes]);
              setRedoStack([]);
              setPaintStrokes([...paintStrokes, newImageStroke]);
            }

            toast({
              title: "画像を追加しました",
              description: "選択ツールで移動できます。",
            });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      } catch {
        toast({
          title: "エラー",
          description: "画像の追加に失敗しました。",
          variant: "destructive",
        });
      }
    } finally {
      if (overlayInputRef.current) {
        overlayInputRef.current.value = "";
      }
    }
  };

  const handleTextCancel = () => {
    setIsAddingText(false);
    setTextInputPos(null);
    setTextInputValue("");
    setEditingTextStrokeId(null);
  };

  // Start editing an existing text stroke
  const startEditingText = (stroke: PaintStroke) => {
    if (stroke.tool !== "text" || !stroke.textPosition) return;
    setEditingTextStrokeId(stroke.id);
    setTextInputPos(stroke.textPosition);
    setTextInputValue(stroke.text || "");
    setTextFontSize(stroke.fontSize || Math.max(16, stroke.size * 4));
    setIsAddingText(true);
    setSelectedStrokeIds(new Set());
  };

  const handlePaintMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Handle resizing for select tool
    if (
      isShapeResizing &&
      selectedStrokeIds.size === 1 &&
      shapeResizeStart &&
      originalShapeBounds &&
      activeResizeHandle
    ) {
      const selectedId = Array.from(selectedStrokeIds)[0];
      const origStroke = originalStrokeDataRef.current;
      if (!origStroke) return;

      const { minX, minY, maxX, maxY } = originalShapeBounds;
      const dx = x - shapeResizeStart.x;
      const dy = y - shapeResizeStart.y;

      let newMinX = minX,
        newMinY = minY,
        newMaxX = maxX,
        newMaxY = maxY;

      switch (activeResizeHandle) {
        case "nw":
          newMinX = minX + dx;
          newMinY = minY + dy;
          break;
        case "ne":
          newMaxX = maxX + dx;
          newMinY = minY + dy;
          break;
        case "sw":
          newMinX = minX + dx;
          newMaxY = maxY + dy;
          break;
        case "se":
          newMaxX = maxX + dx;
          newMaxY = maxY + dy;
          break;
        case "n":
          newMinY = minY + dy;
          break;
        case "s":
          newMaxY = maxY + dy;
          break;
        case "w":
          newMinX = minX + dx;
          break;
        case "e":
          newMaxX = maxX + dx;
          break;
      }

      const minDimension = 0.02;

      if (newMaxX - newMinX < minDimension) {
        if (activeResizeHandle.includes("w")) newMinX = newMaxX - minDimension;
        else newMaxX = newMinX + minDimension;
      }
      if (newMaxY - newMinY < minDimension) {
        if (activeResizeHandle.includes("n")) newMinY = newMaxY - minDimension;
        else newMaxY = newMinY + minDimension;
      }
      if (newMinX >= newMaxX) newMinX = newMaxX - minDimension;
      if (newMinY >= newMaxY) newMinY = newMaxY - minDimension;

      const origWidth = Math.max(maxX - minX, 0.001);
      const origHeight = Math.max(maxY - minY, 0.001);
      const newWidth = newMaxX - newMinX;
      const newHeight = newMaxY - newMinY;

      setPaintStrokes((prevStrokes) =>
        prevStrokes.map((stroke) => {
          if (stroke.id !== selectedId) return stroke;

          const updatedStroke = { ...stroke };

          if (
            origStroke.tool === "image" &&
            origStroke.imagePosition &&
            origStroke.imageSize
          ) {
            updatedStroke.imagePosition = { x: newMinX, y: newMinY };
            updatedStroke.imageSize = { width: newWidth, height: newHeight };
          } else if (
            (origStroke.tool === "line" ||
              origStroke.tool === "arrow" ||
              origStroke.tool === "rectangle" ||
              origStroke.tool === "circle") &&
            origStroke.startPoint &&
            origStroke.endPoint
          ) {
            const startXRatio = (origStroke.startPoint.x - minX) / origWidth;
            const startYRatio = (origStroke.startPoint.y - minY) / origHeight;
            const endXRatio = (origStroke.endPoint.x - minX) / origWidth;
            const endYRatio = (origStroke.endPoint.y - minY) / origHeight;

            updatedStroke.startPoint = {
              x: newMinX + startXRatio * newWidth,
              y: newMinY + startYRatio * newHeight,
            };
            updatedStroke.endPoint = {
              x: newMinX + endXRatio * newWidth,
              y: newMinY + endYRatio * newHeight,
            };
          } else if (origStroke.points.length > 0) {
            updatedStroke.points = origStroke.points.map((p) => ({
              x: newMinX + ((p.x - minX) / origWidth) * newWidth,
              y: newMinY + ((p.y - minY) / origHeight) * newHeight,
            }));
          } else if (origStroke.tool === "text" && origStroke.textPosition) {
            const scaleRatio = Math.max(
              0.25,
              Math.min(4, (newWidth / origWidth + newHeight / origHeight) / 2),
            );
            const baseFontSize = origStroke.fontSize || 16;
            updatedStroke.textPosition = { x: newMinX, y: newMinY };
            updatedStroke.fontSize = Math.max(
              8,
              Math.min(72, Math.round(baseFontSize * scaleRatio)),
            );
          }

          return updatedStroke;
        }),
      );

      return;
    }

    // Handle dragging for select tool
    if (isDragging && selectedStrokeIds.size > 0 && dragStart) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      setPaintStrokes((prevStrokes) =>
        prevStrokes.map((stroke) => {
          if (!selectedStrokeIds.has(stroke.id)) return stroke;

          const updatedStroke = { ...stroke };

          // Move based on stroke type
          if (stroke.imagePosition) {
            updatedStroke.imagePosition = {
              x: stroke.imagePosition.x + dx,
              y: stroke.imagePosition.y + dy,
            };
          }
          if (stroke.textPosition) {
            updatedStroke.textPosition = {
              x: stroke.textPosition.x + dx,
              y: stroke.textPosition.y + dy,
            };
          }
          if (stroke.startPoint && stroke.endPoint) {
            updatedStroke.startPoint = {
              x: stroke.startPoint.x + dx,
              y: stroke.startPoint.y + dy,
            };
            updatedStroke.endPoint = {
              x: stroke.endPoint.x + dx,
              y: stroke.endPoint.y + dy,
            };
          }
          if (stroke.points.length > 0) {
            updatedStroke.points = stroke.points.map((p) => ({
              x: p.x + dx,
              y: p.y + dy,
            }));
          }

          return updatedStroke;
        }),
      );

      setDragStart({ x, y });
      return;
    }

    // Update cursor when hovering over handles (only when select tool is active)
    if (
      paintTool === "select" &&
      selectedStrokeIds.size === 1 &&
      !isDragging &&
      !isShapeResizing
    ) {
      const selectedId = Array.from(selectedStrokeIds)[0];
      const selectedStroke = paintStrokes.find((s) => s.id === selectedId);
      if (selectedStroke) {
        const handle = getResizeHandleAtPosition(x, y, selectedStroke);
        if (handle) {
          canvas.style.cursor = getCursorForHandle(handle);
        } else {
          // Check if over the stroke itself
          const isOverStroke = findStrokeAtPosition(x, y, canvas);
          canvas.style.cursor = isOverStroke ? "move" : "default";
        }
      }
    } else if (paintTool === "select") {
      const hitStroke = findStrokeAtPosition(x, y, canvas);
      canvas.style.cursor = hitStroke ? "move" : "default";
    }

    if (isBoxSelecting && selectionBoxStart) {
      setSelectionBoxCurrent({ x, y });
      return;
    }

    if (!isPainting || !currentStroke) return;

    // Reset snap timer on move
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);

    // Shift key or Snap logic
    const shouldSnap = e.shiftKey || isSnapped;

    if (shouldSnap && !isShapeTool(paintTool)) {
      // Snap to line logic for freehand tools
      if (currentStroke.points.length > 0) {
        const start = currentStroke.points[0];
        setCurrentStroke({
          ...currentStroke,
          points: [start, { x, y }], // Replace with straight line
        });
      }
      return;
    }

    // Set timer for Hold to Snap (only for freehand tools)
    if (!isShapeTool(paintTool) && !isSnapped && !e.shiftKey) {
      snapTimerRef.current = setTimeout(() => {
        setIsSnapped(true);
        setCurrentStroke((prev) => {
          if (!prev || prev.points.length === 0) return prev;
          return {
            ...prev,
            points: [prev.points[0], { x, y }], // Snap to current pos
          };
        });
      }, 500); // 500ms delay
    }

    if (isShapeTool(paintTool)) {
      let endX = x;
      let endY = y;

      // Shift key for perfect shape (Square / Circle)
      if (
        e.shiftKey &&
        (paintTool === "rectangle" || paintTool === "circle") &&
        currentStroke.startPoint
      ) {
        const startX = currentStroke.startPoint.x;
        const startY = currentStroke.startPoint.y;

        if (canvas) {
          // Calculate dimensions in pixels to maintain aspect ratio
          const dx = (x - startX) * canvas.width;
          const dy = (y - startY) * canvas.height;

          // Use the larger dimension
          const maxDim = Math.max(Math.abs(dx), Math.abs(dy));

          // Calculate new end point maintaining aspect ratio 1:1
          const newDx = (dx >= 0 ? 1 : -1) * maxDim;
          const newDy = (dy >= 0 ? 1 : -1) * maxDim;

          // Convert back to normalized coordinates
          endX = startX + newDx / canvas.width;
          endY = startY + newDy / canvas.height;
        }
      }

      setCurrentStroke({
        ...currentStroke,
        endPoint: { x: endX, y: endY },
      });
    } else {
      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, { x, y }],
      });
    }
  };

  const handlePaintEnd = () => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    setIsSnapped(false);
    startPointRef.current = null;

    // End resizing
    if (isShapeResizing) {
      setIsShapeResizing(false);
      setActiveResizeHandle(null);
      setShapeResizeStart(null);
      setOriginalShapeBounds(null);
      originalStrokeDataRef.current = null;
      return;
    }

    // End dragging
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    // End box selection
    if (isBoxSelecting && selectionBoxStart && selectionBoxCurrent) {
      const minX = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
      const minY = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
      const maxX = Math.max(selectionBoxStart.x, selectionBoxCurrent.x);
      const maxY = Math.max(selectionBoxStart.y, selectionBoxCurrent.y);

      const newSelection = new Set<string>();

      paintStrokes.forEach((stroke) => {
        let isInside = false;

        // Check if stroke is inside selection box
        const bounds = getStrokeBounds(stroke);
        if (bounds) {
          // If stroke bounds intersect or are contained within selection box
          // Using intersection check for better UX (touching is selecting)
          if (
            bounds.minX < maxX &&
            bounds.maxX > minX &&
            bounds.minY < maxY &&
            bounds.maxY > minY
          ) {
            isInside = true;
          }
        } else if (
          stroke.tool === "image" &&
          stroke.imagePosition &&
          stroke.imageSize
        ) {
          const imgX = stroke.imagePosition.x;
          const imgY = stroke.imagePosition.y;
          const imgW = stroke.imageSize.width;
          const imgH = stroke.imageSize.height;

          if (
            imgX < maxX &&
            imgX + imgW > minX &&
            imgY < maxY &&
            imgY + imgH > minY
          ) {
            isInside = true;
          }
        } else if (stroke.tool === "text" && stroke.textPosition) {
          // Simple point check for text
          if (
            stroke.textPosition.x >= minX &&
            stroke.textPosition.x <= maxX &&
            stroke.textPosition.y >= minY &&
            stroke.textPosition.y <= maxY
          ) {
            isInside = true;
          }
        }

        if (isInside) {
          newSelection.add(stroke.id);
        }
      });

      if (newSelection.size > 0) {
        setSelectedStrokeIds(newSelection);
      }

      setIsBoxSelecting(false);
      setSelectionBoxStart(null);
      setSelectionBoxCurrent(null);
      return;
    }

    if (currentStroke) {
      const isValidShape =
        isShapeTool(currentStroke.tool) &&
        currentStroke.startPoint &&
        currentStroke.endPoint;
      const isValidFreehand =
        !isShapeTool(currentStroke.tool) && currentStroke.points.length > 1;

      if (isValidShape || isValidFreehand) {
        setUndoStack([...undoStack, paintStrokes]);
        setRedoStack([]);
        setPaintStrokes([...paintStrokes, currentStroke]);
      }
    }
    setCurrentStroke(null);
    setIsPainting(false);
  };

  // Z-Order Management
  const handleBringToFront = useCallback(() => {
    if (selectedStrokeIds.size === 0) return;
    if (isCompareMode) {
      const pane = compareActivePane;
      const paneStrokes = getComparePaneStrokes(pane);
      if (pane === "left") {
        setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
        setCompareLeftRedoStack([]);
      } else {
        setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
        setCompareRightRedoStack([]);
      }
      updateComparePaneStrokes(pane, (prev) => {
        const selected = prev.filter((s) => selectedStrokeIds.has(s.id));
        const nonSelected = prev.filter((s) => !selectedStrokeIds.has(s.id));
        return [...nonSelected, ...selected];
      });
      return;
    }
    setUndoStack([...undoStack, paintStrokes]);
    setRedoStack([]);

    setPaintStrokes((prev) => {
      const selected = prev.filter((s) => selectedStrokeIds.has(s.id));
      const nonSelected = prev.filter((s) => !selectedStrokeIds.has(s.id));
      return [...nonSelected, ...selected];
    });
  }, [
    compareActivePane,
    getComparePaneStrokes,
    isCompareMode,
    paintStrokes,
    selectedStrokeIds,
    undoStack,
    updateComparePaneStrokes,
  ]);

  const handleSendToBack = useCallback(() => {
    if (selectedStrokeIds.size === 0) return;
    if (isCompareMode) {
      const pane = compareActivePane;
      const paneStrokes = getComparePaneStrokes(pane);
      if (pane === "left") {
        setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
        setCompareLeftRedoStack([]);
      } else {
        setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
        setCompareRightRedoStack([]);
      }
      updateComparePaneStrokes(pane, (prev) => {
        const selected = prev.filter((s) => selectedStrokeIds.has(s.id));
        const nonSelected = prev.filter((s) => !selectedStrokeIds.has(s.id));
        return [...selected, ...nonSelected];
      });
      return;
    }
    setUndoStack([...undoStack, paintStrokes]);
    setRedoStack([]);

    setPaintStrokes((prev) => {
      const selected = prev.filter((s) => selectedStrokeIds.has(s.id));
      const nonSelected = prev.filter((s) => !selectedStrokeIds.has(s.id));
      return [...selected, ...nonSelected];
    });
  }, [
    compareActivePane,
    getComparePaneStrokes,
    isCompareMode,
    paintStrokes,
    selectedStrokeIds,
    undoStack,
    updateComparePaneStrokes,
  ]);

  const handleBringForward = useCallback(() => {
    if (selectedStrokeIds.size === 0) return;
    if (isCompareMode) {
      const pane = compareActivePane;
      const paneStrokes = getComparePaneStrokes(pane);
      if (pane === "left") {
        setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
        setCompareLeftRedoStack([]);
      } else {
        setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
        setCompareRightRedoStack([]);
      }
      updateComparePaneStrokes(pane, (prev) => {
        const newStrokes = [...prev];
        for (let i = newStrokes.length - 2; i >= 0; i--) {
          if (
            selectedStrokeIds.has(newStrokes[i].id) &&
            !selectedStrokeIds.has(newStrokes[i + 1].id)
          ) {
            [newStrokes[i], newStrokes[i + 1]] = [
              newStrokes[i + 1],
              newStrokes[i],
            ];
          }
        }
        return newStrokes;
      });
      return;
    }
    setUndoStack([...undoStack, paintStrokes]);
    setRedoStack([]);

    setPaintStrokes((prev) => {
      const newStrokes = [...prev];
      for (let i = newStrokes.length - 2; i >= 0; i--) {
        if (
          selectedStrokeIds.has(newStrokes[i].id) &&
          !selectedStrokeIds.has(newStrokes[i + 1].id)
        ) {
          // Swap
          [newStrokes[i], newStrokes[i + 1]] = [
            newStrokes[i + 1],
            newStrokes[i],
          ];
        }
      }
      return newStrokes;
    });
  }, [
    compareActivePane,
    getComparePaneStrokes,
    isCompareMode,
    paintStrokes,
    selectedStrokeIds,
    undoStack,
    updateComparePaneStrokes,
  ]);

  const handleSendBackward = useCallback(() => {
    if (selectedStrokeIds.size === 0) return;
    if (isCompareMode) {
      const pane = compareActivePane;
      const paneStrokes = getComparePaneStrokes(pane);
      if (pane === "left") {
        setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
        setCompareLeftRedoStack([]);
      } else {
        setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
        setCompareRightRedoStack([]);
      }
      updateComparePaneStrokes(pane, (prev) => {
        const newStrokes = [...prev];
        for (let i = 1; i < newStrokes.length; i++) {
          if (
            selectedStrokeIds.has(newStrokes[i].id) &&
            !selectedStrokeIds.has(newStrokes[i - 1].id)
          ) {
            [newStrokes[i], newStrokes[i - 1]] = [
              newStrokes[i - 1],
              newStrokes[i],
            ];
          }
        }
        return newStrokes;
      });
      return;
    }
    setUndoStack([...undoStack, paintStrokes]);
    setRedoStack([]);

    setPaintStrokes((prev) => {
      const newStrokes = [...prev];
      for (let i = 1; i < newStrokes.length; i++) {
        if (
          selectedStrokeIds.has(newStrokes[i].id) &&
          !selectedStrokeIds.has(newStrokes[i - 1].id)
        ) {
          // Swap
          [newStrokes[i], newStrokes[i - 1]] = [
            newStrokes[i - 1],
            newStrokes[i],
          ];
        }
      }
      return newStrokes;
    });
  }, [
    compareActivePane,
    getComparePaneStrokes,
    isCompareMode,
    paintStrokes,
    selectedStrokeIds,
    undoStack,
    updateComparePaneStrokes,
  ]);

  const handleUndo = () => {
    if (isCompareMode) {
      if (compareActivePane === "left") {
        if (compareLeftUndoStack.length === 0) return;
        const previousState =
          compareLeftUndoStack[compareLeftUndoStack.length - 1];
        setCompareLeftRedoStack((prev) => [...prev, compareLeftPaintStrokes]);
        setCompareLeftPaintStrokes(previousState);
        setCompareLeftUndoStack(compareLeftUndoStack.slice(0, -1));
      } else {
        if (compareRightUndoStack.length === 0) return;
        const previousState =
          compareRightUndoStack[compareRightUndoStack.length - 1];
        setCompareRightRedoStack((prev) => [...prev, compareRightPaintStrokes]);
        setCompareRightPaintStrokes(previousState);
        setCompareRightUndoStack(compareRightUndoStack.slice(0, -1));
      }
      return;
    }
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack([...redoStack, paintStrokes]);
    setPaintStrokes(previousState);
    setUndoStack(undoStack.slice(0, -1));
  };

  const handleRedo = () => {
    if (isCompareMode) {
      if (compareActivePane === "left") {
        if (compareLeftRedoStack.length === 0) return;
        const nextState = compareLeftRedoStack[compareLeftRedoStack.length - 1];
        setCompareLeftUndoStack((prev) => [...prev, compareLeftPaintStrokes]);
        setCompareLeftPaintStrokes(nextState);
        setCompareLeftRedoStack(compareLeftRedoStack.slice(0, -1));
      } else {
        if (compareRightRedoStack.length === 0) return;
        const nextState =
          compareRightRedoStack[compareRightRedoStack.length - 1];
        setCompareRightUndoStack((prev) => [...prev, compareRightPaintStrokes]);
        setCompareRightPaintStrokes(nextState);
        setCompareRightRedoStack(compareRightRedoStack.slice(0, -1));
      }
      return;
    }
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack([...undoStack, paintStrokes]);
    setPaintStrokes(nextState);
    setRedoStack(redoStack.slice(0, -1));
  };

  // Delete selected strokes
  const handleDeleteSelectedStroke = useCallback(() => {
    if (selectedStrokeIds.size === 0 || !isPaintMode || paintTool !== "select")
      return;
    if (isCompareMode) {
      const pane = compareActivePane;
      const paneStrokes = getComparePaneStrokes(pane);
      if (pane === "left") {
        setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
        setCompareLeftRedoStack([]);
      } else {
        setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
        setCompareRightRedoStack([]);
      }
      updateComparePaneStrokes(pane, (prev) =>
        prev.filter((s) => !selectedStrokeIds.has(s.id)),
      );
      setSelectedStrokeIds(new Set());
      setActiveSelectedStrokeId(null);
      return;
    }

    // Save current state for undo
    setUndoStack((prev) => [...prev, paintStrokes]);
    setRedoStack([]);

    // Remove the selected strokes
    setPaintStrokes((prev) => prev.filter((s) => !selectedStrokeIds.has(s.id)));
    setSelectedStrokeIds(new Set());
    setActiveSelectedStrokeId(null);
  }, [
    compareActivePane,
    getComparePaneStrokes,
    isCompareMode,
    isPaintMode,
    paintStrokes,
    paintTool,
    selectedStrokeIds,
    updateComparePaneStrokes,
  ]);

  const handleColorChange = (newColor: string) => {
    setPaintColor(newColor);
    const currentSelectedIds = selectedStrokeIdsRef.current;
    if (currentSelectedIds.size > 0 && paintTool === "select") {
      if (isCompareMode) {
        const pane = compareActivePane;
        const paneStrokes = getComparePaneStrokes(pane);
        if (pane === "left") {
          setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
          setCompareLeftRedoStack([]);
        } else {
          setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
          setCompareRightRedoStack([]);
        }
        updateComparePaneStrokes(pane, (prev) =>
          prev.map((s) =>
            currentSelectedIds.has(s.id) ? { ...s, color: newColor } : s,
          ),
        );
      } else {
        setUndoStack((prev) => [...prev, paintStrokes]);
        setRedoStack([]);
        setPaintStrokes((prev) =>
          prev.map((s) =>
            currentSelectedIds.has(s.id) ? { ...s, color: newColor } : s,
          ),
        );
      }
    }
  };

  const handleSizeChange = (newSize: number) => {
    setPaintSize(newSize);
    const currentSelectedIds = selectedStrokeIdsRef.current;
    if (currentSelectedIds.size > 0 && paintTool === "select") {
      if (isCompareMode) {
        const pane = compareActivePane;
        const paneStrokes = getComparePaneStrokes(pane);
        if (pane === "left") {
          setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
          setCompareLeftRedoStack([]);
        } else {
          setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
          setCompareRightRedoStack([]);
        }
        updateComparePaneStrokes(pane, (prev) =>
          prev.map((s) =>
            currentSelectedIds.has(s.id) ? { ...s, size: newSize } : s,
          ),
        );
      } else {
        setUndoStack((prev) => [...prev, paintStrokes]);
        setRedoStack([]);
        setPaintStrokes((prev) =>
          prev.map((s) =>
            currentSelectedIds.has(s.id) ? { ...s, size: newSize } : s,
          ),
        );
      }
    }
  };

  const handleTextFontSizeChange = (newSize: number) => {
    const clampedSize = Math.max(8, Math.min(96, Math.round(newSize)));
    setTextFontSize(clampedSize);
    const currentSelectedIds = selectedStrokeIdsRef.current;
    if (paintTool !== "select" || currentSelectedIds.size === 0) return;

    if (isCompareMode) {
      const pane = compareActivePane;
      const paneStrokes = getComparePaneStrokes(pane);
      if (pane === "left") {
        setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
        setCompareLeftRedoStack([]);
      } else {
        setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
        setCompareRightRedoStack([]);
      }
      updateComparePaneStrokes(pane, (prevStrokes) =>
        prevStrokes.map((stroke) =>
          currentSelectedIds.has(stroke.id)
            ? { ...stroke, fontSize: clampedSize }
            : stroke,
        ),
      );
    } else {
      setUndoStack((prev) => [...prev, paintStrokes]);
      setRedoStack([]);
      setPaintStrokes((prevStrokes) =>
        prevStrokes.map((stroke) =>
          currentSelectedIds.has(stroke.id)
            ? { ...stroke, fontSize: clampedSize }
            : stroke,
        ),
      );
    }
  };

  const selectedTextStrokeSource = isCompareMode
    ? getComparePaneStrokes(compareActivePane)
    : paintStrokes;
  const selectedTextStroke =
    paintTool === "select" && selectedStrokeIds.size === 1
      ? selectedTextStrokeSource.find(
          (stroke) =>
            selectedStrokeIds.has(stroke.id) && stroke.tool === "text",
        ) || null
      : null;
  const activeTextFontSize =
    selectedTextStroke?.fontSize ||
    (selectedTextStroke
      ? Math.max(16, selectedTextStroke.size * 4)
      : textFontSize);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      )
        return;

      if (!isPaintMode) return;

      const key = e.key.toLowerCase();
      const hasModifier = e.metaKey || e.ctrlKey;
      if (hasModifier && !e.altKey) {
        if (key === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }
        if (key === "y") {
          e.preventDefault();
          handleRedo();
          return;
        }
      }

      if (paintTool !== "select" || selectedStrokeIds.size === 0) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelectedStroke();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPaintMode,
    paintTool,
    selectedStrokeIds,
    handleDeleteSelectedStroke,
    handleUndo,
    handleRedo,
  ]);

  const clearPaintStrokes = () => {
    if (isCompareMode) {
      const pane = compareActivePane;
      const paneStrokes = getComparePaneStrokes(pane);
      if (paneStrokes.length > 0) {
        if (pane === "left") {
          setCompareLeftUndoStack((prev) => [...prev, paneStrokes]);
          setCompareLeftRedoStack([]);
        } else {
          setCompareRightUndoStack((prev) => [...prev, paneStrokes]);
          setCompareRightRedoStack([]);
        }
      }
      if (pane === "left") {
        setCompareLeftPaintStrokes([]);
        setCompareLeftCurrentStroke(null);
      } else {
        setCompareRightPaintStrokes([]);
        setCompareRightCurrentStroke(null);
      }
      setSelectedStrokeIds(new Set());
      setActiveSelectedStrokeId(null);
      return;
    }
    if (paintStrokes.length > 0) {
      setUndoStack([...undoStack, paintStrokes]);
      setRedoStack([]);
    }
    setPaintStrokes([]);
    setCurrentStroke(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingComment || !canvasRef.current) return;

    const isPdfCanvasEnabled =
      !!file?.mimeType &&
      !selectedNormalReplyImageUrl &&
      file.mimeType === "application/pdf" &&
      !isAiFile;
    const supportsPaintCanvas =
      !!file?.mimeType &&
      ((file.mimeType.startsWith("image/") && !isAdobeFile && !isPsdFile) ||
        isAdobeFile ||
        isPdfCanvasEnabled);
    if (isPaintMode && supportsPaintCanvas) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setNewCommentPos({ x, y });
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    if (!newCommentPos) {
      toast({
        title: "ピン位置が未設定です",
        description: "画像上をクリックしてナンバーピンを配置してください。",
        variant: "destructive",
      });
      return;
    }
    const fallbackComparePane =
      compareReplyImageUrls.length > 0 && !leftCompareReplyImageUrl
        ? "right"
        : leftCompareReplyImageUrl && compareReplyImageUrls.length === 0
          ? "left"
          : compareActivePane;
    const paneForComment =
      isCompareMode && newCommentPos
        ? (newCommentPos.pane ?? comparePendingPinPane ?? fallbackComparePane)
        : null;

    let targetFileId = id;

    if (isCompareMode && paneForComment === "right") {
      if (compareFile?.id) {
        targetFileId = compareFile.id;
      } else if (compareFileId) {
        targetFileId = compareFileId;
      }
    }

    if (!targetFileId) return;
    const targetIsVideo =
      isCompareMode && paneForComment === "right"
        ? !!compareFile?.mimeType?.startsWith("video/")
        : !!file?.mimeType?.startsWith("video/");
    const commentData: {
      body: string;
      x?: number;
      y?: number;
      videoTimestamp?: number;
      compareKey?: string;
      fileId: string;
      createdAt?: string;
    } = {
      body: newCommentText.trim(),
      fileId: targetFileId,
      createdAt: new Date().toISOString(),
    };
    const compareKey =
      isCompareMode &&
      paneForComment === "right" &&
      compareReplyImageUrls.length > 0
        ? compareReplyImageUrls[compareReplyIndex] ||
          compareReplyImageUrls[0] ||
          currentRightValue ||
          undefined
        : isCompareMode &&
            paneForComment === "left" &&
            !!leftCompareReplyImageUrl
          ? leftCompareReplyImageUrl || currentLeftValue || undefined
          : undefined;
    const normalReplyCompareKey =
      !isCompareMode && selectedNormalReplyImageUrl
        ? selectedNormalThumbnailId || selectedNormalReplyImageUrl
        : undefined;
    if (compareKey) {
      commentData.compareKey = compareKey;
    } else if (normalReplyCompareKey) {
      commentData.compareKey = normalReplyCompareKey;
    } else if (isCompareMode && paneForComment === "right") {
      // If we're on the right pane but couldn't determine a compareKey,
      // we shouldn't submit as it would default to the main file (left pane).
      // This prevents the "right pin appearing on left" bug.
      console.error("Cannot determine compareKey for right pane comment");
      return;
    }
    if (newCommentPos) {
      commentData.x = newCommentPos.x;
      commentData.y = newCommentPos.y;
    }
    if (targetIsVideo) {
      const liveVideoTimestamp =
        isCompareMode && paneForComment === "right"
          ? (compareVideoRef.current?.currentTime ?? compareCurrentTime)
          : (videoRef.current?.currentTime ?? currentTime);
      commentData.videoTimestamp = liveVideoTimestamp;
    }
    addCommentMutation.mutate(commentData);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatInputDateTime = (date: Date) => {
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const updateCompareOverlayScale = useCallback(
    (el: HTMLImageElement | HTMLVideoElement) => {
      const naturalWidth =
        el instanceof HTMLImageElement ? el.naturalWidth : el.videoWidth;
      const naturalHeight =
        el instanceof HTMLImageElement ? el.naturalHeight : el.videoHeight;
      const renderedWidth = el.clientWidth;
      if (naturalWidth > 0 && naturalHeight > 0 && renderedWidth > 0) {
        setCompareOverlayScale(renderedWidth / naturalWidth);

        // Update compare canvas size and redraw
        const compareCanvas = compareCanvasRef.current;
        if (compareCanvas) {
          compareCanvas.width = naturalWidth;
          compareCanvas.height = naturalHeight;
          redrawComparePaneCanvas("left");
        }
      } else {
        setCompareOverlayScale(1);
      }
    },
    [redrawComparePaneCanvas],
  );

  const updateCompareRightOverlayScale = useCallback(
    (el: HTMLImageElement | HTMLVideoElement) => {
      const naturalWidth =
        el instanceof HTMLImageElement ? el.naturalWidth : el.videoWidth;
      const naturalHeight =
        el instanceof HTMLImageElement ? el.naturalHeight : el.videoHeight;
      if (naturalWidth > 0 && naturalHeight > 0) {
        const rightCanvas = compareRightCanvasRef.current;
        if (rightCanvas) {
          rightCanvas.width = naturalWidth;
          rightCanvas.height = naturalHeight;
          redrawComparePaneCanvas("right");
        }
      }
    },
    [redrawComparePaneCanvas],
  );

  // Trigger update when entering compare mode to ensure canvas size is correct
  useEffect(() => {
    if (isCompareMode && compareContainerRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (!compareContainerRef.current) return;
        const img = compareContainerRef.current.querySelector("img");
        const video = compareContainerRef.current.querySelector("video");
        if (img && (img as HTMLImageElement).complete) {
          updateCompareOverlayScale(img as HTMLImageElement);
        } else if (video && (video as HTMLVideoElement).readyState >= 1) {
          updateCompareOverlayScale(video as HTMLVideoElement);
        }
      }, 50);
    }
    if (isCompareMode && compareRightContainerRef.current) {
      setTimeout(() => {
        if (!compareRightContainerRef.current) return;
        const img = compareRightContainerRef.current.querySelector("img");
        const video = compareRightContainerRef.current.querySelector("video");
        if (img && (img as HTMLImageElement).complete) {
          updateCompareRightOverlayScale(img as HTMLImageElement);
        } else if (video && (video as HTMLVideoElement).readyState >= 1) {
          updateCompareRightOverlayScale(video as HTMLVideoElement);
        }
      }, 50);
    }
  }, [
    isCompareMode,
    updateCompareOverlayScale,
    updateCompareRightOverlayScale,
  ]);

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

  const scopedReplyImagePrefix = "reply-image:";
  const filteredComments = (file?.comments || []).filter((comment) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "unresolved") return comment.status !== "resolved";
    return comment.status === statusFilter;
  });
  const mainDisplayComments = filteredComments.filter(
    (comment) =>
      !comment.parentId || !comment.parentId.startsWith(scopedReplyImagePrefix),
  );
  const mainScopedComments = (file?.comments || []).filter(
    (comment) =>
      !comment.parentId || !comment.parentId.startsWith(scopedReplyImagePrefix),
  );
  const compareRightFilteredComments = (compareFile?.comments || []).filter(
    (comment) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "unresolved") return comment.status !== "resolved";
      return comment.status === statusFilter;
    },
  );
  const leftReplyCompareKeys = leftCompareReplyImageUrl
    ? [leftCompareReplyImageUrl, currentLeftValue].filter(
        (key): key is string => !!key,
      )
    : [];
  const rightCurrentReplyImageUrl =
    compareReplyImageUrls[compareReplyIndex] || compareReplyImageUrls[0] || "";
  const rightReplyCompareKeys =
    compareReplyImageUrls.length > 0
      ? [rightCurrentReplyImageUrl, currentRightValue].filter(
          (key): key is string => !!key,
        )
      : [];
  const normalReplyScopeKeys =
    selectedNormalReplyImageUrl && selectedNormalThumbnailId
      ? [selectedNormalReplyImageUrl, selectedNormalThumbnailId]
      : selectedNormalReplyImageUrl
        ? [selectedNormalReplyImageUrl]
        : [];
  const filterCommentsForComparePane = useCallback(
    (comments: CommentWithAnchor[], compareKeys: string[]) => {
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
      if (compareKeys.length > 0) {
        const scopeCandidates = new Set<string>();
        for (const key of compareKeys) {
          for (const candidate of buildScopeCandidates(key)) {
            scopeCandidates.add(candidate);
          }
        }
        return comments.filter((comment) =>
          comment.parentId
            ? Array.from(buildScopeCandidates(comment.parentId)).some(
                (candidate) => scopeCandidates.has(candidate),
              )
            : false,
        );
      }
      return comments.filter(
        (comment) =>
          !comment.parentId ||
          !comment.parentId.startsWith(scopedReplyImagePrefix),
      );
    },
    [scopedReplyImagePrefix],
  );
  const compareDisplayLeftComments = filterCommentsForComparePane(
    filteredComments,
    leftReplyCompareKeys,
  );
  const compareDisplayRightComments = filterCommentsForComparePane(
    compareFile ? compareRightFilteredComments : filteredComments,
    rightReplyCompareKeys,
  );
  const normalDisplayComments =
    normalReplyScopeKeys.length > 0
      ? filterCommentsForComparePane(filteredComments, normalReplyScopeKeys)
      : mainDisplayComments;
  const normalCountSourceComments =
    normalReplyScopeKeys.length > 0
      ? filterCommentsForComparePane(file?.comments || [], normalReplyScopeKeys)
      : mainScopedComments;

  const statusCounts = {
    all: normalCountSourceComments.length,
    resolved: normalCountSourceComments.filter((c) => c.status === "resolved")
      .length,
    unresolved: normalCountSourceComments.filter((c) => c.status !== "resolved")
      .length,
  };
  const isReplyImageCompareMode = compareReplyImageUrls.length > 0;
  const commentsWithImageReplies = useMemo(() => {
    return (file?.comments || []).filter(
      (comment) => getImageReplyUrls(comment).length > 0,
    );
  }, [file, getImageReplyUrls]);
  const currentCompareCommentIndex = commentsWithImageReplies.findIndex(
    (comment) => comment.id === compareSourceCommentId,
  );
  const canSwitchCompareComments = commentsWithImageReplies.length > 0;
  const isBothVideoCompare =
    isCompareMode &&
    !!file?.mimeType?.startsWith("video/") &&
    !leftCompareReplyImageUrl &&
    !isReplyImageCompareMode &&
    !!compareFile?.mimeType?.startsWith("video/");
  const canPaintOnCompareLeft =
    !!leftCompareReplyImageUrl ||
    !!file?.mimeType?.startsWith("image/") ||
    isAdobeFile;
  const canPaintOnCompareRight =
    isReplyImageCompareMode || !!compareFile?.mimeType?.startsWith("image/");
  const activeZoom =
    compareActivePane === "left" ? compareLeftZoom : compareRightZoom;

  const handleCompareCommentSwitch = useCallback(
    (direction: "prev" | "next") => {
      if (!commentsWithImageReplies.length) return;
      const currentIndex =
        currentCompareCommentIndex >= 0 ? currentCompareCommentIndex : 0;
      const nextIndex =
        direction === "prev"
          ? (currentIndex - 1 + commentsWithImageReplies.length) %
            commentsWithImageReplies.length
          : (currentIndex + 1) % commentsWithImageReplies.length;
      const nextComment = commentsWithImageReplies[nextIndex];
      const nextReplyImages = getImageReplyUrls(nextComment);
      if (!nextReplyImages.length) return;
      setSelectedCommentId(nextComment.id);
      setCompareReplyImageUrls(nextReplyImages);
      setCompareReplyIndex(0);
      setCompareSourceCommentId(nextComment.id);
      setCompareFileId(null);
    },
    [commentsWithImageReplies, currentCompareCommentIndex, getImageReplyUrls],
  );

  useEffect(() => {
    if (isLoading || !file || !!selectedNormalReplyImageUrl) return;
    const isPdfCanvasEnabled = file.mimeType === "application/pdf" && !isAiFile;
    if (!isPdfCanvasEnabled) return;
    syncPdfOverlaySize();
    const iframe = pdfFrameRef.current;
    if (!iframe) return;
    const observer = new ResizeObserver(() => {
      syncPdfOverlaySize();
    });
    observer.observe(iframe);
    return () => {
      observer.disconnect();
    };
  }, [
    isLoading,
    file,
    selectedNormalReplyImageUrl,
    isAiFile,
    syncPdfOverlaySize,
    zoom,
  ]);

  const isPptxFileType =
    !!file &&
    (file.mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.name.trim().toLowerCase().endsWith(".pptx"));
  const isReplyThumbnailActive =
    !!selectedNormalReplyImageUrl && !isPptxFileType;
  const isPptxSidebarTarget =
    !!file && !isReplyThumbnailActive && isPptxFileType;
  const pptxDataUrl = isPptxSidebarTarget && file ? file.url : null;
  const [pptxSlideIndex, setPptxSlideIndex] = useState(0);
  const [pptxSidebarThumbnails, setPptxSidebarThumbnails] = useState<string[]>(
    [],
  );

  useEffect(() => {
    if (isPptxSidebarTarget) return;
    setPptxSidebarThumbnails([]);
    setPptxSlideIndex(0);
  }, [isPptxSidebarTarget]);

  useEffect(() => {
    if (!isPptxFileType || !selectedNormalReplyImageUrl) return;
    setSelectedNormalReplyImageUrl(null);
    setSelectedNormalThumbnailId(null);
  }, [isPptxFileType, selectedNormalReplyImageUrl]);

  if (isLoading) {
    return (
      <div className="h-full flex">
        <div className="flex-1 p-4">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
        <div className="w-80 border-l">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold mb-2">ファイルが見つかりません</h2>
        <Button onClick={() => setLocation("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const activeMainMimeType = isReplyThumbnailActive
    ? selectedNormalThumbnail?.mimeType || "image/png"
    : file.mimeType;
  const isVideo = activeMainMimeType.startsWith("video/");
  const isImage = isReplyThumbnailActive
    ? activeMainMimeType.startsWith("image/")
    : activeMainMimeType.startsWith("image/") && !isAdobeFile && !isPsdFile;
  const isPdf =
    !isReplyThumbnailActive && file.mimeType === "application/pdf" && !isAiFile;
  const isPptx =
    !isReplyThumbnailActive &&
    (file.mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.name.trim().toLowerCase().endsWith(".pptx"));
  const activeNormalImageUrl = selectedNormalReplyImageUrl || file.url;
  const activeNormalImageAlt = selectedNormalThumbnail?.label || file.name;
  const shareSelectedCompareUrl = isCompareMode
    ? compareActivePane === "left"
      ? leftCompareReplyImageUrl || null
      : rightCurrentReplyImageUrl || null
    : selectedNormalReplyImageUrl || null;
  const shareSelectedCompareKey = isCompareMode
    ? compareActivePane === "left"
      ? leftCompareReplyImageUrl
        ? currentLeftValue || leftCompareReplyImageUrl
        : null
      : rightCurrentReplyImageUrl
        ? currentRightValue || rightCurrentReplyImageUrl
        : null
    : selectedNormalThumbnailId || selectedNormalReplyImageUrl || null;

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 border-b bg-card">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              file.project
                ? setLocation(`/projects/${file.projectId}`)
                : setLocation("/projects")
            }
            data-testid="button-back-from-review"
            aria-label="戻る"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                data-testid="button-toggle-left-sidebar"
              >
                {sidebarState === "expanded" ? (
                  <>
                    <PanelLeftClose className="h-4 w-4 mr-2" />
                    サイドバーを非表示
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="h-4 w-4 mr-2" />
                    サイドバーを表示
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>サイドバーの表示/非表示</TooltipContent>
          </Tooltip>

          <div className="border-l h-6 mx-2" />

          <div className="min-w-0 flex flex-wrap items-center gap-2">
            {isEditingFileName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingFileName}
                  onChange={(e) => setEditingFileName(e.target.value)}
                  onKeyDown={handleKeyDownFileName}
                  className="h-8 text-sm w-64"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveFileName();
                  }}
                  disabled={updateFileNameMutation.isPending}
                >
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEditFileName}
                >
                  キャンセル
                </Button>
              </div>
            ) : (
              <>
                <span
                  className="text-sm font-medium truncate"
                  data-testid="text-file-title"
                >
                  {file.name}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-accent"
                  onClick={handleEditFileName}
                >
                  編集
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex flex-wrap items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isCompareMode) {
                  if (compareActivePane === "left") {
                    setCompareLeftZoom(1);
                  } else {
                    setCompareRightZoom(1);
                  }
                  return;
                }
                setZoom(1);
              }}
              data-testid="button-fit-width"
              aria-label="画面幅に合わせる"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isCompareMode) {
                  if (compareActivePane === "left") {
                    setCompareLeftZoom(0.5);
                  } else {
                    setCompareRightZoom(0.5);
                  }
                  return;
                }
                setZoom(0.5);
              }}
              data-testid="button-fit-height"
              aria-label="画面高さに合わせる"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <span className="text-xs mx-1">-</span>
            <span className="text-sm w-12 text-center">
              {Math.round((isCompareMode ? activeZoom : zoom) * 100)}%
            </span>
            <span className="text-xs mx-1">+</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isCompareMode) {
                  if (compareActivePane === "left") {
                    setCompareLeftZoom((z) => Math.max(0.25, z - 0.25));
                  } else {
                    setCompareRightZoom((z) => Math.max(0.25, z - 0.25));
                  }
                  return;
                }
                setZoom((z) => Math.max(0.25, z - 0.25));
              }}
              data-testid="button-zoom-out"
              aria-label="縮小"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isCompareMode) {
                  if (compareActivePane === "left") {
                    setCompareLeftZoom((z) => Math.min(3, z + 0.25));
                  } else {
                    setCompareRightZoom((z) => Math.min(3, z + 0.25));
                  }
                  return;
                }
                setZoom((z) => Math.min(3, z + 0.25));
              }}
              data-testid="button-zoom-in"
              aria-label="拡大"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Share button */}
          <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" data-testid="button-share">
                <Share2 className="mr-2 h-4 w-4" />
                共有リンク発行
              </Button>
            </DialogTrigger>
            {showShareModal && (
              <ShareLinkModal
                fileId={id!}
                selectedCompareKey={shareSelectedCompareKey}
                selectedCompareUrl={shareSelectedCompareUrl}
                onClose={() => setShowShareModal(false)}
              />
            )}
          </Dialog>

          {/* Download button */}
          {file.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                // If it's an image or adobe file with drawn paints, try to merge them before download
                if (
                  (isImage || isAdobeFile) &&
                  paintCanvasRef.current &&
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

                    // Draw paint strokes if visible
                    if (showAllPaints) {
                      ctx.drawImage(paintCanvasRef.current, 0, 0);
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
              data-testid="button-download"
            >
              <Download className="mr-2 h-4 w-4" />
              ダウンロード
            </Button>
          )}

          {/* All paints toggle */}
          <Button
            variant={showAllPaints ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowAllPaints(!showAllPaints)}
            data-testid="button-toggle-paints"
          >
            <Paintbrush className="mr-2 h-4 w-4" />
            全ペイント表示
          </Button>

          {/* Compare mode toggle */}
          <Button
            variant={isCompareMode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              if (isCompareMode) {
                setIsCompareMode(false);
                setCompareFileId(null);
                setCompareReplyImageUrls([]);
                setCompareReplyIndex(0);
                setCompareSourceCommentId(null);
                return;
              }

              const comments = file.comments || [];
              const selectedComment = comments.find(
                (comment) => comment.id === selectedCommentId,
              );
              const selectedReplyImages = getImageReplyUrls(selectedComment);
              const leftCompareInitialReplyUrl = selectedNormalReplyImageUrl;

              if (selectedComment && selectedReplyImages.length > 0) {
                setLeftCompareReplyImageUrl(leftCompareInitialReplyUrl || null);
                setCompareReplyImageUrls(selectedReplyImages);
                setCompareReplyIndex(0);
                setCompareSourceCommentId(selectedComment.id);
                setCompareFileId(null);
                setIsCompareMode(true);
                return;
              }

              if (selectedComment && selectedReplyImages.length === 0) {
                toast({
                  title: "比較画像がありません",
                  description:
                    "選択中コメントの返信に画像がないため、通常の見比べモードを開きます。",
                });
              }

              if (!selectedComment) {
                const firstCommentWithImageReply = comments.find(
                  (comment) => getImageReplyUrls(comment).length > 0,
                );

                if (firstCommentWithImageReply) {
                  const fallbackReplyImages = getImageReplyUrls(
                    firstCommentWithImageReply,
                  );
                  setSelectedCommentId(firstCommentWithImageReply.id);
                  setLeftCompareReplyImageUrl(
                    leftCompareInitialReplyUrl || null,
                  );
                  setCompareReplyImageUrls(fallbackReplyImages);
                  setCompareReplyIndex(0);
                  setCompareSourceCommentId(firstCommentWithImageReply.id);
                  setCompareFileId(null);
                  setIsCompareMode(true);
                  toast({
                    title: "コメントを自動選択しました",
                    description:
                      "画像返信がある最新コメントを選択して見比べを表示しています。",
                  });
                  return;
                }

                toast({
                  title: "コメントを選択してください",
                  description:
                    "画像返信付きのコメントを選択すると、右上の見比べから直接比較できます。",
                });
              }

              setCompareReplyImageUrls([]);
              setCompareReplyIndex(0);
              setCompareSourceCommentId(null);
              setCompareFileId(null);
              setLeftCompareReplyImageUrl(leftCompareInitialReplyUrl || null);
              setIsCompareMode(true);
            }}
            data-testid="button-toggle-compare"
          >
            <GitCompare className="mr-2 h-4 w-4" />
            見比べ
          </Button>

          {/* Home button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-home"
            aria-label="ホーム"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Compare mode header bar */}
      {isCompareMode && (
        <div className="flex items-center gap-4 px-4 py-2 border-b bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              同期
            </span>
            <Switch
              checked={isSyncEnabled}
              onCheckedChange={setIsSyncEnabled}
              data-testid="switch-sync"
            />
            <span className="text-xs text-muted-foreground">
              {isSyncEnabled ? "ON" : "OFF"}
            </span>
          </div>

          <div className="border-l h-6" />

          <div className="flex items-center gap-2">
            <span className="text-sm">画像の選択</span>
            <Button
              variant={compareActivePane === "left" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7",
                compareActivePane === "left" && "bg-blue-500 hover:bg-blue-600",
              )}
              onClick={() => setCompareActivePane("left")}
              data-testid="button-compare-image-left"
            >
              左の画像
            </Button>
            <Button
              variant={compareActivePane === "right" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7",
                compareActivePane === "right" &&
                  "bg-blue-500 hover:bg-blue-600",
              )}
              onClick={() => setCompareActivePane("right")}
              data-testid="button-compare-image-right"
            >
              右の画像
            </Button>
          </div>

          <div className="border-l h-6" />

          <div className="flex items-center gap-2">
            <span className="text-sm">コメントの切り替え</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleCompareCommentSwitch("prev")}
              disabled={!canSwitchCompareComments}
              data-testid="button-compare-comment-prev"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Badge variant="outline" className="min-w-[64px] justify-center">
              {canSwitchCompareComments
                ? `${currentCompareCommentIndex >= 0 ? currentCompareCommentIndex + 1 : 1}/${commentsWithImageReplies.length}`
                : "0/0"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleCompareCommentSwitch("next")}
              disabled={!canSwitchCompareComments}
              data-testid="button-compare-comment-next"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={compareSyncMaster === "left" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7",
                compareSyncMaster === "left" && "bg-blue-500 hover:bg-blue-600",
              )}
              onClick={() => setCompareSyncMaster("left")}
              disabled={!isBothVideoCompare}
              data-testid="button-compare-master-left"
            >
              左の動画
            </Button>
            <Button
              variant={compareSyncMaster === "right" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7",
                compareSyncMaster === "right" &&
                  "bg-blue-500 hover:bg-blue-600",
              )}
              onClick={() => setCompareSyncMaster("right")}
              disabled={!isBothVideoCompare}
              data-testid="button-compare-master-right"
            >
              右の動画
            </Button>
          </div>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCompareMode(false)}
            data-testid="button-close-compare"
          >
            <X className="h-4 w-4 mr-1" />
            比較モード終了
          </Button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Thumbnail (always visible) */}
        <div className="w-32 border-r bg-card flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto">
          {isPptx && !isReplyThumbnailActive ? (
            <>
              <div className="text-xs text-muted-foreground mb-1">
                {pptxSidebarThumbnails.length} 件
              </div>
              {pptxSidebarThumbnails.map((thumb, index) => (
                <button
                  key={`pptx-thumb-${index}`}
                  type="button"
                  className={cn(
                    "w-28 h-20 overflow-hidden rounded-md border-2 cursor-pointer relative bg-white",
                    pptxSlideIndex === index
                      ? "border-primary"
                      : "border-border",
                  )}
                  onClick={() => setPptxSlideIndex(index)}
                  data-testid={`thumbnail-page-${index + 1}`}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={`slide-${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      {index + 1}
                    </div>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-1">
                {normalThumbnailOptions.length} 件
              </div>
              {normalThumbnailOptions.map((option, index) => {
                const optionIsVideo =
                  option.type === "file" &&
                  option.mimeType?.startsWith("video/");
                const optionIsPdf =
                  option.type === "file" &&
                  option.mimeType === "application/pdf" &&
                  !option.label.toLowerCase().endsWith(".ai");
                const optionIsImage = option.mimeType?.startsWith("image/");
                const optionThumbUrl =
                  option.type === "reply"
                    ? option.url
                    : option.id === id && isAdobeFile
                      ? resolvedPreviewUrl || option.url
                      : option.url;
                const isSelected = selectedNormalThumbnailId
                  ? selectedNormalThumbnailId === option.id
                  : option.id === id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      "w-28 h-20 overflow-hidden rounded-md border-2 cursor-pointer relative",
                      isSelected ? "border-primary" : "border-border",
                    )}
                    onClick={() => handleNormalThumbnailSelect(option.id)}
                    data-testid={`thumbnail-page-${index + 1}`}
                  >
                    {optionThumbUrl && optionIsImage && (
                      <img
                        src={optionThumbUrl}
                        alt={option.label}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {optionIsVideo && (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {optionIsPdf && (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {!optionIsImage && !optionIsVideo && !optionIsPdf && (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <FileImage className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/55 text-[10px] text-white px-1 py-0.5 truncate">
                      {option.label}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Layer Panel - Only for PSD/AI files */}
        {isAdobeFile && !isReplyThumbnailActive && (
          <div className="w-64 border-r bg-card flex flex-col shrink-0 overflow-hidden">
            <div
              className="flex items-center justify-between px-3 py-2 border-b cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              data-testid="button-toggle-layer-panel"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">レイヤー</span>
              </div>
              {showLayerPanel ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {showLayerPanel && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {isLayersLoading || isLoadingLayerImages ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">
                      読み込み中...
                    </span>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {layersData?.layers && layersData.layers.length > 0 ? (
                        <>
                          <div className="flex items-center gap-1 px-2 py-1 mb-2 border-b pb-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const allGroupIds = new Set<number>();
                                const collectGroups = (layers: LayerInfo[]) => {
                                  for (const l of layers) {
                                    if (
                                      (l.type === "group" ||
                                        l.type === "folder") &&
                                      l.children?.length
                                    ) {
                                      allGroupIds.add(l.id);
                                      collectGroups(l.children);
                                    }
                                  }
                                };
                                collectGroups(layersData.layers);
                                setExpandedGroups((prev) =>
                                  prev.size === allGroupIds.size
                                    ? new Set()
                                    : allGroupIds,
                                );
                              }}
                              className="p-1 hover:bg-muted rounded text-muted-foreground"
                              title={
                                expandedGroups.size > 0
                                  ? "全て折りたたむ"
                                  : "全て展開"
                              }
                            >
                              {expandedGroups.size > 0 ? (
                                <FolderOpen className="h-3.5 w-3.5" />
                              ) : (
                                <Folder className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCustomLayerComposition(true);
                                const allIds: number[] = [];
                                const collectIds = (layers: LayerInfo[]) => {
                                  for (const l of layers) {
                                    allIds.push(l.id);
                                    if (l.children) collectIds(l.children);
                                  }
                                };
                                collectIds(layersData.layers);
                                const allVisible = allIds.every(
                                  (id) => layerVisibility.get(id) !== false,
                                );
                                const newMap = new Map(layerVisibility);
                                allIds.forEach((id) =>
                                  newMap.set(id, !allVisible),
                                );
                                setLayerVisibility(newMap);
                              }}
                              className="p-1 hover:bg-muted rounded text-muted-foreground"
                              title="全レイヤー表示/非表示"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Recursive layer tree rendering */}
                          {(() => {
                            const renderLayerItem = (
                              layer: LayerInfo,
                              depth: number = 0,
                            ) => {
                              const isGroup =
                                (layer.type === "group" ||
                                  layer.type === "folder") &&
                                !!layer.children;
                              const isExpanded = expandedGroups.has(layer.id);
                              const isVisible = layerVisibility.has(layer.id)
                                ? layerVisibility.get(layer.id)
                                : layer.visible;
                              const isLocked = layerLocks.has(layer.id)
                                ? layerLocks.get(layer.id)
                                : layer.locked;

                              return (
                                <div key={layer.id} className="select-none">
                                  <div
                                    className={cn(
                                      "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 text-sm group transition-colors cursor-pointer",
                                      !isVisible && "opacity-50",
                                    )}
                                    style={{
                                      paddingLeft: `${depth * 12 + 8}px`,
                                    }}
                                    onClick={() => {
                                      if (isGroup)
                                        toggleGroupExpansion(layer.id);
                                    }}
                                  >
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          "h-5 w-5 hover:bg-transparent",
                                          !isVisible && "text-muted-foreground",
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleLayerVisibility(
                                            layer.id,
                                            layer.visible,
                                          );
                                        }}
                                      >
                                        {isVisible ? (
                                          <Eye className="h-3.5 w-3.5" />
                                        ) : (
                                          <EyeOff className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                      {isGroup && (
                                        <div className="w-5 h-5 flex items-center justify-center">
                                          {isExpanded ? (
                                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Layer Thumbnail */}
                                    <div className="w-8 h-8 rounded border bg-white flex items-center justify-center overflow-hidden shrink-0">
                                      {layerImages[layer.id] ? (
                                        <img
                                          src={
                                            (
                                              layerImages[layer.id] as
                                                | HTMLImageElement
                                                | undefined
                                            )?.src
                                          }
                                          alt=""
                                          className="w-full h-full object-contain"
                                        />
                                      ) : isGroup ? (
                                        <Folder className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <FileImage className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </div>

                                    <span
                                      className="truncate flex-1 text-xs"
                                      title={layer.name}
                                    >
                                      {layer.name}
                                    </span>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleLayerLock(layer.id);
                                        }}
                                      >
                                        {isLocked ? (
                                          <Lock className="h-3 w-3" />
                                        ) : (
                                          <Unlock className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>

                                  {isGroup && isExpanded && layer.children && (
                                    <div>
                                      {/* Render children in reverse order for visual stacking (top to bottom in list) */}
                                      {[...layer.children]
                                        .reverse()
                                        .map((child) =>
                                          renderLayerItem(child, depth + 1),
                                        )}
                                    </div>
                                  )}
                                </div>
                              );
                            };

                            // Root layers are also reversed for UI list (top layer first)
                            return [...layersData.layers]
                              .reverse()
                              .map((layer) => renderLayerItem(layer));
                          })()}
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-muted-foreground">
                            レイヤーがありません
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Compare Mode View */}
          {isCompareMode ? (
            renderCompareMode()
          ) : (
            /* Normal Single File View */
            <div
              ref={normalScrollRef}
              className={cn(
                "flex-1 overflow-auto p-4 flex items-start",
                zoom > 1 ? "justify-start" : "justify-center",
                isSpacePressed &&
                  zoom > 1 &&
                  (isSpacePanning
                    ? "cursor-grabbing select-none"
                    : "cursor-grab"),
              )}
              onMouseDownCapture={handleSpacePanStart}
            >
              <div
                ref={canvasRef}
                className={cn(
                  "relative bg-card rounded-lg shadow-lg overflow-hidden w-fit h-fit",
                  isAddingComment && !isPaintMode && "cursor-crosshair",
                  isPaintMode && "cursor-crosshair",
                )}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center top",
                }}
                onClick={handleCanvasClick}
              >
                {isImage && activeNormalImageUrl && (
                  <img
                    src={activeNormalImageUrl}
                    alt={activeNormalImageAlt}
                    className="max-w-full"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (paintCanvasRef.current) {
                        paintCanvasRef.current.width = img.naturalWidth;
                        paintCanvasRef.current.height = img.naturalHeight;
                        redrawCanvas();
                      }
                    }}
                  />
                )}
                {isPdf && file.url && (
                  <iframe
                    ref={pdfFrameRef}
                    src={file.url}
                    className="w-[min(96vw,1400px)] h-[min(85vh,1200px)] min-h-[800px] bg-white"
                    title={file.name}
                    onLoad={() => syncPdfOverlaySize()}
                  />
                )}
                {isPptx && pptxDataUrl && (
                  <div className="w-[min(96vw,1400px)]">
                    <PptxPreview
                      src={pptxDataUrl}
                      title={file.name}
                      fallbackImageUrl={resolvedPreviewUrl}
                      slideIndex={pptxSlideIndex}
                      onSlideIndexChange={setPptxSlideIndex}
                      onThumbnailsChange={setPptxSidebarThumbnails}
                      showInternalThumbnails={false}
                    />
                  </div>
                )}
                {isVideo && file.url && (
                  <video
                    ref={videoRef}
                    src={file.url}
                    className="max-w-full"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    data-testid="video-player"
                  />
                )}
                {/* Adobe file preview (PSD/AI with generated preview or layer composite) */}
                {isAdobeFile && !isReplyThumbnailActive && (
                  <>
                    {/* Layer canvas or Preview Image */}
                    {isAdobeFile &&
                    !isReplyThumbnailActive &&
                    layerImagesLoaded &&
                    Object.keys(layerImages).length > 0 &&
                    isCustomLayerComposition ? (
                      <canvas
                        ref={layerCanvasRef}
                        className="max-w-full"
                        style={{ display: "block" }}
                        data-testid="psd-layer-canvas"
                      />
                    ) : resolvedPreviewUrl ? (
                      /* Static preview image - initial view or fallback */
                      <img
                        src={resolvedPreviewUrl}
                        alt={file.name}
                        className="max-w-full"
                        draggable={false}
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (paintCanvasRef.current) {
                            paintCanvasRef.current.width = img.naturalWidth;
                            paintCanvasRef.current.height = img.naturalHeight;
                            redrawCanvas();
                          }
                        }}
                      />
                    ) : isAdobeFile &&
                      layerImagesLoaded &&
                      Object.keys(layerImages).length > 0 ? (
                      /* Fallback to Canvas if no preview URL available but layers are loaded */
                      <canvas
                        ref={layerCanvasRef}
                        className="max-w-full"
                        style={{ display: "block" }}
                        data-testid="psd-layer-canvas"
                      />
                    ) : null}

                    {/* Loading indicator for layer images */}
                    {isAdobeFile &&
                      !isReplyThumbnailActive &&
                      isLoadingLayerImages && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">
                              レイヤー画像を読み込み中...
                            </span>
                          </div>
                        </div>
                      )}
                  </>
                )}
                {/* Preview generation loading state for Adobe files */}
                {isAdobeFile &&
                  !isReplyThumbnailActive &&
                  !resolvedPreviewUrl &&
                  isGeneratingPreview && (
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="font-medium text-lg mb-2">
                        プレビューを生成中...
                      </p>
                      <p className="text-muted-foreground max-w-md">
                        PSDファイルのプレビュー画像を生成しています。しばらくお待ちください。
                      </p>
                    </div>
                  )}
                {/* Fallback placeholder for unsupported files */}
                {!isImage &&
                  !isPdf &&
                  !isPptx &&
                  !isVideo &&
                  !(
                    isAdobeFile &&
                    (resolvedPreviewUrl || isGeneratingPreview)
                  ) && (
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                      <div className="rounded-full bg-muted p-6 mb-4">
                        <FileImage className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-lg mb-2">
                        {isPsdFile
                          ? "Photoshop ファイル (.psd)"
                          : isAiFile
                            ? "Illustrator ファイル (.ai)"
                            : file.name.split(".").pop()?.toUpperCase() ||
                              "ファイル"}
                      </p>
                      <p className="text-muted-foreground max-w-md">
                        このファイル形式はブラウザでプレビューできませんが、コメントピンを追加してフィードバックを残すことができます。
                      </p>
                    </div>
                  )}

                {/* Paint canvas overlay */}
                {(isImage || isAdobeFile || isPdf) && (
                  <canvas
                    ref={paintCanvasRef}
                    className={cn(
                      "absolute inset-0 w-full h-full z-[5]",
                      isPaintMode
                        ? "pointer-events-auto"
                        : "pointer-events-none",
                    )}
                    onMouseDown={handlePaintStart}
                    onMouseMove={handlePaintMove}
                    onMouseUp={handlePaintEnd}
                    onMouseLeave={handlePaintEnd}
                    onDoubleClick={(e) => {
                      if (!isPaintMode || paintTool !== "select") return;
                      const canvas = paintCanvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const x = (e.clientX - rect.left) / rect.width;
                      const y = (e.clientY - rect.top) / rect.height;
                      const hitStroke = findStrokeAtPosition(x, y);
                      if (hitStroke && hitStroke.tool === "text") {
                        startEditingText(hitStroke);
                      }
                    }}
                    data-testid="paint-canvas"
                  />
                )}

                {/* Text input overlay */}
                {isAddingText && textInputPos && (
                  <div
                    className="absolute z-30"
                    style={{
                      left: `${textInputPos.x * 100}%`,
                      top: `${textInputPos.y * 100}%`,
                    }}
                  >
                    <div className="flex flex-col gap-1 bg-card rounded shadow-lg p-2 border min-w-[200px]">
                      <textarea
                        ref={textInputRef}
                        value={textInputValue}
                        onChange={(e) => setTextInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            handleTextCancel();
                          } else if (
                            e.key === "Enter" &&
                            (e.ctrlKey || e.metaKey)
                          ) {
                            e.preventDefault();
                            handleTextSubmit();
                          }
                        }}
                        placeholder={"テキストを入力...\nCtrl+Enter で確定"}
                        className="px-2 py-1 bg-transparent border rounded outline-none min-w-[180px] min-h-[60px] resize-none"
                        style={{
                          fontFamily: '"Noto Sans JP", sans-serif',
                          color: paintColor,
                          fontSize: `${textFontSize}px`,
                        }}
                        rows={3}
                        data-testid="input-text-overlay"
                      />
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs text-muted-foreground">
                          Ctrl+Enter で確定
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleTextSubmit}
                            aria-label="テキスト追加"
                            data-testid="button-text-submit"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleTextCancel}
                            aria-label="キャンセル"
                            data-testid="button-text-cancel"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comment pins */}
                {normalDisplayComments.map((comment, index) => (
                  <CommentPin
                    key={comment.id}
                    comment={comment}
                    index={index}
                    isSelected={selectedCommentId === comment.id}
                    onClick={() => setSelectedCommentId(comment.id)}
                    isDraggable={isPaintMode && paintTool === "select"}
                    isDragging={draggingPinId === comment.id}
                    dragOffset={
                      draggingPinId === comment.id ? pinDragOffset : undefined
                    }
                    onDragStart={handlePinDragStart}
                  />
                ))}

                {newCommentPos && (
                  <div
                    className="absolute z-20 aspect-square rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold animate-pulse"
                    style={{
                      left: `${newCommentPos.x * 100}%`,
                      top: `${newCommentPos.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                      width: "1.75rem",
                    }}
                  >
                    +
                  </div>
                )}
              </div>

              {/* Video controls */}
              {isVideo && (
                <div
                  className="bg-card border rounded-lg p-3 mt-4 mx-auto max-w-3xl"
                  data-testid="video-controls"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skipTime(-10)}
                      aria-label="10秒戻る"
                      data-testid="button-skip-back"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "一時停止" : "再生"}
                      data-testid="button-play-pause"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skipTime(10)}
                      aria-label="10秒進む"
                      data-testid="button-skip-forward"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground w-10">
                        {formatTime(currentTime)}
                      </span>
                      <div className="flex-1 relative">
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          data-testid="slider-timeline"
                        />
                        <div className="absolute top-full left-0 right-0 mt-1 h-3 relative">
                          {normalDisplayComments
                            .filter(
                              (c) =>
                                c.anchor?.videoTimestamp !== undefined &&
                                c.anchor?.videoTimestamp !== null,
                            )
                            .map((comment, idx) => (
                              <div
                                key={comment.id}
                                className="absolute w-2 h-2 rounded-full bg-amber-500 -translate-x-1/2 cursor-pointer"
                                style={{
                                  left: `${((comment.anchor?.videoTimestamp || 0) / (duration || 1)) * 100}%`,
                                }}
                                onClick={() => {
                                  if (
                                    videoRef.current &&
                                    comment.anchor?.videoTimestamp !==
                                      undefined &&
                                    comment.anchor.videoTimestamp !== null
                                  ) {
                                    videoRef.current.currentTime =
                                      comment.anchor.videoTimestamp;
                                  }
                                  setSelectedCommentId(comment.id);
                                }}
                                title={`コメント ${idx + 1}: ${formatTime(comment.anchor?.videoTimestamp || 0)}`}
                              />
                            ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10">
                        {formatTime(duration)}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      aria-label={isMuted ? "ミュート解除" : "ミュート"}
                      data-testid="button-mute"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Comment Input Bar */}
          <div className="border-t bg-card p-3">
            {isPaintMode ? (
              // Paint Mode Layout: Two rows
              <div className="flex flex-col gap-3">
                {/* Row 1: Tools & Controls */}
                <div className="flex items-center justify-between overflow-x-auto pb-1">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsPaintMode(false);
                        setIsAddingComment(false);
                        if (!newCommentPos) {
                          setComparePendingPinPane(null);
                        }
                      }}
                      className="shrink-0"
                      data-testid="button-paint-mode-active"
                    >
                      <Paintbrush className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">
                        ペイントモード終了
                      </span>
                      <span className="sm:hidden">終了</span>
                    </Button>

                    <div className="border-l h-6 mx-2" />

                    {/* Tool Selection Group */}
                    <div className="flex items-center bg-muted/50 rounded-lg p-1 gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={
                              paintTool === "select" ? "secondary" : "ghost"
                            }
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setPaintTool("select");
                              setSelectedStrokeIds(new Set());
                              setActiveSelectedStrokeId(null);
                            }}
                            data-testid="button-select"
                          >
                            <MousePointer2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>選択/移動</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={
                              paintTool === "number" ? "secondary" : "ghost"
                            }
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPaintTool("number")}
                            data-testid="button-number"
                          >
                            <Hash className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          ナンバーピン（コメント追加）
                        </TooltipContent>
                      </Tooltip>

                      <div className="w-px h-4 bg-border mx-1" />

                      {/* Draw Tools (Brush, Highlighter, Eraser) */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={
                              ["brush", "highlighter", "eraser"].includes(
                                paintTool,
                              )
                                ? "secondary"
                                : "ghost"
                            }
                            size="icon"
                            className="h-8 w-8"
                            data-testid="button-draw-tools"
                          >
                            {paintTool === "highlighter" && (
                              <Highlighter className="h-4 w-4" />
                            )}
                            {paintTool === "eraser" && (
                              <Eraser className="h-4 w-4" />
                            )}
                            {(!["highlighter", "eraser"].includes(paintTool) ||
                              paintTool === "brush") && (
                              <Pencil className="h-4 w-4" />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1" align="start">
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={
                                    paintTool === "brush"
                                      ? "secondary"
                                      : "ghost"
                                  }
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPaintTool("brush")}
                                  data-testid="button-brush"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>ブラシ</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={
                                    paintTool === "highlighter"
                                      ? "secondary"
                                      : "ghost"
                                  }
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPaintTool("highlighter")}
                                  data-testid="button-highlighter"
                                >
                                  <Highlighter className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>ハイライター</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={
                                    paintTool === "eraser"
                                      ? "secondary"
                                      : "ghost"
                                  }
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPaintTool("eraser")}
                                  data-testid="button-eraser"
                                >
                                  <Eraser className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>消しゴム</TooltipContent>
                            </Tooltip>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div className="w-px h-4 bg-border mx-1" />

                      {/* Shape Tools */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={
                              ["line", "arrow", "rectangle", "circle"].includes(
                                paintTool,
                              )
                                ? "secondary"
                                : "ghost"
                            }
                            size="icon"
                            className="h-8 w-8"
                            data-testid="button-shapes"
                          >
                            {paintTool === "line" && (
                              <Minus className="h-4 w-4 -rotate-45" />
                            )}
                            {paintTool === "arrow" && (
                              <MoveRight className="h-4 w-4 -rotate-45" />
                            )}
                            {paintTool === "rectangle" && (
                              <Square className="h-4 w-4" />
                            )}
                            {paintTool === "circle" && (
                              <Circle className="h-4 w-4" />
                            )}
                            {!["line", "arrow", "rectangle", "circle"].includes(
                              paintTool,
                            ) && <Square className="h-4 w-4" />}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1" align="start">
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={
                                    paintTool === "line" ? "secondary" : "ghost"
                                  }
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPaintTool("line")}
                                >
                                  <Minus className="h-4 w-4 -rotate-45" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>直線</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={
                                    paintTool === "arrow"
                                      ? "secondary"
                                      : "ghost"
                                  }
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPaintTool("arrow")}
                                >
                                  <MoveRight className="h-4 w-4 -rotate-45" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>矢印</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={
                                    paintTool === "rectangle"
                                      ? "secondary"
                                      : "ghost"
                                  }
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPaintTool("rectangle")}
                                >
                                  <Square className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>四角形</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={
                                    paintTool === "circle"
                                      ? "secondary"
                                      : "ghost"
                                  }
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPaintTool("circle")}
                                >
                                  <Circle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>円</TooltipContent>
                            </Tooltip>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={
                              paintTool === "text" ? "secondary" : "ghost"
                            }
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPaintTool("text")}
                            data-testid="button-text"
                          >
                            <Type className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>テキスト</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={
                              paintTool === "image" ? "secondary" : "ghost"
                            }
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => overlayInputRef.current?.click()}
                            data-testid="button-image"
                          >
                            <ImagePlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>画像追加</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="border-l h-6 mx-2" />

                    {/* Style Controls */}
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-8 w-8 p-0 border-2"
                            style={{ borderColor: paintColor }}
                            data-testid="button-color-picker"
                          >
                            <div
                              className="w-full h-full rounded-sm"
                              style={{ backgroundColor: paintColor }}
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3">
                          <div className="space-y-3">
                            <div className="text-sm font-medium">
                              カラー選択
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                "#ef4444",
                                "#f97316",
                                "#eab308",
                                "#22c55e",
                                "#3b82f6",
                                "#8b5cf6",
                                "#ec4899",
                                "#000000",
                                "#ffffff",
                              ].map((color) => (
                                <button
                                  key={color}
                                  className={cn(
                                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                    paintColor === color
                                      ? "border-foreground scale-110 ring-2 ring-offset-2 ring-primary"
                                      : "border-transparent",
                                  )}
                                  style={{
                                    backgroundColor: color,
                                    border:
                                      color === "#ffffff"
                                        ? "1px solid #e2e8f0"
                                        : undefined,
                                  }}
                                  onClick={() => handleColorChange(color)}
                                />
                              ))}
                            </div>
                            <div className="pt-2 border-t">
                              <input
                                type="color"
                                value={paintColor}
                                onChange={(e) =>
                                  handleColorChange(e.target.value)
                                }
                                className="w-full h-8 cursor-pointer rounded-md"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Opacity control */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 px-2"
                            data-testid="button-opacity"
                          >
                            <div className="flex flex-col items-center justify-center w-4">
                              <span className="text-[8px] leading-none opacity-50">
                                ○
                              </span>
                              <span className="text-[8px] leading-none">●</span>
                            </div>
                            <span className="text-xs w-8 text-right">
                              {Math.round((paintOpacity || 1) * 100)}%
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-3" side="top">
                          <div className="space-y-3">
                            <div className="text-sm font-medium">透明度</div>
                            <div className="flex items-center gap-3">
                              <Slider
                                value={[
                                  Math.max(
                                    10,
                                    Math.min(100, (paintOpacity || 1) * 100),
                                  ),
                                ]}
                                onValueChange={([value]) => {
                                  if (typeof value !== "number") return;
                                  const newOpacity = value / 100;
                                  setPaintOpacity(newOpacity);
                                  if (selectedStrokeIds.size > 0) {
                                    setUndoStack([...undoStack, paintStrokes]);
                                    setRedoStack([]);
                                    setPaintStrokes((prevStrokes) =>
                                      prevStrokes.map((s) =>
                                        selectedStrokeIds.has(s.id)
                                          ? { ...s, opacity: newOpacity }
                                          : s,
                                      ),
                                    );
                                  }
                                }}
                                min={10}
                                max={100}
                                step={1}
                                className="flex-1"
                                data-testid="slider-opacity"
                              />
                              <span className="text-sm w-10 text-right">
                                {Math.round((paintOpacity || 1) * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between gap-1">
                              {[25, 50, 75, 100].map((opacity) => (
                                <button
                                  key={opacity}
                                  className={cn(
                                    "flex-1 py-1.5 rounded text-xs border transition-colors",
                                    Math.round((paintOpacity || 1) * 100) ===
                                      opacity
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted hover:bg-accent border-transparent",
                                  )}
                                  onClick={() => {
                                    const newOpacity = opacity / 100;
                                    setPaintOpacity(newOpacity);
                                    if (selectedStrokeIds.size > 0) {
                                      setUndoStack([
                                        ...undoStack,
                                        paintStrokes,
                                      ]);
                                      setRedoStack([]);
                                      setPaintStrokes((prevStrokes) =>
                                        prevStrokes.map((s) =>
                                          selectedStrokeIds.has(s.id)
                                            ? { ...s, opacity: newOpacity }
                                            : s,
                                        ),
                                      );
                                    }
                                  }}
                                >
                                  {opacity}%
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      {(paintTool === "text" ||
                        !!selectedTextStroke ||
                        isAddingText) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-2 px-2"
                              data-testid="button-text-size"
                            >
                              <span className="text-xs font-medium">Aa</span>
                              <span className="text-xs w-7 text-right">
                                {activeTextFontSize}px
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3" side="top">
                            <div className="space-y-3">
                              <div className="text-sm font-medium">
                                文字サイズ
                              </div>
                              <div className="flex items-center gap-3">
                                <Slider
                                  value={[activeTextFontSize]}
                                  onValueChange={([value]) => {
                                    if (typeof value !== "number") return;
                                    handleTextFontSizeChange(value);
                                  }}
                                  min={8}
                                  max={96}
                                  step={1}
                                  className="flex-1"
                                  data-testid="slider-text-size"
                                />
                                <span className="text-sm w-10 text-right">
                                  {activeTextFontSize}px
                                </span>
                              </div>
                              <div className="flex justify-between gap-1">
                                {[12, 16, 24, 32, 48].map((size) => (
                                  <button
                                    key={size}
                                    className={cn(
                                      "flex-1 py-1.5 rounded text-xs border transition-colors",
                                      activeTextFontSize === size
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted hover:bg-accent border-transparent",
                                    )}
                                    onClick={() =>
                                      handleTextFontSizeChange(size)
                                    }
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 px-2"
                          >
                            <div
                              className="rounded-full bg-foreground"
                              style={{
                                width: Math.min(16, Math.max(4, paintSize)),
                                height: Math.min(16, Math.max(4, paintSize)),
                              }}
                            />
                            <span className="text-xs w-6 text-right">
                              {paintSize}px
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-3">
                          <div className="space-y-3">
                            <div className="text-sm font-medium">
                              サイズ調整
                            </div>
                            <Slider
                              value={[paintSize]}
                              onValueChange={([value]) =>
                                handleSizeChange(value)
                              }
                              min={1}
                              max={40}
                              step={1}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Layer Arrangement */}
                    {selectedStrokeIds.size > 0 && (
                      <>
                        <div className="border-l h-6 mx-2" />
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleBringToFront}
                              >
                                <ArrowUpFromLine className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>最前面へ移動</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleBringForward}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>前面へ移動</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleSendBackward}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>背面へ移動</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleSendToBack}
                              >
                                <ArrowDownToLine className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>最背面へ移動</TooltipContent>
                          </Tooltip>
                        </div>
                      </>
                    )}

                    <div className="border-l h-6 mx-2" />

                    {/* History & Actions */}
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>元に戻す</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                          >
                            <Redo2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>やり直す</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={clearPaintStrokes}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>すべて消去</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Row 2: Comment Input (Full Width) */}
                <div className="space-y-1.5">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <Textarea
                        placeholder={
                          !newCommentPos
                            ? "ツールバーから # を選択して画像をクリック..."
                            : "コメントを入力...（Shift+Enterで改行 / ⌘+Enterで送信）"
                        }
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return;
                          if (
                            e.key === "Enter" &&
                            e.metaKey &&
                            newCommentText.trim()
                          ) {
                            e.preventDefault();
                            handleAddComment();
                            return;
                          }
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                          }
                        }}
                        className={cn(
                          "pr-10 transition-all min-h-[44px] max-h-32 resize-y",
                          newCommentPos
                            ? "border-primary ring-1 ring-primary/20"
                            : "bg-muted/50",
                        )}
                        onFocus={() => {
                          if (
                            !isAddingComment &&
                            (paintTool === "number" ||
                              (isCompareMode && isPaintMode))
                          ) {
                            setIsAddingComment(true);
                          }
                        }}
                      />
                      {newCommentPos && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="h-5 px-1 text-[10px] bg-background"
                          >
                            ピン配置済
                          </Badge>
                        </div>
                      )}
                    </div>

                    <Button
                      size="default"
                      disabled={
                        !newCommentPos ||
                        !newCommentText.trim() ||
                        addCommentMutation.isPending
                      }
                      onClick={handleAddComment}
                      className={cn(
                        "min-w-[80px] transition-all",
                        newCommentPos && newCommentText.trim()
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {addCommentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          送信
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="px-1 text-[11px] text-muted-foreground">
                    入力日時: {formatInputDateTime(liveInputDate)}
                  </div>
                </div>

                {/* Hidden File Input for Overlay */}
                <input
                  ref={overlayInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOverlayImageUpload}
                  className="hidden"
                />
              </div>
            ) : (
              // Normal Mode Layout (Single Row)
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder={
                      isAddingComment && !newCommentPos
                        ? "画像をクリックしてピンを配置..."
                        : "コメントを入力"
                    }
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        if (
                          newCommentPos &&
                          newCommentText.trim() &&
                          !addCommentMutation.isPending
                        ) {
                          handleAddComment();
                        }
                      }
                    }}
                    onFocus={() => {
                      if (
                        !isAddingComment &&
                        (!isPaintMode || paintTool === "number")
                      ) {
                        setIsAddingComment(true);
                      }
                    }}
                    className="min-h-[40px] max-h-[120px] resize-y py-2 pr-24"
                    data-testid="input-bottom-comment"
                  />
                  <div className="mt-1 px-1 text-[11px] text-muted-foreground">
                    入力日時: {formatInputDateTime(liveInputDate)}
                  </div>
                  <div className="absolute right-2 bottom-2 text-xs text-muted-foreground hidden sm:flex items-center gap-2 pointer-events-none">
                    <span className="opacity-50 text-[10px]">
                      Shift+Enter 改行
                    </span>
                    <span className="flex items-center gap-1 opacity-50">
                      <CornerDownLeft className="h-3 w-3" />
                      <span>送信 (⌘+Enter)</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    variant={isPaintMode ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsPaintMode(!isPaintMode);
                      if (isPaintMode) {
                        setIsAddingComment(false);
                        if (!newCommentPos) {
                          setComparePendingPinPane(null);
                        }
                      }
                    }}
                    data-testid="button-paint-mode"
                  >
                    <Paintbrush className="mr-2 h-4 w-4" />
                    ペイントモード
                  </Button>
                </div>

                <Button
                  size="icon"
                  disabled={
                    !newCommentPos ||
                    !newCommentText.trim() ||
                    addCommentMutation.isPending
                  }
                  onClick={handleAddComment}
                  variant="default"
                  data-testid="button-send-comment"
                  aria-label="コメント送信"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Comments */}
        {showRightSidebar && (
          <div
            className="border-l bg-card flex flex-col relative shrink-0"
            style={{ width: rightSidebarWidth }}
          >
            {/* Resize Handle */}
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 transition-colors z-10",
                isResizing && "bg-primary/50",
              )}
              onMouseDown={handleResizeStart}
              data-testid="resize-handle-right-sidebar"
            />
            <div className="p-3 border-b">
              <Tabs
                value={statusFilter}
                onValueChange={setStatusFilter}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="all" data-testid="tab-filter-all">
                    全て
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {statusCounts.all}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="resolved"
                    data-testid="tab-filter-resolved"
                  >
                    対応済
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {statusCounts.resolved}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="unresolved"
                    data-testid="tab-filter-unresolved"
                  >
                    未対応
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {statusCounts.unresolved}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1">
              {!isCompareMode && normalDisplayComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">コメントがありません</p>
                </div>
              ) : isCompareMode ? (
                <div className="flex flex-col divide-y">
                  {/* Left Pane Comments */}
                  {compareDisplayLeftComments.length > 0 && (
                    <div className="bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
                      左画面
                    </div>
                  )}
                  {compareDisplayLeftComments.map((comment, index) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      index={index}
                      isSelected={selectedCommentId === comment.id}
                      onClick={() => {
                        setSelectedCommentId(comment.id);
                        if (
                          comment.anchor?.videoTimestamp !== undefined &&
                          comment.anchor?.videoTimestamp !== null &&
                          videoRef.current
                        ) {
                          videoRef.current.currentTime =
                            comment.anchor.videoTimestamp;
                        }
                      }}
                      onStatusChange={(status) =>
                        updateStatusMutation.mutate({
                          commentId: comment.id,
                          status,
                        })
                      }
                      onEdit={() => handleEditComment(comment)}
                      onDelete={() => handleDeleteComment(comment.id)}
                      fileUrl={file?.url}
                      paintStrokes={paintStrokes}
                    />
                  ))}

                  {/* Right Pane Comments */}
                  {compareDisplayRightComments.length > 0 && (
                    <div className="bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground border-t">
                      右画面
                    </div>
                  )}
                  {compareDisplayRightComments.map((comment, index) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      index={index}
                      isSelected={selectedCommentId === comment.id}
                      onClick={() => {
                        setSelectedCommentId(comment.id);
                        if (
                          comment.anchor?.videoTimestamp !== undefined &&
                          comment.anchor?.videoTimestamp !== null &&
                          (compareVideoRef.current || videoRef.current)
                        ) {
                          if (compareVideoRef.current) {
                            compareVideoRef.current.currentTime =
                              comment.anchor.videoTimestamp;
                          }
                          // Also try main video if sync is enabled or as fallback
                          if (videoRef.current) {
                            videoRef.current.currentTime =
                              comment.anchor.videoTimestamp;
                          }
                        }
                      }}
                      onStatusChange={(status) =>
                        updateStatusMutation.mutate({
                          commentId: comment.id,
                          status,
                        })
                      }
                      onEdit={() => handleEditComment(comment)}
                      onDelete={() => handleDeleteComment(comment.id)}
                      fileUrl={file?.url}
                      paintStrokes={paintStrokes}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col divide-y">
                  {normalDisplayComments.map((comment, index) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      index={index}
                      isSelected={selectedCommentId === comment.id}
                      onClick={() => {
                        setSelectedCommentId(comment.id);
                        if (
                          comment.anchor?.videoTimestamp !== undefined &&
                          comment.anchor?.videoTimestamp !== null &&
                          videoRef.current
                        ) {
                          videoRef.current.currentTime =
                            comment.anchor.videoTimestamp;
                        }
                      }}
                      onStatusChange={(status) =>
                        updateStatusMutation.mutate({
                          commentId: comment.id,
                          status,
                        })
                      }
                      onEdit={() => handleEditComment(comment)}
                      onDelete={() => handleDeleteComment(comment.id)}
                      fileUrl={file?.url}
                      paintStrokes={paintStrokes}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
