export type RefractionResult = {
  incidentDeg: number;
  refractedDeg: number | null;
  criticalAngleDeg: number | null;
  tir: boolean;
  reflectance: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Pure physics: Snell + Schlick approximation.
export function solveRefraction(incidentDeg: number, n1: number, n2: number): RefractionResult {
  const incident = clamp(incidentDeg, 0, 89.9);
  const safeN1 = Math.max(n1, 1e-6);
  const safeN2 = Math.max(n2, 1e-6);

  const iRad = degToRad(incident);
  const sinT = (safeN1 / safeN2) * Math.sin(iRad);
  const tir = Math.abs(sinT) > 1;

  const criticalAngleDeg =
    safeN1 > safeN2 ? radToDeg(Math.asin(clamp(safeN2 / safeN1, -1, 1))) : null;

  const refractedDeg = tir ? null : radToDeg(Math.asin(clamp(sinT, -1, 1)));

  const r0 = ((safeN1 - safeN2) / (safeN1 + safeN2)) ** 2;
  const cosX = tir
    ? Math.cos(iRad)
    : Math.cos(Math.max(iRad, degToRad(refractedDeg ?? 0)));
  const reflectance = tir ? 1 : r0 + (1 - r0) * (1 - clamp(cosX, 0, 1)) ** 5;

  return {
    incidentDeg: incident,
    refractedDeg,
    criticalAngleDeg,
    tir,
    reflectance: clamp(reflectance, 0, 1),
  };
}
