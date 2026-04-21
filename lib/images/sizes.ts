export type PrintSize =
  | "8x10"
  | "11x14"
  | "16x20"
  | "18x24"
  | "24x36"
  | "30x40";

export const PRINT_SIZES: PrintSize[] = [
  "8x10",
  "11x14",
  "16x20",
  "18x24",
  "24x36",
  "30x40",
];

export const PRINT_DIMENSIONS_INCHES: Record<
  PrintSize,
  { w: number; h: number }
> = {
  "8x10": { w: 8, h: 10 },
  "11x14": { w: 11, h: 14 },
  "16x20": { w: 16, h: 20 },
  "18x24": { w: 18, h: 24 },
  "24x36": { w: 24, h: 36 },
  "30x40": { w: 30, h: 40 },
};

export const MIN_DPI = 240;

export type DerivativeKind =
  | "thumb"
  | "catalog"
  | "pdp"
  | "zoom"
  | "social"
  | "email";

export const DERIVATIVE_SPECS: Record<
  DerivativeKind,
  | { longestEdge: number; mode: "contain" }
  | { width: number; height: number; mode: "cover" }
> = {
  thumb: { longestEdge: 300, mode: "contain" },
  catalog: { longestEdge: 600, mode: "contain" },
  pdp: { longestEdge: 1200, mode: "contain" },
  zoom: { longestEdge: 2400, mode: "contain" },
  social: { width: 1200, height: 630, mode: "cover" },
  email: { longestEdge: 600, mode: "contain" },
};

export const MIN_MASTER_LONGEST_EDGE = 2400;
export const MAX_MASTER_BYTES = 200 * 1024 * 1024;
export const ALLOWED_MASTER_MIME = new Set([
  "image/tiff",
  "image/png",
  "image/jpeg",
]);
