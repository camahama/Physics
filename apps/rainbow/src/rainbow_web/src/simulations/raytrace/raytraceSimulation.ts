import { computeRaytraceSnapshot, type RaytraceInput, type RaytraceSnapshot } from '../../physics/raytrace/engine';
import { UI_PARAMS } from '../../app/uiParams';

export class RaytraceSimulation {
  private state: RaytraceInput;

  constructor(initial?: Partial<RaytraceInput>) {
    const defaults = UI_PARAMS.raytrace.defaults;
    this.state = {
      sourceXOffset: initial?.sourceXOffset ?? defaults.sourceXOffset,
      maxDepth: initial?.maxDepth ?? defaults.maxDepth,
      minIntensity: initial?.minIntensity ?? defaults.minIntensity,
      radius: initial?.radius ?? defaults.radius,
      nAir: initial?.nAir ?? defaults.nAir,
      nWater: initial?.nWater ?? defaults.nWater,
    };
  }

  setSourceXOffset(value: number): void {
    this.state.sourceXOffset = Math.max(
      UI_PARAMS.raytrace.sourceXOffsetRange.min,
      Math.min(UI_PARAMS.raytrace.sourceXOffsetRange.max, value),
    );
  }

  setMaxDepth(value: number): void {
    this.state.maxDepth = Math.max(
      UI_PARAMS.raytrace.maxDepthRange.min,
      Math.min(UI_PARAMS.raytrace.maxDepthRange.max, Math.round(value)),
    );
  }

  setRadius(value: number): void {
    this.state.radius = Math.max(
      UI_PARAMS.raytrace.radiusRange.min,
      Math.min(UI_PARAMS.raytrace.radiusRange.max, value),
    );
  }

  getState(): RaytraceInput {
    return { ...this.state };
  }

  compute(): RaytraceSnapshot {
    return computeRaytraceSnapshot(this.state);
  }
}
