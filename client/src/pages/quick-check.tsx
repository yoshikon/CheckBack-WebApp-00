import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileImage, Globe, ExternalLink, Loader2, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { File as FileType, Project } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface QuickCheckFile extends FileType {
  project?: Project;
}

export default function QuickCheckPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [webCaptureOpen, setWebCaptureOpen] = useState(false);
  const [webUrl, setWebUrl] = useState("");
  const [webName, setWebName] = useState("");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [basicAuthEnabled, setBasicAuthEnabled] = useState(false);
  const [basicAuthUser, setBasicAuthUser] = useState("");
  const [basicAuthPass, setBasicAuthPass] = useState("");

  const { data: recentFiles, isLoading: isLoadingFiles } = useQuery<QuickCheckFile[]>({
    queryKey: ["/api/quick-check/recent"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("quickCheck", "true");
      
      const response = await fetch("/api/quick-check/upload", {
        method: "POST",
        body: formData,
        headers: {
          "x-user-id": localStorage.getItem("userId") || "",
        },
      });
      
      if (!response.ok) {
        throw new Error("アップロードに失敗しました");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-check/recent"] });
      toast({
        title: "Success",
        description: "ファイルがアップロードされました",
      });
      setLocation(`/files/${data.id}`);
    },
    onError: (error: Error) => {
      const isFileTooLarge = error.message?.includes("File too large") || error.message?.includes("ファイルサイズ");
      toast({
        title: "Error",
        description: isFileTooLarge 
          ? "ファイルサイズが大きすぎます。200MB以下のファイルをアップロードしてください。" 
          : error.message,
        variant: "destructive",
      });
    },
  });

  const webCaptureMutation = useMutation({
    mutationFn: async (params: {
      url: string;
      name?: string;
      viewport: "desktop" | "mobile";
      basicAuth?: { username: string; password: string };
    }) => {
      return await apiRequest("POST", "/api/quick-check/capture", params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-check/recent"] });
      setWebCaptureOpen(false);
      resetWebCaptureForm();
      toast({
        title: "Success",
        description: "Webページがキャプチャされました",
      });
      setLocation(`/files/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "キャプチャに失敗しました",
        variant: "destructive",
      });
    },
  });

  const resetWebCaptureForm = () => {
    setWebUrl("");
    setWebName("");
    setViewport("desktop");
    setBasicAuthEnabled(false);
    setBasicAuthUser("");
    setBasicAuthPass("");
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleWebCapture = () => {
    if (!webUrl) {
      toast({
        title: "Error",
        description: "URLを入力してください",
        variant: "destructive",
      });
      return;
    }

    webCaptureMutation.mutate({
      url: webUrl,
      name: webName || undefined,
      viewport,
      basicAuth: basicAuthEnabled ? { username: basicAuthUser, password: basicAuthPass } : undefined,
    });
  };

  const supportedFormats = ".mp4 / .mov / .pdf / .jpeg / .png / .ai / .psd / .pptx / .docx / .xlsx";

  return (
    <div className="space-y-8" data-testid="page-quick-check">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-quick-check-title">Quick Check</h1>
        <p className="text-muted-foreground" data-testid="text-quick-check-description">
          クイックチェックを始めましょう
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground" data-testid="steps-indicator">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>アップロード</span>
        </div>
        <div className="w-8 h-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
          <span>リンクを発行</span>
        </div>
        <div className="w-8 h-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
          <span>チェックバック開始</span>
        </div>
      </div>

      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
        data-testid="card-upload-area"
      >
        <CardContent className="py-12">
          <div
            className="flex flex-col items-center justify-center cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.psd,.ai,image/vnd.adobe.photoshop,application/postscript,video/*,application/illustrator,.pptx,.docx,.xlsx"
              onChange={handleFileInputChange}
              data-testid="input-file"
            />
            
            {isUploading || uploadMutation.isPending ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            ) : (
              <FileImage className="h-16 w-16 text-primary mb-4" />
            )}
            
            <h3 className="text-xl font-semibold text-primary mb-2" data-testid="text-upload-title">
              ここにアップロードしてみましょう
            </h3>
            <p className="text-muted-foreground mb-4">
              クリックまたはドラッグ＆ドロップでアップロード
            </p>
            <p className="text-sm text-muted-foreground">
              {supportedFormats}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Web Page Capture Section */}
      <div className="text-center space-y-2">
        <p className="text-muted-foreground">Webサイトのアップロードはこちら</p>
        <Button
          onClick={() => setWebCaptureOpen(true)}
          className="gap-2"
          data-testid="button-web-capture"
        >
          <Globe className="h-4 w-4" />
          Webページをアップロード
        </Button>
      </div>

      {/* Recently Used Files */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold" data-testid="text-section-recent-files">最近使用したファイル</h2>
          <Link href="/files">
            <span className="text-sm text-primary hover:underline cursor-pointer" data-testid="link-view-all">全て見る</span>
          </Link>
        </div>

        {isLoadingFiles ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="skeleton-recent-files">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Skeleton className="rounded" style={{ width: "3rem", height: "3rem" }} />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !recentFiles || recentFiles.length === 0 ? (
          <Card data-testid="card-no-recent-files">
            <CardContent className="py-12 text-center">
              <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-recent-files">
                アップロードされたファイルはありません
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="list-recent-files">
            {recentFiles.map((file) => (
              <Link key={file.id} href={`/files/${file.id}`}>
                <Card className="hover-elevate cursor-pointer transition-colors" data-testid={`card-recent-file-${file.id}`}>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div 
                        className="rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0"
                        style={{ width: "3rem", height: "3rem" }}
                      >
                        {file.thumbnailUrl || file.url ? (
                          (file.mimeType ?? "").startsWith("image/") ? (
                            <img
                              src={file.thumbnailUrl || file.url || undefined}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileImage className="h-5 w-5 text-muted-foreground" />
                          )
                        ) : (
                          <FileImage className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid={`text-file-name-${file.id}`}>
                          {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {file.createdAt ? formatDistanceToNow(new Date(file.createdAt), { addSuffix: true, locale: ja }) : ""}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Web Capture Dialog */}
      <Dialog open={webCaptureOpen} onOpenChange={setWebCaptureOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-web-capture">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Webページのレビューを作成</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="web-url">リンク</Label>
              <p className="text-sm text-muted-foreground">
                アップロードしたいWebサイトのリンクを入力してください。
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="web-url"
                  placeholder="URLを入力"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  className="flex-1"
                  data-testid="input-web-url"
                />
                <Select value={viewport} onValueChange={(v) => setViewport(v as "desktop" | "mobile")}>
                  <SelectTrigger className="w-32" data-testid="select-viewport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">デスクトップ</SelectItem>
                    <SelectItem value="mobile">モバイル</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="web-name">Webサイトの名前を設定できます。</Label>
              <Input
                id="web-name"
                placeholder="オプション"
                value={webName}
                onChange={(e) => setWebName(e.target.value)}
                data-testid="input-web-name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="basic-auth"
                checked={basicAuthEnabled}
                onCheckedChange={(checked) => setBasicAuthEnabled(checked === true)}
                data-testid="checkbox-basic-auth"
              />
              <Label htmlFor="basic-auth" className="cursor-pointer">
                Basic認証が必要なサイト
              </Label>
            </div>

            {basicAuthEnabled && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="auth-user">ユーザー名</Label>
                  <Input
                    id="auth-user"
                    placeholder="ユーザー名を入力"
                    value={basicAuthUser}
                    onChange={(e) => setBasicAuthUser(e.target.value)}
                    data-testid="input-auth-user"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-pass">パスワード</Label>
                  <Input
                    id="auth-pass"
                    type="password"
                    placeholder="パスワードを入力"
                    value={basicAuthPass}
                    onChange={(e) => setBasicAuthPass(e.target.value)}
                    data-testid="input-auth-pass"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleWebCapture}
                disabled={webCaptureMutation.isPending || !webUrl}
                className="min-w-32"
                data-testid="button-create-capture"
              >
                {webCaptureMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    作成中...
                  </>
                ) : (
                  "作成"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
