// Cache extracted colors in memory
const colorCache = new Map<string, [number, number, number]>();

export async function getAverageColor(imageUrl: string): Promise<[number, number, number]> {
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl)!;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Sample a small version for speed
      canvas.width = 20;
      canvas.height = 28;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 20, 28);
      const data = ctx.getImageData(0, 0, 20, 28).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // skip transparent
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      const avg: [number, number, number] = count > 0
        ? [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
        : [128, 128, 128];
      colorCache.set(imageUrl, avg);
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
