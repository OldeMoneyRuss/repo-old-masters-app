import Vibrant from "node-vibrant";

export async function extractDominantColors(buffer: Buffer): Promise<string[]> {
  const palette = await Vibrant.from(buffer).quality(3).maxColorCount(64).getPalette();
  const order = [
    "Vibrant",
    "Muted",
    "DarkVibrant",
    "LightVibrant",
    "DarkMuted",
    "LightMuted",
  ] as const;
  const hex: string[] = [];
  for (const key of order) {
    const swatch = palette[key];
    if (swatch?.hex && !hex.includes(swatch.hex)) {
      hex.push(swatch.hex);
      if (hex.length === 5) break;
    }
  }
  return hex;
}
