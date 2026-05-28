import { createRainbowView, rainbowPixelContribution, type RainbowView } from '../../physics/rainbow/engine';
import { UI_PARAMS } from '../../app/uiParams';

export type RainbowDrop = { x: number; y: number; color: string; intensity: number; radius: number };
export type RainbowDropSample = RainbowDrop & { r: number; g: number; b: number };
type FallingDrop = {
  x: number;
  y: number;
  vy: number;
  radius: number;
  boost: boolean;
};

export type RainbowUiState = {
  simulating: boolean;
  rainIntensity: number;
  spawnRate: number;
  totalPoints: number;
  activeDrops: number;
};

export class RainbowSimulation {
  private view: RainbowView;
  private rainIntensity: number = this.sanitizeRainIntensity(UI_PARAMS.rainbow.defaults.rainIntensity);
  private readonly acceleration: number = UI_PARAMS.rainbow.defaults.acceleration;
  private readonly maxPoints: number = UI_PARAMS.rainbow.defaults.maxPoints;
  private readonly dropFallSpeed: number = UI_PARAMS.rainbow.defaults.dropFallSpeed;
  private readonly spawnRateAtMax: number = UI_PARAMS.rainbow.defaults.spawnRateAtMax;
  private readonly maxActiveDrops: number = UI_PARAMS.rainbow.defaults.maxActiveDrops;
  private totalPoints = 0;
  private readonly activeDrops: FallingDrop[] = [];
  private spawnCarry = 0;
  private currentSpawnRate: number = this.intensityToSpawnRate(this.rainIntensity);

  constructor() {
    this.view = createRainbowView();
  }

  uiState(): RainbowUiState {
    return {
      simulating: this.rainIntensity > 0,
      rainIntensity: this.sanitizeRainIntensity(this.rainIntensity),
      spawnRate: Number.isFinite(this.currentSpawnRate) ? this.currentSpawnRate : 0,
      totalPoints: this.totalPoints,
      activeDrops: this.activeDrops.length,
    };
  }

  viewState(): RainbowView {
    return this.view;
  }

  setSimulating(value: boolean): void {
    this.setRainIntensity(value ? UI_PARAMS.rainbow.defaults.rainIntensity : 0);
  }

  toggleSimulating(): void {
    this.setSimulating(this.rainIntensity <= 0);
  }

  setRainIntensity(value: number): void {
    this.rainIntensity = this.sanitizeRainIntensity(value);
    this.currentSpawnRate = this.intensityToSpawnRate(this.rainIntensity);
  }

  clear(): void {
    this.totalPoints = 0;
    this.activeDrops.length = 0;
    this.spawnCarry = 0;
    this.currentSpawnRate = this.intensityToSpawnRate(this.rainIntensity);
  }

  manualDrop(x: number, y: number, boost = false): RainbowDropSample | null {
    const drop = this.createDropSample(x, y, boost ? UI_PARAMS.rainbow.manualDropRadius.boosted : UI_PARAMS.rainbow.manualDropRadius.normal, boost);
    this.addActiveDrop({
      x,
      y,
      vy: this.dropFallSpeed * (boost ? 1.08 : 1),
      radius: boost ? UI_PARAMS.rainbow.manualDropRadius.boosted : UI_PARAMS.rainbow.manualDropRadius.normal,
      boost,
    });
    this.totalPoints += 1;
    return drop;
  }

  previewDrop(x: number, y: number): RainbowDropSample {
    const c = rainbowPixelContribution(x, y, this.view, false, { allowWeak: true });
    if (!c || c.intensity <= UI_PARAMS.rainbow.intensityThreshold) {
      return {
        x,
        y,
        r: 0,
        g: 0,
        b: 0,
        color: 'rgb(0, 0, 0)',
        intensity: 0,
        radius: UI_PARAMS.rainbow.previewRadius,
      };
    }

    return {
      x,
      y,
      r: c.r,
      g: c.g,
      b: c.b,
      color: c.color,
      intensity: c.intensity,
      radius: UI_PARAMS.rainbow.previewRadius,
    };
  }

  rainTick(deltaMs: number): RainbowDropSample[] {
    const dt = Math.max(0, Math.min(0.05, deltaMs / 1000));

    if (this.currentSpawnRate > 0 && dt > 0) {
      this.currentSpawnRate = Math.min(this.maxPoints, this.currentSpawnRate * this.acceleration);
      this.spawnCarry += this.currentSpawnRate * dt;
      const spawnCount = Math.floor(this.spawnCarry);
      this.spawnCarry -= spawnCount;

      for (let i = 0; i < spawnCount; i += 1) {
        const depthScale = 0.55 + Math.random() * 1.15;
        this.addActiveDrop({
          x: Math.random() * this.view.config.width,
          y: -Math.random() * this.view.config.height * 0.18,
          vy: this.dropFallSpeed * depthScale,
          radius: UI_PARAMS.rainbow.rainDropRadius * (0.82 + Math.random() * 0.28),
          boost: false,
        });
      }

      this.totalPoints += spawnCount;
    }

    if (dt > 0) {
      this.advanceDrops(dt);
    }

    return this.activeDrops
      .map((drop) => this.createDropSample(drop.x, drop.y, drop.radius, drop.boost))
      .filter((drop): drop is RainbowDropSample => drop !== null);
  }

  private createDropSample(x: number, y: number, radius: number, boost = false): RainbowDropSample | null {
    const c = rainbowPixelContribution(x, y, this.view, boost, { allowWeak: true });
    if (!c || c.intensity <= UI_PARAMS.rainbow.intensityThreshold) {
      return null;
    }

    return {
      x,
      y,
      r: c.r,
      g: c.g,
      b: c.b,
      color: c.color,
      intensity: c.intensity,
      radius,
    };
  }

  private addActiveDrop(drop: FallingDrop): void {
    this.activeDrops.push(drop);
    if (this.activeDrops.length > this.maxActiveDrops) {
      this.activeDrops.splice(0, this.activeDrops.length - this.maxActiveDrops);
    }
  }

  private advanceDrops(dt: number): void {
    const bottomY = this.view.config.height;
    let writeIndex = 0;

    for (let i = 0; i < this.activeDrops.length; i += 1) {
      const drop = this.activeDrops[i];
      drop.y += drop.vy * dt;

      if (drop.y - drop.radius <= bottomY) {
        this.activeDrops[writeIndex] = drop;
        writeIndex += 1;
      }
    }

    this.activeDrops.length = writeIndex;
  }

  private intensityToSpawnRate(intensity: number): number {
    const range = UI_PARAMS.rainbow.rainIntensityRange;
    const safeIntensity = this.sanitizeRainIntensity(intensity);
    const normalized = range.max <= range.min ? 0 : (safeIntensity - range.min) / (range.max - range.min);
    const eased = Math.max(0, Math.min(1, normalized));
    return eased * this.spawnRateAtMax;
  }

  private sanitizeRainIntensity(value: number): number {
    const range = UI_PARAMS.rainbow.rainIntensityRange;
    if (!Number.isFinite(value)) {
      return range.min;
    }
    return Math.max(range.min, Math.min(range.max, value));
  }
}
