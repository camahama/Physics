import type { ModuleRenderContext } from "../../config/modules.js";
import { createPackageCredit } from "../../components/packageCredit.js";

const BOARD_WIDTH = 920;
const BOARD_HEIGHT = 640;
const PLOT = {
  left: 90,
  right: 860,
  top: 52,
  bottom: 560,
};
const AXIS_BREAK_OFFSET = 42;
const AXIS_BREAK_CLEARANCE = 34;
const SNAP_RADIUS = 22;
const MAX_PROCESSES = 6;
const DEFAULT_AXIS_RANGE = {
  pressureMinAtm: 1,
  pressureMaxAtm: 5,
  volumeMinLiters: 0,
  volumeMaxLiters: 10,
};
const ATM_TO_PA = 101325;
const HPA_TO_PA = 100;
const KPA_TO_PA = 1000;
const LITER_TO_CUBIC_METER = 0.001;
const GAS_CONSTANT = 8.31446261815324;
const LINEAR_TOLERANCE = 1e-7;
const DISPLAY_SIGNIFICANT_DIGITS = 3;

type ProcessType = "isotherm" | "adiabat" | "isochor" | "isobar";
type PressureUnit = "atm" | "Pa" | "hPa" | "kPa";
type VolumeUnit = "l" | "m3";
type TemperatureUnit = "K" | "C";
type GasType = "He" | "H2" | "N2" | "air" | "CO2";
type Point = { x: number; y: number };
type ProcessEndpoint = "start" | "end";
type EndpointRef = { processId: string; endpoint: ProcessEndpoint };
type Process = {
  id: string;
  type: ProcessType;
  start: Point;
  end: Point;
};
type AxisRange = typeof DEFAULT_AXIS_RANGE;
type StateValues = { p: string; v: string; t: string };
type LinearEquation = { coefficients: number[]; value: number };
type AxisTick = { baseValue: number; displayValue: number; label: string };
type StateDatum = { pPa: number; vM3: number; tK: number };
type PhysicalPoint = { volumeLiters: number; pressureAtm: number };
type ProcessCalculation = {
  process: Process;
  fromLabel: number;
  toLabel: number;
  qJ: number;
  wJ: number;
};
type StatePoint = Point & {
  label: number;
  processIds: string[];
  refs: EndpointRef[];
};

const processTypes: ProcessType[] = ["isotherm", "adiabat", "isochor", "isobar"];
const pressureUnits: PressureUnit[] = ["atm", "Pa", "hPa", "kPa"];
const volumeUnits: VolumeUnit[] = ["l", "m3"];
const temperatureUnits: TemperatureUnit[] = ["K", "C"];
const gasTypes: GasType[] = ["He", "H2", "N2", "air", "CO2"];
const gasProperties: Record<GasType, { degreesOfFreedom: number; gamma: number; molarMassKgPerMol: number }> = {
  He: { degreesOfFreedom: 3, gamma: 5 / 3, molarMassKgPerMol: 0.004002602 },
  H2: { degreesOfFreedom: 5, gamma: 7 / 5, molarMassKgPerMol: 0.00201588 },
  N2: { degreesOfFreedom: 5, gamma: 7 / 5, molarMassKgPerMol: 0.0280134 },
  air: { degreesOfFreedom: 5, gamma: 7 / 5, molarMassKgPerMol: 0.0289652 },
  CO2: { degreesOfFreedom: 5, gamma: 7 / 5, molarMassKgPerMol: 0.0440095 },
};

const state = {
  processes: [] as Process[],
  stateValues: {} as Record<number, StateValues>,
  units: {
    pressure: "atm" as PressureUnit,
    volume: "l" as VolumeUnit,
    temperature: "K" as TemperatureUnit,
  },
  axisRange: { ...DEFAULT_AXIS_RANGE } as AxisRange,
  gasType: "He" as GasType,
  gasMass: "",
  molarAmount: "",
  solverError: "",
  selectedType: "isotherm" as ProcessType,
  dragging: null as (
    | { type: "endpoint"; refs: EndpointRef[] }
    | { type: "state"; refs: EndpointRef[] }
    | { type: "process"; processId: string; lastPoint: Point }
  ) | null,
};

let nextProcessId = 1;

export function renderProcessBuilderModule({ t }: ModuleRenderContext): HTMLElement {
  const page = document.createElement("main");
  page.className = "page-shell process-builder-shell";

  const content = element("section", "module-page module-page-wide process-builder-page");
  const backLink = document.createElement("a");
  backLink.href = "#/";
  backLink.className = "module-menu-button";
  backLink.textContent = t("common.menuButton");

  const header = element("header", "process-builder-header");
  const headerInfo = element("div", "module-header-info");
  headerInfo.append(richTextElement("p", "module-description", t("modules.processBuilder.description")), backLink);
  header.append(
    element("h1", "module-title", t("modules.processBuilder.title")),
    headerInfo,
  );

  const layout = element("div", "process-builder-layout");
  const controls = element("aside", "process-builder-controls");
  const boardPanel = element("section", "process-builder-board-panel");
  const tablePanel = element("section", "process-builder-table-panel");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.setAttribute("viewBox", `0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`);
  svg.setAttribute("class", "process-builder-board");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", t("modules.processBuilder.boardLabel"));
  svg.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  svg.addEventListener("drop", (event) => {
    event.preventDefault();
    const processType = event.dataTransfer?.getData("application/x-process-type");
    if (isProcessType(processType)) {
      addProcess(processType, svgPointFromEvent(event, svg));
    }
  });
  svg.addEventListener("pointermove", (event) => {
    if (!state.dragging) {
      return;
    }

    const point = svgPointFromEvent(event, svg);
    if (state.dragging.type === "endpoint" || state.dragging.type === "state") {
      moveEndpointRefsWithConstraints(state.dragging.refs, point);
    } else {
      const delta = {
        x: point.x - state.dragging.lastPoint.x,
        y: point.y - state.dragging.lastPoint.y,
      };
      moveProcessBy(state.dragging.processId, delta);
      state.dragging.lastPoint = point;
    }
    update();
  });
  svg.addEventListener("pointerup", () => finishDragging());
  svg.addEventListener("pointerleave", () => finishDragging());

  function update() {
    renderControls();
    renderBoard();
    renderTable();
  }

  function renderControls() {
    controls.replaceChildren();
    controls.append(
      element("h2", "process-builder-panel-title", t("modules.processBuilder.toolsTitle")),
      richTextElement("p", "process-builder-instructions", t("modules.processBuilder.instructions")),
    );

    const toolGrid = element("div", "process-builder-tool-grid");
    for (const type of processTypes) {
      const button = document.createElement("button");
      button.type = "button";
      button.draggable = true;
      button.className = type === state.selectedType ? "process-builder-tool active" : "process-builder-tool";
      button.append(createProcessIcon(type), element("span", "", t(`modules.processBuilder.types.${type}`)));
      button.addEventListener("click", () => {
        state.selectedType = type;
        update();
      });
      button.addEventListener("dblclick", () => addProcess(type));
      button.addEventListener("dragstart", (event) => {
        state.selectedType = type;
        event.dataTransfer?.setData("application/x-process-type", type);
        event.dataTransfer?.setData("text/plain", type);
        event.dataTransfer?.setDragImage(button, 24, 24);
      });
      toolGrid.append(button);
    }

    const actions = element("div", "process-builder-actions");
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "process-builder-action";
    addButton.textContent = t("modules.processBuilder.addSelected");
    addButton.disabled = state.processes.length >= MAX_PROCESSES;
    addButton.addEventListener("click", () => addProcess(state.selectedType));

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "process-builder-reset";
    clearButton.textContent = t("modules.processBuilder.clearAll");
    clearButton.addEventListener("click", () => {
      state.processes = [];
      state.stateValues = {};
      state.dragging = null;
      state.axisRange = { ...DEFAULT_AXIS_RANGE };
      update();
    });

    const count = element(
      "p",
      "process-builder-count",
      t("modules.processBuilder.processCount", {
        count: state.processes.length,
        max: MAX_PROCESSES,
      }),
    );

    actions.append(addButton, clearButton, count);
    controls.append(toolGrid, actions);
  }

  function renderBoard() {
    const states = getNumberedStates();
    svg.replaceChildren();
    svg.append(createGrid(), createAxes(t, pressureUnitLabel(), volumeUnitLabel()), createDropHint(t));

    for (const process of state.processes) {
      svg.append(renderProcess(process));
    }

    for (const process of state.processes) {
      svg.append(renderEndpoint(process, "start"));
      svg.append(renderEndpoint(process, "end"));
    }

    for (const numberedState of states) {
      svg.append(renderStateLabel(numberedState));
    }
  }

  function renderTable() {
    tablePanel.replaceChildren();
    tablePanel.append(element("h2", "process-builder-panel-title", t("modules.processBuilder.tableTitle")));
    const valueLayout = element("div", "process-builder-value-layout");
    const valueControls = renderValueControls();

    const tableWrap = element("div", "process-builder-table-wrap");
    const table = document.createElement("table");
    table.className = "process-builder-table";

    const head = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.append(
      tableHeaderCell(t("modules.processBuilder.table.state")),
      tableQuantityHeaderCell("p", state.units.pressure),
      tableQuantityHeaderCell("V", state.units.volume === "m3" ? "m³" : "l"),
      tableQuantityHeaderCell("T", state.units.temperature === "C" ? "°C" : "K"),
    );
    head.append(headerRow);

    const body = document.createElement("tbody");
    const numberedStates = getNumberedStates();
    if (numberedStates.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "process-builder-empty";
      cell.textContent = t("modules.processBuilder.emptyTable");
      row.append(cell);
      body.append(row);
    } else {
      numberedStates.forEach((statePoint) => {
        const row = document.createElement("tr");
        row.append(
          tableTextCell(formatStateName(statePoint.label)),
          tableStateInputCell(statePoint.label, "p", pressureColumnLabel()),
          tableStateInputCell(statePoint.label, "v", volumeColumnLabel()),
          tableStateInputCell(statePoint.label, "t", temperatureColumnLabel()),
        );
        body.append(row);
      });
    }

    table.append(head, body);
    if (state.solverError) {
      tableWrap.append(element("p", "process-builder-solver-error", state.solverError));
    }
    tableWrap.append(table, renderEnergyTable(numberedStates));
    valueLayout.append(valueControls, tableWrap);
    tablePanel.append(valueLayout);
  }

  function renderEnergyTable(numberedStates: StatePoint[]) {
    const section = element("section", "process-builder-energy-section");
    section.append(element("h3", "process-builder-subtitle", t("modules.processBuilder.energy.title")));

    const table = document.createElement("table");
    table.className = "process-builder-table process-builder-energy-table";

    const head = document.createElement("thead");
    const headerRow = document.createElement("tr");
    [
      t("modules.processBuilder.energy.heatFlow"),
      t("modules.processBuilder.energy.work"),
    ].forEach((label) => {
      const cell = document.createElement("th");
      cell.textContent = label;
      headerRow.append(cell);
    });
    head.append(headerRow);

    const body = document.createElement("tbody");
    const calculations = calculateProcessEnergies(numberedStates);
    if (calculations.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 2;
      cell.className = "process-builder-empty";
      cell.textContent = t("modules.processBuilder.energy.empty");
      row.append(cell);
      body.append(row);
    } else {
      calculations.forEach((calculation) => {
        const row = document.createElement("tr");
        row.append(
          tableEnergyCell("Q", `${calculation.fromLabel}${calculation.toLabel}`, calculation.qJ, true),
          tableEnergyCell("W", `${calculation.fromLabel}${calculation.toLabel}`, calculation.wJ, true),
        );
        body.append(row);
      });
    }

    table.append(head, body);
    section.append(table, renderEnergySummary(calculations));
    return section;
  }

  function renderEnergySummary(calculations: ProcessCalculation[]) {
    const summary = element("dl", "process-builder-energy-summary");
    const hasCompleteCycle = calculations.length > 0 && calculations.every((calculation) => (
      Number.isFinite(calculation.qJ) && Number.isFinite(calculation.wJ)
    ));
    const netWork = hasCompleteCycle
      ? calculations.reduce((sum, calculation) => sum + calculation.wJ, 0)
      : Number.NaN;
    const heatIn = hasCompleteCycle
      ? calculations
      .filter((calculation) => calculation.qJ > 0)
      .reduce((sum, calculation) => sum + calculation.qJ, 0)
      : Number.NaN;
    const efficiency = heatIn > 0 ? netWork / heatIn : Number.NaN;

    summary.append(
      definitionRichItem(createSymbolName("W", "netto"), formatEnergyValue(netWork)),
      definitionRichItem(createSymbolName("Q", "in"), formatEnergyValue(heatIn)),
      definitionRichItem(createEfficiencyName(), formatEfficiencyValue(efficiency)),
    );
    return summary;
  }

  function renderValueControls() {
    const panel = element("aside", "process-builder-value-controls");
    const gas = gasProperties[state.gasType];

    panel.append(
      selectorRow(
        t("modules.processBuilder.valueControls.pressureUnit"),
        state.units.pressure,
        pressureUnits,
        (value) => {
          changePressureUnit(value as PressureUnit);
          update();
        },
      ),
      selectorRow(
        t("modules.processBuilder.valueControls.volumeUnit"),
        state.units.volume,
        volumeUnits,
        (value) => {
          changeVolumeUnit(value as VolumeUnit);
          update();
        },
        formatVolumeUnitOption,
      ),
      selectorRow(
        t("modules.processBuilder.valueControls.temperatureUnit"),
        state.units.temperature,
        temperatureUnits,
        (value) => {
          changeTemperatureUnit(value as TemperatureUnit);
          update();
        },
        (value) => value === "C" ? "°C" : value,
      ),
      selectorRow(
        t("modules.processBuilder.valueControls.gasType"),
        state.gasType,
        gasTypes,
        (value) => {
          if (isGasType(value)) {
            state.gasType = value;
            update();
          }
        },
        (value) => t(`modules.processBuilder.gases.${value}`),
      ),
    );

    const gasInfo = element("dl", "process-builder-gas-info");
    gasInfo.append(
      definitionItem("f", formatDisplayNumber(gas.degreesOfFreedom), "process-math-symbol process-gas-symbol"),
      definitionItem("γ", formatDisplayNumber(gas.gamma), "process-math-symbol process-gas-symbol"),
      definitionItem("M", `${formatDisplayNumber(gas.molarMassKgPerMol * 1000)} g/mol`, "process-math-symbol process-gas-symbol"),
    );

    panel.append(
      gasInfo,
      inputRow(t("modules.processBuilder.valueControls.mass"), state.gasMass, (value) => {
        state.gasMass = value;
      }),
      inputRow(t("modules.processBuilder.valueControls.molarAmount"), state.molarAmount, (value) => {
        state.molarAmount = value;
      }),
    );

    const actions = element("div", "process-builder-solver-actions");
    const solveButton = document.createElement("button");
    solveButton.type = "button";
    solveButton.className = "process-builder-solve";
    solveButton.textContent = t("modules.processBuilder.valueControls.solve");
    solveButton.addEventListener("click", () => {
      solveValues(t);
      update();
    });

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "process-builder-clear-values";
    clearButton.textContent = t("modules.processBuilder.valueControls.clearValues");
    clearButton.addEventListener("click", () => {
      state.stateValues = {};
      state.gasMass = "";
      state.molarAmount = "";
      state.solverError = "";
      update();
    });

    actions.append(solveButton, clearButton);
    panel.append(actions);

    return panel;
  }

  function renderProcess(process: Process): SVGElement {
    const group = svgGroup(`process-path process-${process.type}`);
    const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const pathData = getProcessPath(process);
    hitPath.setAttribute("d", pathData);
    hitPath.setAttribute("class", "process-hit-line");
    hitPath.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      hitPath.setPointerCapture(event.pointerId);
      state.dragging = {
        type: "process",
        processId: process.id,
        lastPoint: svgPointFromEvent(event, svg),
      };
    });
    path.setAttribute("d", pathData);
    path.setAttribute("class", "process-line");
    group.append(hitPath, path);
    return group;
  }

  function renderEndpoint(process: Process, endpoint: ProcessEndpoint): SVGElement {
    const point = process[endpoint];
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.setAttribute("cx", String(point.x));
    handle.setAttribute("cy", String(point.y));
    handle.setAttribute("r", "9");
    handle.setAttribute("class", `process-endpoint ${endpoint}`);
    handle.tabIndex = 0;
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      state.dragging = {
        type: "endpoint",
        refs: getConnectedEndpointRefs(process[endpoint]),
      };
    });
    return handle;
  }

  function finishDragging() {
    if (!state.dragging) {
      return;
    }

    if (state.dragging.type === "endpoint" || state.dragging.type === "state") {
      const currentPoint = getEndpointPoint(state.dragging.refs[0]);
      const snapTarget = currentPoint ? getSnapTarget(currentPoint, state.dragging.refs) : null;
      if (snapTarget) {
        moveEndpointRefsWithConstraints(state.dragging.refs, snapTarget);
      }
    }

    state.dragging = null;
    rescaleAxesToFit();
    update();
  }

  function addProcess(type: ProcessType, preferredCenter?: Point) {
    if (state.processes.length >= MAX_PROCESSES) {
      return;
    }

    state.selectedType = type;
    state.processes.push(createProcess(type, preferredCenter));
    rescaleAxesToFit();
    update();
  }

  function tableTypeCell(process: Process) {
    const cell = document.createElement("td");
    const select = document.createElement("select");
    select.setAttribute("aria-label", t("modules.processBuilder.table.type"));
    for (const type of processTypes) {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = t(`modules.processBuilder.types.${type}`);
      option.selected = process.type === type;
      select.append(option);
    }
    select.addEventListener("change", () => {
      if (isProcessType(select.value)) {
        process.type = select.value;
        const nextStart = constrainProcessEndpoint(process.type, "start", process.start, process);
        process.start = nextStart;
        process.end = constrainProcessEndpoint(process.type, "end", process.end, process);
        normalizeProcessEndpoints(process);
        update();
      }
    });
    cell.append(select);
    return cell;
  }

  function tableStateInputCell(stateLabel: number, key: keyof StateValues, label: string) {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    const values = getStateValues(stateLabel);
    input.value = values[key];
    input.setAttribute("aria-label", label);
    input.addEventListener("input", () => {
      getStateValues(stateLabel)[key] = input.value;
    });
    input.addEventListener("change", () => {
      if (key === "p" || key === "v") {
        applyStateValuesToGeometry(stateLabel, t);
        update();
      }
    });
    cell.append(input);
    return cell;
  }

  function selectorRow(
    labelText: string,
    value: string,
    options: string[],
    onChange: (value: string) => void,
    formatLabel = (option: string) => option,
  ) {
    const label = element("label", "process-builder-control-row");
    const text = element("span", "", labelText);
    const select = document.createElement("select");
    for (const option of options) {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = formatLabel(option);
      optionElement.selected = option === value;
      select.append(optionElement);
    }
    select.addEventListener("change", () => onChange(select.value));
    label.append(text, select);
    return label;
  }

  function inputRow(labelText: string, value: string, onInput: (value: string) => void) {
    const label = element("label", "process-builder-control-row");
    const text = element("span", "", labelText);
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.value = value;
    input.addEventListener("input", () => {
      onInput(input.value);
    });
    label.append(text, input);
    return label;
  }

  function pressureColumnLabel() {
    return `p / ${state.units.pressure}`;
  }

  function volumeColumnLabel() {
    return `V / ${state.units.volume === "m3" ? "m³" : "l"}`;
  }

  function temperatureColumnLabel() {
    return `T / ${state.units.temperature === "C" ? "°C" : "K"}`;
  }

  function pressureUnitLabel() {
    return state.units.pressure;
  }

  function volumeUnitLabel() {
    return state.units.volume === "m3" ? "m³" : "l";
  }

  function formatVolumeUnitOption(value: string) {
    return value === "m3" ? "m³" : "l";
  }

  layout.append(controls, boardPanel);
  boardPanel.append(svg);
  content.append(header, layout, tablePanel, createPackageCredit(t));
  page.append(content);
  update();

  return page;
}

function createProcess(type: ProcessType, preferredCenter?: Point): Process {
  const center = clampPoint(preferredCenter ?? {
    x: 250 + state.processes.length * 72,
    y: 430 - state.processes.length * 38,
  });
  const start = clampPoint({ x: center.x - 78, y: center.y + 46 });
  const end = clampPoint({ x: center.x + 78, y: center.y - 46 });
  const baseProcess: Process = {
    id: `process-${nextProcessId}`,
    type,
    start,
    end,
  };
  nextProcessId += 1;
  baseProcess.start = constrainProcessEndpoint(type, "start", start, baseProcess);
  baseProcess.end = constrainProcessEndpoint(type, "end", end, baseProcess);
  normalizeProcessEndpoints(baseProcess);
  return baseProcess;
}

function constrainProcessEndpoint(
  type: ProcessType,
  endpoint: ProcessEndpoint,
  point: Point,
  process: Process,
) {
  const constrained = clampPoint(point);
  const other = endpoint === "start" ? process.end : process.start;

  if (type === "isobar") {
    constrained.y = other.y;
  }
  if (type === "isochor") {
    constrained.x = other.x;
  }

  return constrained;
}

function normalizeProcessEndpoints(process: Process) {
  process.start = clampPoint(process.start);
  process.end = clampPoint(process.end);

  if (process.type === "isobar") {
    process.end.y = process.start.y;
  }

  if (process.type === "isochor") {
    process.end.x = process.start.x;
  }

  if (process.type === "isotherm" || process.type === "adiabat") {
    const lowVolume = process.start.x <= process.end.x ? process.start : process.end;
    const highVolume = process.start.x <= process.end.x ? process.end : process.start;
    const highPressureY = Math.min(process.start.y, process.end.y);
    const lowPressureY = Math.max(process.start.y, process.end.y);
    process.start = { x: lowVolume.x, y: highPressureY };
    process.end = { x: highVolume.x, y: lowPressureY };
  }
}

function createGrid() {
  const group = svgGroup("process-grid");
  const background = svgNode("rect", {
    x: String(PLOT.left),
    y: String(PLOT.top),
    width: String(PLOT.right - PLOT.left),
    height: String(PLOT.bottom - PLOT.top),
    class: "process-plot-background",
  });
  group.append(background);

  for (const tick of createVolumeTicks(11)) {
    const x = volumeToX(tick.baseValue);
    if (isBelowVolumeAxisBreak(x)) {
      continue;
    }
    group.append(svgNode("line", {
      x1: String(x),
      y1: String(PLOT.top),
      x2: String(x),
      y2: String(PLOT.bottom),
      class: "process-grid-line",
    }));
  }

  for (const tick of createPressureTicks(9)) {
    const y = pressureToY(tick.baseValue);
    if (isBelowPressureAxisBreak(y)) {
      continue;
    }
    group.append(svgNode("line", {
      x1: String(PLOT.left),
      y1: String(y),
      x2: String(PLOT.right),
      y2: String(y),
      class: "process-grid-line",
    }));
  }

  return group;
}

function createAxes(t: ModuleRenderContext["t"], pressureUnit: string, volumeUnit: string) {
  const group = svgGroup("process-axes");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "process-axis-arrow");
  marker.setAttribute("markerWidth", "16");
  marker.setAttribute("markerHeight", "16");
  marker.setAttribute("refX", "14");
  marker.setAttribute("refY", "8");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "userSpaceOnUse");
  const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowHead.setAttribute("d", "M 0 0 L 16 8 L 0 16 Z");
  arrowHead.setAttribute("class", "process-axis-arrowhead");
  marker.append(arrowHead);
  defs.append(marker);

  group.append(
    defs,
    svgNode("line", {
      x1: String(PLOT.left),
      y1: String(PLOT.bottom),
      x2: String(PLOT.right + 24),
      y2: String(PLOT.bottom),
      class: "process-axis",
      "marker-end": "url(#process-axis-arrow)",
    }),
    svgNode("line", {
      x1: String(PLOT.left),
      y1: String(PLOT.bottom),
      x2: String(PLOT.left),
      y2: String(PLOT.top - 24),
      class: "process-axis",
      "marker-end": "url(#process-axis-arrow)",
    }),
  );

  const vLabel = createAxisLabel(PLOT.right - 12, PLOT.bottom + 54, "V", volumeUnit, false);
  const pLabel = createAxisLabel(PLOT.left + 14, PLOT.top - 30, "p", pressureUnit, true);
  const title = svgNode("text", {
    x: String((PLOT.left + PLOT.right) / 2),
    y: String(PLOT.top - 18),
    class: "process-board-title",
  });
  appendSvgRichText(title, t("modules.processBuilder.boardTitle"));
  group.append(vLabel, pLabel, title, ...createAxisBreakMarkers(), ...createAxisTicks());
  return group;
}

function createAxisLabel(x: number, y: number, symbol: string, unit: string, isYAxis: boolean) {
  const label = svgNode("text", {
    x: String(x),
    y: String(y),
    class: isYAxis ? "process-axis-label y" : "process-axis-label",
  });
  const symbolSpan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  symbolSpan.setAttribute("class", "process-axis-symbol");
  symbolSpan.textContent = symbol;
  const unitSpan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  unitSpan.setAttribute("class", "process-axis-unit-span");
  unitSpan.textContent = ` / ${unit}`;
  label.append(symbolSpan, unitSpan);
  return label;
}

function createAxisTicks() {
  const ticks: SVGElement[] = [];
  for (const tick of createVolumeTicks(6)) {
    const x = volumeToX(tick.baseValue);
    if (isBelowVolumeAxisBreak(x)) {
      continue;
    }
    ticks.push(svgNode("line", {
      x1: String(x),
      y1: String(PLOT.bottom - 7),
      x2: String(x),
      y2: String(PLOT.bottom + 7),
      class: "process-axis-tick",
    }));

    const label = svgNode("text", {
      x: String(x),
      y: String(PLOT.bottom + 30),
      class: "process-axis-tick-label",
    });
    label.textContent = tick.label;
    ticks.push(label);
  }

  for (const tick of createPressureTicks(6)) {
    const y = pressureToY(tick.baseValue);
    if (isBelowPressureAxisBreak(y)) {
      continue;
    }
    ticks.push(svgNode("line", {
      x1: String(PLOT.left - 7),
      y1: String(y),
      x2: String(PLOT.left + 7),
      y2: String(y),
      class: "process-axis-tick",
    }));

    const label = svgNode("text", {
      x: String(PLOT.left - 20),
      y: String(y + 5),
      class: "process-axis-tick-label y",
    });
    label.textContent = tick.label;
    ticks.push(label);
  }

  return ticks;
}

function createAxisBreakMarkers() {
  const markers: SVGElement[] = [];

  if (hasPressureAxisBreak()) {
    const pathData = `M ${PLOT.left - 11} ${PLOT.bottom - AXIS_BREAK_OFFSET + 12} l 22 -12 l -22 -12`;
    markers.push(createAxisBreakMarker(pathData));
  }

  if (hasVolumeAxisBreak()) {
    const pathData = `M ${PLOT.left + AXIS_BREAK_OFFSET - 12} ${PLOT.bottom - 11} l 12 22 l 12 -22`;
    markers.push(createAxisBreakMarker(pathData));
  }

  return markers;
}

function createAxisBreakMarker(pathData: string) {
  const marker = svgGroup("process-axis-break-marker");
  marker.append(
    svgNode("path", {
      d: pathData,
      class: "process-axis-break-mask",
    }),
    svgNode("path", {
      d: pathData,
      class: "process-axis-break",
    }),
  );
  return marker;
}

function hasPressureAxisBreak() {
  return pressureAtmToDisplay(state.axisRange.pressureMinAtm) > 0;
}

function hasVolumeAxisBreak() {
  return volumeLitersToDisplay(state.axisRange.volumeMinLiters) > 0;
}

function isBelowPressureAxisBreak(y: number) {
  return hasPressureAxisBreak() && y > PLOT.bottom - AXIS_BREAK_OFFSET - AXIS_BREAK_CLEARANCE;
}

function isBelowVolumeAxisBreak(x: number) {
  return hasVolumeAxisBreak() && x < PLOT.left + AXIS_BREAK_OFFSET + AXIS_BREAK_CLEARANCE;
}

function createDropHint(t: ModuleRenderContext["t"]) {
  const group = svgGroup("process-drop-hint");
  if (state.processes.length > 0) {
    return group;
  }

  const text = svgNode("text", {
    x: String((PLOT.left + PLOT.right) / 2),
    y: String((PLOT.top + PLOT.bottom) / 2),
    class: "process-drop-text",
  });
  text.textContent = t("modules.processBuilder.dropHint");
  group.append(text);
  return group;
}

function renderStateLabel(statePoint: StatePoint) {
  const group = svgGroup("process-state");
  const badge = svgNode("circle", {
    cx: String(statePoint.x),
    cy: String(statePoint.y),
    r: "16",
    class: "process-state-badge",
  });
  const label = svgNode("text", {
    x: String(statePoint.x),
    y: String(statePoint.y + 5),
    class: "process-state-label",
  });
  label.textContent = String(statePoint.label);
  group.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    group.setPointerCapture(event.pointerId);
    state.dragging = {
      type: "state",
      refs: getConnectedEndpointRefs(statePoint),
    };
  });
  group.append(badge, label);
  return group;
}

function getNumberedStates(): StatePoint[] {
  const merged: StatePoint[] = [];
  for (const process of state.processes) {
    for (const endpointName of ["start", "end"] as ProcessEndpoint[]) {
      const endpoint = process[endpointName];
      const existing = merged.find((point) => distance(point, endpoint) <= 1);
      if (existing) {
        existing.processIds.push(process.id);
        existing.refs.push({ processId: process.id, endpoint: endpointName });
      } else {
        merged.push({
          ...endpoint,
          label: 0,
          processIds: [process.id],
          refs: [{ processId: process.id, endpoint: endpointName }],
        });
      }
    }
  }

  if (merged.length === 0) {
    return [];
  }

  const centroid = {
    x: average(merged.map((point) => point.x)),
    y: average(merged.map((point) => point.y)),
  };
  const clockwise = [...merged].sort((a, b) => (
    Math.atan2(a.y - centroid.y, a.x - centroid.x) -
    Math.atan2(b.y - centroid.y, b.x - centroid.x)
  ));
  const topLeftIndex = clockwise.reduce((bestIndex, point, index) => {
    const best = clockwise[bestIndex];
    const score = point.x + point.y * 1.15;
    const bestScore = best.x + best.y * 1.15;
    return score < bestScore ? index : bestIndex;
  }, 0);
  const ordered = [
    ...clockwise.slice(topLeftIndex),
    ...clockwise.slice(0, topLeftIndex),
  ];

  ordered.forEach((point, index) => {
    point.label = index + 1;
  });

  return ordered;
}

function getConnectedEndpointRefs(point: Point): EndpointRef[] {
  const refs: EndpointRef[] = [];
  for (const process of state.processes) {
    for (const endpoint of ["start", "end"] as ProcessEndpoint[]) {
      if (distance(process[endpoint], point) <= 1) {
        refs.push({ processId: process.id, endpoint });
      }
    }
  }
  return refs;
}

function moveEndpointRefsWithConstraints(refs: EndpointRef[], point: Point) {
  const target = clampPoint(point);
  const queue: Array<{ refs: EndpointRef[]; point: Point; axes: { x: boolean; y: boolean } }> = [
    { refs: uniqueRefs(refs), point: target, axes: { x: true, y: true } },
  ];
  let steps = 0;

  while (queue.length > 0 && steps < 120) {
    steps += 1;
    const item = queue.shift();
    if (!item) {
      continue;
    }

    for (const ref of uniqueRefs(item.refs)) {
      const process = getProcess(ref.processId);
      if (!process) {
        continue;
      }

      const endpointPoint = process[ref.endpoint];
      const nextPoint = {
        x: item.axes.x ? item.point.x : endpointPoint.x,
        y: item.axes.y ? item.point.y : endpointPoint.y,
      };
      const otherEndpointName = ref.endpoint === "start" ? "end" : "start";
      const otherPointBefore = { ...process[otherEndpointName] };

      process[ref.endpoint] = clampPoint(nextPoint);

      if (process.type === "isobar" && item.axes.y) {
        process[otherEndpointName].y = process[ref.endpoint].y;
        queue.push({
          refs: getConnectedEndpointRefs(otherPointBefore),
          point: process[otherEndpointName],
          axes: { x: false, y: true },
        });
      }

      if (process.type === "isochor" && item.axes.x) {
        process[otherEndpointName].x = process[ref.endpoint].x;
        queue.push({
          refs: getConnectedEndpointRefs(otherPointBefore),
          point: process[otherEndpointName],
          axes: { x: true, y: false },
        });
      }

      normalizeProcessEndpoints(process);
    }
  }
}

function moveProcessBy(processId: string, delta: Point) {
  const process = getProcess(processId);
  if (!process) {
    return;
  }

  const boundedDelta = constrainProcessDelta(process, delta);
  process.start = {
    x: process.start.x + boundedDelta.x,
    y: process.start.y + boundedDelta.y,
  };
  process.end = {
    x: process.end.x + boundedDelta.x,
    y: process.end.y + boundedDelta.y,
  };
  normalizeProcessEndpoints(process);
}

function constrainProcessDelta(process: Process, delta: Point): Point {
  const minX = Math.min(process.start.x, process.end.x);
  const maxX = Math.max(process.start.x, process.end.x);
  const minY = Math.min(process.start.y, process.end.y);
  const maxY = Math.max(process.start.y, process.end.y);

  return {
    x: clamp(delta.x, PLOT.left - minX, PLOT.right - maxX),
    y: clamp(delta.y, PLOT.top - minY, PLOT.bottom - maxY),
  };
}

function getEndpointPoint(ref: EndpointRef): Point | null {
  const process = getProcess(ref.processId);
  return process ? process[ref.endpoint] : null;
}

function cloneProcesses(processes: Process[]): Process[] {
  return processes.map((process) => ({
    ...process,
    start: { ...process.start },
    end: { ...process.end },
  }));
}

function getMergedRefGroups() {
  return getNumberedStates().map((statePoint) => statePoint.refs.map((ref) => ({ ...ref })));
}

function areRefGroupsMerged(refGroups: EndpointRef[][]) {
  return refGroups.every(areRefsMerged);
}

function areRefsMerged(refs: EndpointRef[]) {
  const points = refs
    .map(getEndpointPoint)
    .filter((point): point is Point => point != null);
  if (points.length !== refs.length || points.length === 0) {
    return false;
  }
  return points.every((point) => distance(point, points[0]) <= 1);
}

function uniqueRefs(refs: EndpointRef[]): EndpointRef[] {
  const seen = new Set<string>();
  const result: EndpointRef[] = [];
  for (const ref of refs) {
    const key = `${ref.processId}:${ref.endpoint}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(ref);
    }
  }
  return result;
}

function getStateValues(stateLabel: number): StateValues {
  state.stateValues[stateLabel] ??= { p: "", v: "", t: "" };
  return state.stateValues[stateLabel];
}

function applyStateValuesToGeometry(stateLabel: number, t?: ModuleRenderContext["t"]) {
  const statePoint = getNumberedStates().find((entry) => entry.label === stateLabel);
  if (!statePoint) {
    return;
  }

  const processSnapshot = cloneProcesses(state.processes);
  const axisSnapshot = { ...state.axisRange };
  const mergedRefGroups = getMergedRefGroups();
  const values = getStateValues(stateLabel);
  const pressurePa = parsePressure(values.p);
  const volumeM3 = parseVolume(values.v);
  const targetPhysical = {
    volumeLiters: Number.isFinite(volumeM3) ? volumeM3 / LITER_TO_CUBIC_METER : xToVolumeLiters(statePoint.x),
    pressureAtm: Number.isFinite(pressurePa) ? pressurePa / ATM_TO_PA : yToPressureAtm(statePoint.y),
  };

  rescaleAxesToFit([targetPhysical]);
  const target = {
    x: volumeToX(targetPhysical.volumeLiters),
    y: pressureToY(targetPhysical.pressureAtm),
  };
  moveEndpointRefsWithConstraints(statePoint.refs, target);
  rescaleAxesToFit();

  if (!areRefGroupsMerged(mergedRefGroups)) {
    state.processes = processSnapshot;
    state.axisRange = axisSnapshot;
    state.solverError = t?.("modules.processBuilder.errors.splitState") ?? "The entered value would split a numbered state.";
    return;
  }

  state.solverError = "";
}

function solveValues(t?: ModuleRenderContext["t"]) {
  const numberedStates = getNumberedStates();
  if (numberedStates.length === 0) {
    state.solverError = t?.("modules.processBuilder.errors.noProcesses") ?? "Add at least one process before solving.";
    return;
  }

  const labels = numberedStates.map((statePoint) => statePoint.label);
  const variableNames = [
    ...labels.flatMap((label) => [`p${label}`, `v${label}`, `t${label}`]),
    "n",
  ];
  const variableIndex = new Map(variableNames.map((name, index) => [name, index]));
  const equations: LinearEquation[] = [];
  const gas = gasProperties[state.gasType];

  for (const label of labels) {
    const idealGas = createEquation(variableNames.length);
    idealGas.coefficients[variableIndex.get(`p${label}`)!] = 1;
    idealGas.coefficients[variableIndex.get(`v${label}`)!] = 1;
    idealGas.coefficients[variableIndex.get(`t${label}`)!] = -1;
    idealGas.coefficients[variableIndex.get("n")!] = -1;
    idealGas.value = Math.log(GAS_CONSTANT);
    equations.push(idealGas);

    const values = getStateValues(label);
    addKnownLogEquation(equations, variableNames.length, variableIndex.get(`p${label}`)!, parsePressure(values.p));
    addKnownLogEquation(equations, variableNames.length, variableIndex.get(`v${label}`)!, parseVolume(values.v));
    addKnownLogEquation(equations, variableNames.length, variableIndex.get(`t${label}`)!, parseTemperature(values.t));
  }

  const molarAmount = parseNumericInput(state.molarAmount);
  if (Number.isFinite(molarAmount) && molarAmount > 0) {
    addKnownLogEquation(equations, variableNames.length, variableIndex.get("n")!, molarAmount);
  }

  const massGrams = parseNumericInput(state.gasMass);
  if (Number.isFinite(massGrams) && massGrams > 0) {
    addKnownLogEquation(equations, variableNames.length, variableIndex.get("n")!, (massGrams / 1000) / gas.molarMassKgPerMol);
  }

  for (const process of state.processes) {
    const startLabel = findStateLabel(process.start, numberedStates);
    const endLabel = findStateLabel(process.end, numberedStates);
    if (startLabel == null || endLabel == null || startLabel === endLabel) {
      continue;
    }

    if (process.type === "isobar") {
      equations.push(differenceEquation(variableNames.length, variableIndex.get(`p${startLabel}`)!, variableIndex.get(`p${endLabel}`)!));
    } else if (process.type === "isochor") {
      equations.push(differenceEquation(variableNames.length, variableIndex.get(`v${startLabel}`)!, variableIndex.get(`v${endLabel}`)!));
    } else if (process.type === "isotherm") {
      equations.push(differenceEquation(variableNames.length, variableIndex.get(`t${startLabel}`)!, variableIndex.get(`t${endLabel}`)!));
    } else {
      const equation = createEquation(variableNames.length);
      equation.coefficients[variableIndex.get(`p${startLabel}`)!] = 1;
      equation.coefficients[variableIndex.get(`v${startLabel}`)!] = gas.gamma;
      equation.coefficients[variableIndex.get(`p${endLabel}`)!] = -1;
      equation.coefficients[variableIndex.get(`v${endLabel}`)!] = -gas.gamma;
      equations.push(equation);
    }
  }

  const result = solveLinearSystem(equations, variableNames.length);
  if (result.status === "inconsistent") {
    state.solverError = t?.("modules.processBuilder.errors.inconsistent") ?? "The entered values are overspecified or inconsistent.";
    return;
  }
  if (result.status === "underdetermined") {
    state.solverError = t?.("modules.processBuilder.errors.underdetermined") ?? "The entered values are underspecified.";
    return;
  }

  state.solverError = "";
  for (const label of labels) {
    const values = getStateValues(label);
    const pressurePa = Math.exp(result.solution[variableIndex.get(`p${label}`)!]);
    const volumeM3 = Math.exp(result.solution[variableIndex.get(`v${label}`)!]);
    const temperatureK = Math.exp(result.solution[variableIndex.get(`t${label}`)!]);

    if (values.p.trim() === "") {
      values.p = formatDisplayNumber(formatPressure(pressurePa));
    }
    if (values.v.trim() === "") {
      values.v = formatDisplayNumber(formatVolume(volumeM3));
    }
    if (values.t.trim() === "") {
      values.t = formatDisplayNumber(formatTemperature(temperatureK));
    }
    applyStateValuesToGeometry(label, t);
  }
  rescaleAxesToFit();

  const amountMol = Math.exp(result.solution[variableIndex.get("n")!]);
  if (state.molarAmount.trim() === "") {
    state.molarAmount = formatDisplayNumber(amountMol);
  }
  if (state.gasMass.trim() === "") {
    state.gasMass = formatDisplayNumber(amountMol * gas.molarMassKgPerMol * 1000);
  }
}

function calculateProcessEnergies(numberedStates: StatePoint[]): ProcessCalculation[] {
  const labels = numberedStates.map((statePoint) => statePoint.label);
  const molarAmount = getMolarAmount(numberedStates);
  const gas = gasProperties[state.gasType];
  return state.processes
    .map((process) => {
      const startLabel = findStateLabel(process.start, numberedStates);
      const endLabel = findStateLabel(process.end, numberedStates);
      if (startLabel == null || endLabel == null || startLabel === endLabel) {
        return null;
      }

      const [fromLabel, toLabel] = orderProcessDirection(startLabel, endLabel, labels);
      const fromState = getParsedStateDatum(fromLabel);
      const toState = getParsedStateDatum(toLabel);
      const { qJ, wJ } = calculateProcessEnergy(process.type, fromState, toState, molarAmount, gas);
      return { process, fromLabel, toLabel, qJ, wJ };
    })
    .filter((calculation): calculation is ProcessCalculation => calculation != null)
    .sort((a, b) => labels.indexOf(a.fromLabel) - labels.indexOf(b.fromLabel));
}

function calculateProcessEnergy(
  type: ProcessType,
  fromState: StateDatum | null,
  toState: StateDatum | null,
  molarAmount: number,
  gas: typeof gasProperties[GasType],
) {
  if (!fromState || !toState) {
    return { qJ: Number.NaN, wJ: Number.NaN };
  }

  const degreesCv = gas.degreesOfFreedom / 2;
  const cv = degreesCv * GAS_CONSTANT;
  const cp = cv + GAS_CONSTANT;

  if (type === "isobar") {
    const wJ = fromState.pPa * (toState.vM3 - fromState.vM3);
    const qJ = Number.isFinite(molarAmount)
      ? molarAmount * cp * (toState.tK - fromState.tK)
      : Number.NaN;
    return { qJ, wJ };
  }

  if (type === "isochor") {
    const qJ = Number.isFinite(molarAmount)
      ? molarAmount * cv * (toState.tK - fromState.tK)
      : Number.NaN;
    return { qJ, wJ: 0 };
  }

  if (type === "isotherm") {
    const wJ = fromState.pPa * fromState.vM3 * Math.log(toState.vM3 / fromState.vM3);
    return { qJ: wJ, wJ };
  }

  const wJ = (fromState.pPa * fromState.vM3 - toState.pPa * toState.vM3) / (gas.gamma - 1);
  return { qJ: 0, wJ };
}

function getParsedStateDatum(label: number): StateDatum | null {
  const values = getStateValues(label);
  const pPa = parsePressure(values.p);
  const vM3 = parseVolume(values.v);
  const tK = parseTemperature(values.t);
  if (!Number.isFinite(pPa) || !Number.isFinite(vM3) || !Number.isFinite(tK)) {
    return null;
  }
  return { pPa, vM3, tK };
}

function getMolarAmount(numberedStates: StatePoint[]) {
  const molarAmount = parseNumericInput(state.molarAmount);
  if (Number.isFinite(molarAmount) && molarAmount > 0) {
    return molarAmount;
  }

  const massGrams = parseNumericInput(state.gasMass);
  if (Number.isFinite(massGrams) && massGrams > 0) {
    return (massGrams / 1000) / gasProperties[state.gasType].molarMassKgPerMol;
  }

  const inferred = numberedStates
    .map((statePoint) => getParsedStateDatum(statePoint.label))
    .filter((datum): datum is StateDatum => datum != null)
    .map((datum) => (datum.pPa * datum.vM3) / (GAS_CONSTANT * datum.tK))
    .filter((value) => Number.isFinite(value) && value > 0);

  return inferred.length > 0 ? average(inferred) : Number.NaN;
}

function orderProcessDirection(startLabel: number, endLabel: number, orderedLabels: number[]): [number, number] {
  const startIndex = orderedLabels.indexOf(startLabel);
  const endIndex = orderedLabels.indexOf(endLabel);
  if (startIndex >= 0 && endIndex >= 0 && orderedLabels.length > 1) {
    if ((startIndex + 1) % orderedLabels.length === endIndex) {
      return [startLabel, endLabel];
    }
    if ((endIndex + 1) % orderedLabels.length === startIndex) {
      return [endLabel, startLabel];
    }
    return startIndex < endIndex ? [startLabel, endLabel] : [endLabel, startLabel];
  }
  return startLabel < endLabel ? [startLabel, endLabel] : [endLabel, startLabel];
}

function getSnapTarget(point: Point, ignoredRefs: EndpointRef[]): Point | null {
  const candidates = state.processes.flatMap((process) => [process.start, process.end]);
  let best: Point | null = null;
  let bestDistance = SNAP_RADIUS;
  const ignoredPoints = ignoredRefs
    .map(getEndpointPoint)
    .filter((endpointPoint): endpointPoint is Point => endpointPoint != null);

  for (const candidate of candidates) {
    if (ignoredPoints.some((ignoredPoint) => distance(candidate, ignoredPoint) < 0.1)) {
      continue;
    }

    const candidateDistance = distance(candidate, point);
    if (candidateDistance < bestDistance) {
      best = candidate;
      bestDistance = candidateDistance;
    }
  }

  return best ? { ...best } : null;
}

function getProcessPath(process: Process) {
  if (process.type === "isobar" || process.type === "isochor") {
    return `M ${process.start.x} ${process.start.y} L ${process.end.x} ${process.end.y}`;
  }

  return getCurvePoints(process)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function getCurvePoints(process: Process): Point[] {
  const sampleCount = 40;
  return Array.from({ length: sampleCount + 1 }, (_unused, index) => (
    curvePointAt(process, index / sampleCount)
  ));
}

function curvePointAt(process: Process, fraction: number): Point {
  const start = process.start;
  const end = process.end;
  const x = start.x + (end.x - start.x) * fraction;
  const startVolume = xToVolume(start.x);
  const endVolume = xToVolume(end.x);
  const currentVolume = xToVolume(x);
  const exponent = process.type === "adiabat" ? gasProperties[state.gasType].gamma : 1;
  const startCurve = 1 / startVolume ** exponent;
  const endCurve = 1 / endVolume ** exponent;
  const currentCurve = 1 / currentVolume ** exponent;
  const interpolation = Math.abs(endCurve - startCurve) < 1e-9
    ? fraction
    : (currentCurve - startCurve) / (endCurve - startCurve);

  return {
    x,
    y: start.y + (end.y - start.y) * interpolation,
  };
}

function xToVolume(x: number) {
  return Math.max(1e-6, xToVolumeLiters(x));
}

function volumeToX(volume: number) {
  const clamped = clamp(volume, state.axisRange.volumeMinLiters, state.axisRange.volumeMaxLiters);
  const span = state.axisRange.volumeMaxLiters - state.axisRange.volumeMinLiters;
  return PLOT.left + ((clamped - state.axisRange.volumeMinLiters) / span) * (PLOT.right - PLOT.left);
}

function pressureToY(pressure: number) {
  const clamped = clamp(pressure, state.axisRange.pressureMinAtm, state.axisRange.pressureMaxAtm);
  const span = state.axisRange.pressureMaxAtm - state.axisRange.pressureMinAtm;
  return PLOT.bottom - ((clamped - state.axisRange.pressureMinAtm) / span) * (PLOT.bottom - PLOT.top);
}

function xToVolumeLiters(x: number) {
  const fraction = (clamp(x, PLOT.left, PLOT.right) - PLOT.left) / (PLOT.right - PLOT.left);
  return state.axisRange.volumeMinLiters + fraction * (state.axisRange.volumeMaxLiters - state.axisRange.volumeMinLiters);
}

function yToPressureAtm(y: number) {
  const fraction = (PLOT.bottom - clamp(y, PLOT.top, PLOT.bottom)) / (PLOT.bottom - PLOT.top);
  return state.axisRange.pressureMinAtm + fraction * (state.axisRange.pressureMaxAtm - state.axisRange.pressureMinAtm);
}

function rescaleAxesToFit(extraPoints: PhysicalPoint[] = []) {
  const endpoints = state.processes.flatMap((process) => [
    {
      process,
      endpoint: "start" as ProcessEndpoint,
      volumeLiters: xToVolumeLiters(process.start.x),
      pressureAtm: yToPressureAtm(process.start.y),
    },
    {
      process,
      endpoint: "end" as ProcessEndpoint,
      volumeLiters: xToVolumeLiters(process.end.x),
      pressureAtm: yToPressureAtm(process.end.y),
    },
  ]);
  const physicalPoints = [
    ...endpoints.map((endpoint) => ({
      volumeLiters: endpoint.volumeLiters,
      pressureAtm: endpoint.pressureAtm,
    })),
    ...extraPoints,
  ];

  if (physicalPoints.length === 0) {
    state.axisRange = { ...DEFAULT_AXIS_RANGE };
    return;
  }

  const volumeRange = createNiceDisplayRange(
    physicalPoints.map((point) => volumeLitersToDisplay(point.volumeLiters)),
    volumeLitersToDisplay(0),
  );
  const pressureRange = createNiceDisplayRange(
    physicalPoints.map((point) => pressureAtmToDisplay(point.pressureAtm)),
    pressureAtmToDisplay(0),
  );

  state.axisRange = {
    volumeMinLiters: displayVolumeToLiters(volumeRange.min),
    volumeMaxLiters: displayVolumeToLiters(volumeRange.max),
    pressureMinAtm: displayPressureToAtm(pressureRange.min),
    pressureMaxAtm: displayPressureToAtm(pressureRange.max),
  };

  for (const endpoint of endpoints) {
    endpoint.process[endpoint.endpoint] = {
      x: volumeToX(endpoint.volumeLiters),
      y: pressureToY(endpoint.pressureAtm),
    };
  }
}

function createNiceDisplayRange(values: number[], originValue: number) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) {
    return { min: 0, max: 1, step: 0.2 };
  }

  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const center = (rawMin + rawMax) / 2;
  const dataSpan = Math.max(rawMax - rawMin, Math.abs(center) * 0.25, 1e-9);
  const paddedMin = Math.max(originValue, rawMin - dataSpan * 0.16);
  const paddedMax = rawMax + dataSpan * 0.16;
  const step = niceStep((paddedMax - paddedMin) / 5);
  let min = Math.max(originValue, Math.floor(paddedMin / step) * step);
  let max = Math.ceil(paddedMax / step) * step;

  if (min <= originValue + step * 0.35) {
    min = originValue;
  }
  if (max <= min) {
    max = min + step;
  }

  return { min, max, step };
}

function createVolumeTicks(preferredCount: number) {
  const min = volumeLitersToDisplay(state.axisRange.volumeMinLiters);
  const max = volumeLitersToDisplay(state.axisRange.volumeMaxLiters);
  return createTicks(min, max, preferredCount, displayVolumeToLiters);
}

function createPressureTicks(preferredCount: number) {
  const min = pressureAtmToDisplay(state.axisRange.pressureMinAtm);
  const max = pressureAtmToDisplay(state.axisRange.pressureMaxAtm);
  return createTicks(min, max, preferredCount, displayPressureToAtm);
}

function createTicks(
  min: number,
  max: number,
  preferredCount: number,
  toBaseValue: (value: number) => number,
): AxisTick[] {
  const step = niceStep((max - min) / Math.max(1, preferredCount - 1));
  const first = Math.ceil((min - step * 1e-8) / step) * step;
  const ticks: AxisTick[] = [];

  for (let value = first; value <= max + step * 1e-8; value += step) {
    const cleaned = cleanNumber(value);
    ticks.push({
      baseValue: toBaseValue(cleaned),
      displayValue: cleaned,
      label: formatTickLabel(cleaned),
    });
  }

  return ticks;
}

function niceStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1
    ? 1
    : normalized <= 2
      ? 2
      : normalized <= 5
        ? 5
        : 10;
  return niceNormalized * magnitude;
}

function formatTickLabel(value: number) {
  const absValue = Math.abs(value);
  if (absValue >= 1000 || (absValue > 0 && absValue < 0.01)) {
    return value.toExponential(DISPLAY_SIGNIFICANT_DIGITS - 1);
  }
  return formatDisplayNumber(value);
}

function cleanNumber(value: number) {
  return Number(value.toPrecision(12));
}

function pressureAtmToDisplay(valueAtm: number) {
  return formatPressureForUnit(valueAtm * ATM_TO_PA, state.units.pressure);
}

function displayPressureToAtm(value: number) {
  return pressureDisplayToPa(value, state.units.pressure) / ATM_TO_PA;
}

function volumeLitersToDisplay(valueLiters: number) {
  return formatVolumeForUnit(valueLiters * LITER_TO_CUBIC_METER, state.units.volume);
}

function displayVolumeToLiters(value: number) {
  return volumeDisplayToM3(value, state.units.volume) / LITER_TO_CUBIC_METER;
}

function parseNumericInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

function changePressureUnit(nextUnit: PressureUnit) {
  if (nextUnit === state.units.pressure) {
    return;
  }

  for (const values of Object.values(state.stateValues)) {
    const pressurePa = parsePressure(values.p);
    if (Number.isFinite(pressurePa)) {
      values.p = formatDisplayNumber(formatPressureForUnit(pressurePa, nextUnit));
    }
  }
  state.units.pressure = nextUnit;
}

function changeVolumeUnit(nextUnit: VolumeUnit) {
  if (nextUnit === state.units.volume) {
    return;
  }

  for (const values of Object.values(state.stateValues)) {
    const volumeM3 = parseVolume(values.v);
    if (Number.isFinite(volumeM3)) {
      values.v = formatDisplayNumber(formatVolumeForUnit(volumeM3, nextUnit));
    }
  }
  state.units.volume = nextUnit;
}

function changeTemperatureUnit(nextUnit: TemperatureUnit) {
  if (nextUnit === state.units.temperature) {
    return;
  }

  for (const values of Object.values(state.stateValues)) {
    const temperatureK = parseTemperature(values.t);
    if (Number.isFinite(temperatureK)) {
      values.t = formatDisplayNumber(formatTemperatureForUnit(temperatureK, nextUnit));
    }
  }
  state.units.temperature = nextUnit;
}

function parsePressure(value: string) {
  return parsePressureWithUnit(value, state.units.pressure);
}

function parsePressureWithUnit(value: string, unit: PressureUnit) {
  const numeric = parseNumericInput(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return Number.NaN;
  }

  return pressureDisplayToPa(numeric, unit);
}

function parseVolume(value: string) {
  return parseVolumeWithUnit(value, state.units.volume);
}

function parseVolumeWithUnit(value: string, unit: VolumeUnit) {
  const numeric = parseNumericInput(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return Number.NaN;
  }
  return volumeDisplayToM3(numeric, unit);
}

function parseTemperature(value: string) {
  return parseTemperatureWithUnit(value, state.units.temperature);
}

function parseTemperatureWithUnit(value: string, unit: TemperatureUnit) {
  const numeric = parseNumericInput(value);
  if (!Number.isFinite(numeric)) {
    return Number.NaN;
  }
  const kelvin = unit === "C" ? numeric + 273.15 : numeric;
  return kelvin > 0 ? kelvin : Number.NaN;
}

function formatPressure(valuePa: number) {
  return formatPressureForUnit(valuePa, state.units.pressure);
}

function formatPressureForUnit(valuePa: number, unit: PressureUnit) {
  if (unit === "Pa") {
    return valuePa;
  }
  if (unit === "hPa") {
    return valuePa / HPA_TO_PA;
  }
  if (unit === "kPa") {
    return valuePa / KPA_TO_PA;
  }
  return valuePa / ATM_TO_PA;
}

function formatVolume(valueM3: number) {
  return formatVolumeForUnit(valueM3, state.units.volume);
}

function formatVolumeForUnit(valueM3: number, unit: VolumeUnit) {
  return unit === "m3" ? valueM3 : valueM3 / LITER_TO_CUBIC_METER;
}

function formatTemperature(valueK: number) {
  return formatTemperatureForUnit(valueK, state.units.temperature);
}

function formatTemperatureForUnit(valueK: number, unit: TemperatureUnit) {
  return unit === "C" ? valueK - 273.15 : valueK;
}

function pressureDisplayToPa(value: number, unit: PressureUnit) {
  if (unit === "Pa") {
    return value;
  }
  if (unit === "hPa") {
    return value * HPA_TO_PA;
  }
  if (unit === "kPa") {
    return value * KPA_TO_PA;
  }
  return value * ATM_TO_PA;
}

function volumeDisplayToM3(value: number, unit: VolumeUnit) {
  return unit === "m3" ? value : value * LITER_TO_CUBIC_METER;
}

function formatDisplayNumber(value: number, significantDigits = DISPLAY_SIGNIFICANT_DIGITS) {
  if (!Number.isFinite(value)) {
    return "";
  }
  return Number(value.toPrecision(significantDigits)).toString();
}

function createEquation(variableCount: number): LinearEquation {
  return {
    coefficients: Array(variableCount).fill(0),
    value: 0,
  };
}

function differenceEquation(variableCount: number, leftIndex: number, rightIndex: number): LinearEquation {
  const equation = createEquation(variableCount);
  equation.coefficients[leftIndex] = 1;
  equation.coefficients[rightIndex] = -1;
  return equation;
}

function addKnownLogEquation(
  equations: LinearEquation[],
  variableCount: number,
  variableIndex: number,
  value: number,
) {
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }
  const equation = createEquation(variableCount);
  equation.coefficients[variableIndex] = 1;
  equation.value = Math.log(value);
  equations.push(equation);
}

function solveLinearSystem(equations: LinearEquation[], variableCount: number) {
  const matrix = equations.map((equation) => [...equation.coefficients, equation.value]);
  let row = 0;
  const pivotColumns: number[] = [];

  for (let column = 0; column < variableCount && row < matrix.length; column += 1) {
    let pivotRow = row;
    for (let candidate = row + 1; candidate < matrix.length; candidate += 1) {
      if (Math.abs(matrix[candidate][column]) > Math.abs(matrix[pivotRow][column])) {
        pivotRow = candidate;
      }
    }

    if (Math.abs(matrix[pivotRow][column]) < LINEAR_TOLERANCE) {
      continue;
    }

    [matrix[row], matrix[pivotRow]] = [matrix[pivotRow], matrix[row]];
    const pivot = matrix[row][column];
    for (let entry = column; entry <= variableCount; entry += 1) {
      matrix[row][entry] /= pivot;
    }

    for (let targetRow = 0; targetRow < matrix.length; targetRow += 1) {
      if (targetRow === row) {
        continue;
      }
      const factor = matrix[targetRow][column];
      if (Math.abs(factor) < LINEAR_TOLERANCE) {
        continue;
      }
      for (let entry = column; entry <= variableCount; entry += 1) {
        matrix[targetRow][entry] -= factor * matrix[row][entry];
      }
    }

    pivotColumns.push(column);
    row += 1;
  }

  for (const equationRow of matrix) {
    const hasCoefficients = equationRow
      .slice(0, variableCount)
      .some((coefficient) => Math.abs(coefficient) > LINEAR_TOLERANCE);
    if (!hasCoefficients && Math.abs(equationRow[variableCount]) > LINEAR_TOLERANCE) {
      return { status: "inconsistent" as const, solution: [] as number[] };
    }
  }

  if (pivotColumns.length < variableCount) {
    return { status: "underdetermined" as const, solution: [] as number[] };
  }

  const solution = Array(variableCount).fill(0);
  pivotColumns.forEach((column, index) => {
    solution[column] = matrix[index][variableCount];
  });
  return { status: "solved" as const, solution };
}

function createProcessIcon(type: ProcessType) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 44");
  svg.setAttribute("class", "process-tool-icon");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", `process-tool-path process-${type}`);
  if (type === "isobar") {
    path.setAttribute("d", "M 10 24 H 54");
  } else if (type === "isochor") {
    path.setAttribute("d", "M 32 8 V 36");
  } else if (type === "adiabat") {
    path.setAttribute("d", "M 10 8 C 18 27 34 35 54 36");
  } else {
    path.setAttribute("d", "M 10 8 C 22 22 36 32 54 36");
  }
  svg.append(path);
  return svg;
}

function tableTextCell(text: string) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function tableEnergyCell(symbol: string, subscript: string, value: number, includeUnit: boolean) {
  const cell = document.createElement("td");
  const expression = createSymbolName(symbol, subscript);
  const formattedValue = includeUnit ? formatEnergyValue(value) : formatEfficiencyValue(value);
  if (formattedValue) {
    expression.append(document.createTextNode(` = ${formattedValue}`));
  }
  cell.append(expression);
  return cell;
}

function tableHeaderCell(text: string) {
  const cell = document.createElement("th");
  cell.textContent = text;
  return cell;
}

function tableQuantityHeaderCell(symbol: string, unit: string) {
  const cell = document.createElement("th");
  const variable = document.createElement("var");
  const unitSpan = document.createElement("span");
  variable.className = "process-math-symbol";
  variable.textContent = symbol;
  unitSpan.className = "process-table-unit";
  unitSpan.textContent = ` / ${unit}`;
  cell.append(variable, unitSpan);
  return cell;
}

function svgPointFromEvent(event: MouseEvent | PointerEvent | DragEvent, svg: SVGSVGElement): Point {
  const rect = svg.getBoundingClientRect();
  return clampPoint({
    x: ((event.clientX - rect.left) / rect.width) * BOARD_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * BOARD_HEIGHT,
  });
}

function findStateLabel(point: Point, states: StatePoint[]) {
  return states.find((statePoint) => distance(statePoint, point) <= 1)?.label ?? null;
}

function formatStateName(label: number | null) {
  return label == null ? "--" : String(label);
}

function formatEnergyValue(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Math.abs(value) >= 1000) {
    return `${formatDisplayNumber(value / 1000)} kJ`;
  }
  return `${formatDisplayNumber(value)} J`;
}

function formatEfficiencyValue(value: number) {
  return Number.isFinite(value) ? formatDisplayNumber(value) : "";
}

function definitionRichItem(term: HTMLElement, description: string) {
  const wrapper = document.createElement("div");
  const termNode = document.createElement("dt");
  const descriptionNode = document.createElement("dd");
  termNode.append(term);
  descriptionNode.textContent = description;
  wrapper.append(termNode, descriptionNode);
  return wrapper;
}

function createEfficiencyName() {
  const expression = element("span", "process-energy-expression");
  const eta = document.createElement("var");
  eta.className = "process-math-symbol";
  eta.textContent = "η";
  expression.append(
    eta,
    document.createTextNode(" = "),
    createSymbolName("W", "netto"),
    document.createTextNode(" / "),
    createSymbolName("Q", "in"),
  );
  return expression;
}

function createSymbolName(symbol: string, subscript: string) {
  const expression = element("span", "process-energy-expression");
  const variable = document.createElement("var");
  const subscriptNode = document.createElement("sub");
  variable.className = "process-math-symbol";
  variable.textContent = symbol;
  subscriptNode.textContent = subscript;
  expression.append(variable, subscriptNode);
  return expression;
}

function getProcess(id: string) {
  return state.processes.find((process) => process.id === id) ?? null;
}

function isProcessType(value: unknown): value is ProcessType {
  return typeof value === "string" && processTypes.includes(value as ProcessType);
}

function isGasType(value: unknown): value is GasType {
  return typeof value === "string" && gasTypes.includes(value as GasType);
}

function definitionItem(term: string, description: string, termClassName = "") {
  const wrapper = document.createElement("div");
  const termNode = document.createElement("dt");
  const descriptionNode = document.createElement("dd");
  if (termClassName) {
    termNode.className = termClassName;
  }
  termNode.textContent = term;
  descriptionNode.textContent = description;
  wrapper.append(termNode, descriptionNode);
  return wrapper;
}

function clampPoint(point: Point): Point {
  return {
    x: clamp(point.x, PLOT.left, PLOT.right),
    y: clamp(point.y, PLOT.top, PLOT.bottom),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function svgGroup(className: string) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", className);
  return group;
}

function svgNode(tagName: string, attributes: Record<string, string>) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });
  return node;
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

function richTextElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  textContent: string,
): HTMLElementTagNameMap[K] {
  const item = element(tagName, className);
  appendRichText(item, textContent);
  return item;
}

function appendRichText(parent: HTMLElement, textContent: string) {
  appendSplitText(parent, textContent, (value) => {
    const text = document.createElement("span");
    text.className = "process-builder-pv";
    text.textContent = value;
    return text;
  });
}

function appendSvgRichText(parent: SVGElement, textContent: string) {
  appendSplitText(parent, textContent, (value) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    text.setAttribute("class", "process-builder-pv");
    text.textContent = value;
    return text;
  });
}

function appendSplitText(
  parent: Element,
  textContent: string,
  createSpecialNode: (value: string) => Element,
) {
  const parts = textContent.split(/(pV)/g);
  for (const part of parts) {
    if (part === "") {
      continue;
    }
    parent.append(part === "pV" ? createSpecialNode(part) : document.createTextNode(part));
  }
}
