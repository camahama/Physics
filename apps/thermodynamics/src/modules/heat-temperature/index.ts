import type { ModuleRenderContext } from "../../config/modules.js";
import { createPackageCredit } from "../../components/packageCredit.js";
import { gasState, NR, type Experiment, type GasState } from "./model.js";
import "./styles.css";

const NS = "http://www.w3.org/2000/svg";
const modes: Experiment[] = ["locked", "loaded", "isothermal", "insulated"];
const color = (temperature: number) => `hsl(${220 - Math.max(0, Math.min(1, (temperature - 140) / 620)) * 210} 68% 52%)`;
const fmt = (n: number, digits = 0) => (Math.abs(n) < 1e-8 ? 0 : n).toFixed(digits);

export function renderHeatTemperatureModule({ t }: ModuleRenderContext): HTMLElement {
  const tr = (key: string) => t(`modules.heatTemperature.${key}`);
  let mode: Experiment = "locked", view = "pv", input = 0, target = 0, rotation = 145;
  let previousTime = 0;
  let state = gasState(mode, input);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = el("main", "page-shell gas-shell");
  const content = el("section", "module-page gas-page");
  const header = el("header", "gas-header");
  const heading = el("div");
  heading.append(el("p", "gas-eyebrow", tr("eyebrow")), el("h1", "module-title", tr("title")), el("p", "gas-intro", tr("description")));
  const menu = el("a", "module-menu-button", t("common.menuButton")); menu.href = "#/";
  header.append(heading, menu);
  const experiments = el("div", "gas-experiments");
  const modeButtons = modes.map((m, i) => {
    const b = button(`${i + 1}  ${tr(m + "Title")}`, () => {
      mode = m; input = target = (mode === "insulated" || mode === "isothermal") ? 1 : 0; configure(); update();
    });
    experiments.append(b); return b;
  });
  const lesson = el("div", "gas-lesson");
  const question = el("strong"); const explanation = el("span"); lesson.append(question, explanation);
  const stage = el("div", "gas-stage");
  const apparatus = el("section", "gas-panel");
  apparatus.append(el("h2", "gas-panel-title", tr("apparatus")));
  const cylinder = svg("svg", { viewBox: "0 -25 600 425", role: "img", "aria-label": tr("apparatus") });
  cylinder.innerHTML = `<defs><linearGradient id="gas-steel" x2="1" y2="0"><stop stop-color="#546675"/><stop offset=".25" stop-color="#eef5fa"/><stop offset=".55" stop-color="#b9c9d4"/><stop offset=".8" stop-color="#f5fafc"/><stop offset="1" stop-color="#627685"/></linearGradient><pattern id="gas-insulation" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 9L9 0" stroke="#a38148" stroke-width="3"/></pattern></defs>`;
  const jacket = svg("path", {
    d: "M100 60H120V320H340V60H360V335H100Z",
    fill: "url(#gas-insulation)",
  });
  const shell = svg("path", { d: "M120 65V320H340V65", fill: "none", stroke: "url(#gas-steel)", "stroke-width": 18 });
  const gas = svg("rect", { x: 130, width: 200, fill: "#dce8f7" });
  const particles = svg("g", {});
  const dots = Array.from({length: 36}, () => { const d = svg("circle", { r: 3.8, fill: "#346fab" }); particles.append(d); return d; });
  // Independent Gaussian velocity components avoid shared speeds and phase patterns.
  // Sample once, then integrate continuously so heating does not teleport particles.
  const particleMotion = dots.map(() => {
    const magnitude = Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, Math.random())));
    const angle = Math.random() * 2 * Math.PI;
    return { x: Math.random() * 2, y: Math.random() * 2,
      vx: magnitude * Math.cos(angle) * 48, vy: magnitude * Math.sin(angle) * 48 };
  });
  const piston = svg("g", {});
  // The bore runs from x=129 to x=331. Leave metal clearance on both sides;
  // only the small elastomer seals extend into that clearance.
  piston.append(
    svg("rect", { x: 130, y: -9, width: 8, height: 10, rx: 4, fill: "#283c48" }),
    svg("rect", { x: 322, y: -9, width: 8, height: 10, rx: 4, fill: "#283c48" }),
    svg("rect", { x: 135, y: -14, width: 190, height: 20, rx: 3, fill: "url(#gas-steel)", stroke: "#4f6676", "stroke-width": 2 }),
    svg("rect", { x: 219, y: -51, width: 22, height: 37, fill: "url(#gas-steel)" }),
  );
  const load = svg("rect", { x: 187, y: -75, width: 86, height: 25, rx: 4, fill: "#445768" });
  piston.append(load);
  const lock = svg("g", {});
  lock.append(
    svg("path", { d: "M120 164V192H155 M340 164V192H305", fill: "none", stroke: "#b98537", "stroke-width": 6, "stroke-linejoin": "round" }),
    svg("circle", { cx: 120, cy: 172, r: 3, fill: "#4f5961" }),
    svg("circle", { cx: 340, cy: 172, r: 3, fill: "#4f5961" }),
  );
  const thermo = svg("rect", { x: 415, width: 12, rx: 6, fill: "#da643b" });
  cylinder.append(jacket, gas, particles, shell, piston, lock,
    svg("rect", { x: 410, y: 100, width: 22, height: 200, rx: 11, fill: "#e6ecf0", stroke: "#91a2ad" }), thermo,
    svg("circle", { cx: 421, cy: 306, r: 17, fill: "#da643b" }), text("T", 413, 85));
  const reservoir = svg("g", {});
  // Water surrounds the cylinder in cutaway, leaving the gas unobstructed.
  reservoir.append(
    svg("path", { d: "M78 140H110V330H350V140H382V350H78Z", fill: "#addcec", "fill-opacity": .65 }),
    svg("path", { d: "M76 118V350Q76 357 84 357H376Q384 357 384 350V118", fill: "none", stroke: "#689bad", "stroke-width": 4 }),
    svg("path", { d: "M79 140Q87 135 95 140T111 140 M349 140Q357 135 365 140T381 140", fill: "none", stroke: "#3995b6", "stroke-width": 2 }),
    svg("path", { d: "M88 165V332 M372 165V332", fill: "none", stroke: "#eafaff", "stroke-width": 3 }),
    text(tr("reservoir"), 135, 393),
  );
  cylinder.append(reservoir);
  const heatArrow = text("", 165, 345); const workArrow = text("", 230, 35);
  workArrow.setAttribute("text-anchor", "middle");
  cylinder.append(heatArrow, workArrow);
  apparatus.append(cylinder, el("p", "gas-caption", tr("particleNote")));
  const graphPanel = el("section", "gas-panel");
  const graphHead = el("div", "gas-graph-head");
  graphHead.append(el("h2", "gas-panel-title", tr("stateSpace")));
  const views = el("div", "gas-view-buttons");
  const viewButtons = ["pv", "pt", "pvt"].map(v => {
    const b = button(v === "pv" ? "pV" : v === "pt" ? "pT" : "pVT", () => { view = v; update(); }); views.append(b); return b;
  });
  graphHead.append(views);
  const graph = svg("svg", { viewBox: "0 0 600 400", role: "img", "aria-label": tr("graphLabel") });
  const graphNote = el("p", "gas-caption");
  const rotate = slider(tr("rotate"), -180, 180, 1, rotation, value => { rotation = value; drawGraph(); });
  graphPanel.append(graphHead, graph, rotate.row, graphNote);
  stage.append(apparatus, graphPanel);
  const meters = el("div", "gas-meters");
  const readouts = ["T / K", "V / l", "p / bar"].map(label => {
    const box = el("div"); const value = el("strong"); box.append(el("span", "", label), value); meters.append(box); return value;
  });
  const controls = el("section", "gas-controls");
  const control = slider(tr("heatControl"), -75, 225, 1, 0, value => { target = value; if (reducedMotion) { input = target; update(); } });
  controls.append(control.row);
  const energy = el("section", "gas-energy");
  energy.append(el("h2", "gas-panel-title", tr("energyTitle")));
  const energyRows = el("div", "gas-energy-rows");
  const energyOutputs = ["work", "heat", "internal"].map(key => {
    const row = el("div", `gas-energy-item ${key}`); const output = el("strong");
    const bar = el("div", "gas-energy-bar");
    const track = el("div", "gas-energy-track");
    track.setAttribute("aria-hidden", "true");
    track.append(bar, el("span", "gas-energy-zero", "0"), el("span", "gas-energy-negative", "−"), el("span", "gas-energy-positive", "+"));
    row.append(el("span", "", tr(key)), output, track); energyRows.append(row); return { output, bar };
  });
  energy.append(energyRows, el("p", "gas-caption", tr("signNote")));
  const details = el("details", "gas-model-details");
  details.append(el("summary", "", tr("modelTitle")), el("p", "", tr("modelNote")));
  const source = el("a", "", tr("source")); source.href = "https://openstax.org/books/university-physics-volume-2/pages/3-key-equations"; source.target = "_blank"; source.rel = "noreferrer"; details.append(source);
  content.append(header, experiments, lesson, stage, meters, controls, energy, details, createPackageCredit(t)); page.append(content);

  function configure() {
    control.input.min = (mode === "insulated" || mode === "isothermal") ? "0.45" : "-75";
    control.input.max = (mode === "insulated" || mode === "isothermal") ? "2.5" : "225";
    control.input.step = (mode === "insulated" || mode === "isothermal") ? "0.01" : "1";
    control.title.textContent = tr((mode === "insulated" || mode === "isothermal") ? "volumeControl" : "heatControl");
    modeButtons.forEach((b, i) => b.setAttribute("aria-pressed", String(modes[i] === mode)));
    setMathText(question, tr(mode + "Question")); setMathText(explanation, tr(mode + "Explanation"));
  }
  function update() {
    state = gasState(mode, input);
    control.input.value = String(target);
    control.value.textContent = `${fmt(target, (mode === "insulated" || mode === "isothermal") ? 2 : 0)} ${(mode === "insulated" || mode === "isothermal") ? "l" : "J"}`;
    readouts[0].textContent = fmt(state.temperature); readouts[1].textContent = fmt(state.volume, 2); readouts[2].textContent = fmt(state.pressure, 2);
    const y = 310 - 100 * state.volume;
    gas.setAttribute("y", String(y)); gas.setAttribute("height", String(310 - y)); gas.setAttribute("fill", color(state.temperature)); gas.setAttribute("opacity", ".16");
    piston.setAttribute("transform", `translate(0 ${y})`);
    workArrow.setAttribute("y", String(y - (mode === "loaded" ? 85 : 60)));
    reservoir.setAttribute("visibility", mode === "isothermal" ? "visible" : "hidden");
    jacket.setAttribute("visibility", mode === "insulated" ? "visible" : "hidden");
    load.setAttribute("visibility", mode === "loaded" ? "visible" : "hidden");
    lock.setAttribute("visibility", mode === "locked" ? "visible" : "hidden");
    const height = (state.temperature - 100) / 700 * 190;
    thermo.setAttribute("y", String(300 - height)); thermo.setAttribute("height", String(height)); thermo.setAttribute("fill", color(state.temperature));
    setMathText(heatArrow, mode === "insulated" ? "Q = 0" : `${state.heat >= 0 ? "↑" : "↓"} Q = ${fmt(-state.heat)} J`);
    setMathText(workArrow, `${Math.abs(state.work) < 0.05 ? "" : state.work > 0 ? "↑ " : "↓ "}W = ${fmt(-state.work)} J`);
    [-state.work, -state.heat, state.energy].forEach((value, i) => {
      energyOutputs[i].output.textContent = `${fmt(value, 1)} J`;
      const extent = Math.min(50, Math.abs(value) / 225 * 50);
      energyOutputs[i].bar.style.width = `${extent}%`;
      energyOutputs[i].bar.style.left = `${value < 0 ? 50 - extent : 50}%`;
    });
    viewButtons.forEach((b, i) => b.setAttribute("aria-pressed", String(["pv", "pt", "pvt"][i] === view)));
    rotate.row.hidden = view !== "pvt";
    setMathText(graphNote, tr(view === "pvt" ? "surfaceNote" : "graphNote"));
    drawParticles(); drawGraph();
  }
  function drawParticles(dt = 0) {
    const height = 100 * state.volume - 16;
    const bounce = (v: number) => 1 - Math.abs(v - 1);
    const wrap = (v: number) => (v % 2 + 2) % 2;
    const speed = Math.sqrt(state.temperature / 300);
    dots.forEach((d, i) => {
      const motion = particleMotion[i];
      motion.x = wrap(motion.x + dt * speed * motion.vx / 184);
      motion.y = wrap(motion.y + dt * speed * motion.vy / height);
      d.setAttribute("cx", String(138 + bounce(motion.x) * 184));
      d.setAttribute("cy", String(302 - bounce(motion.y) * height));
      d.setAttribute("fill", color(state.temperature));
    });
  }
  function drawGraph() {
    const nodes: SVGElement[] = [];
    const line = (a: number[], b: number[], cls = "gas-grid") => svg("path", { d: `M${a.join(" ")}L${b.join(" ")}`, class: cls });
    let project: (s: GasState) => number[];
    if (view === "pvt") {
      const a = rotation * Math.PI / 180;
      const point = (v: number, temp: number, p: number) => {
        const x = (v - 1.45) * 115, z = (temp - 450) * .3;
        return [300 + x * Math.cos(a) - z * Math.sin(a), 260 + (x * Math.sin(a) + z * Math.cos(a)) * .28 - p * 30];
      };
      project = s => point(s.volume, s.temperature, s.pressure);
      for (let temp = 100; temp <= 800; temp += 50) {
        const coords = Array.from({length: 41}, (_, i) => { const v = .45 + i * 2.05 / 40; return point(v, temp, NR * temp / (100 * v)); });
        nodes.push(svg("path", { d: coords.map((p, i) => `${i ? "L" : "M"}${p.join(" ")}`).join(""), fill: "none", stroke: color(temp), "stroke-width": 1.5, opacity: .6 }));
      }
      for (let v = .45; v <= 2.51; v += .205) nodes.push(line(point(v,100,NR*100/(100*v)), point(v,800,NR*800/(100*v))));
      // Keep the temperature axis outside the projected base, on its lower edge.
      // All ticks use the same projection as the surface, with a shared outward offset.
      const tDirection = [-Math.sin(a), .28 * Math.cos(a)];
      const tLength = Math.hypot(...tDirection);
      let normal = [-tDirection[1] / tLength, tDirection[0] / tLength];
      if (normal[1] < 0) normal = normal.map(n => -n);
      const vDirection = [Math.cos(a), .28 * Math.sin(a)];
      const axisVolume = vDirection[0] * normal[0] + vDirection[1] * normal[1] >= 0 ? 2.5 : .45;
      const temperatureAxis = (temp: number) => {
        const p = point(axisVolume, temp, 0);
        return [p[0] + normal[0] * 28, p[1] + normal[1] * 28];
      };
      nodes.push(line(temperatureAxis(100), temperatureAxis(800), "gas-axis"));
      for (const temp of [100,450,800]) {
        const p = temperatureAxis(temp);
        nodes.push(line(p, [p[0] + normal[0] * 5, p[1] + normal[1] * 5], "gas-axis"));
        const tick = text(String(temp), p[0] + normal[0] * 14, p[1] + normal[1] * 14 + 4, "gas-tick");
        tick.setAttribute("text-anchor", "middle"); nodes.push(tick);
      }
      const tMid = temperatureAxis(450);
      const tLabel = text("T / K", tMid[0] + normal[0] * 37, tMid[1] + normal[1] * 37 + 4);
      tLabel.setAttribute("text-anchor", "middle"); nodes.push(tLabel);

      // Pressure is always beyond the rightmost base corner, clear of the mesh.
      const corners = [[.45,100],[.45,800],[2.5,100],[2.5,800]];
      const rightCorner = corners.reduce((best, c) => point(c[0],c[1],0)[0] > point(best[0],best[1],0)[0] ? c : best);
      const pressureAxis = (pressure: number) => {
        const p = point(rightCorner[0], rightCorner[1], pressure);
        return [p[0] + 28, p[1]];
      };
      nodes.push(line(pressureAxis(0), pressureAxis(6), "gas-axis"));
      for (const pressure of [0,2,4,6]) {
        const p = pressureAxis(pressure);
        nodes.push(line(p,[p[0]+5,p[1]],"gas-axis"),text(String(pressure),p[0]+10,p[1]+4,"gas-tick"));
      }
      const pTop = pressureAxis(6);
      nodes.push(text("p / bar",pTop[0]-5,pTop[1]-14));

      // Volume remains attached to the opposite base edge.
      const volumeTemperature = axisVolume === 2.5 ? 100 : 800;
      nodes.push(line(point(.45,volumeTemperature,0),point(2.5,volumeTemperature,0),"gas-axis"));
      for (const v of [.5,1,1.5,2,2.5]) {
        const p=point(v,volumeTemperature,0); nodes.push(text(fmt(v,1),p[0]-5,p[1]+17,"gas-tick"));
      }
      const vEnd=point(2.5,volumeTemperature,0);
      nodes.push(text("V / l",vEnd[0]-12,vEnd[1]+36));
      nodes.push(text("pV = nRT",370,35));
    } else {
      const xmin = view === "pv" ? 0 : 100, xmax = view === "pv" ? 2.6 : 800;
      project = s => [65 + ((view === "pv" ? s.volume : s.temperature) - xmin) / (xmax - xmin) * 490, 340 - s.pressure / 4 * 280];
      for (let p = 0; p <= 4; p++) { const y = 340 - p * 70; nodes.push(line([65,y],[555,y]),text(String(p),38,y+5,"gas-tick")); }
      for (const v of view === "pv" ? [0,.5,1,1.5,2,2.5] : [100,200,300,400,500,600,700,800]) {
        const x = 65 + (v-xmin)/(xmax-xmin)*490; nodes.push(line([x,60],[x,340]),text(String(v),x-10,363,"gas-tick"));
      }
      nodes.push(line([65,50],[65,340],"gas-axis"),line([65,340],[565,340],"gas-axis"),text("p / bar",24,30),text(view === "pv" ? "V / l" : "T / K",510,394));
    }
    {
      const min = Number(control.input.min), max = Number(control.input.max);
      const fullCurve = Array.from({ length: 161 }, (_, i) => project(gasState(mode, min + (max - min) * i / 160)));
      nodes.push(svg("path", {
        d: fullCurve.map((point, i) => `${i ? "L" : "M"}${point.join(" ")}`).join(""),
        class: "gas-full-curve",
      }));
    }
    const initial = (mode === "insulated" || mode === "isothermal") ? 1 : 0;
    const path = Array.from({length: 81}, (_, i) => project(gasState(mode,initial+(input-initial)*i/80)));
    nodes.push(svg("path", { d:path.map((p,i)=>`${i?"L":"M"}${p.join(" ")}`).join(""),class:"gas-trace" }));
    const start=project(gasState(mode,initial)), current=project(state);
    nodes.push(svg("circle",{cx:start[0],cy:start[1],r:5,fill:"white",stroke:"#536f84","stroke-width":2}), svg("circle",{cx:current[0],cy:current[1],r:8,fill:color(state.temperature),stroke:"white","stroke-width":3}));
    graph.replaceChildren(...nodes);
  }
  function animate(now: number) {
    if (!page.isConnected) return;
    const dt = Math.min(.05, (now - (previousTime || now)) / 1000); previousTime = now;
    if (Math.abs(target-input) > .0001) { input += (target-input)*Math.min(1,dt*7); if(Math.abs(target-input)<.0001) input=target; update(); }
    if (!reducedMotion) { drawParticles(dt); }
    requestAnimationFrame(animate);
  }
  configure(); update(); requestAnimationFrame(animate);
  return page;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", value = "") { const e = document.createElement(tag); e.className=cls; setMathText(e,value); return e; }
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string,string|number>) { const e=document.createElementNS(NS,tag); Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v))); return e; }
function text(value:string,x:number,y:number,cls="gas-svg-label") { const e=svg("text",{x,y,class:cls}); setMathText(e,value); return e; }
function button(value:string,action:()=>void) { const b=el("button","gas-button",value); b.type="button"; b.addEventListener("click",action); return b; }
function slider(name:string,min:number,max:number,step:number,value:number,action:(n:number)=>void) {
  const row=el("label","gas-slider"), title=el("span","",name), output=el("strong"), input=el("input");
  input.type="range"; input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(value);
  input.addEventListener("input",()=>{output.textContent=input.value;action(Number(input.value));});
  const header=el("span","gas-slider-heading");header.append(title,output);row.append(header,input);return {row,input,title,value:output};
}

// Symbols are italic; prose, numerical values, and units remain upright.
function setMathText(target: Element, value: string) {
  const symbols = /(?<![\p{L}])(?:ΔU|pVT|pV|pT|nRT|Cv|Cp|[QWUTVpnRγ])(?![\p{L}])/gu;
  const nodes: Node[] = [];
  let end = 0;
  for (const match of value.matchAll(symbols)) {
    nodes.push(document.createTextNode(value.slice(end, match.index)));
    const symbol = target.namespaceURI === NS ? document.createElementNS(NS, "tspan") : document.createElement("i");
    symbol.setAttribute("class", "gas-quantity"); symbol.textContent = match[0]; nodes.push(symbol);
    end = match.index! + match[0].length;
  }
  nodes.push(document.createTextNode(value.slice(end))); target.replaceChildren(...nodes);
}
