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
        const { loadPresentation, renderSlideWithInheritance } = await import(
          "pptx-viewer"
        );
        const presentation = await loadPresentation(src);
        cleanup = presentation.cleanup;

        const slide = presentation.slides[0];
        if (!slide) throw new Error("No slides");

        let layout;
        let master;
        if (slide.layoutId && presentation.slideLayouts) {
          layout = presentation.slideLayouts.get(slide.layoutId);
        }
        if (layout?.masterId && presentation.slideMasters) {
          master = presentation.slideMasters.get(layout.masterId);
        }
        if (!master && presentation.slideMasters?.size) {
          master = presentation.slideMasters.values().next().value;
        }

        const svg = renderSlideWithInheritance(
          slide,
          presentation.slideSize,
          layout,
          master,
          { width: 320 },
        );

        const serialized = new XMLSerializer().serializeToString(svg);
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

        if (!mounted) return;
        setThumbDataUrl(dataUrl);
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
