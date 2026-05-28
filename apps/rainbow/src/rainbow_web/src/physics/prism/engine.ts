export type PrismMode = 'air' | 'block_straight' | 'block_rotated' | 'triangle';

export type Vec2 = { x: number; y: number };
export type SpectrumBand = { name: string; color: string; n: number };
export type PrismRay = { band: SpectrumBand; points: Vec2[] };
export type PrismSnapshot = { mode: PrismMode; polygon: Vec2[]; rays: PrismRay[] };

type Edge = { a: Vec2; b: Vec2; normal: Vec2 };

const WIDTH = 1000;
const HEIGHT = 460;

const SPECTRUM: SpectrumBand[] = [
  { name: 'Red', color: '#ff3b30', n: 1.25 },
  { name: 'Orange', color: '#ff8c00', n: 1.29 },
  { name: 'Yellow', color: '#ffd60a', n: 1.33 },
  { name: 'Green', color: '#30d158', n: 1.38 },
  { name: 'Blue', color: '#0a84ff', n: 1.42 },
  { name: 'Indigo', color: '#5e5ce6', n: 1.46 },
  { name: 'Violet', color: '#bf5af2', n: 1.5 },
];

function v(x: number, y: number): Vec2 {
  return { x, y };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return v(a.x + b.x, a.y + b.y);
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return v(a.x - b.x, a.y - b.y);
}

function mul(a: Vec2, s: number): Vec2 {
  return v(a.x * s, a.y * s);
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function len(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l > 0 ? v(a.x / l, a.y / l) : v(0, 0);
}

function rotate(p: Vec2, center: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const t = sub(p, center);
  return add(v(t.x * c - t.y * s, t.x * s + t.y * c), center);
}

function buildModePolygon(mode: PrismMode): Vec2[] {
  if (mode === 'air') {
    return [];
  }

  if (mode === 'block_straight') {
    const cx = 560;
    const cy = 230;
    const hw = 141;
    const hh = 95;
    return [v(cx - hw, cy - hh), v(cx - hw, cy + hh), v(cx + hw, cy + hh), v(cx + hw, cy - hh)];
  }

  if (mode === 'block_rotated') {
    const cx = 560;
    const cy = 230;
    const hw = 145;
    const hh = 145;
    const rect = [v(cx - hw, cy - hh), v(cx - hw, cy + hh), v(cx + hw, cy + hh), v(cx + hw, cy - hh)];
    return rect.map((p) => rotate(p, v(cx, cy), 30));
  }

  const cx = 590;
  const cy = 240;
  const r = 170;
  const out: Vec2[] = [];
  for (let i = 0; i < 3; i += 1) {
    const a = ((90 + i * 120) * Math.PI) / 180;
    out.push(v(cx + r * Math.cos(a), cy - r * Math.sin(a)));
  }
  return out;
}

function polygonEdges(poly: Vec2[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const e = sub(b, a);
    edges.push({ a, b, normal: norm(v(-e.y, e.x)) });
  }
  return edges;
}

function intersectRaySegment(origin: Vec2, dir: Vec2, a: Vec2, b: Vec2): { t: number; u: number } | null {
  const s = sub(b, a);
  const den = cross(dir, s);
  if (Math.abs(den) < 1e-9) {
    return null;
  }

  const ap = sub(a, origin);
  const t = cross(ap, s) / den;
  const u = cross(ap, dir) / den;
  if (t < 1e-6 || u < -1e-6 || u > 1 + 1e-6) {
    return null;
  }

  return { t, u };
}

function refractOrReflect(dir: Vec2, normal: Vec2, n1: number, n2: number): Vec2 {
  const incident = norm(dir);
  const eta = n1 / n2;
  const c1 = -dot(incident, normal);
  const cs2Sq = 1 - eta * eta * (1 - c1 * c1);

  if (cs2Sq < 0) {
    const reflected = add(incident, mul(normal, 2 * c1));
    return norm(reflected);
  }

  const term = eta * c1 - Math.sqrt(cs2Sq);
  return norm(add(mul(incident, eta), mul(normal, term)));
}

function traceBand(start: Vec2, dir: Vec2, nBand: number, poly: Vec2[]): Vec2[] {
  const pts: Vec2[] = [start];

  if (poly.length === 0) {
    pts.push(add(start, mul(dir, 960)));
    return pts;
  }

  const edges = polygonEdges(poly);
  let pos = start;
  let ray = norm(dir);
  let inside = false;

  for (let bounce = 0; bounce < 6; bounce += 1) {
    let bestT = Number.POSITIVE_INFINITY;
    let best: Edge | null = null;

    for (const edge of edges) {
      const hit = intersectRaySegment(pos, ray, edge.a, edge.b);
      if (hit && hit.t < bestT) {
        bestT = hit.t;
        best = edge;
      }
    }

    if (!best || !Number.isFinite(bestT)) {
      pts.push(add(pos, mul(ray, 960)));
      break;
    }

    const hitPos = add(pos, mul(ray, bestT));
    pts.push(hitPos);

    const entering = dot(ray, best.normal) < 0;
    const normalEff = entering ? best.normal : mul(best.normal, -1);
    const n1 = entering ? 1.0 : nBand;
    const n2 = entering ? nBand : 1.0;

    ray = refractOrReflect(ray, normalEff, n1, n2);
    inside = entering ? true : dot(ray, best.normal) < 0;

    pos = add(hitPos, mul(ray, 0.2));
    if (!inside && (pos.x > WIDTH - 30 || pos.x < 30 || pos.y < 20 || pos.y > HEIGHT - 20)) {
      pts.push(add(pos, mul(ray, 420)));
      break;
    }
  }

  return pts;
}

export function computePrismSnapshot(mode: PrismMode, incidentDeg: number, colorSeparation = 0): PrismSnapshot {
  const polygon = buildModePolygon(mode);
  const theta = (incidentDeg * Math.PI) / 180;
  const dir = norm(v(Math.cos(theta), Math.sin(theta)));
  const separation = colorSeparation;

  const rays = SPECTRUM.map((band, idx) => {
    const centeredIndex = idx - (SPECTRUM.length - 1) / 2;
    const start = v(75, 230 + centeredIndex * separation);
    const nEff = mode === 'air' ? 1.0 : band.n;
    return { band: { ...band, n: nEff }, points: traceBand(start, dir, nEff, polygon) };
  });

  return { mode, polygon, rays };
}

export function prismModeDescription(mode: PrismMode): string {
  if (mode === 'air') {
    return 'Vacuum/air mode. All colors continue nearly together.';
  }
  if (mode === 'block_straight') {
    return 'Straight block. Entry and exit faces are parallel, so direction mostly recovers.';
  }
  if (mode === 'block_rotated') {
    return 'Rotated block. Parallel faces still preserve overall direction, with path offsets.';
  }
  return 'Triangular prism. Non-parallel faces produce visible dispersion between colors.';
}
