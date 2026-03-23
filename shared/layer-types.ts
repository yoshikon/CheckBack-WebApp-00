export interface LayerEffectInfo {
  dropShadow?: Array<{
    enabled: boolean;
    color: { r: number; g: number; b: number; a: number };
    opacity: number;
    angle: number;
    distance: number;
    spread: number;
    size: number;
  }>;
  innerShadow?: Array<{
    enabled: boolean;
    color: { r: number; g: number; b: number; a: number };
    opacity: number;
    angle: number;
    distance: number;
    choke: number;
    size: number;
  }>;
  outerGlow?: Array<{
    enabled: boolean;
    color: { r: number; g: number; b: number; a: number };
    opacity: number;
    size: number;
    spread: number;
  }>;
  innerGlow?: Array<{
    enabled: boolean;
    color: { r: number; g: number; b: number; a: number };
    opacity: number;
    size: number;
    choke: number;
  }>;
  stroke?: Array<{
    enabled: boolean;
    size: number;
    position: string;
    color: { r: number; g: number; b: number; a: number };
    opacity: number;
  }>;
  colorOverlay?: Array<{
    enabled: boolean;
    color: { r: number; g: number; b: number; a: number };
    opacity: number;
    blendMode: string;
  }>;
  gradientOverlay?: Array<{
    enabled: boolean;
    opacity: number;
    blendMode: string;
    angle: number;
  }>;
}

export interface MaskInfo {
  type: "raster" | "vector";
  bounds: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  width: number;
  height: number;
  disabled: boolean;
  invert: boolean;
  defaultColor: number;
}

export interface LayerInfo {
  id: number;
  name: string;
  type: "layer" | "group" | "folder";
  visible: boolean;
  locked: boolean;
  opacity: number;
  fillOpacity: number;
  blendMode: string;
  depth: number;
  children?: LayerInfo[];
  imageUrl?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  mask?: MaskInfo;
  maskImageUrl?: string;
  hasVectorMask?: boolean;
  isClippingMask?: boolean;
  effects?: LayerEffectInfo;
  hasEffects?: boolean;
  isAdjustmentLayer?: boolean;
  isTextLayer?: boolean;
  textContent?: string;
  isSmartObject?: boolean;
}

export interface LayerExtractionResult {
  success: boolean;
  layers?: LayerInfo[];
  error?: string;
  documentWidth?: number;
  documentHeight?: number;
}
