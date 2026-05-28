import {
  computePrismSnapshot,
  prismModeDescription,
  type PrismMode,
  type PrismSnapshot,
} from '../../physics/prism/engine';
import { UI_PARAMS } from '../../app/uiParams';

export type PrismState = {
  mode: PrismMode;
  incidentDeg: number;
  colorSeparation: number;
};

export class PrismSimulation {
  private state: PrismState;

  constructor(initial?: Partial<PrismState>) {
    this.state = {
      mode: initial?.mode ?? 'triangle',
      incidentDeg: initial?.incidentDeg ?? 0,
      colorSeparation: initial?.colorSeparation ?? 0,
    };
  }

  setMode(mode: PrismMode): void {
    this.state.mode = mode;
  }

  setIncidentDeg(incidentDeg: number): void {
    this.state.incidentDeg = Math.max(
      UI_PARAMS.prism.incidentDeg.min,
      Math.min(UI_PARAMS.prism.incidentDeg.max, incidentDeg),
    );
  }

  setColorSeparation(value: number): void {
    this.state.colorSeparation = Math.max(
      UI_PARAMS.prism.colorSeparation.min,
      Math.min(UI_PARAMS.prism.colorSeparation.max, value),
    );
  }

  getState(): PrismState {
    return { ...this.state };
  }

  description(): string {
    return prismModeDescription(this.state.mode);
  }

  compute(): PrismSnapshot {
    return computePrismSnapshot(this.state.mode, this.state.incidentDeg, this.state.colorSeparation);
  }
}
