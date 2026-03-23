import { useEffect, useRef, useState } from "react";
import { FileText, Loader as Loader2 } from "lucide-react";

interface PptxThumbnailProps {
  src: string;
  alt: string;
  className?: string;
}

export function PptxThumbnail({ src, alt, className }: PptxThumbnailProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [thumbDataUrl, setThumbDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;
    const load = async () => {
      setIsLoading(true);
      setIsError(false);
      setThumbDataUrl(null);
      try {
        const { loadPresentation, renderSlideToCanvas } = await import("pptx-viewer");
        const presentation = await loadPresentation(src);
        cleanup = presentation.cleanup;

        if (!presentation.slides.length) throw new Error("No slides");

        const slideSize = presentation.slideSize;
        const thumbW = 320;
        const thumbH = Math.round((slideSize.height / slideSize.width) * thumbW);
        const canvas = document.createElement("canvas");
        canvas.width = thumbW;
        canvas.height = thumbH;
        await renderSlideToCanvas(presentation, 0, canvas);

        if (!mounted) return;
        setThumbDataUrl(canvas.toDataURL("image/png"));
      } catch {
        if (!mounted) return;
        setIsError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [src]);

  return (
    <div ref={wrapperRef} className={className} aria-label={alt}>
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && !isError && thumbDataUrl && (
        <img
          src={thumbDataUrl}
          alt={alt}
          className="w-full h-full object-contain bg-white"
          draggable={false}
        />
      )}
      {!isLoading && (isError || !thumbDataUrl) && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
          <FileText className="h-6 w-6" />
          <span className="text-[10px]">PPTX</span>
        </div>
      )}
    </div>
  );
}
