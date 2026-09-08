export type Point = { x: number; y: number };
export type GuideMode = "shrink" | "inflate";

export type NormalizationResult = {
  normalizedDataUrl: string;
};

export function normalizeWhiteboardImage(
  image: HTMLImageElement,
  corners?: Point[]
): NormalizationResult {
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = image.naturalWidth;
  srcCanvas.height = image.naturalHeight;
  const srcCtx = srcCanvas.getContext("2d");

  if (!srcCtx) {
    return {
      normalizedDataUrl: image.src
    };
  }

  srcCtx.fillStyle = "white";
  srcCtx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);
  srcCtx.drawImage(image, 0, 0);

  let workingCanvas = srcCanvas;

  if (corners && corners.length === 4) {
    const ordered = orderCorners(corners);
    const [tl, tr, br, bl] = ordered;
    const widthA = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const widthB = Math.hypot(br.x - bl.x, br.y - bl.y);
    const heightA = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const heightB = Math.hypot(br.x - tr.x, br.y - tr.y);
    let outSize = Math.max(600, Math.round(Math.max(widthA, widthB, heightA, heightB)));

    if (!isFinite(outSize) || outSize > 2200) outSize = 800;

    const H = computeHomography(ordered, [
      { x: 0, y: 0 },
      { x: outSize, y: 0 },
      { x: outSize, y: outSize },
      { x: 0, y: outSize }
    ]);

    const warped = warpPerspectiveFull(
      srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height),
      srcCanvas.width,
      srcCanvas.height,
      H,
      outSize,
      outSize
    );

    if (warped) {
      workingCanvas = warped;
    }
  }

  const workingCtx = workingCanvas.getContext("2d");
  if (!workingCtx) {
    return {
      normalizedDataUrl: workingCanvas.toDataURL("image/png")
    };
  }

  return {
    normalizedDataUrl: workingCanvas.toDataURL("image/png")
  };
}

export function identifyFigureArea(
  image: HTMLImageElement,
  guidePoints?: Point[],
  mode: GuideMode = "shrink"
): Point[] {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return [];
  }

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (guidePoints && guidePoints.length >= 3) {
    return refineOutlineFromGuide(imageData, guidePoints, mode);
  }

  return detectFigureOutline(imageData);
}

function refineOutlineFromGuide(imageData: ImageData, guidePoints: Point[], mode: GuideMode): Point[] {
  const { width, height, data } = imageData;
  const gray = toGray(data, width, height);
  const smooth = boxBlur(boxBlur(gray, width, height, 2), width, height, 2);
  const grad = computeGradient(smooth, width, height);
  const centroid = polygonCentroid(guidePoints);
  const refined: Point[] = [];

  for (let i = 0; i < guidePoints.length; i += 1) {
    const pt = guidePoints[i];
    const dx = pt.x - centroid.x;
    const dy = pt.y - centroid.y;
    const baseDistance = Math.max(8, Math.hypot(dx, dy));
    const direction = {
      x: dx / baseDistance,
      y: dy / baseDistance
    };

    const snapped = snapGuidePoint(
      smooth,
      grad,
      width,
      height,
      centroid,
      direction,
      baseDistance,
      mode
    );

    refined.push(snapped);
  }

  return smoothClosedPolygon(safeSimplifyPolygon(refined, 10), 2);
}

function orderCorners(pts: Point[]): Point[] {
  if (pts.length !== 4) {
    return pts;
  }

  const cx = pts.reduce((sum, pt) => sum + pt.x, 0) / pts.length;
  const cy = pts.reduce((sum, pt) => sum + pt.y, 0) / pts.length;

  const clockwise = [...pts].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  let topLeftIndex = 0;
  let minSum = Number.POSITIVE_INFINITY;
  for (let i = 0; i < clockwise.length; i += 1) {
    const sum = clockwise[i].x + clockwise[i].y;
    if (sum < minSum) {
      minSum = sum;
      topLeftIndex = i;
    }
  }

  const rotated = clockwise
    .slice(topLeftIndex)
    .concat(clockwise.slice(0, topLeftIndex));

  const area = polygonSignedArea(rotated);
  if (area < 0) {
    return [rotated[0], rotated[3], rotated[2], rotated[1]];
  }

  return rotated;
}

function polygonSignedArea(pts: Point[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const next = pts[(i + 1) % pts.length];
    area += pts[i].x * next.y - next.x * pts[i].y;
  }
  return area / 2;
}

function computeHomography(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; ++i) {
    const { x: x1, y: y1 } = src[i];
    const { x: x2, y: y2 } = dst[i];

    A.push([x1, y1, 1, 0, 0, 0, -x2 * x1, -x2 * y1]);
    b.push(x2);

    A.push([0, 0, 0, x1, y1, 1, -y2 * x1, -y2 * y1]);
    b.push(y2);
  }

  const solution = solveLinearSystem(A, b);
  if (!solution) {
    return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ];
  }

  return [
    solution[0], solution[1], solution[2],
    solution[3], solution[4], solution[5],
    solution[6], solution[7], 1
  ];
}

function solveLinearSystem(matrix: number[][], values: number[]): number[] | null {
  const n = values.length;
  const augmented = matrix.map((row, i) => [...row, values[i]]);

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivotRow][col])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][col]) < 1e-10) {
      return null;
    }

    if (pivotRow !== col) {
      [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];
    }

    const pivot = augmented[col][col];
    for (let j = col; j <= n; j += 1) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === col) {
        continue;
      }

      const factor = augmented[row][col];
      if (Math.abs(factor) < 1e-12) {
        continue;
      }

      for (let j = col; j <= n; j += 1) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map((row) => row[n]);
}

function warpPerspectiveFull(
  srcImageData: ImageData,
  width: number,
  height: number,
  H: number[],
  outW: number,
  outH: number
): HTMLCanvasElement | null {
  const Hinv = invert3x3(H);
  if (!Hinv) {
    return null;
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) {
    return null;
  }

  const outData = outCtx.createImageData(outW, outH);
  const src = srcImageData.data;
  const dst = outData.data;

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const sp = applyHomography(x, y, Hinv);
      const idx = (y * outW + x) * 4;

      if (sp.x < 0 || sp.y < 0 || sp.x >= width - 1 || sp.y >= height - 1) {
        dst[idx] = 255;
        dst[idx + 1] = 255;
        dst[idx + 2] = 255;
        dst[idx + 3] = 255;
        continue;
      }

      const x0 = Math.floor(sp.x);
      const y0 = Math.floor(sp.y);
      const dx = sp.x - x0;
      const dy = sp.y - y0;
      const i00 = (y0 * width + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + width * 4;
      const i11 = i01 + 4;

      for (let c = 0; c < 4; c += 1) {
        const v00 = src[i00 + c];
        const v10 = src[i10 + c];
        const v01 = src[i01 + c];
        const v11 = src[i11 + c];
        const v0 = v00 * (1 - dx) + v10 * dx;
        const v1 = v01 * (1 - dx) + v11 * dx;
        dst[idx + c] = Math.round(v0 * (1 - dy) + v1 * dy);
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}

function applyHomography(x: number, y: number, H: number[]): Point {
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-12) {
    return { x: 0, y: 0 };
  }

  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w
  };
}

function invert3x3(m: number[]): number[] | null {
  const a = m[0], b = m[1], c = m[2];
  const d = m[3], e = m[4], f = m[5];
  const g = m[6], h = m[7], i = m[8];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) {
    return null;
  }

  const invDet = 1 / det;
  return [
    A * invDet,
    D * invDet,
    G * invDet,
    B * invDet,
    E * invDet,
    H * invDet,
    C * invDet,
    F * invDet,
    I * invDet
  ];
}

function detectFigureOutline(imageData: ImageData): Point[] {
  const { width, height, data } = imageData;
  const gray = toGray(data, width, height);
  const medium = boxBlur(boxBlur(gray, width, height, 2), width, height, 2);
  const background = boxBlur(boxBlur(medium, width, height, 10), width, height, 10);
  const grad = computeGradient(medium, width, height);
  const residuals = new Float32Array(width * height);
  const scoreMap = new Float32Array(width * height);
  let maxResidual = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const residual = Math.max(0, background[i] - medium[i]);
      residuals[i] = residual;
      if (residual > maxResidual) {
        maxResidual = residual;
      }
    }
  }

  const residualCutoff = Math.max(4, maxResidual * 0.12);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      if (residuals[i] < residualCutoff) {
        continue;
      }

      let tangent = Math.atan2(grad[i * 2 + 1], grad[i * 2]) + Math.PI / 2;
      while (tangent < 0) tangent += Math.PI;
      while (tangent >= Math.PI) tangent -= Math.PI;

      const tangentDeg = (tangent * 180) / Math.PI;
      const axisDistance = Math.min(
        circularDistanceDeg(tangentDeg, 0),
        circularDistanceDeg(tangentDeg, 90)
      );

      if (axisDistance < 12) {
        continue;
      }

      scoreMap[i] = residuals[i] * Math.max(0.2, axisDistance / 90);
    }
  }

  const xRange = findWideActiveRange(scoreMap, width, height);
  const fallbackRange = xRange ?? findFallbackRange(scoreMap, width, height);
  if (!fallbackRange) {
    return [];
  }

  const envelope = buildEnvelopePolygon(scoreMap, width, height, fallbackRange.start, fallbackRange.end);
  if (envelope.length < 3) {
    return [];
  }

  return smoothClosedPolygon(safeSimplifyPolygon(envelope, 12), 3);
}

function toGray(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < gray.length; p += 1, i += 4) {
    gray[p] = Math.round((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3);
  }
  return gray;
}

function boxBlur(gray: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
          sum += gray[yy * width + xx];
          count += 1;
        }
      }
      out[y * width + x] = Math.round(sum / count);
    }
  }
  return out;
}

function computeGradient(gray: Uint8Array, width: number, height: number): Float32Array {
  const grad = new Float32Array(width * height * 2);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      grad[i * 2] = gray[i + 1] - gray[i - 1];
      grad[i * 2 + 1] = gray[i + width] - gray[i - width];
    }
  }
  return grad;
}

function polygonCentroid(points: Point[]): Point {
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < points.length; i += 1) {
    sumX += points[i].x;
    sumY += points[i].y;
  }
  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

function snapGuidePoint(
  gray: Uint8Array,
  grad: Float32Array,
  width: number,
  height: number,
  centroid: Point,
  direction: Point,
  baseDistance: number,
  mode: GuideMode
): Point {
  const perpendicular = { x: -direction.y, y: direction.x };
  const searchStart = mode === "shrink" ? baseDistance * 0.4 : baseDistance * 0.9;
  const searchEnd = mode === "shrink" ? baseDistance * 1.08 : baseDistance * 1.8;
  const step = 1.5;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestPoint = {
    x: centroid.x + direction.x * baseDistance,
    y: centroid.y + direction.y * baseDistance
  };

  for (let distance = searchStart; distance <= searchEnd; distance += step) {
    const x = centroid.x + direction.x * distance;
    const y = centroid.y + direction.y * distance;
    if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) {
      continue;
    }

    const score = sampleBoundaryScore(gray, grad, width, height, x, y, perpendicular);
    const distancePenalty = Math.abs(distance - baseDistance) * (mode === "shrink" ? 0.18 : 0.1);
    const weighted = score - distancePenalty;

    if (weighted > bestScore) {
      bestScore = weighted;
      bestPoint = { x, y };
    }
  }

  return bestPoint;
}

function sampleBoundaryScore(
  gray: Uint8Array,
  grad: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  perpendicular: Point
): number {
  let score = 0;
  let samples = 0;

  for (let offset = -2; offset <= 2; offset += 1) {
    const sx = x + perpendicular.x * offset;
    const sy = y + perpendicular.y * offset;
    const ix = Math.max(1, Math.min(width - 2, Math.round(sx)));
    const iy = Math.max(1, Math.min(height - 2, Math.round(sy)));
    const index = iy * width + ix;
    const darkness = 255 - gray[index];
    const edge = Math.abs(grad[index * 2]) + Math.abs(grad[index * 2 + 1]);
    score += darkness * 0.55 + edge * 1.4;
    samples += 1;
  }

  return score / Math.max(1, samples);
}

function circularDistanceDeg(a: number, b: number): number {
  let diff = Math.abs(a - b) % 180;
  if (diff > 90) {
    diff = 180 - diff;
  }
  return diff;
}

function findWideActiveRange(
  scoreMap: Float32Array,
  width: number,
  height: number
): { start: number; end: number } | null {
  const columnScores = new Float32Array(width);
  let maxScore = 0;

  for (let x = 0; x < width; x += 1) {
    let score = 0;
    for (let y = 0; y < height; y += 1) {
      score = Math.max(score, scoreMap[y * width + x]);
    }
    columnScores[x] = score;
    if (score > maxScore) {
      maxScore = score;
    }
  }

  const smoothScores = smoothSeries(columnScores, Math.max(4, Math.round(width * 0.015)));
  const cutoff = Math.max(1, maxScore * 0.3);

  let bestStart = -1;
  let bestEnd = -1;
  let currentStart = -1;

  for (let x = 0; x < width; x += 1) {
    if (smoothScores[x] >= cutoff) {
      if (currentStart < 0) {
        currentStart = x;
      }
      continue;
    }

    if (currentStart >= 0) {
      if (x - currentStart > bestEnd - bestStart) {
        bestStart = currentStart;
        bestEnd = x - 1;
      }
      currentStart = -1;
    }
  }

  if (currentStart >= 0 && width - currentStart > bestEnd - bestStart) {
    bestStart = currentStart;
    bestEnd = width - 1;
  }

  if (bestStart < 0 || bestEnd <= bestStart) {
    return null;
  }

  if (bestEnd - bestStart < width * 0.45) {
    return null;
  }

  return {
    start: bestStart,
    end: bestEnd
  };
}

function findFallbackRange(
  scoreMap: Float32Array,
  width: number,
  height: number
): { start: number; end: number } | null {
  const columnScores = new Float32Array(width);
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = 0; y < height; y += 1) {
      sum += scoreMap[y * width + x];
    }
    columnScores[x] = sum;
  }

  const smoothScores = smoothSeries(columnScores, Math.max(6, Math.round(width * 0.02)));
  const targetWidth = Math.max(10, Math.round(width * 0.55));
  let bestStart = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let start = 0; start <= width - targetWidth; start += 1) {
    let score = 0;
    for (let x = start; x < start + targetWidth; x += 1) {
      score += smoothScores[x];
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  if (bestScore <= 0) {
    return null;
  }

  return {
    start: bestStart,
    end: Math.min(width - 1, bestStart + targetWidth - 1)
  };
}

function buildEnvelopePolygon(
  scoreMap: Float32Array,
  width: number,
  height: number,
  startX: number,
  endX: number
): Point[] {
  const firstCurve = traceDominantCurve(scoreMap, width, height, startX, endX);
  if (firstCurve.length === 0) {
    return [];
  }

  const suppressed = suppressCurveBand(
    scoreMap,
    width,
    height,
    startX,
    firstCurve,
    Math.max(10, Math.round(height * 0.06))
  );
  const secondCurve = traceDominantCurve(suppressed, width, height, startX, endX);
  if (secondCurve.length === 0) {
    return [];
  }

  const top = new Float32Array(firstCurve.length);
  const bottom = new Float32Array(firstCurve.length);
  for (let i = 0; i < firstCurve.length; i += 1) {
    top[i] = Math.min(firstCurve[i], secondCurve[i]);
    bottom[i] = Math.max(firstCurve[i], secondCurve[i]);
  }

  const topSmooth = smoothSeries(top, Math.max(4, Math.round(firstCurve.length * 0.02)));
  const bottomSmooth = smoothSeries(bottom, Math.max(4, Math.round(firstCurve.length * 0.02)));
  const minGap = Math.max(8, Math.round(height * 0.08));
  const maxGap = Math.round(height * 0.55);
  const support = new Float32Array(firstCurve.length);
  let maxSupport = 0;

  for (let i = 0; i < firstCurve.length; i += 1) {
    const x = startX + i;
    const topScore = sampleVerticalNeighborhood(scoreMap, width, height, x, topSmooth[i], 3);
    const bottomScore = sampleVerticalNeighborhood(scoreMap, width, height, x, bottomSmooth[i], 3);
    support[i] = Math.min(topScore, bottomScore);
    maxSupport = Math.max(maxSupport, support[i]);
  }

  const trimmed = findStrongSupportWindow(support, topSmooth, bottomSmooth, minGap, maxGap);
  const stableWindow = findStableGapWindow(topSmooth, bottomSmooth, minGap, maxGap);
  const activeWindow = trimmed && trimmed.end - trimmed.start >= firstCurve.length * 0.35
    ? trimmed
    : stableWindow;

  if (!activeWindow) {
    return buildRawCurvePolygon(startX, topSmooth, bottomSmooth, minGap, maxGap);
  }

  const topPoints: Point[] = [];
  const bottomPoints: Point[] = [];

  for (let i = activeWindow.start; i <= activeWindow.end; i += 1) {
    const gap = bottomSmooth[i] - topSmooth[i];
    if (gap < minGap || gap > maxGap) {
      continue;
    }

    const x = startX + i;
    topPoints.push({ x, y: topSmooth[i] });
    bottomPoints.push({ x, y: bottomSmooth[i] });
  }

  if (topPoints.length < 3 || bottomPoints.length < 3) {
    return buildRawCurvePolygon(startX, topSmooth, bottomSmooth, minGap, maxGap);
  }

  return buildTaperedPolygon(topPoints, bottomPoints);
}

function buildRawCurvePolygon(
  startX: number,
  top: Float32Array,
  bottom: Float32Array,
  minGap: number,
  maxGap: number
): Point[] {
  const topPoints: Point[] = [];
  const bottomPoints: Point[] = [];

  for (let i = 0; i < top.length; i += 1) {
    const gap = bottom[i] - top[i];
    if (gap < minGap || gap > maxGap) {
      continue;
    }

    const x = startX + i;
    topPoints.push({ x, y: top[i] });
    bottomPoints.push({ x, y: bottom[i] });
  }

  if (topPoints.length < 3 || bottomPoints.length < 3) {
    return [];
  }

  return buildTaperedPolygon(topPoints, bottomPoints);
}

function sampleVerticalNeighborhood(
  scoreMap: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number
): number {
  let best = 0;
  const yy = Math.round(y);
  for (let py = Math.max(0, yy - radius); py <= Math.min(height - 1, yy + radius); py += 1) {
    best = Math.max(best, scoreMap[py * width + x]);
  }
  return best;
}

function findStrongSupportWindow(
  support: Float32Array,
  top: Float32Array,
  bottom: Float32Array,
  minGap: number,
  maxGap: number
): { start: number; end: number } | null {
  let maxSupport = 0;
  for (let i = 0; i < support.length; i += 1) {
    maxSupport = Math.max(maxSupport, support[i]);
  }

  if (maxSupport <= 0) {
    return null;
  }

  const cutoff = maxSupport * 0.18;
  let bestStart = -1;
  let bestEnd = -1;
  let currentStart = -1;

  for (let i = 0; i < support.length; i += 1) {
    const gap = bottom[i] - top[i];
    const stableGap = gap >= minGap && gap <= maxGap;
    const strongEnough = support[i] >= cutoff;

    if (stableGap && strongEnough) {
      if (currentStart < 0) {
        currentStart = i;
      }
      continue;
    }

    if (currentStart >= 0) {
      if (i - currentStart > bestEnd - bestStart) {
        bestStart = currentStart;
        bestEnd = i - 1;
      }
      currentStart = -1;
    }
  }

  if (currentStart >= 0 && support.length - currentStart > bestEnd - bestStart) {
    bestStart = currentStart;
    bestEnd = support.length - 1;
  }

  if (bestStart < 0 || bestEnd <= bestStart) {
    return null;
  }

  return { start: bestStart, end: bestEnd };
}

function findStableGapWindow(
  top: Float32Array,
  bottom: Float32Array,
  minGap: number,
  maxGap: number
): { start: number; end: number } | null {
  let bestStart = -1;
  let bestEnd = -1;
  let currentStart = -1;

  for (let i = 0; i < top.length; i += 1) {
    const gap = bottom[i] - top[i];
    const stableGap = gap >= minGap && gap <= maxGap;

    if (stableGap) {
      if (currentStart < 0) {
        currentStart = i;
      }
      continue;
    }

    if (currentStart >= 0) {
      if (i - currentStart > bestEnd - bestStart) {
        bestStart = currentStart;
        bestEnd = i - 1;
      }
      currentStart = -1;
    }
  }

  if (currentStart >= 0 && top.length - currentStart > bestEnd - bestStart) {
    bestStart = currentStart;
    bestEnd = top.length - 1;
  }

  if (bestStart < 0 || bestEnd <= bestStart) {
    return null;
  }

  return { start: bestStart, end: bestEnd };
}

function buildTaperedPolygon(topPoints: Point[], bottomPoints: Point[]): Point[] {
  if (topPoints.length < 3 || bottomPoints.length < 3) {
    return topPoints.concat([...bottomPoints].reverse());
  }

  const taperedTop = taperRightEnd(topPoints, bottomPoints);
  const taperedBottom = taperRightEnd(bottomPoints, topPoints);
  const leftTip = createTipPoint(taperedTop, taperedBottom, "start");
  const rightTip = createTipPoint(taperedTop, taperedBottom, "end");
  const topBody = taperedTop.slice(1, -1);
  const bottomBody = taperedBottom.slice(1, -1).reverse();

  return [leftTip, ...topBody, rightTip, ...bottomBody];
}

function taperRightEnd(primary: Point[], opposite: Point[]): Point[] {
  const tapered = primary.map((point) => ({ ...point }));
  const span = Math.min(6, Math.floor((primary.length - 1) / 3));

  for (let offset = 0; offset <= span; offset += 1) {
    const weight = (span - offset + 1) / (span + 2);
    const endIndex = primary.length - 1 - offset;
    const endMid = midpoint(primary[endIndex], opposite[endIndex]);
    tapered[endIndex] = blendPoints(primary[endIndex], endMid, weight * 0.75);
  }

  return tapered;
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function blendPoints(a: Point, b: Point, t: number): Point {
  return {
    x: a.x * (1 - t) + b.x * t,
    y: a.y * (1 - t) + b.y * t
  };
}

function safeSimplifyPolygon(points: Point[], minSpacing: number): Point[] {
  const simplified = simplifyPolygon(points, minSpacing);
  if (simplified.length >= 3) {
    return simplified;
  }

  const softer = simplifyPolygon(points, Math.max(4, Math.floor(minSpacing / 2)));
  if (softer.length >= 3) {
    return softer;
  }

  return points;
}

function smoothClosedPolygon(points: Point[], iterations: number): Point[] {
  if (points.length < 3) {
    return points;
  }

  let current = points;
  for (let iter = 0; iter < iterations; iter += 1) {
    const next: Point[] = [];
    for (let i = 0; i < current.length; i += 1) {
      const a = current[i];
      const b = current[(i + 1) % current.length];
      next.push({
        x: a.x * 0.75 + b.x * 0.25,
        y: a.y * 0.75 + b.y * 0.25
      });
      next.push({
        x: a.x * 0.25 + b.x * 0.75,
        y: a.y * 0.25 + b.y * 0.75
      });
    }
    current = next;
  }

  return safeSimplifyPolygon(current, 6);
}

function createTipPoint(
  topPoints: Point[],
  bottomPoints: Point[],
  side: "start" | "end"
): Point {
  const radius = Math.min(3, topPoints.length - 1, bottomPoints.length - 1);
  let sumX = 0;
  let sumY = 0;
  let sumW = 0;

  for (let offset = 0; offset <= radius; offset += 1) {
    const index = side === "start" ? offset : topPoints.length - 1 - offset;
    const weight = radius + 1 - offset;
    const top = topPoints[index];
    const bottom = bottomPoints[index];

    sumX += ((top.x + bottom.x) / 2) * weight;
    sumY += ((top.y + bottom.y) / 2) * weight;
    sumW += weight;
  }

  return {
    x: sumX / sumW,
    y: sumY / sumW
  };
}

function traceDominantCurve(
  scoreMap: Float32Array,
  width: number,
  height: number,
  startX: number,
  endX: number
): number[] {
  const columns = endX - startX + 1;
  const maxStep = Math.max(8, Math.round(height * 0.04));
  const penalty = 1.4;
  const prev = new Float32Array(height);
  const curr = new Float32Array(height);
  const backtrack = new Int16Array(columns * height);

  for (let y = 0; y < height; y += 1) {
    prev[y] = scoreMap[y * width + startX];
  }

  for (let col = 1; col < columns; col += 1) {
    const x = startX + col;
    for (let y = 0; y < height; y += 1) {
      let bestScore = Number.NEGATIVE_INFINITY;
      let bestPrev = y;
      for (let py = Math.max(0, y - maxStep); py <= Math.min(height - 1, y + maxStep); py += 1) {
        const candidate = prev[py] - Math.abs(py - y) * penalty;
        if (candidate > bestScore) {
          bestScore = candidate;
          bestPrev = py;
        }
      }
      curr[y] = bestScore + scoreMap[y * width + x];
      backtrack[col * height + y] = bestPrev;
    }
    prev.set(curr);
  }

  let bestY = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let y = 0; y < height; y += 1) {
    if (prev[y] > bestScore) {
      bestScore = prev[y];
      bestY = y;
    }
  }

  if (bestScore <= 0) {
    return [];
  }

  const curve = new Array<number>(columns);
  curve[columns - 1] = bestY;
  for (let col = columns - 1; col > 0; col -= 1) {
    curve[col - 1] = backtrack[col * height + curve[col]];
  }

  return curve;
}

function suppressCurveBand(
  scoreMap: Float32Array,
  width: number,
  height: number,
  startX: number,
  curve: number[],
  bandRadius: number
): Float32Array {
  const next = new Float32Array(scoreMap);
  for (let i = 0; i < curve.length; i += 1) {
    const x = startX + i;
    for (let y = Math.max(0, curve[i] - bandRadius); y <= Math.min(height - 1, curve[i] + bandRadius); y += 1) {
      next[y * width + x] = 0;
    }
  }
  return next;
}

function smoothSeries(values: Float32Array, radius: number): Float32Array {
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(values.length - 1, i + radius); j += 1) {
      sum += values[j];
      count += 1;
    }
    out[i] = sum / Math.max(1, count);
  }
  return out;
}

function simplifyPolygon(points: Point[], minSpacing: number): Point[] {
  if (points.length < 3) {
    return points;
  }

  const simplified: Point[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = simplified[simplified.length - 1];
    if (Math.hypot(points[i].x - prev.x, points[i].y - prev.y) >= minSpacing) {
      simplified.push(points[i]);
    }
  }

  if (simplified.length >= 3) {
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < minSpacing) {
      simplified.pop();
    }
  }

  return simplified;
}
