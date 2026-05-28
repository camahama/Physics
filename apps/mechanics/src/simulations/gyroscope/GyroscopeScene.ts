import {
  AmbientLight,
  ArrowHelper,
  BoxGeometry,
  Clock,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  TorusGeometry,
  Vector3,
  WebGLRenderer
} from "three";
import { copy } from "../../i18n";
import { GyroscopeModel } from "./GyroscopeModel";

const labels = copy.gyroscope.figure;
const ORIGIN = new Vector3();
const LABEL_LIFT = new Vector3(0, 0.12, 0);
const EPSILON = 1e-4;

export class GyroscopeScene {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100);
  private readonly renderer = new WebGLRenderer({ antialias: true, alpha: true });
  private readonly clock = new Clock();
  private readonly top = new Group();
  private readonly angularMomentumArrow = new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), 1, 0xe85d04, 0.2, 0.12);
  private readonly torqueArrow = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), 1, 0x4cc9f0, 0.2, 0.12);
  private readonly positionArrow = new ArrowHelper(new Vector3(0, 1, 0), new Vector3(), 1, 0x2a9d8f, 0.18, 0.1);
  private readonly gravityArrow = new ArrowHelper(new Vector3(0, -1, 0), new Vector3(), 1, 0x6d597a, 0.18, 0.1);
  private readonly overlay = document.createElement("div");
  private readonly labelNodes = {
    angularMomentum: this.createOverlayPill(labels.angularMomentum),
    torque: this.createOverlayPill(labels.torque),
    position: this.createOverlayPill(labels.position),
    gravity: this.createOverlayPill(labels.gravity)
  };
  private readonly equationNodes = {
    torque: this.createEquationBadge(labels.equationTorque),
    precession: this.createEquationBadge(labels.equationPrecession)
  };
  private frameId = 0;
  private isPaused = false;

  constructor(
    private readonly mountNode: HTMLElement,
    private readonly model: GyroscopeModel
  ) {
    this.scene.background = new Color(0xf3efe7);
    this.camera.position.set(3.8, 2.2, 4.2);
    this.camera.lookAt(0, 0.7, 0);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.mountNode.append(this.renderer.domElement, this.overlay);

    this.buildScene();
    this.buildOverlay();
    this.handleResize();
    window.addEventListener("resize", this.handleResize);
  }

  start(): void {
    this.clock.start();
    this.renderFrame();
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.clock.getDelta();
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.handleResize);
    this.renderer.dispose();
  }

  syncFromModel(): void {
    const state = this.model.getState();
    this.top.quaternion.copy(state.orientation);

    const positionLength = MathUtils.clamp(state.centerOfMass.length(), 0.12, 1.8);
    this.positionArrow.position.copy(ORIGIN);
    this.positionArrow.setDirection(state.centerOfMass.clone().normalize());
    this.positionArrow.setLength(positionLength, 0.18, 0.1);

    const gravityLength = MathUtils.clamp(state.gravityForce.length() * 0.12, 0.16, 2.2);
    this.gravityArrow.position.copy(state.centerOfMass);
    this.gravityArrow.setDirection(state.gravityForce.clone().normalize());
    this.gravityArrow.setLength(gravityLength, 0.18, 0.1);

    const angularMomentumMagnitude = state.angularMomentum.length();
    const angularMomentumLength =
      angularMomentumMagnitude < EPSILON ? 0 : MathUtils.clamp(angularMomentumMagnitude * 0.16, 0, 2.5);
    if (angularMomentumMagnitude >= EPSILON) {
      this.angularMomentumArrow.setDirection(state.angularMomentum.clone().normalize());
    }
    this.angularMomentumArrow.setLength(angularMomentumLength, 0.2, 0.12);

    const torqueMagnitude = state.torque.length();
    const torqueLength =
      torqueMagnitude < EPSILON ? 0 : MathUtils.clamp(torqueMagnitude * 0.18, 0, 1.6);
    if (torqueMagnitude >= EPSILON) {
      this.torqueArrow.setDirection(state.torque.clone().normalize());
    }
    this.torqueArrow.setLength(torqueLength, 0.18, 0.1);

    this.positionLabels();
  }

  private renderFrame = (): void => {
    const delta = Math.min(this.clock.getDelta(), 1 / 30);
    if (!this.isPaused) {
      this.model.step(delta);
    }
    this.syncFromModel();
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.renderFrame);
  };

  private handleResize = (): void => {
    const { clientWidth, clientHeight } = this.mountNode;
    const safeHeight = Math.max(clientHeight, 320);
    this.camera.aspect = clientWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, safeHeight);
    this.positionLabels();
  };

  private buildScene(): void {
    const ambient = new AmbientLight(0xffffff, 1.4);
    const keyLight = new DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4, 8, 6);

    const base = new Mesh(
      new CylinderGeometry(1.2, 1.5, 0.16, 48),
      new MeshStandardMaterial({ color: 0x4f6d7a, metalness: 0.2, roughness: 0.8 })
    );
    base.position.y = -0.08;

    const mast = new Mesh(
      new CylinderGeometry(0.06, 0.08, 1.3, 24),
      new MeshStandardMaterial({ color: 0xc1121f, metalness: 0.35, roughness: 0.45 })
    );
    mast.position.y = 0.48;

    const axle = new Mesh(
      new CylinderGeometry(0.05, 0.05, 1.4, 24),
      new MeshStandardMaterial({ color: 0x243b53, metalness: 0.45, roughness: 0.35 })
    );
    axle.rotation.z = Math.PI / 2;
    axle.position.y = 1.05;

    const wheel = new Mesh(
      new TorusGeometry(0.44, 0.12, 18, 60),
      new MeshStandardMaterial({ color: 0xf0a202, metalness: 0.4, roughness: 0.34 })
    );
    wheel.rotation.y = Math.PI / 2;
    wheel.position.y = 1.05;

    const counterweight = new Mesh(
      new BoxGeometry(0.2, 0.2, 0.2),
      new MeshStandardMaterial({ color: 0x4f6d7a, metalness: 0.25, roughness: 0.6 })
    );
    counterweight.position.set(0, 1.45, 0);

    this.top.add(mast, axle, wheel, counterweight);
    this.scene.add(base, this.top, this.positionArrow, this.gravityArrow, this.angularMomentumArrow, this.torqueArrow, ambient, keyLight);
    this.syncFromModel();
  }

  private buildOverlay(): void {
    this.overlay.className = "scene-overlay";
    this.overlay.append(
      this.equationNodes.torque,
      this.equationNodes.precession,
      this.labelNodes.angularMomentum,
      this.labelNodes.torque,
      this.labelNodes.position,
      this.labelNodes.gravity
    );
  }

  private createOverlayPill(text: string): HTMLDivElement {
    const label = document.createElement("div");
    label.className = "vector-label";
    label.textContent = text;
    return label;
  }

  private createEquationBadge(text: string): HTMLDivElement {
    const badge = document.createElement("div");
    badge.className = "figure-equation";
    badge.textContent = text;
    return badge;
  }

  private positionLabels(): void {
    const state = this.model.getState();
    this.placeLabel(this.labelNodes.position, state.centerOfMass.clone().multiplyScalar(0.55).add(LABEL_LIFT));
    this.placeLabel(
      this.labelNodes.gravity,
      state.centerOfMass.clone().add(state.gravityForce.clone().normalize().multiplyScalar(0.8)).add(new Vector3(0.18, 0, 0))
    );
    this.placeLabel(this.labelNodes.angularMomentum, this.vectorLabelPosition(state.angularMomentum, MathUtils.clamp(state.angularMomentum.length() * 0.16, 0.4, 1.8), LABEL_LIFT));
    this.placeLabel(this.labelNodes.torque, this.vectorLabelPosition(state.torque, MathUtils.clamp(state.torque.length() * 0.18, 0.35, 1.2), new Vector3(0, 0.16, 0)));
  }

  private vectorLabelPosition(vector: Vector3, distance: number, lift: Vector3): Vector3 {
    if (vector.lengthSq() < EPSILON) {
      return lift.clone();
    }
    return vector.clone().normalize().multiplyScalar(distance).add(lift);
  }

  private placeLabel(element: HTMLElement, worldPosition: Vector3): void {
    const projected = worldPosition.project(this.camera);
    const x = ((projected.x + 1) / 2) * this.mountNode.clientWidth;
    const y = ((-projected.y + 1) / 2) * this.mountNode.clientHeight;
    element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }
}
