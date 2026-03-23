import { useState, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  SplitSquareHorizontal,
  GitCompare,
  FileImage,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import type { File, ProjectWithFiles } from "@shared/schema";

type CompareMode = "side-by-side" | "overlay" | "slider";

export default function FileComparePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, setLocation] = useLocation();
  
  const [leftFileId, setLeftFileId] = useState<string | null>(null);
  const [rightFileId, setRightFileId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("side-by-side");
  const [zoom, setZoom] = useState(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [sliderPosition, setSliderPosition] = useState(50);

  const { data: project, isLoading } = useQuery<ProjectWithFiles>({
    queryKey: ["/api/projects", projectId],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b px-4 py-3">
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="p-4">
          <Skeleton className="w-full h-[600px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">プロジェクトが見つかりません</h1>
          <Button asChild>
            <Link href="/projects">プロジェクト一覧に戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  const files = project.files || [];
  const leftFile = files.find(f => f.id === leftFileId);
  const rightFile = files.find(f => f.id === rightFileId);

  const imageFiles = files.filter(f => 
    f.mimeType.startsWith("image/") && 
    !f.mimeType.includes("photoshop") && 
    !f.mimeType.includes("postscript")
  );

  const groupedFiles = imageFiles.reduce((groups, file) => {
    const baseName = file.parentFileId ? 
      imageFiles.find(f => f.id === file.parentFileId)?.name || file.name : 
      file.name;
    if (!groups[baseName]) {
      groups[baseName] = [];
    }
    groups[baseName].push(file);
    return groups;
  }, {} as Record<string, File[]>);

  Object.values(groupedFiles).forEach(group => {
    group.sort((a, b) => a.versionNumber - b.versionNumber);
  });

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.25, Math.min(3, prev + delta)));
  };

  const renderCompareView = () => {
    if (!leftFile || !rightFile) {
      return (
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="text-center max-w-md px-4">
            <div className="rounded-full bg-muted p-6 mb-4 mx-auto w-fit">
              <GitCompare className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Select Files to Compare</h2>
            <p className="text-muted-foreground">
              上のドロップダウンから左右のファイルを選択して、並べて比較できます。
            </p>
          </div>
        </div>
      );
    }

    if (compareMode === "side-by-side") {
      return (
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <div className="flex-1 border rounded-lg bg-card overflow-auto">
            <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{leftFile.versionNumber}</Badge>
                <span className="text-sm font-medium truncate">{leftFile.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(leftFile.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[400px]">
              {leftFile.url ? (
                <img
                  src={leftFile.url}
                  alt={leftFile.name}
                  className="max-w-full max-h-[600px] object-contain"
                  style={{ transform: `scale(${zoom})` }}
                  data-testid="img-compare-left"
                />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <FileImage className="h-12 w-12 mb-2" />
                  <span>プレビュー不可</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 border rounded-lg bg-card overflow-auto">
            <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{rightFile.versionNumber}</Badge>
                <span className="text-sm font-medium truncate">{rightFile.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(rightFile.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[400px]">
              {rightFile.url ? (
                <img
                  src={rightFile.url}
                  alt={rightFile.name}
                  className="max-w-full max-h-[600px] object-contain"
                  style={{ transform: `scale(${zoom})` }}
                  data-testid="img-compare-right"
                />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <FileImage className="h-12 w-12 mb-2" />
                  <span>プレビュー不可</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (compareMode === "overlay") {
      return (
        <div className="flex-1 p-4 overflow-auto">
          <div className="border rounded-lg bg-card p-4">
            <div className="mb-4 flex items-center gap-4">
              <span className="text-sm text-muted-foreground">不透明度:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="flex-1 max-w-xs"
                data-testid="slider-overlay-opacity"
              />
              <span className="text-sm font-mono w-12">{Math.round(overlayOpacity * 100)}%</span>
            </div>
            <div className="relative flex items-center justify-center min-h-[500px]">
              {leftFile.url && (
                <img
                  src={leftFile.url}
                  alt={leftFile.name}
                  className="max-w-full max-h-[600px] object-contain absolute"
                  style={{ transform: `scale(${zoom})` }}
                  data-testid="img-overlay-base"
                />
              )}
              {rightFile.url && (
                <img
                  src={rightFile.url}
                  alt={rightFile.name}
                  className="max-w-full max-h-[600px] object-contain absolute"
                  style={{ transform: `scale(${zoom})`, opacity: overlayOpacity }}
                  data-testid="img-overlay-top"
                />
              )}
            </div>
          </div>
        </div>
      );
    }

    if (compareMode === "slider") {
      return (
        <div className="flex-1 p-4 overflow-auto">
          <div className="border rounded-lg bg-card p-4">
            <div className="mb-4 flex items-center gap-4">
              <span className="text-sm text-muted-foreground">スライダー位置:</span>
              <input
                type="range"
                min={0}
                max={100}
                value={sliderPosition}
                onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                className="flex-1 max-w-xs"
                data-testid="slider-compare-position"
              />
              <span className="text-sm font-mono w-12">{sliderPosition}%</span>
            </div>
            <div className="relative flex items-center justify-center min-h-[500px] overflow-hidden">
              {rightFile.url && (
                <img
                  src={rightFile.url}
                  alt={rightFile.name}
                  className="max-w-full max-h-[600px] object-contain"
                  style={{ transform: `scale(${zoom})` }}
                  data-testid="img-slider-right"
                />
              )}
              {leftFile.url && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={leftFile.url}
                    alt={leftFile.name}
                    className="max-w-full max-h-[600px] object-contain"
                    style={{ transform: `scale(${zoom})` }}
                    data-testid="img-slider-left"
                  />
                </div>
              )}
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
                style={{ left: `${sliderPosition}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold" data-testid="text-compare-title">
              File Compare
            </h1>
            <p className="text-sm text-muted-foreground">
              {project.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleZoom(-0.25)}
              disabled={zoom <= 0.25}
              aria-label="縮小"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(1)}
              className="px-2 min-w-[4rem]"
              data-testid="button-zoom-reset"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleZoom(0.25)}
              disabled={zoom >= 3}
              aria-label="拡大"
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Left:</span>
          <Select value={leftFileId || ""} onValueChange={setLeftFileId}>
            <SelectTrigger className="w-[220px]" data-testid="select-left-file">
              <SelectValue placeholder="ファイルを選択" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedFiles).map(([baseName, versions]) => (
                <SelectGroup key={baseName}>
                  <SelectLabel>{baseName}</SelectLabel>
                  {versions.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      v{file.versionNumber} - {new Date(file.createdAt).toLocaleDateString("ja-JP")}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <GitCompare className="h-4 w-4 text-muted-foreground" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Right:</span>
          <Select value={rightFileId || ""} onValueChange={setRightFileId}>
            <SelectTrigger className="w-[220px]" data-testid="select-right-file">
              <SelectValue placeholder="ファイルを選択" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedFiles).map(([baseName, versions]) => (
                <SelectGroup key={baseName}>
                  <SelectLabel>{baseName}</SelectLabel>
                  {versions.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      v{file.versionNumber} - {new Date(file.createdAt).toLocaleDateString("ja-JP")}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          <Button
            variant={compareMode === "side-by-side" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCompareMode("side-by-side")}
            data-testid="button-mode-sidebyside"
          >
            <SplitSquareHorizontal className="h-4 w-4 mr-1" />
            Side by Side
          </Button>
          <Button
            variant={compareMode === "overlay" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCompareMode("overlay")}
            data-testid="button-mode-overlay"
          >
            <Layers className="h-4 w-4 mr-1" />
            Overlay
          </Button>
          <Button
            variant={compareMode === "slider" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCompareMode("slider")}
            data-testid="button-mode-slider"
          >
            <GitCompare className="h-4 w-4 mr-1" />
            Slider
          </Button>
        </div>
      </div>

      {renderCompareView()}
    </div>
  );
}
