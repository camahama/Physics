import type { ModuleRenderContext } from "../../config/modules.js";
import { createPackageCredit } from "../../components/packageCredit.js";

export function renderHeatTemperatureModule({ t }: ModuleRenderContext): HTMLElement {
  const page = document.createElement("main");
  page.className = "page-shell thermodynamics-shell";

  const content = element("section", "module-page module-page-wide placeholder-page");
  const backLink = document.createElement("a");
  backLink.href = "#/";
  backLink.className = "module-menu-button";
  backLink.textContent = t("common.menuButton");

  const header = element("header", "placeholder-header");
  const headerInfo = element("div", "module-header-info");
  headerInfo.append(
    element("p", "module-description", t("modules.heatTemperature.description")),
    backLink,
  );
  header.append(
    element("h1", "module-title", t("modules.heatTemperature.title")),
    headerInfo,
  );

  const stage = element("section", "placeholder-stage");
  stage.setAttribute("aria-label", t("modules.heatTemperature.stageLabel"));
  stage.append(createThermalSketch(), element("p", "status-note", t("modules.heatTemperature.status")));

  content.append(header, stage, createPackageCredit(t));
  page.append(content);

  return page;
}

function createThermalSketch() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "thermal-sketch");
  svg.setAttribute("viewBox", "0 0 920 360");
  svg.setAttribute("role", "img");

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  gradient.setAttribute("id", "thermal-gradient");
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("x2", "100%");
  gradient.innerHTML = `
    <stop offset="0%" stop-color="#2f72d6" />
    <stop offset="50%" stop-color="#f0c845" />
    <stop offset="100%" stop-color="#c93c2f" />
  `;
  defs.append(gradient);
  svg.append(defs);

  const plate = node("rect", {
    x: "120",
    y: "150",
    width: "680",
    height: "64",
    rx: "12",
    class: "thermal-bar",
  });
  const leftReservoir = node("circle", { cx: "120", cy: "182", r: "52", class: "cold-reservoir" });
  const rightReservoir = node("circle", { cx: "800", cy: "182", r: "52", class: "hot-reservoir" });
  const energyPath = node("path", {
    d: "M 220 110 C 330 52 420 272 530 110 C 620 -24 690 146 724 110",
    class: "energy-path",
  });

  svg.append(leftReservoir, rightReservoir, plate, energyPath);

  for (let index = 0; index < 9; index += 1) {
    const x = 200 + index * 62;
    svg.append(node("circle", {
      cx: String(x),
      cy: String(182 + (index % 2 === 0 ? -8 : 8)),
      r: String(7 + index * 0.7),
      class: "thermal-particle",
    }));
  }

  svg.append(label("cold", 78, 292), label("Q", 456, 88), label("hot", 762, 292));

  return svg;
}

function label(value: string, x: number, y: number) {
  const text = node("text", { x: String(x), y: String(y), class: "thermal-label" });
  text.textContent = value;
  return text;
}

function node(tagName: string, attributes: Record<string, string>) {
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
