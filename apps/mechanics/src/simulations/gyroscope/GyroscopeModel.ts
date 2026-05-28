import { Euler, Quaternion, Vector3 } from "three";

export type GyroscopeConfig = {
  spinRate: number;
  rotorInertia: number;
  mass: number;
  leverArm: number;
  tiltAngle: number;
  gravity: number;
  friction: number;
};

export type GyroscopeState = {
  elapsed: number;
  spinRate: number;
  rotorInertia: number;
  mass: number;
  leverArm: number;
  tiltAngle: number;
  gravity: number;
  friction: number;
  spinAngle: number;
  precessionAngle: number;
  precessionRate: number;
  bodyAxis: Vector3;
  centerOfMass: Vector3;
  gravityForce: Vector3;
  angularMomentum: Vector3;
  torque: Vector3;
  orientation: Quaternion;
};

const MIN_SPIN = 0.01;
const MAX_TILT = Math.PI / 2 - 0.08;
const TILT_GAIN = 0.11;
const PRECESSION_LIMIT = 8;
const LOW_SPIN_BLEND = 2.5;

export class GyroscopeModel {
  private state: GyroscopeState;
  private readonly initialState: Pick<
    GyroscopeState,
    "spinRate" | "tiltAngle" | "spinAngle" | "precessionAngle"
  >;

  constructor(config: GyroscopeConfig) {
    this.state = {
      elapsed: 0,
      spinRate: config.spinRate,
      rotorInertia: config.rotorInertia,
      mass: config.mass,
      leverArm: config.leverArm,
      tiltAngle: config.tiltAngle,
      gravity: config.gravity,
      friction: config.friction,
      spinAngle: 0,
      precessionAngle: 0,
      precessionRate: 0,
      bodyAxis: new Vector3(),
      centerOfMass: new Vector3(),
      gravityForce: new Vector3(),
      angularMomentum: new Vector3(),
      torque: new Vector3(),
      orientation: new Quaternion()
    };

    this.initialState = {
      spinRate: config.spinRate,
      tiltAngle: config.tiltAngle,
      spinAngle: 0,
      precessionAngle: 0
    };

    this.recomputeDerivedState();
  }

  getState(): GyroscopeState {
    return {
      elapsed: this.state.elapsed,
      spinRate: this.state.spinRate,
      rotorInertia: this.state.rotorInertia,
      mass: this.state.mass,
      leverArm: this.state.leverArm,
      tiltAngle: this.state.tiltAngle,
      gravity: this.state.gravity,
      friction: this.state.friction,
      spinAngle: this.state.spinAngle,
      precessionAngle: this.state.precessionAngle,
      precessionRate: this.state.precessionRate,
      bodyAxis: this.state.bodyAxis.clone(),
      centerOfMass: this.state.centerOfMass.clone(),
      gravityForce: this.state.gravityForce.clone(),
      angularMomentum: this.state.angularMomentum.clone(),
      torque: this.state.torque.clone(),
      orientation: this.state.orientation.clone()
    };
  }

  setParameters(config: Partial<GyroscopeConfig>): void {
    if (typeof config.spinRate === "number") {
      this.state.spinRate = config.spinRate;
    }
    if (typeof config.rotorInertia === "number") {
      this.state.rotorInertia = config.rotorInertia;
    }
    if (typeof config.mass === "number") {
      this.state.mass = config.mass;
    }
    if (typeof config.leverArm === "number") {
      this.state.leverArm = config.leverArm;
    }
    if (typeof config.tiltAngle === "number") {
      this.state.tiltAngle = config.tiltAngle;
    }
    if (typeof config.gravity === "number") {
      this.state.gravity = config.gravity;
    }
    if (typeof config.friction === "number") {
      this.state.friction = config.friction;
    }

    this.recomputeDerivedState();
  }

  reset(): void {
    this.state.elapsed = 0;
    this.state.spinRate = this.initialState.spinRate;
    this.state.tiltAngle = this.initialState.tiltAngle;
    this.state.spinAngle = this.initialState.spinAngle;
    this.state.precessionAngle = this.initialState.precessionAngle;
    this.recomputeDerivedState();
  }

  step(deltaSeconds: number): GyroscopeState {
    this.state.elapsed += deltaSeconds;
    this.advanceDynamics(deltaSeconds);
    this.recomputeDerivedState();
    return this.getState();
  }

  private advanceDynamics(deltaSeconds: number): void {
    if (this.state.friction > 0) {
      const dampingFactor = Math.exp(-this.state.friction * deltaSeconds);
      this.state.spinRate *= dampingFactor;

      const torqueMagnitude =
        this.state.mass *
        this.state.gravity *
        this.state.leverArm *
        Math.sin(this.state.tiltAngle);
      const angularMomentumMagnitude =
        this.state.rotorInertia * Math.max(Math.abs(this.state.spinRate), MIN_SPIN);
      const tiltRate =
        this.state.friction *
        TILT_GAIN *
        (torqueMagnitude / angularMomentumMagnitude) *
        (1 - this.state.tiltAngle / MAX_TILT);

      this.state.tiltAngle = Math.min(
        MAX_TILT,
        this.state.tiltAngle + tiltRate * deltaSeconds
      );
    }

    this.state.spinAngle += this.state.spinRate * deltaSeconds;

    const safeSpinRate =
      Math.sign(this.state.spinRate || 1) *
      Math.max(Math.abs(this.state.spinRate), MIN_SPIN);
    this.state.precessionAngle += this.computePrecessionRate(safeSpinRate) * deltaSeconds;
  }

  private recomputeDerivedState(): void {
    const safeSpinRate =
      Math.sign(this.state.spinRate || 1) *
      Math.max(Math.abs(this.state.spinRate), MIN_SPIN);
    const precessionRate = this.computePrecessionRate(safeSpinRate);

    const axisOrientation = new Quaternion().setFromEuler(
      new Euler(this.state.tiltAngle, this.state.precessionAngle, 0, "YXZ")
    );
    const spinOrientation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      this.state.spinAngle
    );
    const orientation = axisOrientation.clone().multiply(spinOrientation);

    const bodyAxis = new Vector3(0, 1, 0).applyQuaternion(axisOrientation).normalize();
    const angularMomentum = bodyAxis
      .clone()
      .multiplyScalar(this.state.rotorInertia * this.state.spinRate);
    const centerOfMass = bodyAxis.clone().multiplyScalar(this.state.leverArm);
    const gravityForce = new Vector3(0, -this.state.mass * this.state.gravity, 0);
    const torque = centerOfMass.clone().cross(gravityForce);

    this.state.precessionRate = precessionRate;
    this.state.bodyAxis.copy(bodyAxis);
    this.state.centerOfMass.copy(centerOfMass);
    this.state.gravityForce.copy(gravityForce);
    this.state.orientation.copy(orientation);
    this.state.angularMomentum.copy(angularMomentum);
    this.state.torque.copy(torque);
  }

  private computePrecessionRate(safeSpinRate: number): number {
    const steadyRate =
      (this.state.mass * this.state.gravity * this.state.leverArm) /
      (this.state.rotorInertia * safeSpinRate);
    const spinMagnitude = Math.abs(safeSpinRate);
    const blend = Math.min(spinMagnitude / LOW_SPIN_BLEND, 1);
    const limitedRate =
      Math.sign(steadyRate) * Math.min(Math.abs(steadyRate), PRECESSION_LIMIT);

    return limitedRate * blend;
  }
}
