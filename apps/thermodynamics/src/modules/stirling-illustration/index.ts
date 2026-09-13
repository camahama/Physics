import type { ModuleRenderContext } from "../../config/modules.js";
import { createPackageCredit } from "../../components/packageCredit.js";

const R = 8.31446261815324;
const ATM_TO_PA = 101325;
const LITER_TO_M3 = 0.001;
const PV_WIDTH = 720;
const PV_HEIGHT = 460;
const PV_PLOT = {
  left: 72,
  right: 672,
  top: 42,
  bottom: 392,
};

type StirlingState = {
  coldTemperature: number;
  hotTemperature: number;
  compressionRatio: number;
  minVolumeLiters: number;
  minPressureAtm: number;
  amountMol: number;
  pressureAmountMode: "pressure" | "amount";
};

type CyclePoint = {
  volumeLiters: number;
  pressureAtm: number;
};

type CycleValues = {
  points: [CyclePoint, CyclePoint, CyclePoint, CyclePoint];
  netWorkJ: number;
  heatInJ: number;
  efficiency: number;
};

type Scale = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

type SliderControl = {
  row: HTMLLabelElement;
  input: HTMLInputElement;
  valueLabel: HTMLElement;
  unit: string;
};

type AmountControl = {
  row: HTMLLabelElement;
  input: HTMLInputElement;
};

type ResultControls = {
  row: HTMLElement;
  netWork: HTMLElement;
  heatIn: HTMLElement;
  efficiency: HTMLElement;
};

export function renderStirlingIllustrationModule({ t }: ModuleRenderContext): HTMLElement {
  const state: StirlingState = {
    coldTemperature: 300,
    hotTemperature: 700,
    compressionRatio: 3,
    minVolumeLiters: 0.5,
    minPressureAtm: 1,
    amountMol: 0,
    pressureAmountMode: "pressure",
  };
  syncAmountFromPressure(state);

  let animationFrame = 0;
  let startedAt = performance.now();
  let pausedPhase = 0;
  let isRunning = false;
  let dragPointer: number | null = null;
  let previousAngle: number | null = null;

  const page = element("main", "page-shell thermodynamics-shell stirling-lecture-shell");
  const content = element("section", "module-page module-page-wide stirling-illustration-page");
  const backLink = document.createElement("a");
  backLink.href = "#/";
  backLink.className = "module-menu-button";
  backLink.textContent = t("common.menuButton");

  const header = element("header", "stirling-illustration-header");
  const headerInfo = element("div", "module-header-info");
  headerInfo.append(
    richTextElement("p", "module-description", t("modules.stirlingIllustration.description")),
    backLink,
  );
  header.append(
    element("h1", "module-title", t("modules.stirlingIllustration.title")),
    headerInfo,
  );

  const layout = element("section", "stirling-illustration-layout");
  const diagramPanel = element("section", "stirling-panel stirling-pv-panel");
  const controlPanel = element("aside", "stirling-panel stirling-controls-panel");
  const enginePanel = element("section", "stirling-panel stirling-engine-panel");
  const pvSvg = svgNode("svg", {
    class: "stirling-pv-diagram",
    viewBox: `0 0 ${PV_WIDTH} ${PV_HEIGHT}`,
    role: "img",
    "aria-label": t("modules.stirlingIllustration.diagramLabel"),
  });
  const engineSvg = svgNode("svg", {
    class: "stirling-engine-model",
    viewBox: "20 70 790 490",
    role: "img",
    "aria-label": t("modules.stirlingIllustration.engineLabel"),
  });

  const runButton = document.createElement("button");
  runButton.type = "button";
  runButton.className = "stirling-run-button running";
  const manualControls = element("div", "stirling-manual-controls");
  manualControls.hidden = true;
  const manualHint = element("p", "stirling-lecture-note", t("modules.stirlingIllustration.controls.manualHint"));
  const phaseControl = createSlider({
    label: t("modules.stirlingIllustration.controls.phase"), value: 0,
    min: 0, max: 360, step: 1, unit: "°",
    onInput: (degrees) => {
      pausedPhase = (degrees % 360) / 360;
      updateModel();
    },
  });
  manualControls.append(manualHint, phaseControl.row);
  const sliders = {
    coldTemperature: createSlider({
      label: t("modules.stirlingIllustration.controls.coldTemperature"),
      value: state.coldTemperature,
      min: 200,
      max: 500,
      step: 5,
      unit: "K",
      onInput: (value) => {
        state.coldTemperature = Math.min(value, state.hotTemperature - 20);
        syncPressureAmountPair(state);
        updateModel();
      },
    }),
    hotTemperature: createSlider({
      label: t("modules.stirlingIllustration.controls.hotTemperature"),
      value: state.hotTemperature,
      min: 350,
      max: 1200,
      step: 10,
      unit: "K",
      onInput: (value) => {
        state.hotTemperature = Math.max(value, state.coldTemperature + 20);
        updateModel();
      },
    }),
    compressionRatio: createSlider({
      label: t("modules.stirlingIllustration.controls.compressionRatio"),
      value: state.compressionRatio,
      min: 1.2,
      max: 8,
      step: 0.1,
      unit: "",
      onInput: (value) => {
        state.compressionRatio = value;
        syncPressureAmountPair(state);
        updateModel();
      },
    }),
    minVolumeLiters: createSlider({
      label: t("modules.stirlingIllustration.controls.minVolume"),
      value: state.minVolumeLiters,
      min: 0.1,
      max: 3,
      step: 0.05,
      unit: "l",
      onInput: (value) => {
        state.minVolumeLiters = value;
        syncPressureAmountPair(state);
        updateModel();
      },
    }),
    minPressureAtm: createSlider({
      label: t("modules.stirlingIllustration.controls.minPressure"),
      value: state.minPressureAtm,
      min: 0.2,
      max: 5,
      step: 0.05,
      unit: "atm",
      onInput: (value) => {
        state.minPressureAtm = value;
        state.pressureAmountMode = "pressure";
        syncAmountFromPressure(state);
        updateModel();
      },
    }),
  };
  const amountControl = createAmountInput();
  const results = createResults();

  function updateModel() {
    if (!isRunning) syncSlider(phaseControl, pausedPhase * 360);
    const values = calculateCycle(state);
    syncControlValues();
    updateResults(results, values);
    renderPvDiagram(pvSvg, values, currentPhase());
    if (!isRunning) {
      renderEngine(engineSvg, values, currentPhase(), t);
    }
  }

  function createAmountInput() {
    const label = document.createElement("label");
    label.className = "stirling-control-row";
    const heading = element("span", "stirling-control-label", t("modules.stirlingIllustration.controls.amount"));
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.value = formatNumber(state.amountMol, 3);
    input.addEventListener("input", () => {
      const parsed = parseInput(input.value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return;
      }
      state.amountMol = parsed;
      state.pressureAmountMode = "amount";
      syncPressureFromAmount(state);
      updateModel();
    });
    label.append(heading, input);
    return { input, row: label };
  }

  function createResults() {
    const resultPanel = element("section", "stirling-results");
    const netWork = resultItem(t("modules.stirlingIllustration.results.netWork"));
    const heatIn = resultItem(t("modules.stirlingIllustration.results.heatIn"));
    const efficiency = resultItem(t("modules.stirlingIllustration.results.efficiency"));
    resultPanel.append(netWork.row, heatIn.row, efficiency.row);
    return {
      row: resultPanel,
      netWork: netWork.value,
      heatIn: heatIn.value,
      efficiency: efficiency.value,
    };
  }

  function animate(now: number) {
    if (!document.body.contains(page)) {
      cancelAnimationFrame(animationFrame);
      return;
    }
    if (!isRunning) {
      return;
    }
    const phase = phaseAtTime(now);
    const values = calculateCycle(state);
    renderPvDiagram(pvSvg, values, phase);
    renderEngine(engineSvg, values, phase, t);
    animationFrame = requestAnimationFrame(animate);
  }

  function currentPhase() {
    return isRunning ? phaseAtTime(performance.now()) : pausedPhase;
  }

  function phaseAtTime(now: number) {
    return ((now - startedAt) / 6400) % 1;
  }

  function setRunning(nextRunning: boolean) {
    if (nextRunning === isRunning) {
      return;
    }
    endDrag();
    if (nextRunning) {
      isRunning = true;
      startedAt = performance.now() - pausedPhase * 6400;
      updateRunButton();
      animationFrame = requestAnimationFrame(animate);
      return;
    }

    pausedPhase = currentPhase();
    isRunning = false;
    cancelAnimationFrame(animationFrame);
    updateRunButton();
    updateModel();
  }

  function updateRunButton() {
    runButton.textContent = isRunning
      ? t("modules.stirlingIllustration.controls.stop")
      : t("modules.stirlingIllustration.controls.start");
    runButton.classList.toggle("running", isRunning);
    manualControls.hidden = isRunning;
    engineSvg.classList.toggle("manual", !isRunning);
  }

  function syncControlValues() {
    syncSlider(sliders.coldTemperature, state.coldTemperature);
    syncSlider(sliders.hotTemperature, state.hotTemperature);
    syncSlider(sliders.compressionRatio, state.compressionRatio);
    syncSlider(sliders.minVolumeLiters, state.minVolumeLiters);
    syncSlider(sliders.minPressureAtm, state.minPressureAtm);
    if (document.activeElement !== amountControl.input) {
      amountControl.input.value = formatNumber(state.amountMol, 3);
    }
  }

  function endDrag() {
    const pointer = dragPointer;
    dragPointer = null;
    previousAngle = null;
    engineSvg.classList.remove("dragging");
    if (pointer !== null && engineSvg.hasPointerCapture(pointer)) engineSvg.releasePointerCapture(pointer);
  }

  // Transform through the SVG screen matrix to account for letterboxing and zoom.
  function pointerPosition(event: PointerEvent) {
    const matrix = engineSvg.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = point.x - 810, y = point.y - 310;
    return { angle: Math.atan2(y, x), radius: Math.hypot(x, y) };
  }

  engineSvg.addEventListener("pointerdown", (event) => {
    if (isRunning || dragPointer !== null || event.button !== 0) return;
    const point = pointerPosition(event);
    if (!point || point.radius < 30 || point.radius > 288) return;
    event.preventDefault();
    dragPointer = event.pointerId;
    previousAngle = point.angle;
    engineSvg.setPointerCapture(event.pointerId);
    engineSvg.classList.add("dragging");
  });
  engineSvg.addEventListener("pointermove", (event) => {
    if (event.pointerId !== dragPointer) return;
    const point = pointerPosition(event);
    if (!point || point.radius < 30) {
      previousAngle = null;
      return;
    }
    if (previousAngle !== null) {
      pausedPhase = advancePhaseByAngle(pausedPhase, previousAngle, point.angle);
      updateModel();
    }
    previousAngle = point.angle;
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
    engineSvg.addEventListener(type, (event) => {
      if (event.pointerId === dragPointer) endDrag();
    });
  }
  runButton.addEventListener("click", () => setRunning(!isRunning));
  updateRunButton();

  diagramPanel.append(
    element("h2", "stirling-section-title", t("modules.stirlingIllustration.diagramTitle")),
    pvSvg,
  );
  const controlsHeading = element("div", "stirling-controls-heading");
  const playbackButtons = element("div", "stirling-playback-buttons");
  playbackButtons.append(runButton);
  controlsHeading.append(
    element("h2", "stirling-section-title", t("modules.stirlingIllustration.controlsTitle")),
    playbackButtons,
  );
  controlPanel.append(
    controlsHeading,
    manualControls,
    sliders.coldTemperature.row,
    sliders.hotTemperature.row,
    sliders.compressionRatio.row,
    sliders.minVolumeLiters.row,
    sliders.minPressureAtm.row,
    amountControl.row,
    results.row,
  );
  layout.append(diagramPanel, enginePanel);
  enginePanel.append(
    element("h2", "stirling-section-title", t("modules.stirlingIllustration.engineTitle")),
    engineSvg,
    element("p", "stirling-flywheel-caption", t("modules.stirlingIllustration.engine.cam")),
  );
  const modelNote = element("p", "stirling-lecture-note", t("modules.stirlingIllustration.engine.idealNote"));
  content.append(header, layout, controlPanel, modelNote, createPackageCredit(t));
  page.append(content);

  updateModel();

  return page;
}

function advancePhaseByAngle(phase: number, previous: number, next: number) {
  const delta = Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
  return ((phase + delta / (2 * Math.PI)) % 1 + 1) % 1;
}

function calculateCycle(state: StirlingState): CycleValues {
  const vMin = state.minVolumeLiters * LITER_TO_M3;
  const vMax = vMin * state.compressionRatio;
  const n = Math.max(state.amountMol, 1e-9);
  const tc = state.coldTemperature;
  const th = Math.max(state.hotTemperature, tc + 1);
  const points: [CyclePoint, CyclePoint, CyclePoint, CyclePoint] = [
    { volumeLiters: vMin / LITER_TO_M3, pressureAtm: n * R * th / vMin / ATM_TO_PA },
    { volumeLiters: vMax / LITER_TO_M3, pressureAtm: n * R * th / vMax / ATM_TO_PA },
    { volumeLiters: vMax / LITER_TO_M3, pressureAtm: n * R * tc / vMax / ATM_TO_PA },
    { volumeLiters: vMin / LITER_TO_M3, pressureAtm: n * R * tc / vMin / ATM_TO_PA },
  ];
  const logRatio = Math.log(state.compressionRatio);
  return {
    points,
    netWorkJ: n * R * (th - tc) * logRatio,
    heatInJ: n * R * th * logRatio,
    efficiency: 1 - tc / th,
  };
}

function renderPvDiagram(svg: SVGSVGElement, values: CycleValues, phase: number) {
  const scale = createScale(values.points);
  const toX = (volume: number) => PV_PLOT.left + ((volume - scale.xMin) / (scale.xMax - scale.xMin)) * (PV_PLOT.right - PV_PLOT.left);
  const toY = (pressure: number) => PV_PLOT.bottom - ((pressure - scale.yMin) / (scale.yMax - scale.yMin)) * (PV_PLOT.bottom - PV_PLOT.top);
  const [one, two, three, four] = values.points;
  const moving = sampleCycle(values, phase);

  const grid = svgGroup("stirling-pv-grid");
  for (const tick of createTicks(scale.xMin, scale.xMax, 6)) {
    const x = toX(tick);
    grid.append(svgNode("line", {
      x1: String(x),
      y1: String(PV_PLOT.top),
      x2: String(x),
      y2: String(PV_PLOT.bottom),
      class: "stirling-grid-line",
    }));
    grid.append(svgText(formatNumber(tick, 3), x, PV_PLOT.bottom + 30, "stirling-axis-tick-label"));
  }
  for (const tick of createTicks(scale.yMin, scale.yMax, 6)) {
    const y = toY(tick);
    grid.append(svgNode("line", {
      x1: String(PV_PLOT.left),
      y1: String(y),
      x2: String(PV_PLOT.right),
      y2: String(y),
      class: "stirling-grid-line",
    }));
    grid.append(svgText(formatNumber(tick, 3), PV_PLOT.left - 18, y + 5, "stirling-axis-tick-label y"));
  }

  const hotPath = createIsothermPath(one, two, toX, toY);
  const coldPath = createIsothermPath(three, four, toX, toY);
  const coolPath = `M ${toX(two.volumeLiters)} ${toY(two.pressureAtm)} L ${toX(three.volumeLiters)} ${toY(three.pressureAtm)}`;
  const heatPath = `M ${toX(four.volumeLiters)} ${toY(four.pressureAtm)} L ${toX(one.volumeLiters)} ${toY(one.pressureAtm)}`;

  const cycle = svgGroup("stirling-cycle");
  cycle.append(
    svgNode("path", { d: hotPath, class: "stirling-cycle-path hot" }),
    svgNode("path", { d: coolPath, class: "stirling-cycle-path cool" }),
    svgNode("path", { d: coldPath, class: "stirling-cycle-path cold" }),
    svgNode("path", { d: heatPath, class: "stirling-cycle-path heat" }),
  );

  values.points.forEach((point, index) => {
    cycle.append(svgNode("circle", {
      cx: String(toX(point.volumeLiters)),
      cy: String(toY(point.pressureAtm)),
      r: "5",
      class: "stirling-state-point",
    }));
    cycle.append(svgText(String(index + 1), toX(point.volumeLiters) + 12, toY(point.pressureAtm) - 10, "stirling-state-label"));
  });

  const axes = svgGroup("stirling-axes");
  axes.append(
    svgNode("line", {
      x1: String(PV_PLOT.left),
      y1: String(PV_PLOT.bottom),
      x2: String(PV_PLOT.right + 20),
      y2: String(PV_PLOT.bottom),
      class: "stirling-axis",
    }),
    svgNode("line", {
      x1: String(PV_PLOT.left),
      y1: String(PV_PLOT.bottom),
      x2: String(PV_PLOT.left),
      y2: String(PV_PLOT.top - 20),
      class: "stirling-axis",
    }),
    svgText("V / l", PV_PLOT.right - 4, PV_PLOT.bottom + 58, "stirling-axis-label"),
    svgText("p / atm", PV_PLOT.left + 16, PV_PLOT.top - 12, "stirling-axis-label y"),
  );

  const tracker = svgNode("circle", {
    cx: String(toX(moving.volumeLiters)),
    cy: String(toY(moving.pressureAtm)),
    r: "9",
    class: "stirling-cycle-dot",
  });

  svg.replaceChildren(
    svgNode("rect", {
      x: String(PV_PLOT.left),
      y: String(PV_PLOT.top),
      width: String(PV_PLOT.right - PV_PLOT.left),
      height: String(PV_PLOT.bottom - PV_PLOT.top),
      class: "stirling-plot-background",
    }),
    grid,
    axes,
    cycle,
    tracker,
  );
}

// Both the cam followers and pV marker use this one phase/volume law.
// Closed-groove cams provide the dwells required by the ideal Stirling cycle.
function engineGeometry(values: CycleValues, phase: number) {
  const moving = sampleCycle(values, phase);
  const freeLength = 240 * moving.volumeLiters / values.points[1].volumeLiters;
  const segment = Math.floor(((phase % 1 + 1) % 1) * 4);
  const local = smoothStep(((phase % 1 + 1) % 1) * 4 - segment);
  const hotFraction = segment === 0 ? 0.96 : segment === 1 ? lerp(0.96, 0.04, local)
    : segment === 2 ? 0.04 : lerp(0.04, 0.96, local);
  return { moving, power: 104 + freeLength, regenerator: 80 + freeLength * hotFraction };
}

// Qualitative matrix temperature: stores heat on 2→3, returns it on 4→1.
// The ideal cycle does not specify a matrix heat capacity or absolute temperature.
function regeneratorHeatFraction(phase: number) {
  const cycle = ((phase % 1 + 1) % 1) * 4;
  const segment = Math.floor(cycle);
  const progress = smoothStep(cycle - segment);
  return segment === 0 ? 0 : segment === 1 ? progress : segment === 2 ? 1 : 1 - progress;
}

function renderEngine(svg: SVGSVGElement, values: CycleValues, phase: number, t: ModuleRenderContext["t"]) {
  const { moving, power, regenerator } = engineGeometry(values, phase);
  const cx = 810, cy = 310;
  const angle = phase * 360;
  const line = (x1: number, y1: number, x2: number, y2: number, cls: string) =>
    svgNode("line", { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2), class: cls });
  const rect = (x: number, y: number, width: number, height: number, cls: string) =>
    svgNode("rect", { x: String(x), y: String(y), width: String(width), height: String(height), class: cls });
  // Each follower travels horizontally, rigidly attached to its piston rod.
  // Profiles are generated in wheel coordinates, then rotate with the shaft.
  const cam = (kind: "power" | "regenerator", offset: number, cls: string) => {
    const points: string[] = [];
    for (let i = 0; i <= 360; i++) {
      const g = engineGeometry(values, i / 360);
      const radius = cx - (g[kind] + offset);
      const a = Math.PI - i * Math.PI / 180;
      points.push(`${i ? "L" : "M"} ${cx + radius * Math.cos(a)} ${cy + radius * Math.sin(a)}`);
    }
    return svgNode("path", { d: points.join(" ") + " Z", class: cls,
      transform: `rotate(${angle} ${cx} ${cy})` });
  };
  const defs = svgNode("defs", {});
  const metalGradient = (id: string, colors: string[], shaft = false) => {
    const gradient = svgNode("linearGradient", shaft
      ? { id, gradientUnits: "userSpaceOnUse", x1: "0", x2: "0", y1: "302", y2: "318" }
      : { id, x1: "0%", x2: "0%", y1: "0%", y2: "100%" });
    colors.forEach((color, i) => gradient.append(svgNode("stop", {
      offset: `${i * 100 / (colors.length - 1)}%`, "stop-color": color,
    })));
    defs.append(gradient);
  };
  metalGradient("stirling-metal", ["#394954", "#9caeb9", "#f5fafc", "#afbec7", "#71848f", "#dbe5ea", "#455b68"]);
  metalGradient("stirling-dark-metal", ["#27333e", "#758692", "#d6e0e6", "#637582", "#263843"]);
  const storedHeat = regeneratorHeatFraction(phase);
  const thermalTint = (cold: number[], hot: number[]) =>
    `rgb(${cold.map((channel, i) => Math.round(lerp(channel, hot[i], storedHeat))).join(" ")})`;
  metalGradient("stirling-bronze", [
    thermalTint([39, 67, 103], [119, 42, 28]),
    thermalTint([83, 147, 193], [207, 98, 53]),
    thermalTint([202, 231, 242], [255, 214, 160]),
    thermalTint([76, 130, 176], [192, 77, 42]),
    thermalTint([36, 64, 95], [100, 39, 27]),
  ]);
  metalGradient("stirling-bore", ["#647581", "#cbd6dc", "#f5f8fa", "#c2cfd7", "#647783"]);
  metalGradient("stirling-shaft", ["#3c515e", "#eff8ff", "#a8bcc9", "#405866"], true);
  metalGradient("stirling-flame", ["#ffdf74", "#ffad32", "#e85020"]);
  const wheel = svgGroup("stirling-cam-wheel");
  wheel.append(svgNode("circle", { cx: String(cx), cy: String(cy), r: "278", class: "stirling-flywheel" }));
  wheel.append(svgNode("circle", { cx: String(cx), cy: String(cy), r: "270", class: "stirling-rim-highlight" }));
  for (let i = 0; i < 6; i++) {
    const a = (angle + i * 60) * Math.PI / 180;
    wheel.append(line(cx + 25 * Math.cos(a), cy + 25 * Math.sin(a), cx + 264 * Math.cos(a), cy + 264 * Math.sin(a), "stirling-wheel-spoke"));
  }
  wheel.append(cam("power", 445, "stirling-cam-track power"), cam("regenerator", 470, "stirling-cam-track regenerator"));
  const parts: SVGElement[] = [defs, wheel,
    rect(62, 222, 320, 152, "stirling-cylinder-shell"),
    rect(80, 240, 282, 116, "stirling-cylinder-cut"),
    rect(80, 240, regenerator - 80, 116, "stirling-hot-space"),
    rect(regenerator + 24, 240, power - regenerator - 24, 116, "stirling-cold-space"),
    rect(power, 238, 24, 120, "stirling-power-piston"),
    line(power + 5, 240, power + 5, 355, "stirling-piston-ring"),
    line(power + 18, 240, power + 18, 355, "stirling-piston-ring"),
    // A hollow power rod surrounds the independently moving regenerator rod.
    line(power + 24, 310, power + 445, 310, "stirling-power-shaft"),
    line(regenerator + 24, 310, regenerator + 470, 310, "stirling-regenerator-shaft"),
    rect(regenerator, 242, 24, 112, "stirling-regenerator"),
  ];
  for (const x of [70, 374]) {
    for (const y of [230, 366]) {
      parts.push(svgNode("circle", { cx: String(x), cy: String(y), r: "4", class: "stirling-fastener" }),
        line(x - 2, y, x + 2, y, "stirling-fastener-slot"));
    }
  }
  for (let x = 4; x < 24; x += 5) parts.push(line(regenerator + x, 245, regenerator + x, 351, "stirling-mesh"));
  for (let y = 246; y < 354; y += 8) parts.push(line(regenerator + 2, y, regenerator + 22, y, "stirling-mesh"));
  for (let x = 268; x <= 360; x += 14) {
    parts.push(
      line(x, 200, x, 222, "stirling-cooling-fin"),
      svgNode("path", {
        d: `M ${x - 3} 374 L ${x - 3} 399 Q ${x} 411 ${x + 5} 399 L ${x + 5} 374 Z`,
        class: "stirling-cooling-flange",
      }),
    );
  }
  parts.push(
    svgNode("circle", { cx: String(power + 445), cy: "310", r: "9", class: "stirling-cam-follower power" }),
    svgNode("circle", { cx: String(regenerator + 470), cy: "310", r: "7", class: "stirling-cam-follower regenerator" }),
    svgNode("circle", { cx: String(cx), cy: String(cy), r: "18", class: "stirling-flywheel-hub" }),
    svgNode("path", { d: "M 40 420 H 112 M 55 417 C 36 397 58 382 70 368 C 66 392 102 397 88 417", class: "stirling-heat-source" }),
    svgText(t("modules.stirlingIllustration.engine.hot"), 40, 456, "stirling-engine-label hot"),
    svgText(t("modules.stirlingIllustration.engine.cooler"), 266, 456, "stirling-engine-label cool"),
    svgText(t("modules.stirlingIllustration.engine.regenerator"), 80, 510, "stirling-engine-label bronze"),
    svgText(`V = ${formatNumber(moving.volumeLiters)} l    p = ${formatNumber(moving.pressureAtm)} atm`, 80, 100, "stirling-engine-label"),
    svgText(`Vmax / Vmin = ${formatNumber(values.points[1].volumeLiters / values.points[0].volumeLiters)} : 1`, 80, 138, "stirling-engine-label"),
  );
  // Dead-centre references measure gas length, excluding the solid matrix.
  for (const point of [values.points[0], values.points[1]]) {
    const x = 104 + 240 * point.volumeLiters / values.points[1].volumeLiters;
    parts.push(line(x, 220, x, 375, "stirling-dead-centre"));
  }
  svg.replaceChildren(...parts);
}

function sampleCycle(values: CycleValues, phase: number): CyclePoint {
  const [one, two, three, four] = values.points;
  const segment = Math.min(3, Math.floor(phase * 4));
  const local = smoothStep(phase * 4 - segment);
  if (segment === 0) {
    const volume = lerp(one.volumeLiters, two.volumeLiters, local);
    return interpolateIsotherm(one, volume);
  }
  if (segment === 1) {
    return interpolateLinear(two, three, local);
  }
  if (segment === 2) {
    const volume = lerp(three.volumeLiters, four.volumeLiters, local);
    return interpolateIsotherm(three, volume);
  }
  return interpolateLinear(four, one, local);
}

function interpolateIsotherm(reference: CyclePoint, volumeLiters: number): CyclePoint {
  return {
    volumeLiters,
    pressureAtm: reference.pressureAtm * reference.volumeLiters / volumeLiters,
  };
}

function interpolateLinear(start: CyclePoint, end: CyclePoint, amount: number): CyclePoint {
  return {
    volumeLiters: start.volumeLiters + (end.volumeLiters - start.volumeLiters) * amount,
    pressureAtm: start.pressureAtm + (end.pressureAtm - start.pressureAtm) * amount,
  };
}

function createScale(points: CyclePoint[]): Scale {
  const volumes = points.map((point) => point.volumeLiters);
  const pressures = points.map((point) => point.pressureAtm);
  const vMin = Math.min(...volumes);
  const vMax = Math.max(...volumes);
  const pMin = Math.min(...pressures);
  const pMax = Math.max(...pressures);
  return {
    xMin: Math.max(0, vMin - (vMax - vMin) * 0.18),
    xMax: vMax + (vMax - vMin) * 0.18,
    yMin: Math.max(0, pMin - (pMax - pMin) * 0.16),
    yMax: pMax + (pMax - pMin) * 0.16,
  };
}

function createIsothermPath(
  start: CyclePoint,
  end: CyclePoint,
  toX: (volume: number) => number,
  toY: (pressure: number) => number,
) {
  const parts = [`M ${toX(start.volumeLiters)} ${toY(start.pressureAtm)}`];
  for (let index = 1; index <= 36; index += 1) {
    const amount = index / 36;
    const volume = start.volumeLiters * ((end.volumeLiters / start.volumeLiters) ** amount);
    const pressure = start.pressureAtm * start.volumeLiters / volume;
    parts.push(`L ${toX(volume)} ${toY(pressure)}`);
  }
  return parts.join(" ");
}

function createTicks(min: number, max: number, count: number) {
  const step = niceStep((max - min) / Math.max(1, count - 1));
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= max + step * 0.1; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}

function niceStep(rawStep: number) {
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const normalized = rawStep / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothStep(value: number) {
  const clamped = clamp01(value);
  return clamped ** 3 * (10 - 15 * clamped + 6 * clamped ** 2);
}

function syncPressureAmountPair(state: StirlingState) {
  if (state.pressureAmountMode === "amount") {
    syncPressureFromAmount(state);
  } else {
    syncAmountFromPressure(state);
  }
}

function syncAmountFromPressure(state: StirlingState) {
  const vMax = state.minVolumeLiters * state.compressionRatio * LITER_TO_M3;
  state.amountMol = state.minPressureAtm * ATM_TO_PA * vMax / (R * state.coldTemperature);
}

function syncPressureFromAmount(state: StirlingState) {
  const vMax = state.minVolumeLiters * state.compressionRatio * LITER_TO_M3;
  state.minPressureAtm = state.amountMol * R * state.coldTemperature / vMax / ATM_TO_PA;
}

function createSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onInput,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onInput: (value: number) => void;
}): SliderControl {
  const row = element("label", "stirling-slider-row");
  const header = element("span", "stirling-slider-header");
  const valueLabel = element("span", "stirling-control-value", formatValueWithUnit(value, unit));
  header.append(element("span", "stirling-control-label", label), valueLabel);
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => onInput(Number(input.value)));
  row.append(header, input);
  return { row, input, valueLabel, unit };
}

function syncSlider(control: SliderControl, value: number) {
  if (document.activeElement !== control.input) {
    control.input.value = String(value);
  }
  control.valueLabel.textContent = formatValueWithUnit(value, control.unit);
}

function updateResults(controls: ResultControls, values: CycleValues) {
  controls.netWork.textContent = formatEnergy(values.netWorkJ);
  controls.heatIn.textContent = formatEnergy(values.heatInJ);
  controls.efficiency.textContent = formatPercent(values.efficiency);
}

function resultItem(label: string) {
  const item = element("div", "stirling-result-item");
  const value = element("strong", "stirling-result-value");
  item.append(element("span", "stirling-result-label", label), value);
  return { row: item, value };
}

function formatValueWithUnit(value: number, unit: string) {
  return `${formatNumber(value, 3)}${unit ? ` ${unit}` : ""}`;
}

function formatEnergy(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${formatNumber(value / 1000, 3)} kJ`;
  }
  return `${formatNumber(value, 3)} J`;
}

function formatPercent(value: number) {
  return `${formatNumber(value * 100, 3)} %`;
}

function formatNumber(value: number, significantDigits = 3) {
  if (!Number.isFinite(value)) {
    return "";
  }
  return Number(value.toPrecision(significantDigits)).toString();
}

function parseInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

function richTextElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  textContent: string,
): HTMLElementTagNameMap[K] {
  const item = element(tagName, className);
  appendRichText(item, textContent);
  return item;
}

function appendRichText(elementNode: HTMLElement, textContent: string) {
  const parts = textContent.split(/(pV|Q_12|W|η)/g);
  parts.forEach((part) => {
    if (part === "pV" || part === "W" || part === "η") {
      const span = element("span", "process-math-symbol", part);
      elementNode.append(span);
    } else if (part === "Q_12") {
      const span = element("span", "process-math-symbol", "Q");
      const sub = element("sub", "", "12");
      span.append(sub);
      elementNode.append(span);
    } else if (part) {
      elementNode.append(document.createTextNode(part));
    }
  });
}

function svgText(textContent: string, x: number, y: number, className: string) {
  const text = svgNode("text", {
    x: String(x),
    y: String(y),
    class: className,
  });
  const parts = textContent.split(/(Vmax|Vmin|\bpV\b|\bp\b|\bV\b)/g);
  parts.forEach(part => {
    if (/^(Vmax|Vmin|pV|p|V)$/.test(part)) {
      const symbol = svgNode("tspan", { "font-style": "italic" });
      symbol.textContent = part.startsWith("V") ? "V" : part;
      text.append(symbol);
      if (part === "Vmax" || part === "Vmin") {
        const subscript = svgNode("tspan", { "baseline-shift": "sub", "font-size": "70%", "font-style": "normal" });
        subscript.textContent = part.slice(1); text.append(subscript);
      }
    } else text.append(document.createTextNode(part));
  });
  return text;
}

function svgGroup(className: string) {
  return svgNode("g", { class: className });
}

function svgNode<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const item = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    item.setAttribute(key, value);
  });
  return item;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className = "",
  textContent = "",
): HTMLElementTagNameMap[K] {
  const item = document.createElement(tagName);
  if (className) {
    item.className = className;
  }
  if (textContent) {
    item.textContent = textContent;
  }
  return item;
}
