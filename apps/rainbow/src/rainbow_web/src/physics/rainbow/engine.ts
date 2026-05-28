import { generatedRainbowProfile } from '../../data/rainbow_profile.generated';

export type Vec2 = { x: number; y: number };

export type RainbowPhysicsConfig = {
  width: number;
  height: number;
  fovDeg: number;
  sunElevationDeg: number;
  globalIntensity: number;
};

export type RainbowView = {
  config: RainbowPhysicsConfig;
  aspPixel: Vec2;
  viewDist: number;
  spectralLut: Array<[number, number, number, number]>;
};

export type RainbowContribution = {
  r: number;
  g: number;
  b: number;
  intensity: number;
  color: string;
};

export type RainbowContributionOptions = {
  allowWeak?: boolean;
};

const MAX_ANGLE_DEG = Number(generatedRainbowProfile.maxAngleDeg ?? 65);
const LUT_SIZE = Number(generatedRainbowProfile.lutSize ?? 1024);
const PRECOMPUTED_LUT: Array<[number, number, number, number]> = (
  generatedRainbowProfile.lut as unknown as number[][]
).map((v) => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0, v[3] ?? 0]);

function sampleSpectralLut(
  angleDeg: number,
  lut: Array<[number, number, number, number]>,
): [number, number, number, number] {
  if (angleDeg <= 0) {
    return lut[0] ?? [0, 0, 0, 0];
  }
  if (angleDeg >= MAX_ANGLE_DEG) {
    return [0, 0, 0, 0];
  }

  const t = (angleDeg / MAX_ANGLE_DEG) * (LUT_SIZE - 1);
  const i0 = Math.floor(t);
  const i1 = Math.min(LUT_SIZE - 1, i0 + 1);
  const a = t - i0;

  const c0 = lut[i0] ?? [0, 0, 0, 0];
  const c1 = lut[i1] ?? [0, 0, 0, 0];
  return [
    c0[0] * (1 - a) + c1[0] * a,
    c0[1] * (1 - a) + c1[1] * a,
    c0[2] * (1 - a) + c1[2] * a,
    c0[3] * (1 - a) + c1[3] * a,
  ];
}

export function createRainbowView(config?: Partial<RainbowPhysicsConfig>): RainbowView {
  const cfg: RainbowPhysicsConfig = {
    width: config?.width ?? 1000,
    height: config?.height ?? 560,
    fovDeg: config?.fovDeg ?? 70,
    sunElevationDeg: config?.sunElevationDeg ?? 40,
    globalIntensity: config?.globalIntensity ?? 2.5,
  };

  const fovRad = (cfg.fovDeg * Math.PI) / 180;
  const viewDist = cfg.width / 2 / Math.tan(fovRad / 2);
  const aspY = cfg.height / 2 + Math.tan((cfg.sunElevationDeg * Math.PI) / 180) * viewDist;

  return {
    config: cfg,
    aspPixel: { x: cfg.width / 2, y: aspY },
    viewDist,
    spectralLut: PRECOMPUTED_LUT,
  };
}

export function rainbowPixelColor(px: number, py: number, view: RainbowView, boostIntensity = false): string | null {
  const c = rainbowPixelContribution(px, py, view, boostIntensity);
  return c ? c.color : null;
}

export function rainbowPixelContribution(
  px: number,
  py: number,
  view: RainbowView,
  boostIntensity = false,
  options?: RainbowContributionOptions,
): RainbowContribution | null {
  const allowWeak = options?.allowWeak ?? false;
  const dx = px - view.aspPixel.x;
  const dy = py - view.aspPixel.y;
  const rPx = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(rPx, view.viewDist) * 180) / Math.PI;

  if (angleDeg >= MAX_ANGLE_DEG) {
    return null;
  }

  const [rf, gf, bf, iRaw] = sampleSpectralLut(angleDeg, view.spectralLut);
  if (!allowWeak && iRaw <= 0.0001) {
    return null;
  }

  // Trust the profile for hue; keep chroma independent of intensity so low-intensity
  // points fade via alpha instead of darkening the background.
  const maxChannel = Math.max(rf, gf, bf);
  let rPhys = 0;
  let gPhys = 0;
  let bPhys = 0;
  if (maxChannel > 1e-6) {
    rPhys = rf / maxChannel;
    gPhys = gf / maxChannel;
    bPhys = bf / maxChannel;
  }

  const brightness = 255;
  const baseIntensity = Math.min(1, Math.max(0, iRaw));
  let intensity = baseIntensity * view.config.globalIntensity;
  if (boostIntensity) {
    intensity *= 1.2;
  }
  intensity = Math.min(1, Math.max(0, intensity));

  const r = Math.min(255, Math.max(0, Math.floor(rPhys * brightness)));
  const g = Math.min(255, Math.max(0, Math.floor(gPhys * brightness)));
  const b = Math.min(255, Math.max(0, Math.floor(bPhys * brightness)));

  if (!allowWeak && intensity <= 0.0001) {
    return null;
  }

  return {
    r,
    g,
    b,
    intensity,
    color: `rgb(${r}, ${g}, ${b})`,
  };
}
