import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader as Loader2 } from "lucide-react";
import type {
  LoadedPresentation,
  Presentation,
  Slide,
  SlideLayout,
  SlideMaster,
} from "pptx-viewer";

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

function resolveSlideInheritance(
  presentation: Presentation,
  slide: Slide,
): { layout?: SlideLayout; master?: SlideMaster } {
  let layout: SlideLayout | undefined;
  let master: SlideMaster | undefined;

  if (slide.layoutId && presentation.slideLayouts) {
    layout = presentation.slideLayouts.get(slide.layoutId);
  }
  if (layout?.masterId && presentation.slideMasters) {
    master = presentation.slideMasters.get(layout.masterId);
  }
  if (!master && presentation.slideMasters?.size) {
    master = presentation.slideMasters.values().next().value as SlideMaster | undefined;
  }
  return { layout, master };
}

async function generateCanvasThumbnail(
  presentation: Presentation,
  slideIndex: number,
  width: number,
): Promise<string> {
  const { renderSlideWithInheritance } = await import("pptx-viewer");
  const slide = presentation.slides[slideIndex];
  if (!slide) return "";

  const { layout, master } = resolveSlideInheritance(presentation, slide);
  const svg = renderSlideWithInheritance(
    slide,
    presentation.slideSize,
    layout,
    master,
    { width },
  );

  const serialized = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
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
  const [presentation, setPresentation] = useState<LoadedPresentation | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [internalSlideIndex, setInternalSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSlideIndex = slideIndex ?? internalSlideIndex;
  const setSlideIndex = useCallback(
    (next: number) => {
      if (slideIndex === undefined) {
        setInternalSlideIndex(next);
      }
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
        if (!mounted) {
          loaded.cleanup();
          return;
        }
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
    if (!presentation) return;
    let cancelled = false;
    const gen = async () => {
      const count = presentation.slides.length;
      const results: string[] = new Array(count).fill("");
      setThumbnails([...results]);
      onThumbnailsChange?.([...results]);
      for (let i = 0; i < count; i++) {
        if (cancelled) return;
        try {
          results[i] = await generateCanvasThumbnail(presentation, i, 320);
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
    return () => {
      cancelled = true;
    };
  }, [presentation, onThumbnailsChange]);

  useEffect(() => {
    if (!presentation || !slideContainerRef.current || !stageRef.current) return;
    const container = slideContainerRef.current;
    container.innerHTML = "";

    const render = async () => {
      try {
        const { renderSlideWithInheritance } = await import("pptx-viewer");
        const slide = presentation.slides[activeSlideIndex];
        if (!slide) return;

        const stageWidth = Math.max(320, stageRef.current!.clientWidth - 32);
        const stageHeight = Math.max(240, stageRef.current!.clientHeight - 32);
        const slideW = presentation.slideSize.width;
        const slideH = presentation.slideSize.height;
        const scale = Math.min(stageWidth / slideW, stageHeight / slideH);
        const displayWidth = Math.max(1, Math.round(slideW * scale));

        const { layout, master } = resolveSlideInheritance(presentation, slide);
        const svg = renderSlideWithInheritance(
          slide,
          presentation.slideSize,
          layout,
          master,
          { width: displayWidth },
        );
        svg.style.display = "block";
        svg.style.margin = "0 auto";
        svg.style.background = "#ffffff";
        svg.style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)";
        svg.style.borderRadius = "2px";
        container.appendChild(svg);
      } catch (e: any) {
        try {
          const { renderSlideToElement } = await import("pptx-viewer");
          const stageWidth = Math.max(320, stageRef.current!.clientWidth - 32);
          const stageHeight = Math.max(240, stageRef.current!.clientHeight - 32);
          renderSlideToElement(presentation, activeSlideIndex, container, {
            width: stageWidth,
            height: stageHeight,
          });
          const svg = container.querySelector("svg");
          if (svg) {
            svg.style.display = "block";
            svg.style.margin = "0 auto";
            svg.style.background = "#ffffff";
            svg.style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)";
          }
        } catch {
          setError("スライド描画に失敗しました。");
        }
      }
    };
    void render();
  }, [presentation, activeSlideIndex]);

  useEffect(() => {
    if (!presentation || !stageRef.current) return;
    const stage = stageRef.current;
    const observer = new ResizeObserver(() => {
      if (!slideContainerRef.current || !stageRef.current) return;
      const container = slideContainerRef.current;
      const svgEl = container.querySelector("svg");
      if (!svgEl) return;

      const stageWidth = Math.max(320, stage.clientWidth - 32);
      const stageHeight = Math.max(240, stage.clientHeight - 32);
      const slideW = presentation.slideSize.width;
      const slideH = presentation.slideSize.height;
      const scale = Math.min(stageWidth / slideW, stageHeight / slideH);
      const displayWidth = Math.max(1, Math.round(slideW * scale));
      const displayHeight = Math.max(1, Math.round(slideH * scale));
      svgEl.setAttribute("width", String(displayWidth));
      svgEl.setAttribute("height", String(displayHeight));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [presentation]);

  const totalSlides = presentation?.slides?.length || 0;
  const showFallback =
    !isLoading && !!fallbackImageUrl && (!!error || !presentation);

  return (
    <div className={`bg-[#e8ecf0] rounded-md border overflow-hidden ${className || ""}`}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 w-full h-[78vh] min-h-[480px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            PowerPointを読み込み中...
          </span>
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
        <div className="flex flex-col h-[82vh] min-h-[480px]">
          <div className="flex items-center justify-center gap-3 py-2 border-b bg-card/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlideIndex(Math.max(0, activeSlideIndex - 1))}
              disabled={activeSlideIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              {activeSlideIndex + 1} / {Math.max(1, totalSlides)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSlideIndex(
                  Math.min(Math.max(totalSlides - 1, 0), activeSlideIndex + 1),
                )
              }
              disabled={activeSlideIndex >= totalSlides - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {showInternalThumbnails && thumbnails.length > 0 && (
              <div className="w-[100px] shrink-0 bg-[#e2e6ea] border-r overflow-y-auto py-2 px-1.5 space-y-1.5">
                {thumbnails.map((thumb, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSlideIndex(index)}
                    className={`w-full rounded overflow-hidden transition-all ${
                      activeSlideIndex === index
                        ? "ring-2 ring-primary shadow-sm"
                        : "ring-1 ring-border hover:ring-foreground/30"
                    }`}
                  >
                    <div className="w-full aspect-[16/9] bg-white flex items-center justify-center">
                      <img
                        src={thumb}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </div>
                    <div className="text-[10px] py-0.5 text-muted-foreground bg-card/80">
                      {index + 1}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div
              ref={stageRef}
              className="bg-[#e8ecf0] overflow-auto flex-1 flex items-center justify-center p-4"
            >
              <div
                ref={slideContainerRef}
                aria-label={title}
                className="flex items-center justify-center"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
