import { useEffect, useRef, useState, useCallback } from "react";
import { Loader as Loader2 } from "lucide-react";

interface PdfViewerProps {
  url: string;
  className?: string;
  onReady?: () => void;
}

export function PdfViewer({ url, className, onReady }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTasksRef = useRef<Map<number, { cancel: () => void }>>(new Map());

  const renderPdf = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const pdf = await pdfjsLib.getDocument({ url }).promise;
      const totalPages = pdf.numPages;

      const container = containerRef.current;
      container.innerHTML = "";

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const pageDiv = document.createElement("div");
        pageDiv.style.position = "relative";
        pageDiv.style.marginBottom = pageNum < totalPages ? "8px" : "0px";
        pageDiv.style.width = `${viewport.width}px`;
        pageDiv.style.height = `${viewport.height}px`;
        pageDiv.dataset.pageNumber = String(pageNum);

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = "block";
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        pageDiv.appendChild(canvas);
        container.appendChild(pageDiv);

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });

        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNum);
      }

      setLoading(false);
      onReady?.();
    } catch (err: any) {
      if (err?.name === "RenderingCancelledException") return;
      console.error("PDF render error:", err);
      setError("PDFの読み込みに失敗しました");
      setLoading(false);
    }
  }, [url, onReady]);

  useEffect(() => {
    renderPdf();
    return () => {
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {}
      });
      renderTasksRef.current.clear();
    };
  }, [renderPdf]);

  return (
    <div className={className}>
      {loading && (
        <div className="flex items-center justify-center py-16 min-w-[600px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-16 text-destructive text-sm">
          {error}
        </div>
      )}
      <div ref={containerRef} style={{ display: loading ? "none" : "block" }} />
    </div>
  );
}
