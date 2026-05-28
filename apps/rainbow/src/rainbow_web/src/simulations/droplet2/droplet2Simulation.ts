import { buildLayerSlice, offsetSequence, type LayerRay, type Vec2 } from '../../physics/droplet2/engine';
import { UI_PARAMS } from '../../app/uiParams';

export type Droplet2State = {
  radius: number;
  center: Vec2;
  sceneWidth: number;
  sceneHeight: number;
  step: number;
  raysPerTick: number;
  primaryVisible: boolean;
  secondaryVisible: boolean;
  primaryAnimating: boolean;
  secondaryAnimating: boolean;
  primaryRays: LayerRay[];
  secondaryRays: LayerRay[];
  primaryTransmittedRays: LayerRay[];
  secondaryTransmittedRays: LayerRay[];
  primaryCursor: number;
  secondaryCursor: number;
};

export type Droplet2Snapshot = Droplet2State;

export type Droplet2UiState = {
  radius: number;
  raysPerTick: number;
  primaryVisible: boolean;
  secondaryVisible: boolean;
  primaryAnimating: boolean;
  secondaryAnimating: boolean;
  primaryCursor: number;
  secondaryCursor: number;
};

export class Droplet2Simulation {
  private state: Droplet2State;
  private static readonly MAX_RADIUS = UI_PARAMS.droplet2.maxRadius;

  constructor() {
    const defaults = UI_PARAMS.droplet2.defaults;
    this.state = {
      radius: defaults.radius,
      center: { ...defaults.center },
      sceneWidth: UI_PARAMS.droplet2.sceneWidth,
      sceneHeight: UI_PARAMS.droplet2.sceneHeight,
      step: defaults.step,
      raysPerTick: defaults.raysPerTick,
      primaryVisible: false,
      secondaryVisible: false,
      primaryAnimating: false,
      secondaryAnimating: false,
      primaryRays: [],
      secondaryRays: [],
      primaryTransmittedRays: [],
      secondaryTransmittedRays: [],
      primaryCursor: 0,
      secondaryCursor: 0,
    };
  }

  getState(): Droplet2State {
    return {
      ...this.state,
      center: { ...this.state.center },
      primaryRays: [...this.state.primaryRays],
      secondaryRays: [...this.state.secondaryRays],
      primaryTransmittedRays: [...this.state.primaryTransmittedRays],
      secondaryTransmittedRays: [...this.state.secondaryTransmittedRays],
    };
  }

  setRadius(radius: number): void {
    this.state.radius = Math.max(
      UI_PARAMS.droplet2.radiusRange.min,
      Math.min(UI_PARAMS.droplet2.radiusRange.max, radius),
    );

    // Keep user intent (which families are on) when radius changes, but rebuild traces.
    const keepPrimary = this.state.primaryVisible;
    const keepSecondary = this.state.secondaryVisible;

    this.state.primaryRays = [];
    this.state.secondaryRays = [];
    this.state.primaryTransmittedRays = [];
    this.state.secondaryTransmittedRays = [];
    this.state.primaryCursor = 0;
    this.state.secondaryCursor = 0;
    this.state.primaryAnimating = keepPrimary;
    this.state.secondaryAnimating = keepSecondary;
  }

  setRaysPerTick(value: number): void {
    this.state.raysPerTick = Math.max(
      UI_PARAMS.droplet2.raysPerTickRange.min,
      Math.min(UI_PARAMS.droplet2.raysPerTickRange.max, Math.round(value)),
    );
  }

  private offsets(): number[] {
    const base = offsetSequence(Droplet2Simulation.MAX_RADIUS, this.state.step);
    const scale = this.state.radius / Droplet2Simulation.MAX_RADIUS;
    return base.map((x) => x * scale);
  }

  startPrimary(): void {
    this.state.primaryVisible = true;
    this.state.primaryAnimating = true;
    this.state.primaryRays = [];
    this.state.primaryTransmittedRays = [];
    this.state.primaryCursor = 0;
  }

  clearPrimary(): void {
    this.state.primaryVisible = false;
    this.state.primaryAnimating = false;
    this.state.primaryRays = [];
    this.state.primaryTransmittedRays = [];
    this.state.primaryCursor = 0;
  }

  startSecondary(): void {
    this.state.secondaryVisible = true;
    this.state.secondaryAnimating = true;
    this.state.secondaryRays = [];
    this.state.secondaryTransmittedRays = [];
    this.state.secondaryCursor = 0;
  }

  clearSecondary(): void {
    this.state.secondaryVisible = false;
    this.state.secondaryAnimating = false;
    this.state.secondaryRays = [];
    this.state.secondaryTransmittedRays = [];
    this.state.secondaryCursor = 0;
  }

  togglePrimary(): void {
    if (this.state.primaryVisible) {
      this.clearPrimary();
      return;
    }
    this.startPrimary();
  }

  toggleSecondary(): void {
    if (this.state.secondaryVisible) {
      this.clearSecondary();
      return;
    }
    this.startSecondary();
  }

  tick(): void {
    const offsets = this.offsets();

    if (this.state.primaryAnimating) {
      for (let i = 0; i < this.state.raysPerTick; i += 1) {
        if (this.state.primaryCursor >= offsets.length) {
          this.state.primaryAnimating = false;
          break;
        }
        const x = offsets[this.state.primaryCursor];
        const slice = buildLayerSlice(x, 1, this.state.center, this.state.radius, this.state.sceneHeight);
        const transmitted = buildLayerSlice(x, 0, this.state.center, this.state.radius, this.state.sceneHeight);
        this.state.primaryRays.push(...slice);
        this.state.primaryTransmittedRays.push(...transmitted);
        this.state.primaryCursor += 1;
      }
    }

    if (this.state.secondaryAnimating) {
      for (let i = 0; i < this.state.raysPerTick; i += 1) {
        if (this.state.secondaryCursor >= offsets.length) {
          this.state.secondaryAnimating = false;
          break;
        }
        const x = offsets[this.state.secondaryCursor];
        const slice = buildLayerSlice(x, 2, this.state.center, this.state.radius, this.state.sceneHeight);
        const transmitted = buildLayerSlice(x, 0, this.state.center, this.state.radius, this.state.sceneHeight);
        this.state.secondaryRays.push(...slice);
        this.state.secondaryTransmittedRays.push(...transmitted);
        this.state.secondaryCursor += 1;
      }
    }
  }

  snapshot(): Droplet2Snapshot {
    return this.getState();
  }

  frameState(): Droplet2State {
    // Performance path: no cloning, for animation/render loop usage.
    return this.state;
  }

  uiState(): Droplet2UiState {
    return {
      radius: this.state.radius,
      raysPerTick: this.state.raysPerTick,
      primaryVisible: this.state.primaryVisible,
      secondaryVisible: this.state.secondaryVisible,
      primaryAnimating: this.state.primaryAnimating,
      secondaryAnimating: this.state.secondaryAnimating,
      primaryCursor: this.state.primaryCursor,
      secondaryCursor: this.state.secondaryCursor,
    };
  }
}
