import { useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Upload,
  FileImage,
  FileText,
  File,
  MoveVertical as MoreVertical,
  MessageSquare,
  ExternalLink,
  Clock,
  Loader as Loader2,
  Trash2,
  Image,
  Copy,
  Check,
  Link as LinkIcon,
  Share2,
  Video,
  GitCompare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PptxThumbnail } from "@/components/pptx-thumbnail";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import type {
  ProjectWithFiles,
  File as FileType,
  ShareLink,
} from "@shared/schema";

interface UploadedFileInfo {
  file: FileType;
  shareLink: ShareLink;
}

interface UploadPayload {
  file: Blob;
  fileName: string;
}

type PageableUploadDocType = "pdf" | "pptx";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [quickShareOpen, setQuickShareOpen] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] =
    useState<UploadedFileInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfPageDialogOpen, setPdfPageDialogOpen] = useState(false);
  const [pendingPdfFile, setPendingPdfFile] = useState<globalThis.File | null>(
    null,
  );
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [selectedPdfPages, setSelectedPdfPages] = useState<number[]>([]);
  const [selectAllPdfPages, setSelectAllPdfPages] = useState(true);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [uploadDocType, setUploadDocType] =
    useState<PageableUploadDocType>("pdf");

  const { data: project, isLoading } = useQuery<ProjectWithFiles>({
    queryKey: ["/api/projects", id],
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: UploadPayload) => {
      const formData = new FormData();
      formData.append("file", payload.file, payload.fileName);

      const response = await fetch(`/api/projects/${id}/files`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const uploadedFile = await response.json();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const shareLinkResponse = (await apiRequest(
        "POST",
        `/api/files/${uploadedFile.id}/share-links`,
        {
          expiresAt: expiresAt.toISOString(),
          permCommentRead: true,
          permCommentWrite: true,
          allowDownload: true,
        },
      )) as ShareLink;

      return { file: uploadedFile as FileType, shareLink: shareLinkResponse };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      if (data.shareLink && data.shareLink.token) {
        setUploadedFileInfo(data);
        setQuickShareOpen(true);
      } else {
        toast({
          title: "アップロード完了",
          description: "ファイルが正常にアップロードされました。",
        });
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.message ||
        "ファイルのアップロードに失敗しました。もう一度お試しください。";
      const isFileTooLarge =
        errorMessage.includes("File too large") ||
        errorMessage.includes("ファイルサイズ");
      toast({
        title: "アップロード失敗",
        description: isFileTooLarge
          ? "ファイルサイズが大きすぎます。200MB以下のファイルをアップロードしてください。"
          : errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "削除完了",
        description: "ファイルが削除されました。",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    const isPptx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.name.toLowerCase().endsWith(".pptx");
    if (!isPdf && !isPptx) {
      setIsUploading(true);
      uploadMutation.mutate({ file, fileName: file.name });
      return;
    }
    void openPageSelectionDialog(file, isPdf ? "pdf" : "pptx");
  };

  const countPptxSlides = async (file: globalThis.File) => {
    const bytes = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(bytes);
    const presentationXmlFile = zip.file("ppt/presentation.xml");
    if (!presentationXmlFile) {
      throw new Error("presentation.xml が見つかりません");
    }
    const presentationXml = await presentationXmlFile.async("string");
    const parsed = new DOMParser().parseFromString(
      presentationXml,
      "application/xml",
    );
    const parseError = parsed.getElementsByTagName("parsererror")[0];
    if (parseError) {
      throw new Error("presentation.xml の解析に失敗しました");
    }
    const sldIds = Array.from(parsed.getElementsByTagName("*")).filter(
      (node) => node.localName === "sldId",
    );
    return sldIds.length;
  };

  const createPptxSubset = async (
    file: globalThis.File,
    selectedPages: number[],
  ) => {
    const bytes = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(bytes);
    const presentationXmlFile = zip.file("ppt/presentation.xml");
    if (!presentationXmlFile) {
      throw new Error("presentation.xml が見つかりません");
    }
    const presentationXml = await presentationXmlFile.async("string");
    const parsed = new DOMParser().parseFromString(
      presentationXml,
      "application/xml",
    );
    const parseError = parsed.getElementsByTagName("parsererror")[0];
    if (parseError) {
      throw new Error("presentation.xml の解析に失敗しました");
    }
    const selected = new Set(selectedPages);
    const slideNodes = Array.from(parsed.getElementsByTagName("*")).filter(
      (node) => node.localName === "sldId",
    );
    slideNodes.forEach((slideNode, index) => {
      const page = index + 1;
      if (!selected.has(page)) {
        slideNode.parentNode?.removeChild(slideNode);
      }
    });
    const serialized = new XMLSerializer().serializeToString(parsed);
    zip.file("ppt/presentation.xml", serialized);
    return await zip.generateAsync({ type: "uint8array" });
  };

  const openPageSelectionDialog = async (
    file: globalThis.File,
    docType: PageableUploadDocType,
  ) => {
    setPendingPdfFile(file);
    setPdfPageDialogOpen(true);
    setUploadDocType(docType);
    setIsPreparingPdf(true);
    try {
      const pages =
        docType === "pdf"
          ? (() => {
              const load = async () => {
                const bytes = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(bytes, {
                  ignoreEncryption: true,
                });
                return pdfDoc.getPageCount();
              };
              return load();
            })()
          : countPptxSlides(file);
      const totalPages = await pages;
      if (totalPages <= 0) {
        throw new Error("ページ情報が取得できませんでした");
      }
      const allPages = Array.from(
        { length: totalPages },
        (_, index) => index + 1,
      );
      setPdfPageCount(totalPages);
      setSelectedPdfPages(allPages);
      setSelectAllPdfPages(true);
    } catch (error: any) {
      setPdfPageDialogOpen(false);
      setPendingPdfFile(null);
      setIsUploading(true);
      uploadMutation.mutate({ file, fileName: file.name });
      toast({
        title: docType === "pdf" ? "PDF解析をスキップ" : "PPTX解析をスキップ",
        description:
          error?.message && String(error.message).trim().length > 0
            ? `ページ選択は利用できないため全ページでアップロードします: ${error.message}`
            : "ページ選択は利用できないため全ページでアップロードします。",
      });
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleConfirmPdfUpload = async () => {
    if (!pendingPdfFile) return;
    if (!selectAllPdfPages && selectedPdfPages.length === 0) {
      toast({
        title: "ページ未選択",
        description: "読み込むページを1つ以上選択してください。",
        variant: "destructive",
      });
      return;
    }
    setIsPreparingPdf(true);
    setIsUploading(true);
    try {
      let uploadTarget: Blob | globalThis.File = pendingPdfFile;
      if (!selectAllPdfPages) {
        if (uploadDocType === "pdf") {
          const bytes = await pendingPdfFile.arrayBuffer();
          const sourcePdf = await PDFDocument.load(bytes, {
            ignoreEncryption: true,
          });
          const newPdf = await PDFDocument.create();
          const pageIndexes = selectedPdfPages
            .map((page) => page - 1)
            .filter((page) => page >= 0 && page < sourcePdf.getPageCount());
          const copiedPages = await newPdf.copyPages(sourcePdf, pageIndexes);
          copiedPages.forEach((page) => newPdf.addPage(page));
          const subsetBytes = await newPdf.save();
          uploadTarget = new Blob([subsetBytes], { type: "application/pdf" });
        } else {
          const subsetBytes = await createPptxSubset(
            pendingPdfFile,
            selectedPdfPages,
          );
          uploadTarget = new Blob([subsetBytes], {
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          });
        }
      }
      const uploadFileName = !selectAllPdfPages
        ? uploadDocType === "pdf"
          ? pendingPdfFile.name.replace(/\.pdf$/i, "") + "-selected-pages.pdf"
          : pendingPdfFile.name.replace(/\.pptx$/i, "") +
            "-selected-slides.pptx"
        : pendingPdfFile.name;
      resetPdfSelectionState();
      uploadMutation.mutate({ file: uploadTarget, fileName: uploadFileName });
    } catch (error: any) {
      setIsUploading(false);
      setIsPreparingPdf(false);
      toast({
        title:
          uploadDocType === "pdf"
            ? "PDFページ抽出エラー"
            : "PPTXスライド抽出エラー",
        description:
          error?.message && String(error.message).trim().length > 0
            ? `指定ページの作成に失敗しました: ${error.message}`
            : "指定ページの作成に失敗しました。ページ選択を見直して再実行してください。",
        variant: "destructive",
      });
    }
  };

  const resetPdfSelectionState = () => {
    setPdfPageDialogOpen(false);
    setPendingPdfFile(null);
    setPdfPageCount(0);
    setSelectedPdfPages([]);
    setSelectAllPdfPages(true);
    setUploadDocType("pdf");
    setIsPreparingPdf(false);
  };

  const togglePdfPage = (page: number, checked: boolean) => {
    setSelectedPdfPages((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, page])).sort((a, b) => a - b);
      }
      return prev.filter((value) => value !== page);
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("video/")) {
      return <Video className="h-5 w-5" />;
    }
    if (mimeType.startsWith("image/")) {
      return <FileImage className="h-5 w-5" />;
    }
    if (mimeType === "application/pdf") {
      return <FileText className="h-5 w-5" />;
    }
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return <FileText className="h-5 w-5" />;
    }
    if (
      mimeType === "image/vnd.adobe.photoshop" ||
      mimeType === "application/x-photoshop"
    ) {
      return <FileImage className="h-5 w-5" />;
    }
    if (
      mimeType === "application/postscript" ||
      mimeType === "application/illustrator"
    ) {
      return <FileImage className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const isPdfFile = (file: FileType) => {
    return (
      file.mimeType === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  };

  const isPptxFile = (file: FileType) => {
    return (
      file.mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.name.toLowerCase().endsWith(".pptx")
    );
  };

  const getDisplayFileName = (name: string) => {
    const source = (name || "").normalize("NFC");
    const latin1Decoded = (() => {
      try {
        return decodeURIComponent(escape(source)).normalize("NFC");
      } catch {
        return source;
      }
    })();
    const score = (value: string) => {
      const replacementCharPenalty = (value.match(/�/g) || []).length * 10;
      const mojibakePenalty =
        (value.match(/[ÃÂâã¤¥¦§¨ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/g) || []).length * 3;
      const multilingualReward = (
        value.match(/[\u3040-\u30ff\u3400-\u9fff\uff01-\uff60]/g) || []
      ).length;
      return multilingualReward - replacementCharPenalty - mojibakePenalty;
    };
    return score(latin1Decoded) > score(source) ? latin1Decoded : source;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "コピーしました",
        description: "共有リンクがクリップボードにコピーされました。",
      });
    } catch {
      toast({
        title: "コピーに失敗しました",
        description: "手動でリンクをコピーしてください。",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-xl font-semibold mb-2">
          プロジェクトが見つかりません
        </h2>
        <p className="text-muted-foreground mb-4">
          お探しのプロジェクトは存在しないか、削除されています。
        </p>
        <Link href="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/projects")}
            data-testid="button-back-to-projects"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              data-testid="text-project-title"
            >
              {project.name}
            </h1>
            {project.clientName && (
              <p className="text-muted-foreground">{project.clientName}</p>
            )}
            {project.dueDate && (
              <Badge variant="outline" className="mt-2">
                <Clock className="mr-1 h-3 w-3" />
                期限: {new Date(project.dueDate).toLocaleDateString("ja-JP")}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.psd,.ai,image/vnd.adobe.photoshop,application/postscript,video/*,application/illustrator"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            data-testid="button-upload-file"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation(`/projects/${id}/compare`)}
            data-testid="button-compare-files"
          >
            <GitCompare className="mr-2 h-4 w-4" />
            Compare
          </Button>
        </div>
      </div>

      {project.description && (
        <p className="text-muted-foreground max-w-2xl">{project.description}</p>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          現在のファイル数：{project.files?.length || 0}
        </h2>

        {!project.files || project.files.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Image className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                ファイルがありません
              </h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                最初のデザインファイルをアップロードして、フィードバック収集を始めましょう。
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload-first-file"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.files.map((file: FileType) => (
              <Card key={file.id} className="overflow-hidden group">
                <Link href={`/files/${file.id}`}>
                  <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden cursor-pointer">
                    {isPptxFile(file) && !file.thumbnailUrl && file.url ? (
                      <PptxThumbnail
                        src={file.url}
                        alt={getDisplayFileName(file.name)}
                        className="w-full h-full"
                      />
                    ) : file.thumbnailUrl ||
                      (!isPdfFile(file) && !isPptxFile(file) && file.url) ? (
                      <img
                        src={file.thumbnailUrl || file.url || ""}
                        alt={getDisplayFileName(file.name)}
                        className={`w-full h-full transition-transform group-hover:scale-105 ${
                          isPdfFile(file) || isPptxFile(file)
                            ? "object-contain bg-white"
                            : "object-cover"
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        {isPdfFile(file) || isPptxFile(file) ? (
                          <FileText className="h-8 w-8" />
                        ) : (
                          getFileIcon(file.mimeType)
                        )}
                        <span className="text-xs uppercase">
                          {isPdfFile(file)
                            ? "PDF"
                            : isPptxFile(file)
                              ? "PPTX"
                              : file.mimeType.split("/")[1] || "File"}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                </Link>

                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium truncate text-sm"
                        data-testid={`text-file-name-${file.id}`}
                      >
                        {getDisplayFileName(file.name)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.sizeBytes)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link href={`/files/${file.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-open-file-${file.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            data-testid={`button-file-menu-${file.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(file.id)}
                            data-testid={`menu-delete-file-${file.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={quickShareOpen} onOpenChange={setQuickShareOpen}>
        <DialogContent
          className="w-[min(96vw,32rem)] sm:max-w-lg overflow-hidden"
          data-testid="dialog-quick-share"
        >
          <DialogHeader>
            <div className="mx-auto rounded-full bg-primary/10 p-3 mb-2">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              チェックバックの準備が完了しました
            </DialogTitle>
            <DialogDescription className="text-center">
              共有リンクを使って、関係者にファイルを共有できます。
            </DialogDescription>
          </DialogHeader>

          {uploadedFileInfo && (
            <div className="space-y-4 pt-2 min-w-0">
              <div className="bg-muted rounded-lg p-4 max-w-full overflow-hidden">
                <div className="flex items-start gap-3 mb-3 min-w-0">
                  {isPptxFile(uploadedFileInfo.file) &&
                  !uploadedFileInfo.file.thumbnailUrl &&
                  uploadedFileInfo.file.url ? (
                    <PptxThumbnail
                      src={uploadedFileInfo.file.url}
                      alt={getDisplayFileName(uploadedFileInfo.file.name)}
                      className="w-16 h-12 rounded overflow-hidden"
                    />
                  ) : uploadedFileInfo.file.thumbnailUrl ||
                    (!isPdfFile(uploadedFileInfo.file) &&
                      !isPptxFile(uploadedFileInfo.file) &&
                      uploadedFileInfo.file.url) ? (
                    <img
                      src={
                        uploadedFileInfo.file.thumbnailUrl ||
                        uploadedFileInfo.file.url ||
                        ""
                      }
                      alt={getDisplayFileName(uploadedFileInfo.file.name)}
                      className={`w-16 h-12 rounded ${
                        isPdfFile(uploadedFileInfo.file) ||
                        isPptxFile(uploadedFileInfo.file)
                          ? "object-contain bg-white"
                          : "object-cover"
                      }`}
                    />
                  ) : (
                    <div className="w-16 h-12 rounded bg-background flex items-center justify-center">
                      {isPdfFile(uploadedFileInfo.file) ||
                      isPptxFile(uploadedFileInfo.file) ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        getFileIcon(uploadedFileInfo.file.mimeType)
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="block w-full font-medium truncate">
                      {getDisplayFileName(uploadedFileInfo.file.name)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(uploadedFileInfo.file.sizeBytes)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  共有リンク
                </label>
                <div className="flex items-center gap-2 min-w-0">
                  <Input
                    value={getShareUrl(uploadedFileInfo.shareLink.token)}
                    readOnly
                    className="flex-1 min-w-0 text-sm"
                    data-testid="input-share-link"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() =>
                      copyToClipboard(
                        getShareUrl(uploadedFileInfo.shareLink.token),
                      )
                    }
                    data-testid="button-copy-share-link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() =>
                    copyToClipboard(
                      getShareUrl(uploadedFileInfo.shareLink.token),
                    )
                  }
                  className="w-full"
                  data-testid="button-copy-and-close"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  リンクをコピー
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickShareOpen(false);
                    setLocation(`/files/${uploadedFileInfo.file.id}`);
                  }}
                  className="w-full"
                  data-testid="button-open-file-review"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  ファイルを開いてレビュー
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={pdfPageDialogOpen}
        onOpenChange={(open) => {
          if (isPreparingPdf || isUploading) return;
          if (!open) {
            resetPdfSelectionState();
            return;
          }
          setPdfPageDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {(() => {
            const unitLabel = uploadDocType === "pdf" ? "ページ" : "スライド";
            const docLabel = uploadDocType === "pdf" ? "PDF" : "PowerPoint";
            const loadingLabel =
              uploadDocType === "pdf"
                ? "PDFページ情報を読み込み中..."
                : "PowerPointスライド情報を読み込み中...";
            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {docLabel}読込{unitLabel}の選択
                  </DialogTitle>
                  <DialogDescription>
                    読み込む{unitLabel}を指定できます。全{unitLabel}
                    読込のチェック時はすべてアップロードします。
                  </DialogDescription>
                </DialogHeader>
                {isPreparingPdf ? (
                  <div className="py-6 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {loadingLabel}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="checkbox-all-pdf-pages"
                        checked={selectAllPdfPages}
                        onCheckedChange={(checked) => {
                          const next = !!checked;
                          setSelectAllPdfPages(next);
                          if (next) {
                            setSelectedPdfPages(
                              Array.from(
                                { length: pdfPageCount },
                                (_, index) => index + 1,
                              ),
                            );
                          } else {
                            setSelectedPdfPages([]);
                          }
                        }}
                      />
                      <label
                        htmlFor="checkbox-all-pdf-pages"
                        className="text-sm font-medium"
                      >
                        全{unitLabel}を読み込む
                      </label>
                    </div>
                    {!selectAllPdfPages && (
                      <div className="border rounded-md p-3 max-h-56 overflow-y-auto space-y-2">
                        {Array.from(
                          { length: pdfPageCount },
                          (_, index) => index + 1,
                        ).map((page) => (
                          <div key={page} className="flex items-center gap-2">
                            <Checkbox
                              id={`checkbox-pdf-page-${page}`}
                              checked={selectedPdfPages.includes(page)}
                              onCheckedChange={(checked) =>
                                togglePdfPage(page, !!checked)
                              }
                            />
                            <label
                              htmlFor={`checkbox-pdf-page-${page}`}
                              className="text-sm"
                            >
                              {page}
                              {unitLabel}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={resetPdfSelectionState}
                        disabled={isPreparingPdf || isUploading}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={() => void handleConfirmPdfUpload()}
                        disabled={isPreparingPdf || isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            アップロード中...
                          </>
                        ) : (
                          "指定内容でアップロード"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
