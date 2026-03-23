import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import "./ag-psd-init";
import { readPsd } from "ag-psd";
import { PNG } from "pngjs";

const execFileAsync = promisify(execFile);

// Node.js Canvas Factory for PDF.js (defined but not instantiated until needed)
class NodeCanvasFactory {
  private createCanvas: any;

  constructor(createCanvasFn: any) {
    this.createCanvas = createCanvasFn;
  }

  create(width: number, height: number) {
    const canvas = this.createCanvas(width, height);
    return {
      canvas,
      context: canvas.getContext("2d"),
    };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

interface PreviewResult {
  success: boolean;
  previewPath?: string;
  previewUrl?: string;
  error?: string;
}

function isPsdFile(mimeType: string, filename: string): boolean {
  const psdMimes = [
    "image/vnd.adobe.photoshop",
    "image/x-photoshop",
    "application/x-photoshop",
    "application/photoshop",
    "application/psd",
  ];
  return psdMimes.includes(mimeType) || filename.toLowerCase().endsWith(".psd");
}

function isAiFile(mimeType: string, filename: string): boolean {
  const aiMimes = [
    "application/illustrator",
    "application/x-illustrator",
    "application/postscript",
    "application/eps",
    "application/x-eps",
  ];
  return aiMimes.includes(mimeType) || filename.toLowerCase().endsWith(".ai");
}

function isPdfFile(mimeType: string, filename: string): boolean {
  return (
    mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")
  );
}

function isPptxFile(mimeType: string, filename: string): boolean {
  return (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    filename.toLowerCase().endsWith(".pptx")
  );
}

export function needsPreviewGeneration(
  mimeType: string,
  filename: string,
): boolean {
  return (
    isPsdFile(mimeType, filename) ||
    isAiFile(mimeType, filename) ||
    isPdfFile(mimeType, filename) ||
    isPptxFile(mimeType, filename)
  );
}

export async function generatePreview(
  filePath: string,
  mimeType: string,
  filename: string,
): Promise<PreviewResult> {
  const uploadDir = path.join(process.cwd(), "uploads");
  const previewBaseName =
    path
      .basename(filename, path.extname(filename))
      .normalize("NFC")
      .replace(/[^a-zA-Z0-9\-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "file";
  const previewFilename = `preview-${Date.now()}-${previewBaseName}.png`;
  const previewPath = path.join(uploadDir, previewFilename);

  try {
    if (isPsdFile(mimeType, filename)) {
      return await generatePsdPreview(filePath, previewPath, previewFilename);
    } else if (isPdfFile(mimeType, filename)) {
      return await generatePdfPreview(filePath, previewPath, previewFilename);
    } else if (isPptxFile(mimeType, filename)) {
      return await generatePptxPreview(filePath, previewPath, previewFilename);
    } else if (isAiFile(mimeType, filename)) {
      return await generateAiPreview(filePath, previewPath, previewFilename);
    }
    return {
      success: false,
      error: "Unsupported file type for preview generation",
    };
  } catch (error: any) {
    console.error("Preview generation error:", error);
    return {
      success: false,
      error: error.message || "Preview generation failed",
    };
  }
}

async function generatePptxPreview(
  filePath: string,
  previewPath: string,
  previewFilename: string,
): Promise<PreviewResult> {
  try {
    const JSZip = (await import("jszip")).default;
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);

    const thumbnailFile =
      zip.file("docProps/thumbnail.jpeg") ||
      zip.file("docProps/thumbnail.png") ||
      zip.file("docProps/thumbnail.emf");

    if (thumbnailFile) {
      const thumbBuffer = await thumbnailFile.async("nodebuffer");
      const ext = thumbnailFile.name.toLowerCase();
      if (ext.endsWith(".jpeg") || ext.endsWith(".png")) {
        fs.writeFileSync(previewPath, thumbBuffer);
        return {
          success: true,
          previewPath,
          previewUrl: `/uploads/${previewFilename}`,
        };
      }
    }

    const slideImagePaths = Object.keys(zip.files)
      .filter(
        (name) =>
          name.startsWith("ppt/media/") &&
          (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")),
      )
      .sort();

    if (slideImagePaths.length > 0) {
      const firstImage = zip.file(slideImagePaths[0]);
      if (firstImage) {
        const imgBuffer = await firstImage.async("nodebuffer");
        fs.writeFileSync(previewPath, imgBuffer);
        return {
          success: true,
          previewPath,
          previewUrl: `/uploads/${previewFilename}`,
        };
      }
    }

    return {
      success: false,
      error: "No preview image found in PPTX file",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "PPTX preview generation failed",
    };
  }
}

function imageDataToPng(
  imageData: { width: number; height: number; data: Uint8ClampedArray },
  outputPath: string,
): void {
  const { width, height, data } = imageData;
  const png = new PNG({ width, height });

  for (let i = 0; i < width * height * 4; i++) {
    png.data[i] = data[i];
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outputPath, buffer);
}

async function generatePsdPreview(
  filePath: string,
  previewPath: string,
  previewFilename: string,
): Promise<PreviewResult> {
  try {
    const buffer = fs.readFileSync(filePath);
    const psd = readPsd(buffer, {
      skipLayerImageData: true,
      skipCompositeImageData: false,
      skipThumbnail: true,
      useImageData: true,
    });

    if (psd.imageData) {
      const pixelData = psd.imageData;
      const imageData = {
        width: pixelData.width,
        height: pixelData.height,
        data: new Uint8ClampedArray(pixelData.data),
      };
      imageDataToPng(imageData, previewPath);
      console.log(
        `PSD preview generated from composite image: ${psd.width}x${psd.height}`,
      );
      return {
        success: true,
        previewPath: previewPath,
        previewUrl: `/uploads/${previewFilename}`,
      };
    }

    return {
      success: false,
      error: "No composite image data found in PSD file",
    };
  } catch (error: any) {
    console.error("PSD preview generation error:", error);
    return {
      success: false,
      error: error.message || "PSD preview generation failed",
    };
  }
}

async function generateAiPreview(
  filePath: string,
  previewPath: string,
  previewFilename: string,
): Promise<PreviewResult> {
  try {
    const pdfPreview = await renderPdfFirstPageToPng(filePath, previewPath);
    if (pdfPreview.success) {
      return {
        success: true,
        previewPath,
        previewUrl: `/uploads/${previewFilename}`,
      };
    }
  } catch (pdfError: any) {
    console.warn("AI first-page render failed, trying gm fallback:", pdfError);
  }

  try {
    const gmModule = await import("gm");
    const gm = gmModule.default.subClass({ imageMagick: true });

    return new Promise((resolve) => {
      gm(filePath)
        .density(150, 150)
        .background("white")
        .flatten()
        .setFormat("png")
        .write(previewPath, (err: Error | null) => {
          if (err) {
            console.error("AI preview generation error (gm):", err);
            resolve({
              success: false,
              error: err.message || "AI preview generation failed",
            });
          } else {
            resolve({
              success: true,
              previewPath: previewPath,
              previewUrl: `/uploads/${previewFilename}`,
            });
          }
        });
    });
  } catch (gmError: any) {
    console.error("AI preview generation error (all methods failed):", gmError);
    return {
      success: false,
      error: gmError.message || "AI preview generation failed",
    };
  }
}

async function generatePdfPreview(
  filePath: string,
  previewPath: string,
  previewFilename: string,
): Promise<PreviewResult> {
  try {
    const preview = await renderPdfFirstPageToPng(filePath, previewPath);
    if (!preview.success) {
      return preview;
    }
    return {
      success: true,
      previewPath: previewPath,
      previewUrl: `/uploads/${previewFilename}`,
    };
  } catch (error: any) {
    console.error("PDF preview generation error:", error);
    return {
      success: false,
      error: error.message || "PDF preview generation failed",
    };
  }
}

async function renderPdfFirstPageToPng(
  filePath: string,
  previewPath: string,
): Promise<PreviewResult> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("canvas");

    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const data = new Uint8Array(fs.readFileSync(filePath));

    const cMapUrl = path.join(process.cwd(), "node_modules/pdfjs-dist/cmaps/");
    const standardFontDataUrl = path.join(
      process.cwd(),
      "node_modules/pdfjs-dist/standard_fonts/",
    );

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      disableFontFace: true,
    } as any); // Cast to any to bypass type check for canvasFactory property

    // Manually set canvasFactory if supported or needed internally
    (loadingTask as any).canvasFactory = new NodeCanvasFactory(createCanvas);

    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });

    const canvasFactory = new NodeCanvasFactory(createCanvas);
    const { canvas, context } = canvasFactory.create(
      viewport.width,
      viewport.height,
    );

    await page.render({
      canvasContext: context,
      viewport,
    } as any).promise; // Cast to any to bypass type check for canvasFactory property

    const buffer = (canvas as any).toBuffer("image/png");
    fs.writeFileSync(previewPath, buffer);
    return {
      success: true,
      previewPath,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "PDF first-page render failed",
    };
  }
}
