import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader as Loader2 } from "lucide-react";
import type { LoadedPresentation } from "pptx-viewer";

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

async function fallbackThumbnailFromCanvas(
  presentation: LoadedPresentation,
  slideIndex: number,
  thumbW: number,
  thumbH: number,
): Promise<string> {
  const { renderSlideToCanvas } = await import("pptx-viewer");
  const canvas = document.createElement("canvas");
  canvas.width = thumbW;
  canvas.height = thumbH;
  await renderSlideToCanvas(presentation, slideIndex, canvas);
  return canvas.toDataURL("image/png");
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
  const stageRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [presentation, setPresentation] = useState<LoadedPresentation | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [internalSlideIndex, setInternalSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const activeSlideIndex = slideIndex ?? internalSlideIndex;

  const setSlideIndex = useCallback(
    (next: number) => {
      if (slideIndex === undefined) setInternalSlideIndex(next);
      onSlideIndexChange?.(next);
    },
    [slideIndex, onSlideIndexChange],
  );

  useEffect(() => {
    let mounted = true;
    let loaded: LoadedPresentation | null = null;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setSlideIndex(0);
      setThumbnails([]);
      onThumbnailsChange?.([]);
      try {
        const { loadPresentation } = await import("pptx-viewer");
        loaded = await loadPresentation(src);
        if (!mounted) { loaded.cleanup(); return; }
        setPresentation(loaded);
      } catch (e: any) {
        if (!mounted) return;
        setPresentation(null);
        setError(e?.message || "PowerPointの表示に失敗しました。");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
      loaded?.cleanup();
    };
  }, [src]);

  useEffect(() => {
    if (!stageRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(stageRef.current);
    return () => obs.disconnect();
  }, []);

  const slideDisplaySize = (() => {
    if (!presentation || stageSize.width === 0) return { width: 0, height: 0 };
    const { slideSize } = presentation;
    const ar = slideSize.height / slideSize.width;
    const maxW = stageSize.width - 48;
    const maxH = stageSize.height - 48;
    const byWidth = { width: maxW, height: maxW * ar };
    const byHeight = { width: maxH / ar, height: maxH };
    return byWidth.height <= maxH ? byWidth : byHeight;
  })();

  useEffect(() => {
    if (
      !presentation ||
      !slideContainerRef.current ||
      slideDisplaySize.width === 0
    ) return;
    const container = slideContainerRef.current;
    const render = async () => {
      setIsRendering(true);
      try {
        const { renderSlideToElement } = await import("pptx-viewer");
        container.innerHTML = "";
        renderSlideToElement(presentation, activeSlideIndex, container, {
          width: Math.round(slideDisplaySize.width),
        });
      } catch {
        try {
          const { renderSlideWithInheritance } = await import("pptx-viewer");
          const slide = presentation.slides[activeSlideIndex];
          if (!slide) return;
          let layout;
          let master;
          if (slide.layoutId && presentation.slideLayouts) {
            layout = presentation.slideLayouts.get(slide.layoutId);
          }
          if (layout?.masterId && presentation.slideMasters) {
            master = presentation.slideMasters.get(layout.masterId);
          }
          if (!master && presentation.slideMasters?.size) {
            master = presentation.slideMasters.values().next().value as any;
          }
          container.innerHTML = "";
          const svg = renderSlideWithInheritance(
            slide,
            presentation.slideSize,
            layout,
            master,
            { width: Math.round(slideDisplaySize.width) },
          );
          container.appendChild(svg);
        } catch {
          setError("スライド描画に失敗しました。");
        }
      } finally {
        setIsRendering(false);
      }
    };
    void render();
  }, [presentation, activeSlideIndex, slideDisplaySize.width]);

  useEffect(() => {
    if (!presentation) return;
    let cancelled = false;
    const thumbW = 320;
    const slideSize = presentation.slideSize;
    const thumbH = Math.round((slideSize.height / slideSize.width) * thumbW);
    const count = presentation.slides.length;
    const results: string[] = new Array(count).fill("");
    setThumbnails([...results]);
    onThumbnailsChange?.([...results]);

    const gen = async () => {
      for (let i = 0; i < count; i++) {
        if (cancelled) return;
        try {
          results[i] = await fallbackThumbnailFromCanvas(presentation, i, thumbW, thumbH);
        } catch {
          results[i] = "";
        }
        if (!cancelled) {
          setThumbnails([...results]);
          onThumbnailsChange?.([...results]);
        }
      }
    };
    void gen();
    return () => { cancelled = true; };
  }, [presentation, onThumbnailsChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!presentation) return;
      const total = presentation.slides.length;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setSlideIndex(Math.min(total - 1, activeSlideIndex + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setSlideIndex(Math.max(0, activeSlideIndex - 1));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [presentation, activeSlideIndex, setSlideIndex]);

  const totalSlides = presentation?.slides?.length || 0;
  const showFallback = !isLoading && !!fallbackImageUrl && (!!error || !presentation);

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col overflow-hidden bg-[#b0b8c1] rounded ${className || ""}`}
      style={{ height: "calc(100vh - 120px)", minHeight: 480 }}
    >
      <div
        className="flex items-center justify-center gap-3 py-2 shrink-0"
        style={{ background: "rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(0,0,0,0.1)" }}
      >
        {!isLoading && presentation && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => setSlideIndex(Math.max(0, activeSlideIndex - 1))}
              disabled={activeSlideIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-white/90 tabular-nums select-none">
              {activeSlideIndex + 1} / {Math.max(1, totalSlides)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => setSlideIndex(Math.min(Math.max(totalSlides - 1, 0), activeSlideIndex + 1))}
              disabled={activeSlideIndex >= totalSlides - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {showInternalThumbnails && thumbnails.length > 0 && (
          <div
            className="shrink-0 overflow-y-auto py-2 px-2 flex flex-col gap-2"
            style={{ width: 140, background: "#e8eaed" }}
          >
            {thumbnails.map((thumb, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSlideIndex(index)}
                className="w-full rounded overflow-hidden transition-all relative"
                style={{
                  border: activeSlideIndex === index
                    ? "2px solid #1a73e8"
                    : "2px solid transparent",
                  outline: "none",
                  background: "#fff",
                }}
              >
                <div className="w-full" style={{ aspectRatio: "16/9" }}>
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                <div
                  className="absolute bottom-0.5 left-1 text-[10px] leading-none font-medium"
                  style={{ color: "#5f6368", textShadow: "0 0 3px #fff" }}
                >
                  {index + 1}
                </div>
              </button>
            ))}
          </div>
        )}

        <div
          ref={stageRef}
          className="flex-1 flex items-center justify-center overflow-auto"
          style={{ background: "#b0b8c1", padding: 24 }}
        >
          {isLoading && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-white/70" />
              <span className="text-sm text-white/70">PowerPointを読み込み中...</span>
            </div>
          )}

          {showFallback && (
            <img
              src={fallbackImageUrl!}
              alt={title}
              className="max-w-full max-h-full object-contain bg-white"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
              draggable={false}
            />
          )}

          {!isLoading && !showFallback && error && (
            <div className="flex flex-col items-center gap-2 text-white/80">
              <p className="font-medium">PowerPointを表示できませんでした</p>
              <p className="text-sm opacity-70 break-all max-w-xs text-center">{error}</p>
            </div>
          )}

          {!isLoading && !error && !showFallback && presentation && slideDisplaySize.width > 0 && (
            <div
              className="relative bg-white"
              style={{
                width: slideDisplaySize.width,
                height: slideDisplaySize.height,
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {isRendering && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/60">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}
              <div
                ref={slideContainerRef}
                style={{ width: "100%", height: "100%", position: "relative" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
