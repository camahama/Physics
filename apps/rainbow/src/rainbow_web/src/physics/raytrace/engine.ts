export type Vec2 = { x: number; y: number };
export type RaySegment = { start: Vec2; end: Vec2; intensity: number };

export type RaytraceInput = {
  sourceXOffset: number;
  maxDepth: number;
  minIntensity: number;
  radius: number;
  nAir: number;
  nWater: number;
};

export type RaytraceSnapshot = {
  center: Vec2;
  radius: number;
  source: Vec2;
  segments: RaySegment[];
};

const WIDTH = 1000;
const HEIGHT = 520;
const CENTER: Vec2 = { x: WIDTH / 2, y: HEIGHT / 2 - 10 };

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mul(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function len(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

function intersectRayCircle(origin: Vec2, dir: Vec2, center: Vec2, radius: number): number | null {
  const oc = sub(origin, center);
  const a = dot(dir, dir);
  const b = 2 * dot(oc, dir);
  const c = dot(oc, oc) - radius * radius;
  const disc = b * b - 4 * a * c;

  if (disc < 0) {
    return null;
  }

  const s = Math.sqrt(disc);
  const t1 = (-b - s) / (2 * a);
  const t2 = (-b + s) / (2 * a);
  const eps = 1e-3;
  if (t1 > eps) {
    return t1;
  }
  if (t2 > eps) {
    return t2;
  }
  return null;
}

function fresnel(n1: number, n2: number, cosI: number, cosT: number): number {
  if (Math.abs(n1 - n2) < 1e-9) {
    return 0;
  }

  const rsNum = n1 * cosI - n2 * cosT;
  const rsDen = n1 * cosI + n2 * cosT;
  const rs = (rsNum / rsDen) ** 2;

  const rpNum = n1 * cosT - n2 * cosI;
  const rpDen = n1 * cosT + n2 * cosI;
  const rp = (rpNum / rpDen) ** 2;

  return 0.5 * (rs + rp);
}

function terminalEnd(start: Vec2, dir: Vec2, radius: number): Vec2 {
  const inside = len(sub(start, CENTER)) < radius - 1e-3;
  if (inside) {
    const t = intersectRayCircle(start, dir, CENTER, radius);
    if (t !== null) {
      return add(start, mul(dir, t));
    }
  }
  return add(start, mul(dir, 1800));
}

function appendTerminalSegments(start: Vec2, dir: Vec2, intensity: number, cfg: RaytraceInput, out: RaySegment[]): void {
  const inside = len(sub(start, CENTER)) < cfg.radius - 1e-3;

  if (!inside) {
    out.push({ start, end: add(start, mul(dir, 1800)), intensity: intensity * 0.5 });
    return;
  }

  const hit = terminalEnd(start, dir, cfg.radius);
  out.push({ start, end: hit, intensity: intensity * 0.5 });

  const normal = norm(sub(hit, CENTER));
  const effectiveNormal = mul(normal, -1);
  const cosI = Math.max(0, Math.min(1, dot(dir, normal)));

  const eta = cfg.nWater / cfg.nAir;
  const sinI2 = 1 - cosI * cosI;
  const sinT2 = eta * eta * sinI2;

  if (sinT2 > 1) {
    const reflected = norm(sub(dir, mul(effectiveNormal, 2 * dot(dir, effectiveNormal))));
    out.push({
      start: add(hit, mul(reflected, 0.12)),
      end: add(hit, mul(reflected, 260)),
      intensity: intensity * 0.35,
    });
    return;
  }

  const cosT = Math.sqrt(1 - sinT2);
  const term = eta * cosI - cosT;
  const refracted = norm(add(mul(dir, eta), mul(effectiveNormal, term)));

  out.push({
    start: add(hit, mul(refracted, 0.12)),
    end: add(hit, mul(refracted, 1800)),
    intensity: intensity * 0.45,
  });
}

function traceRecursive(
  start: Vec2,
  dir: Vec2,
  intensity: number,
  depth: number,
  cfg: RaytraceInput,
  out: RaySegment[],
): void {
  if (depth > cfg.maxDepth || intensity < cfg.minIntensity) {
    appendTerminalSegments(start, dir, intensity, cfg, out);
    return;
  }

  const t = intersectRayCircle(start, dir, CENTER, cfg.radius);
  if (t === null) {
    out.push({ start, end: add(start, mul(dir, 1800)), intensity });
    return;
  }

  const hit = add(start, mul(dir, t));
  out.push({ start, end: hit, intensity });

  const normal = norm(sub(hit, CENTER));
  const cosIncident = dot(dir, normal);
  if (Math.abs(cosIncident) < 1e-3) {
    return;
  }

  const entering = cosIncident < 0;
  const n1 = entering ? cfg.nAir : cfg.nWater;
  const n2 = entering ? cfg.nWater : cfg.nAir;
  const effectiveNormal = entering ? normal : mul(normal, -1);
  const cosI = entering ? -cosIncident : cosIncident;

  const sinI2 = 1 - cosI * cosI;
  const eta = n1 / n2;
  const sinT2 = eta * eta * sinI2;

  const nudge = 0.12;

  if (sinT2 > 1) {
    const refl = sub(dir, mul(effectiveNormal, 2 * dot(dir, effectiveNormal)));
    traceRecursive(add(hit, mul(effectiveNormal, nudge)), norm(refl), intensity, depth + 1, cfg, out);
    return;
  }

  const cosT = Math.sqrt(1 - sinT2);
  const R = fresnel(n1, n2, cosI, cosT);
  const T = 1 - R;

  const refl = sub(dir, mul(effectiveNormal, 2 * dot(dir, effectiveNormal)));
  traceRecursive(add(hit, mul(effectiveNormal, nudge)), norm(refl), intensity * R, depth + 1, cfg, out);

  const term = eta * cosI - cosT;
  const refr = add(mul(dir, eta), mul(effectiveNormal, term));
  traceRecursive(add(hit, mul(effectiveNormal, -nudge)), norm(refr), intensity * T, depth + 1, cfg, out);
}

export function computeRaytraceSnapshot(input?: Partial<RaytraceInput>): RaytraceSnapshot {
  const cfg: RaytraceInput = {
    sourceXOffset: input?.sourceXOffset ?? -180,
    maxDepth: input?.maxDepth ?? 12,
    minIntensity: input?.minIntensity ?? 0.001,
    radius: input?.radius ?? 180,
    nAir: input?.nAir ?? 1,
    nWater: input?.nWater ?? 1.333,
  };

  const source: Vec2 = { x: CENTER.x + cfg.sourceXOffset, y: HEIGHT - 12 };
  const start: Vec2 = { x: source.x, y: HEIGHT };
  const dir: Vec2 = { x: 0, y: -1 };

  const segments: RaySegment[] = [];
  traceRecursive(start, dir, 1, 0, cfg, segments);

  return {
    center: CENTER,
    radius: cfg.radius,
    source,
    segments,
  };
}
