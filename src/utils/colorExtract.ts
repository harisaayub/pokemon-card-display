import type { Crop } from '../types';

// Cache key = imageUrl + serialised crop fractions
const colorCache = new Map<string, [number, number, number]>();

function cacheKey(imageUrl: string, crop: Crop) {
  return `${imageUrl}|${crop.top.toFixed(3)},${crop.bottom.toFixed(3)},${crop.left.toFixed(3)},${crop.right.toFixed(3)}`;
}

export async function getAverageColor(
  imageUrl: string,
  crop: Crop = { top: 0, bottom: 0, left: 0, right: 0 },
): Promise<[number, number, number]> {
  const key = cacheKey(imageUrl, crop);
  if (colorCache.has(key)) return colorCache.get(key)!;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;

      // Crop window in natural-image pixels
      const x0 = Math.round(crop.left   * W);
      const y0 = Math.round(crop.top    * H);
      const x1 = Math.round((1 - crop.right)  * W);
      const y1 = Math.round((1 - crop.bottom) * H);
      const cw = Math.max(1, x1 - x0);
      const ch = Math.max(1, y1 - y0);

      // Downsample the cropped region to ~20×28 for speed
      const SAMPLE_W = 20;
      const SAMPLE_H = 28;
      const canvas = document.createElement('canvas');
      canvas.width = SAMPLE_W;
      canvas.height = SAMPLE_H;
      const ctx = canvas.getContext('2d')!;
      // Draw only the cropped portion, scaled to sample size
      ctx.drawImage(img, x0, y0, cw, ch, 0, 0, SAMPLE_W, SAMPLE_H);

      const data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      const avg: [number, number, number] = count > 0
        ? [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
        : [128, 128, 128];
      colorCache.set(key, avg);
      resolve(avg);
    };
    img.onerror = () => resolve([128, 128, 128]);
    img.src = imageUrl;
  });
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}
