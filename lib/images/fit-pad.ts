import {
  MIN_DPI,
  PRINT_DIMENSIONS_INCHES,
  PRINT_SIZES,
  type PrintSize,
} from "./sizes";

/**
 * TDS §4.2 — fit-pad algorithm.
 *
 * The source image is scaled to fit inside the print rectangle while
 * preserving its aspect ratio. The remaining space becomes a white border.
 * The effective DPI is measured along the axis where the image actually
 * fills the print — i.e. along the longer relative dimension of the image.
 */
export function fitPadDpi(
  sourceWidthPx: number,
  sourceHeightPx: number,
  size: PrintSize,
): number {
  const { w: printW, h: printH } = PRINT_DIMENSIONS_INCHES[size];
  // Orient the print rectangle to match the image orientation so we compare
  // like-with-like (landscape source ↔ landscape print).
  const sourceLandscape = sourceWidthPx >= sourceHeightPx;
  const [pw, ph] = sourceLandscape
    ? [Math.max(printW, printH), Math.min(printW, printH)]
    : [Math.min(printW, printH), Math.max(printW, printH)];

  const srcRatio = sourceWidthPx / sourceHeightPx;
  const printRatio = pw / ph;

  // Axis that fills the print — the tighter of width/height in the scale-to-fit.
  // If source is "wider" than print (higher ratio), width fills; otherwise height fills.
  const fillByWidth = srcRatio >= printRatio;
  const dpi = fillByWidth ? sourceWidthPx / pw : sourceHeightPx / ph;
  return Math.floor(dpi);
}

export function computeEligibility(
  sourceWidthPx: number,
  sourceHeightPx: number,
): { size: PrintSize; dpi: number; eligible: boolean }[] {
  return PRINT_SIZES.map((size) => {
    const dpi = fitPadDpi(sourceWidthPx, sourceHeightPx, size);
    return { size, dpi, eligible: dpi >= MIN_DPI };
  });
}
