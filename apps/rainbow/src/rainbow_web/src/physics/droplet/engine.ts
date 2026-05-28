export type Vec2 = { x: number; y: number };

export type RainbowBand = {
  name: string;
  hex: string;
  n: number;
};

export const RAINBOW_BANDS: RainbowBand[] = [
  { name: 'Red', hex: '#ff3b30', n: 1.331 },
  { name: 'Orange', hex: '#ff9500', n: 1.333 },
  { name: 'Yellow', hex: '#ffd60a', n: 1.335 },
  { name: 'Green', hex: '#34c759', n: 1.338 },
  { name: 'Blue', hex: '#0a84ff', n: 1.343 },
  { name: 'Indigo', hex: '#5e5ce6', n: 1.345 },
  { name: 'Violet', hex: '#bf5af2', n: 1.348 },
];

export type DropletRayResult = {
  points: Vec2[];
  deviationDeg: number | null;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function impactFromU(u: number, radius: number): number {
  // Keep the impact strictly inside the droplet boundary to avoid grazing singularities.
  return clamp01(u) * radius * 0.995;
}

export function uFromImpact(impact: number, radius: number): number {
  if (radius <= 0) {
    return 0;
  }
  return clamp01(impact / (radius * 0.995));
}

export function computeDropletRay(
  xOffset: number,
  nColor: number,
  center: Vec2,
  radius: number,
  screenHeight: number,
  reflections: 1 | 2,
): DropletRayResult {
  const points: Vec2[] = [];
  const startX = center.x + xOffset;
  const startY = screenHeight;
  points.push({ x: startX, y: startY });

  if (Math.abs(xOffset) > radius) {
    points.push({ x: startX, y: 0 });
    return { points, deviationDeg: null };
  }

  const dyEntry = Math.sqrt(Math.max(0, radius * radius - xOffset * xOffset));
  const entry = { x: startX, y: center.y + dyEntry };
  points.push(entry);

  const alpha = Math.asin(xOffset / radius);
  const sinBeta = (1.0003 / nColor) * Math.sin(alpha);
  if (Math.abs(sinBeta) > 1) {
    return { points, deviationDeg: null };
  }

  const beta = Math.asin(sinBeta);
  let theta = Math.atan2(dyEntry, xOffset);
  const step = -(Math.PI - 2 * beta);

  for (let i = 0; i < reflections; i += 1) {
    theta += step;
    points.push({
      x: center.x + radius * Math.cos(theta),
      y: center.y + radius * Math.sin(theta),
    });
  }

  theta += step;
  const exitX = center.x + radius * Math.cos(theta);
  const exitY = center.y + radius * Math.sin(theta);
  points.push({ x: exitX, y: exitY });

  const finalAngle = theta - alpha;
  points.push({
    x: exitX + 1800 * Math.cos(finalAngle),
    y: exitY + 1800 * Math.sin(finalAngle),
  });

  const alphaDeg = Math.abs((alpha * 180) / Math.PI);
  const betaDeg = Math.abs((beta * 180) / Math.PI);
  const deviation = reflections === 1 ? 4 * betaDeg - 2 * alphaDeg : 180 + 2 * alphaDeg - 6 * betaDeg;

  return { points, deviationDeg: Math.abs(deviation) };
}
