const prefixes: Record<string, number> = {
  q: 1e-30, r: 1e-27, y: 1e-24, z: 1e-21, a: 1e-18, f: 1e-15,
  p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, μ: 1e-6, m: 1e-3,
  c: 1e-2, d: 1e-1, "": 1, da: 1e1, h: 1e2, k: 1e3, K: 1e3,
  M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18, Z: 1e21, Y: 1e24, R: 1e27, Q: 1e30,
};

function unitDetails(unit: string): { base: string; scale: number } {
  return { base: unit === "mH" ? "H" : unit === "µF" ? "F" : unit,
    scale: unit === "mH" ? 1e-3 : unit === "µF" ? 1e-6 : 1 };
}

/** Returns a quantity in the control's units; bare numbers use those units. */
export function parseQuantity(text: string, unit: string): number | null {
  const { base, scale } = unitDetails(unit);
  const normalized = text.trim().replace(/ohms?/gi, "Ω");
  if (base === "F" && /^(?:∞|infinity)\s*(?:F|µF)?$/i.test(normalized)) return Infinity;
  const match = normalized.match(/^([+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?)\s*(\S*)$/i);
  if (!match) return null;
  let value = Number(match[1].replace(",", "."));
  const suffix = match[2];
  if (suffix) {
    const prefix = suffix.endsWith(base) ? suffix.slice(0, -base.length) : suffix;
    if (!(prefix in prefixes)) return null;
    value = value * prefixes[prefix] / scale;
  }
  if (!Number.isFinite(value) || value < 0 || (base === "Hz" && value === 0)) return null;
  return value;
}

export function formatQuantity(value: number, unit: string, language: string): string {
  if (value === Infinity) return `∞ ${unit}`;
  const { base, scale } = unitDetails(unit);
  const magnitude = value * scale;
  const exponent = magnitude === 0 ? 0 : Math.max(-30, Math.min(30, Math.floor(Math.log10(magnitude) / 3) * 3));
  const prefix = Object.keys(prefixes).find((key) => prefixes[key] === 10 ** exponent && key !== "u") ?? "";
  return `${new Intl.NumberFormat(language === "sv" ? "sv-SE" : "en-US", { maximumSignificantDigits: 12, useGrouping: false }).format(magnitude / 10 ** exponent)} ${prefix}${base}`;
}

/** Fill each decade with round steps: 1…9, 10…90, 100…900, etc. */
export function refineSteps(steps: number[]): number[] {
  const positive = steps.filter((value) => Number.isFinite(value) && value > 0);
  if (positive.length === 0) return [...steps];
  const min = Math.min(...positive);
  const max = Math.max(...positive);
  const values = new Set(steps);
  for (let exponent = Math.floor(Math.log10(min)); exponent <= Math.floor(Math.log10(max)); exponent += 1) {
    for (let digit = 1; digit <= 9; digit += 1) {
      const value = Number((digit * 10 ** exponent).toPrecision(12));
      if (value >= min && value <= max) values.add(value);
    }
  }
  return [...values].sort((a, b) => a - b);
}
