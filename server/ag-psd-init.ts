import { initializeCanvas } from "ag-psd";

function createImageDataImpl(width: number, height: number): { data: Uint8ClampedArray; width: number; height: number };
function createImageDataImpl(data: Uint8ClampedArray, width: number, height?: number): { data: Uint8ClampedArray; width: number; height: number };
function createImageDataImpl(
  widthOrData: number | Uint8ClampedArray,
  widthOrHeight: number,
  maybeHeight?: number
): { data: Uint8ClampedArray; width: number; height: number } {
  if (typeof widthOrData === "number") {
    return {
      data: new Uint8ClampedArray(widthOrData * widthOrHeight * 4),
      width: widthOrData,
      height: widthOrHeight,
    };
  } else {
    const w = widthOrHeight;
    const h = maybeHeight ?? (widthOrData.length / (w * 4));
    return {
      data: widthOrData,
      width: w,
      height: h,
    };
  }
}

function createCanvasImpl(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4);

  const context = {
    canvas: { width, height },
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: true,
    lineWidth: 1,

    save() {},
    restore() {},
    scale() {},
    translate() {},
    transform() {},
    setTransform() {},
    resetTransform() {},

    createImageData(w: number, h: number) {
      return createImageDataImpl(w, h);
    },

    getImageData(sx: number, sy: number, sw: number, sh: number) {
      const result = createImageDataImpl(sw, sh);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const srcIdx = ((sy + y) * width + (sx + x)) * 4;
          const dstIdx = (y * sw + x) * 4;
          if (srcIdx >= 0 && srcIdx + 3 < data.length) {
            result.data[dstIdx] = data[srcIdx];
            result.data[dstIdx + 1] = data[srcIdx + 1];
            result.data[dstIdx + 2] = data[srcIdx + 2];
            result.data[dstIdx + 3] = data[srcIdx + 3];
          }
        }
      }
      return result;
    },

    putImageData(imageData: { data: Uint8ClampedArray; width: number; height: number }, dx: number, dy: number) {
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          const srcIdx = (y * imageData.width + x) * 4;
          const dstIdx = ((dy + y) * width + (dx + x)) * 4;
          if (dstIdx >= 0 && dstIdx + 3 < data.length) {
            data[dstIdx] = imageData.data[srcIdx];
            data[dstIdx + 1] = imageData.data[srcIdx + 1];
            data[dstIdx + 2] = imageData.data[srcIdx + 2];
            data[dstIdx + 3] = imageData.data[srcIdx + 3];
          }
        }
      }
    },

    drawImage() {},
    fillRect(x: number, y: number, w: number, h: number) {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          const idx = (py * width + px) * 4;
          if (idx >= 0 && idx + 3 < data.length) {
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
          }
        }
      }
    },
    clearRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    quadraticCurveTo() {},
    arc() {},
    arcTo() {},
    rect() {},
    fill() {},
    stroke() {},
    clip() {},
    measureText() {
      return { width: 0 };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createPattern() {
      return {};
    },
    drawFocusIfNeeded() {},
  };

  return {
    width,
    height,
    getContext(type: string) {
      if (type === "2d") return context;
      return null;
    },
    toBuffer() {
      return Buffer.from(data.buffer);
    },
    toDataURL() {
      return "";
    },
  };
}

initializeCanvas(createCanvasImpl as any, createImageDataImpl as any);
