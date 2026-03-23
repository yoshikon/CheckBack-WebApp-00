import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

interface PptxThumbnailProps {
  src: string;
  alt: string;
  className?: string;
}

export function PptxThumbnail({ src, alt, className }: PptxThumbnailProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [thumbSvg, setThumbSvg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;
    const load = async () => {
      setIsLoading(true);
      setIsError(false);
      setThumbSvg(null);
      try {
        const { loadPresentation, getThumbnails } = await import("pptx-viewer");
        const presentation = await loadPresentation(src);
        cleanup = presentation.cleanup;
        const thumbs = getThumbnails(presentation, 260) as unknown[];
        const first = thumbs[0];
        if (!first) {
          throw new Error("No slide thumbnail");
        }
        const serialized =
          typeof first === "string"
            ? first
            : new XMLSerializer().serializeToString(first as Node);
        if (!mounted) return;
        setThumbSvg(serialized);
      } catch {
        if (!mounted) return;
        setIsError(true);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [src]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      aria-label={alt}
    >
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && !isError && thumbSvg && (
        <div
          className="w-full h-full bg-white flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: thumbSvg }}
        />
      )}
      {!isLoading && (isError || !thumbSvg) && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
          <FileText className="h-6 w-6" />
          <span className="text-[10px]">PPTX</span>
        </div>
      )}
    </div>
  );
}
