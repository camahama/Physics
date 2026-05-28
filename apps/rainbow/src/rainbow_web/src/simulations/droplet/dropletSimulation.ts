import {
  computeDropletRay,
  impactFromU,
  RAINBOW_BANDS,
  uFromImpact,
  type DropletRayResult,
  type Vec2,
} from '../../physics/droplet/engine';
import { UI_PARAMS } from '../../app/uiParams';

export type DropletState = {
  visible: boolean[];
  focusedIndex: number;
  primaryU: number[];
  secondaryU: number[];
  radius: number;
  showPrimary: boolean;
  showSecondary: boolean;
};

export type DropletLayout = {
  width: number;
  height: number;
  center: Vec2;
  radius: number;
};

export type DropletBandResult = {
  bandIndex: number;
  primary: DropletRayResult | null;
  secondary: DropletRayResult | null;
};

export type DropletSnapshot = {
  layout: DropletLayout;
  focusedPrimaryDeviation: number | null;
  focusedSecondaryDeviation: number | null;
  rays: DropletBandResult[];
};

export class DropletSimulation {
  private state: DropletState;

  constructor() {
    const count = RAINBOW_BANDS.length;
    const defaultRadius = UI_PARAMS.droplet.defaults.radius;
    const defaultImpact = UI_PARAMS.droplet.defaults.impact;
    this.state = {
      visible: new Array<boolean>(count).fill(false),
      focusedIndex: 0,
      primaryU: new Array<number>(count).fill(uFromImpact(defaultImpact, defaultRadius)),
      secondaryU: new Array<number>(count).fill(uFromImpact(defaultImpact, defaultRadius)),
      radius: defaultRadius,
      showPrimary: false,
      showSecondary: false,
    };
  }

  getState(): DropletState {
    return {
      ...this.state,
      visible: [...this.state.visible],
      primaryU: [...this.state.primaryU],
      secondaryU: [...this.state.secondaryU],
    };
  }

  setVisible(index: number, visible: boolean): void {
    this.state.visible[index] = visible;
  }

  setFocusedIndex(index: number): void {
    this.state.focusedIndex = Math.max(0, Math.min(RAINBOW_BANDS.length - 1, index));
  }

  setShowPrimary(value: boolean): void {
    this.state.showPrimary = value;
  }

  setShowSecondary(value: boolean): void {
    this.state.showSecondary = value;
  }

  setPrimaryU(index: number, value: number): void {
    this.state.primaryU[index] = Math.max(0, Math.min(1, value));
  }

  setSecondaryU(index: number, value: number): void {
    this.state.secondaryU[index] = Math.max(0, Math.min(1, value));
  }

  setRadius(value: number): void {
    this.state.radius = Math.max(
      UI_PARAMS.droplet.radiusRange.min,
      Math.min(UI_PARAMS.droplet.radiusRange.max, value),
    );
  }

  optimizeImpacts(): void {
    for (let i = 0; i < RAINBOW_BANDS.length; i += 1) {
      const n = RAINBOW_BANDS[i].n;

      const pTerm = 4 - n * n;
      if (pTerm > 0) {
        this.state.primaryU[i] = Math.max(0, Math.min(1, Math.sqrt(pTerm / 3)));
      }

      const sTerm = 9 - n * n;
      if (sTerm > 0) {
        this.state.secondaryU[i] = Math.max(0, Math.min(1, Math.sqrt(sTerm / 8)));
      }
    }

    this.state.showPrimary = true;
  }

  compute(layout?: Partial<DropletLayout>): DropletSnapshot {
    const lay: DropletLayout = {
      width: layout?.width ?? UI_PARAMS.droplet.layoutDefaults.width,
      height: layout?.height ?? UI_PARAMS.droplet.layoutDefaults.height,
      center: layout?.center ?? { ...UI_PARAMS.droplet.layoutDefaults.center },
      radius: layout?.radius ?? this.state.radius,
    };

    const focusedPrimaryImpact = impactFromU(this.state.primaryU[this.state.focusedIndex], lay.radius);
    const focusedSecondaryImpact = impactFromU(this.state.secondaryU[this.state.focusedIndex], lay.radius);

    const focusedBand = RAINBOW_BANDS[this.state.focusedIndex];
    const focusedPrimary = computeDropletRay(
      -focusedPrimaryImpact,
      focusedBand.n,
      lay.center,
      lay.radius,
      lay.height,
      1,
    );
    const focusedSecondary = computeDropletRay(
      focusedSecondaryImpact,
      focusedBand.n,
      lay.center,
      lay.radius,
      lay.height,
      2,
    );
    let focusedPrimaryDeviation: number | null = focusedPrimary.deviationDeg;
    let focusedSecondaryDeviation: number | null = focusedSecondary.deviationDeg;

    const rays: DropletBandResult[] = [];

    for (let i = 0; i < RAINBOW_BANDS.length; i += 1) {
      if (!this.state.visible[i]) {
        continue;
      }

      const band = RAINBOW_BANDS[i];
      const primaryImpact = impactFromU(this.state.primaryU[i], lay.radius);
      const secondaryImpact = impactFromU(this.state.secondaryU[i], lay.radius);
      const primary = this.state.showPrimary
        ? computeDropletRay(-primaryImpact, band.n, lay.center, lay.radius, lay.height, 1)
        : null;
      const secondary = this.state.showSecondary
        ? computeDropletRay(secondaryImpact, band.n, lay.center, lay.radius, lay.height, 2)
        : null;

      rays.push({ bandIndex: i, primary, secondary });
    }

    return {
      layout: lay,
      focusedPrimaryDeviation,
      focusedSecondaryDeviation,
      rays,
    };
  }
}
