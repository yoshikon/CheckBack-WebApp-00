import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type PptxPresentation = {
  slides: unknown[];
  slideSize?: {
    width: number;
    height: number;
  };
  cleanup?: () => void;
};

interface PptxPreviewProps {
  src: string;
  title: string;
  className?: string;
  fallbackImageUrl?: string | null;
  slideIndex?: number;
  onSlideIndexChange?: (index: number) => void;
  onThumbnailsChange?: (thumbnails: string[]) => void;
  showInternalThumbnails?: boolean;
}

export function PptxPreview({
  src,
  title,
  className,
  fallbackImageUrl,
  slideIndex,
  onSlideIndexChange,
  onThumbnailsChange,
  showInternalThumbnails = true,
}: PptxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [presentation, setPresentation] = useState<PptxPresentation | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [internalSlideIndex, setInternalSlideIndex] = useState(0);
  const [renderNonce, setRenderNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSlideIndex = slideIndex ?? internalSlideIndex;
  const setSlideIndex = (next: number) => {
    if (slideIndex === undefined) {
      setInternalSlideIndex(next);
    }
    onSlideIndexChange?.(next);
  };

  useEffect(() => {
    let mounted = true;
    let currentPresentation: PptxPresentation | null = null;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setSlideIndex(0);
      setThumbnails([]);
      onThumbnailsChange?.([]);
      try {
        const { loadPresentation } = await import("pptx-viewer");
        const loaded = (await loadPresentation(src)) as PptxPresentation;
        if (!mounted) {
          loaded.cleanup?.();
          return;
        }
        currentPresentation = loaded;
        setPresentation(loaded);
      } catch (e: any) {
        if (!mounted) return;
        setPresentation(null);
        setError(
          e?.message && String(e.message).trim().length > 0
            ? String(e.message)
            : "PowerPointの表示に失敗しました。",
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
      currentPresentation?.cleanup?.();
    };
  }, [src, onThumbnailsChange]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(() => {
      setRenderNonce((prev) => prev + 1);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const generateThumbnails = async () => {
      if (!presentation) return;
      try {
        const { getThumbnails } = await import("pptx-viewer");
        const svgs = getThumbnails(presentation as any, 200);
        
        if (svgs && svgs.length > 0) {
          const nextThumbs = svgs.map((svg) => {
            const serialized = new XMLSerializer().serializeToString(svg);
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
          });
          
          if (!cancelled) {
            setThumbnails(nextThumbs);
            onThumbnailsChange?.(nextThumbs);
          }
        } else {
          throw new Error("No thumbnails generated");
        }
      } catch (e) {
        console.error("Thumbnail generation error:", e);
        if (!cancelled) {
          const count = Math.max(0, presentation.slides?.length || 0);
          const placeholders = Array.from({ length: count }, (_, i) => {
            const canvas = document.createElement("canvas");
            canvas.width = 112 * 2;
            canvas.height = 80 * 2;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.strokeStyle = "#d1d5db";
              ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
              ctx.fillStyle = "#6b7280";
              ctx.font = "24px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(String(i + 1), canvas.width / 2, canvas.height / 2);
            }
            return canvas.toDataURL("image/png");
          });
          setThumbnails(placeholders);
          onThumbnailsChange?.(placeholders);
        }
      }
    };
    void generateThumbnails();
    return () => {
      cancelled = true;
    };
  }, [presentation, onThumbnailsChange]);

  useEffect(() => {
    const render = async () => {
      if (!presentation || !containerRef.current || !stageRef.current) return;
      try {
        const { renderSlideToElement } = await import("pptx-viewer");
        containerRef.current.innerHTML = "";
        const stageWidth = Math.max(320, stageRef.current.clientWidth - 16);
        const stageHeight = Math.max(240, stageRef.current.clientHeight - 16);
        const slideWidth = presentation.slideSize?.width || 1280;
        const slideHeight = presentation.slideSize?.height || 720;
        const scale = Math.min(stageWidth / slideWidth, stageHeight / slideHeight);
        const displayWidth = Math.max(1, Math.round(slideWidth * scale));
        const displayHeight = Math.max(1, Math.round(slideHeight * scale));
        
        try {
          renderSlideToElement(presentation as any, activeSlideIndex, containerRef.current, {
            width: displayWidth,
            height: displayHeight,
          });
          const svg = containerRef.current.querySelector("svg");
          if (svg) {
            svg.style.display = "block";
            svg.style.margin = "0 auto";
            svg.style.background = "#ffffff";
            svg.style.maxWidth = "100%";
            svg.style.maxHeight = "100%";
          }
        } catch (err) {
          console.error("SVG render failed:", err);
          throw new Error("SVG render failed");
        }
      } catch (e: any) {
        setError(
          e?.message && String(e.message).trim().length > 0
            ? String(e.message)
            : "スライド描画に失敗しました。",
        );
      }
    };
    void render();
  }, [presentation, activeSlideIndex, renderNonce]);

  const totalSlides = presentation?.slides?.length || 0;
  const showFallback =
    !isLoading && !!fallbackImageUrl && (!!error || !presentation);

  return (
    <div className={`bg-[#dbe2eb] rounded-md border overflow-hidden ${className || ""}`}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 w-full h-[78vh] min-h-[480px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">PowerPointを読み込み中...</span>
        </div>
      )}

      {showFallback && (
        <div className="w-full h-[78vh] min-h-[480px] flex items-center justify-center p-3">
          <img
            src={fallbackImageUrl}
            alt={title}
            className="max-w-full max-h-full object-contain bg-white shadow-sm"
            draggable={false}
          />
        </div>
      )}

      {!showFallback && !isLoading && error && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center min-h-[480px]">
          <p className="font-medium mb-2">PowerPointを表示できませんでした</p>
          <p className="text-sm text-muted-foreground break-all">{error}</p>
        </div>
      )}

      {!showFallback && !isLoading && !error && presentation && (
        <div className="space-y-2 p-2">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlideIndex(Math.max(0, activeSlideIndex - 1))}
              disabled={activeSlideIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {activeSlideIndex + 1} / {Math.max(1, totalSlides)} スライド
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSlideIndex(Math.min(Math.max(totalSlides - 1, 0), activeSlideIndex + 1))
              }
              disabled={activeSlideIndex >= totalSlides - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-0 border rounded-md overflow-hidden h-[78vh] min-h-[480px]">
            {showInternalThumbnails && thumbnails.length > 0 ? (
              <div className="w-[74px] shrink-0 bg-[#dbe2eb] border-r overflow-y-auto p-1 space-y-1">
                {thumbnails.map((thumb, index) => (
                  <button
                    key={`${index}`}
                    type="button"
                    onClick={() => setSlideIndex(index)}
                    className={`w-full rounded border overflow-hidden bg-white ${
                      activeSlideIndex === index
                        ? "ring-2 ring-primary border-primary"
                        : "border-muted"
                    }`}
                  >
                    <div className="w-full h-[40px] flex items-center justify-center bg-white">
                      <img
                        src={thumb}
                        alt={`${index + 1} slide thumbnail`}
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                      />
                    </div>
                    <div className="text-[10px] py-0.5 text-muted-foreground">
                      {index + 1}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-[74px] shrink-0 bg-[#dbe2eb] border-r" />
            )}
            <div
              ref={stageRef}
              className="bg-[#dbe2eb] overflow-auto flex-1 p-4"
            >
              <div
                ref={containerRef}
                aria-label={title}
                className="w-full h-full flex items-center justify-center"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
