export type Vec2 = { x: number; y: number };

export type Droplet2Band = {
  name: string;
  hex: string;
  n: number;
};

export const DROPLET2_BANDS: Droplet2Band[] = [
  { name: 'Red', hex: '#ff3b30', n: 1.331 },
  { name: 'Orange', hex: '#ff9500', n: 1.333 },
  { name: 'Yellow', hex: '#ffd60a', n: 1.335 },
  { name: 'Green', hex: '#34c759', n: 1.338 },
  { name: 'Blue', hex: '#0a84ff', n: 1.343 },
  { name: 'Indigo', hex: '#5e5ce6', n: 1.345 },
  { name: 'Violet', hex: '#bf5af2', n: 1.348 },
];

export type LayerRay = {
  bandIndex: number;
  points: Vec2[];
  family: 'transmitted' | 'primary' | 'secondary';
};

export function offsetSequence(radius: number, step = 0.2, factor = 0.98): number[] {
  const start = 0;
  const end = radius * factor;
  const out: number[] = [];
  for (let x = start; x <= end; x += step) {
    out.push(x);
  }
  return out;
}

function mirrorPointsX(points: Vec2[], centerX: number): Vec2[] {
  return points.map((p) => ({ x: 2 * centerX - p.x, y: p.y }));
}

export function computeDroplet2Path(
  xOffset: number,
  nColor: number,
  reflections: 0 | 1 | 2,
  center: Vec2,
  radius: number,
  sceneHeight: number,
): Vec2[] {
  if (Math.abs(xOffset) > radius * 0.999) {
    return [];
  }

  const points: Vec2[] = [];
  const startX = center.x + xOffset;
  points.push({ x: startX, y: sceneHeight });

  const dyEntry = Math.sqrt(radius * radius - xOffset * xOffset);
  points.push({ x: startX, y: center.y + dyEntry });

  const alpha = Math.asin(xOffset / radius);
  const sinBeta = (1.0003 / nColor) * Math.sin(alpha);
  if (Math.abs(sinBeta) > 1) {
    return [];
  }

  const beta = Math.asin(sinBeta);
  let theta = Math.atan2(dyEntry, xOffset);
  const rotationStep = -(Math.PI - 2 * beta);

  for (let i = 0; i < reflections; i += 1) {
    theta += rotationStep;
    points.push({
      x: center.x + radius * Math.cos(theta),
      y: center.y + radius * Math.sin(theta),
    });
  }

  theta += rotationStep;
  const exitX = center.x + radius * Math.cos(theta);
  const exitY = center.y + radius * Math.sin(theta);
  points.push({ x: exitX, y: exitY });

  const finalAngle = theta - alpha;
  points.push({
    x: exitX + 2600 * Math.cos(finalAngle),
    y: exitY + 2600 * Math.sin(finalAngle),
  });

  return points;
}

export function buildLayerSlice(
  offset: number,
  reflections: 0 | 1 | 2,
  center: Vec2,
  radius: number,
  sceneHeight: number,
): LayerRay[] {
  const slice: LayerRay[] = [];
  const impact = Math.abs(offset);

  // Draw violet first, red last to mimic legacy layering feel.
  for (let i = DROPLET2_BANDS.length - 1; i >= 0; i -= 1) {
    const band = DROPLET2_BANDS[i];
    const points = computeDroplet2Path(impact, band.n, reflections, center, radius, sceneHeight);
    if (points.length >= 2) {
      slice.push({
        bandIndex: i,
        points,
        family: reflections === 0 ? 'transmitted' : reflections === 1 ? 'primary' : 'secondary',
      });

      // Mirror the right-side path to the left to guarantee visual symmetry.
      if (impact > 1e-6) {
        slice.push({
          bandIndex: i,
          points: mirrorPointsX(points, center.x),
          family: reflections === 0 ? 'transmitted' : reflections === 1 ? 'primary' : 'secondary',
        });
      }
    }
  }

  return slice;
}
