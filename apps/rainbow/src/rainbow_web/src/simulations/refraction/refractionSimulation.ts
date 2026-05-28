import { solveRefraction, type RefractionResult } from '../../physics/refraction/engine';

export type RefractionState = {
  n1: number;
  n2: number;
  incidentDeg: number;
};

export class RefractionSimulation {
  private state: RefractionState;

  constructor(initial?: Partial<RefractionState>) {
    this.state = {
      n1: initial?.n1 ?? 1.0,
      n2: initial?.n2 ?? 1.33,
      incidentDeg: initial?.incidentDeg ?? 35,
    };
  }

  setIncidentDeg(incidentDeg: number): void {
    this.state.incidentDeg = incidentDeg;
  }

  setMediumIndices(n1: number, n2: number): void {
    this.state.n1 = n1;
    this.state.n2 = n2;
  }

  getState(): RefractionState {
    return { ...this.state };
  }

  compute(): RefractionResult {
    return solveRefraction(this.state.incidentDeg, this.state.n1, this.state.n2);
  }
}
