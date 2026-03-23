import path from "path";
import fs from "fs";
import "./ag-psd-init";
import { readPsd, Layer } from "ag-psd";
import { PNG } from "pngjs";
import type { LayerInfo, MaskInfo, LayerEffectInfo, LayerExtractionResult } from "@shared/layer-types";

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
    "application/pdf", // AI files often detected as PDF
  ];
  return aiMimes.includes(mimeType) || filename.toLowerCase().endsWith(".ai") || filename.toLowerCase().endsWith(".pdf");
}

export function canExtractLayers(mimeType: string, filename: string): boolean {
  return isPsdFile(mimeType, filename) || isAiFile(mimeType, filename);
}

function normalizeColor(c: any): { r: number; g: number; b: number; a: number } {
  if (!c) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: Math.round(c.r ?? 0),
    g: Math.round(c.g ?? 0),
    b: Math.round(c.b ?? 0),
    a: c.a !== undefined ? c.a : 1,
  };
}

function normalizeBlendMode(mode: string | undefined): string {
  if (!mode) return "normal";
  const modeMap: Record<string, string> = {
    "pass through": "passThrough",
    "normal": "normal",
    "dissolve": "dissolve",
    "darken": "darken",
    "multiply": "multiply",
    "color burn": "color-burn",
    "linear burn": "linear-burn",
    "darker color": "darker-color",
    "lighten": "lighten",
    "screen": "screen",
    "color dodge": "color-dodge",
    "linear dodge": "linear-dodge",
    "lighter color": "lighter-color",
    "overlay": "overlay",
    "soft light": "soft-light",
    "hard light": "hard-light",
    "vivid light": "vivid-light",
    "linear light": "linear-light",
    "pin light": "pin-light",
    "hard mix": "hard-mix",
    "difference": "difference",
    "exclusion": "exclusion",
    "subtract": "subtract",
    "divide": "divide",
    "hue": "hue",
    "saturation": "saturation",
    "color": "color",
    "luminosity": "luminosity",
  };
  return modeMap[mode] || mode.replace(/\s+/g, "-");
}

function extractEffects(layer: Layer): LayerEffectInfo | undefined {
  const effects = layer.effects as any;
  if (!effects) return undefined;

  const result: LayerEffectInfo = {};
  let hasAnyEffect = false;

  if (effects.dropShadow && effects.dropShadow.length > 0) {
    result.dropShadow = effects.dropShadow.map((ds: any) => ({
      enabled: ds.enabled !== false,
      color: normalizeColor(ds.color),
      opacity: ds.opacity !== undefined ? Math.round(ds.opacity * 100) : 75,
      angle: ds.angle ?? 120,
      distance: ds.distance?.value ?? ds.distance ?? 5,
      spread: ds.spread?.value ?? ds.spread ?? 0,
      size: ds.size?.value ?? ds.size ?? 5,
    }));
    hasAnyEffect = true;
  }

  if (effects.innerShadow && effects.innerShadow.length > 0) {
    result.innerShadow = effects.innerShadow.map((is: any) => ({
      enabled: is.enabled !== false,
      color: normalizeColor(is.color),
      opacity: is.opacity !== undefined ? Math.round(is.opacity * 100) : 75,
      angle: is.angle ?? 120,
      distance: is.distance?.value ?? is.distance ?? 5,
      choke: is.choke?.value ?? is.choke ?? 0,
      size: is.size?.value ?? is.size ?? 5,
    }));
    hasAnyEffect = true;
  }

  if (effects.outerGlow && effects.outerGlow.length > 0) {
    result.outerGlow = effects.outerGlow.map((og: any) => ({
      enabled: og.enabled !== false,
      color: normalizeColor(og.color),
      opacity: og.opacity !== undefined ? Math.round(og.opacity * 100) : 75,
      size: og.size?.value ?? og.size ?? 10,
      spread: og.spread?.value ?? og.spread ?? 0,
    }));
    hasAnyEffect = true;
  }

  if (effects.innerGlow && effects.innerGlow.length > 0) {
    result.innerGlow = effects.innerGlow.map((ig: any) => ({
      enabled: ig.enabled !== false,
      color: normalizeColor(ig.color),
      opacity: ig.opacity !== undefined ? Math.round(ig.opacity * 100) : 75,
      size: ig.size?.value ?? ig.size ?? 10,
      choke: ig.choke?.value ?? ig.choke ?? 0,
    }));
    hasAnyEffect = true;
  }

  if (effects.stroke && effects.stroke.length > 0) {
    result.stroke = effects.stroke.map((s: any) => ({
      enabled: s.enabled !== false,
      size: s.size?.value ?? s.size ?? 3,
      position: s.position || "outside",
      color: normalizeColor(s.color),
      opacity: s.opacity !== undefined ? Math.round(s.opacity * 100) : 100,
    }));
    hasAnyEffect = true;
  }

  if (effects.colorOverlay && effects.colorOverlay.length > 0) {
    result.colorOverlay = effects.colorOverlay.map((co: any) => ({
      enabled: co.enabled !== false,
      color: normalizeColor(co.color),
      opacity: co.opacity !== undefined ? Math.round(co.opacity * 100) : 100,
      blendMode: normalizeBlendMode(co.blendMode),
    }));
    hasAnyEffect = true;
  }

  if (effects.gradientOverlay && effects.gradientOverlay.length > 0) {
    result.gradientOverlay = effects.gradientOverlay.map((go: any) => ({
      enabled: go.enabled !== false,
      opacity: go.opacity !== undefined ? Math.round(go.opacity * 100) : 100,
      blendMode: normalizeBlendMode(go.blendMode),
      angle: go.angle ?? 90,
    }));
    hasAnyEffect = true;
  }

  return hasAnyEffect ? result : undefined;
}

interface LayerNodeRef {
  id: number;
  agLayer: Layer;
}

function extractLayersFromAgPsd(
  children: Layer[] | undefined,
  depth: number,
  idCounter: { value: number },
  layerNodeRefs: LayerNodeRef[]
): LayerInfo[] {
  if (!children || children.length === 0) return [];

  const layers: LayerInfo[] = [];

  for (const child of children) {
    const layerId = idCounter.value++;
    const isGroup = child.children && child.children.length > 0;

    const opacity = child.opacity !== undefined ? Math.round(child.opacity * 100) : 100;
    const fillOpacity = (child as any).fillOpacity !== undefined
      ? Math.round((child as any).fillOpacity * 100)
      : 100;

    const left = child.left ?? 0;
    const top = child.top ?? 0;
    const right = child.right ?? left;
    const bottom = child.bottom ?? top;
    const width = right - left;
    const height = bottom - top;

    const blendMode = normalizeBlendMode(child.blendMode);

    let maskInfo: MaskInfo | undefined;
    if (child.mask) {
      const m = child.mask;
      const maskLeft = m.left ?? 0;
      const maskTop = m.top ?? 0;
      const maskRight = m.right ?? maskLeft;
      const maskBottom = m.bottom ?? maskTop;
      maskInfo = {
        type: "raster",
        bounds: {
          top: maskTop,
          left: maskLeft,
          bottom: maskBottom,
          right: maskRight,
        },
        width: maskRight - maskLeft,
        height: maskBottom - maskTop,
        disabled: m.disabled ?? false,
        invert: (m as any).invert ?? false,
        defaultColor: m.defaultColor ?? 255,
      };
    }

    const effects = extractEffects(child);

    const isAdjustmentLayer = !!(child as any).adjustment;
    const isTextLayer = !!(child as any).text;
    const textContent = isTextLayer ? (child as any).text?.text : undefined;
    const isSmartObject = !!(child as any).placedLayer;

    const layerInfo: LayerInfo = {
      id: layerId,
      name: child.name || `Layer ${layerId}`,
      type: isGroup ? "group" : "layer",
      visible: child.hidden !== true,
      locked: !!(child as any).protected?.composite,
      opacity,
      fillOpacity,
      blendMode,
      depth,
      left,
      top,
      width,
      height,
    };

    if (maskInfo) layerInfo.mask = maskInfo;
    if (child.vectorMask) layerInfo.hasVectorMask = true;
    if (child.clipping) layerInfo.isClippingMask = true;
    if (effects) {
      layerInfo.effects = effects;
      layerInfo.hasEffects = true;
    }
    if (isAdjustmentLayer) layerInfo.isAdjustmentLayer = true;
    if (isTextLayer) {
      layerInfo.isTextLayer = true;
      layerInfo.textContent = textContent;
    }
    if (isSmartObject) layerInfo.isSmartObject = true;

    layerNodeRefs.push({ id: layerId, agLayer: child });

    if (isGroup && child.children) {
      const childLayers = extractLayersFromAgPsd(child.children, depth + 1, idCounter, layerNodeRefs);
      if (childLayers.length > 0) {
        layerInfo.children = childLayers;
      }
    }

    layers.push(layerInfo);
  }

  return layers;
}

export async function extractLayers(
  filePath: string,
  mimeType: string,
  filename: string
): Promise<LayerExtractionResult> {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: "File not found" };
  }

  try {
    if (isPsdFile(mimeType, filename)) {
      return await extractPsdLayers(filePath);
    } else if (isAiFile(mimeType, filename)) {
      return await extractAiLayers(filePath);
    }
    return { success: false, error: "Unsupported file type for layer extraction" };
  } catch (error: any) {
    console.error("Layer extraction error:", error);
    return { success: false, error: error.message || "Layer extraction failed" };
  }
}

async function extractPsdLayers(filePath: string): Promise<LayerExtractionResult> {
  try {
    const buffer = fs.readFileSync(filePath);
    const psd = readPsd(buffer, {
      skipLayerImageData: true,
      skipCompositeImageData: true,
      skipThumbnail: true,
      useImageData: true,
    });

    const layerNodeRefs: LayerNodeRef[] = [];
    const layers = extractLayersFromAgPsd(psd.children, 0, { value: 0 }, layerNodeRefs);

    return {
      success: true,
      layers,
      documentWidth: psd.width,
      documentHeight: psd.height,
    };
  } catch (error: any) {
    console.error("PSD layer extraction error:", error);
    return { success: false, error: error.message || "PSD layer extraction failed" };
  }
}

async function extractAiLayers(filePath: string): Promise<LayerExtractionResult> {
  try {
    const { default: pdfjsLib } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("canvas");

    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const data = new Uint8Array(fs.readFileSync(filePath));

    const cMapUrl = path.join(process.cwd(), "node_modules/pdfjs-dist/cmaps/");
    const standardFontDataUrl = path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/");

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      disableFontFace: true,
      canvasFactory: new NodeCanvasFactory(createCanvas) as any,
    });

    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const optionalContentConfig = await pdfDoc.getOptionalContentConfig();
    const groups = optionalContentConfig.getGroups();
    
    // Calculate document dimensions from the viewport
    const viewport = page.getViewport({ scale: 1.0 });
    
    // If no groups (layers) found, return single layer
    if (!groups || Object.keys(groups).length === 0) {
      return {
        success: true,
        layers: [{
          id: 0,
          name: "Illustrator Document",
          type: "layer",
          visible: true,
          locked: false,
          opacity: 100,
          fillOpacity: 100,
          blendMode: "normal",
          depth: 0,
          width: viewport.width,
          height: viewport.height,
        }],
        documentWidth: viewport.width,
        documentHeight: viewport.height,
      };
    }

    // Sort OCG IDs deterministically to ensure stable ID assignment
    const sortedOcgIds = Object.keys(groups).sort();
    
    // Helper to get ID for an OCG
    const getLayerIdForOcg = (ocgId: string): number => {
      return sortedOcgIds.indexOf(ocgId);
    };
    
    // Counter for Folder IDs (non-OCG layers), starting after OCGs
    let folderIdCounter = sortedOcgIds.length;

    const processOrder = (items: any[], depth: number): LayerInfo[] => {
      const result: LayerInfo[] = [];
      
      for (const item of items) {
        if (typeof item === 'string') {
          // It's a reference to an OCG
          const group = groups[item];
          if (group) {
            result.push({
              id: getLayerIdForOcg(item),
              name: group.name || `Layer ${item}`,
              type: "layer",
              visible: optionalContentConfig.isVisible(group),
              locked: false,
              opacity: 100,
              fillOpacity: 100,
              blendMode: "normal",
              depth,
              width: viewport.width,
              height: viewport.height,
              left: 0,
              top: 0
            });
          }
        } else if (Array.isArray(item) && item.length > 0) {
          // Nested group. PDF OCG order format is complex.
          
          let childrenItems = item;
          let name = "Group";
          let isFolder = false;
          
          const first = item[0];
          if (typeof first === 'string' && !groups[first]) {
            name = first;
            childrenItems = item.slice(1);
            isFolder = true;
          }
          
          if (isFolder) {
            // Create a folder layer
            const folderId = folderIdCounter++;
            const children = processOrder(childrenItems, depth + 1);
            
            if (children.length > 0) {
              result.push({
                id: folderId,
                name: name,
                type: "group",
                visible: true,
                locked: false,
                opacity: 100,
                fillOpacity: 100,
                blendMode: "normal",
                depth,
                width: viewport.width,
                height: viewport.height,
                left: 0,
                top: 0,
                children: children.reverse() // PDF order is usually top-down?
              });
            }
          } else {
            // Just a list of items, process them at current depth
            result.push(...processOrder(childrenItems, depth));
          }
        }
      }
      return result.reverse();
    };

    let layers: LayerInfo[] = [];
    const order = optionalContentConfig.getOrder();
    
    if (order && order.length > 0) {
      layers = processOrder(order, 0);
    } else {
      // Fallback: Flat list
      for (const key of sortedOcgIds) {
        const group = groups[key];
        layers.push({
          id: getLayerIdForOcg(key),
          name: group.name,
          type: "layer",
          visible: optionalContentConfig.isVisible(group),
          locked: false,
          opacity: 100,
          fillOpacity: 100,
          blendMode: "normal",
          depth: 0,
          width: viewport.width,
          height: viewport.height,
          left: 0,
          top: 0
        });
      }
      layers.reverse();
    }

    return {
      success: true,
      layers,
      documentWidth: viewport.width,
      documentHeight: viewport.height,
    };

  } catch (error: any) {
    console.error("AI layer extraction error:", error);
    return {
      success: true,
      layers: [{
        id: 0,
        name: "Illustrator Document (Parse Failed)",
        type: "layer",
        visible: true,
        locked: false,
        opacity: 100,
        fillOpacity: 100,
        blendMode: "normal",
        depth: 0,
      }],
    };
  }
}

function imageDataToPngBuffer(imageData: { width: number; height: number; data: Uint8ClampedArray }): Buffer {
  const { width, height, data } = imageData;
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height * 4; i++) {
    png.data[i] = data[i];
  }
  return PNG.sync.write(png);
}

export async function extractLayerImages(
  filePath: string,
  fileId: number,
  mimeType: string,
  filename: string
): Promise<{ success: boolean; layerImages?: Map<number, string>; maskImages?: Map<number, string>; error?: string }> {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: "File not found" };
  }

  if (isPsdFile(mimeType, filename)) {
    return extractPsdLayerImages(filePath, fileId);
  } else if (isAiFile(mimeType, filename)) {
    return extractAiLayerImages(filePath, fileId);
  }
  
  return { success: false, error: "Unsupported file type" };
}

async function extractPsdLayerImages(filePath: string, fileId: number) {
  try {
    const buffer = fs.readFileSync(filePath);
    const psd = readPsd(buffer, {
      skipLayerImageData: false,
      skipCompositeImageData: true,
      skipThumbnail: true,
      useImageData: true,
    });

    const layerNodeRefs: LayerNodeRef[] = [];
    extractLayersFromAgPsd(psd.children, 0, { value: 0 }, layerNodeRefs);

    const layerImagesDir = path.join("uploads", "layers", String(fileId));
    if (!fs.existsSync(layerImagesDir)) {
      fs.mkdirSync(layerImagesDir, { recursive: true });
    }

    const layerImages = new Map<number, string>();
    const maskImages = new Map<number, string>();

    for (const ref of layerNodeRefs) {
      try {
        const agLayer = ref.agLayer;

        if (agLayer.imageData) {
          const imgData = agLayer.imageData;
          if (imgData.width > 0 && imgData.height > 0) {
            const layerImagePath = path.join(layerImagesDir, `layer_${ref.id}.png`);
            const pngBuffer = imageDataToPngBuffer({
              width: imgData.width,
              height: imgData.height,
              data: new Uint8ClampedArray(imgData.data)
            });
            fs.writeFileSync(layerImagePath, pngBuffer);
            layerImages.set(ref.id, `/uploads/layers/${fileId}/layer_${ref.id}.png`);
          }
        }

        if (agLayer.mask && (agLayer.mask as any).imageData) {
          const maskData = (agLayer.mask as any).imageData;
          if (maskData.width > 0 && maskData.height > 0) {
            const maskImagePath = path.join(layerImagesDir, `mask_${ref.id}.png`);
            const maskPngBuffer = imageDataToPngBuffer({
              width: maskData.width,
              height: maskData.height,
              data: new Uint8ClampedArray(maskData.data)
            });
            fs.writeFileSync(maskImagePath, maskPngBuffer);
            maskImages.set(ref.id, `/uploads/layers/${fileId}/mask_${ref.id}.png`);
          }
        }
      } catch (layerError: any) {
        console.warn(`Failed to extract layer ${ref.id}:`, layerError?.message || layerError);
      }
    }

    return { success: true, layerImages, maskImages };
  } catch (error: any) {
    console.error("Layer image extraction error:", error);
    return { success: false, error: error.message || "Layer image extraction failed" };
  }
}

async function extractAiLayerImages(filePath: string, fileId: number) {
  try {
    const { default: pdfjsLib } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("canvas");

    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const data = new Uint8Array(fs.readFileSync(filePath));

    const cMapUrl = path.join(process.cwd(), "node_modules/pdfjs-dist/cmaps/");
    const standardFontDataUrl = path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/");

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      disableFontFace: true,
      canvasFactory: new NodeCanvasFactory(createCanvas) as any,
    });

    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const optionalContentConfig = await pdfDoc.getOptionalContentConfig();
    const groups = optionalContentConfig.getGroups();

    if (!groups || Object.keys(groups).length === 0) {
      const viewport = page.getViewport({ scale: 1.0 });
      const canvasFactory = new NodeCanvasFactory(createCanvas);
      const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
      
      await page.render({
        canvasContext: context,
        viewport,
        canvasFactory: canvasFactory as any
      }).promise;
      
      const layerImagesDir = path.join("uploads", "layers", String(fileId));
      if (!fs.existsSync(layerImagesDir)) {
        fs.mkdirSync(layerImagesDir, { recursive: true });
      }
      
      const layerImagePath = path.join(layerImagesDir, `layer_0.png`);
      const buffer = (canvas as any).toBuffer('image/png');
      fs.writeFileSync(layerImagePath, buffer);
      
      const layerImages = new Map<number, string>();
      layerImages.set(0, `/uploads/layers/${fileId}/layer_0.png`);
      
      return { success: true, layerImages, maskImages: new Map() };
    }

    const layerImagesDir = path.join("uploads", "layers", String(fileId));
    if (!fs.existsSync(layerImagesDir)) {
      fs.mkdirSync(layerImagesDir, { recursive: true });
    }

    const layerImages = new Map<number, string>();
    
    // Sort OCG IDs deterministically to ensure stable ID assignment
    const sortedOcgIds = Object.keys(groups).sort();
    
    // Helper to get ID for an OCG
    const getLayerIdForOcg = (ocgId: string): number => {
      return sortedOcgIds.indexOf(ocgId);
    };

    const viewport = page.getViewport({ scale: 1.0 });
    
    for (const key of sortedOcgIds) {
      const layerId = getLayerIdForOcg(key);

      // Set visibility: Only this group is visible
      for (const otherKey in groups) {
        optionalContentConfig.setVisibility(groups[otherKey], otherKey === key);
      }

      const canvasFactory = new NodeCanvasFactory(createCanvas);
      const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
      
      // We must pass intent to display to respect OCG
      await page.render({
        canvasContext: context,
        viewport,
        canvasFactory: canvasFactory as any,
        optionalContentConfigPromise: Promise.resolve(optionalContentConfig)
      }).promise;
      
      const layerImagePath = path.join(layerImagesDir, `layer_${layerId}.png`);
      const buffer = (canvas as any).toBuffer('image/png');
      fs.writeFileSync(layerImagePath, buffer);
      
      layerImages.set(layerId, `/uploads/layers/${fileId}/layer_${layerId}.png`);
    }

    return { success: true, layerImages, maskImages: new Map() };
    
  } catch (error: any) {
    console.error("AI layer image extraction error:", error);
    return { success: false, error: error.message || "AI layer image extraction failed" };
  }
}
