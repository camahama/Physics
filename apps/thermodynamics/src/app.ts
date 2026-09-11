import { moduleRegistry } from "./config/modules.js";
import { createPackageCredit } from "./components/packageCredit.js";
import { createI18n } from "./i18n/index.js";

const DEFAULT_ROUTE = "home";
const DEFAULT_LANGUAGE = "sv";

function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash || DEFAULT_ROUTE;
}

function setDocumentLanguage(language: string) {
  document.documentElement.lang = language;
}

export async function createApp(container: Element) {
  const i18n = await createI18n({ defaultLanguage: DEFAULT_LANGUAGE });

  function render() {
    const route = getRoute();
    const moduleDefinition = moduleRegistry.find(
      (entry) => entry.slug === route,
    );

    const view = moduleDefinition
      ? moduleDefinition.render({ t: i18n.t, language: i18n.language })
      : renderHome({
          t: i18n.t,
          language: i18n.language,
          onLanguageChange: async (language) => {
            await i18n.setLanguage(language);
            render();
          },
        });

    container.innerHTML = "";
    container.append(view);
    setDocumentLanguage(i18n.language);
    document.title = i18n.t("app.meta.title");
  }

  window.addEventListener("hashchange", render);

  render();
}

function renderHome({
  t,
  language,
  onLanguageChange,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  language: string;
  onLanguageChange: (language: string) => Promise<void>;
}) {
  const page = document.createElement("main");
  page.className = "page-shell";

  const hero = document.createElement("section");
  hero.className = "hero";

  const branding = document.createElement("div");
  branding.className = "branding";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = t("home.eyebrow");

  const title = document.createElement("h1");
  title.className = "hero-title";
  title.textContent = t("app.title");

  const description = document.createElement("p");
  description.className = "hero-description";
  description.textContent = t("home.description");

  const languagePicker = renderLanguagePicker({
    label: t("home.languageLabel"),
    language,
    onChange: onLanguageChange,
  });

  const menuTitle = document.createElement("h2");
  menuTitle.className = "section-title";
  menuTitle.textContent = t("home.menuTitle");

  const menu = document.createElement("nav");
  menu.className = "module-menu";
  menu.setAttribute("aria-label", t("home.menuTitle"));

  const moduleList = document.createElement("div");
  moduleList.className = "module-list";

  moduleRegistry
    .filter((moduleDefinition) => !moduleDefinition.hiddenFromMenu)
    .forEach((moduleDefinition) => {
      const link = document.createElement("a");
      link.href = `#/${moduleDefinition.slug}`;
      link.className = "module-link";
      link.append(
        createModuleIcon(moduleDefinition.slug),
        moduleIconTitle(t(moduleDefinition.titleKey)),
      );
      moduleList.append(link);
    });

  menu.append(moduleList);

  const credit = createPackageCredit(t);

  hero.append(
    branding,
    eyebrow,
    title,
    description,
    languagePicker,
    menuTitle,
    menu,
    credit,
  );
  page.append(hero);

  return page;
}

function moduleIconTitle(textContent: string) {
  const title = document.createElement("span");
  title.className = "module-icon-title";
  title.textContent = textContent;
  return title;
}

function createModuleIcon(slug: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "module-icon");
  svg.setAttribute("viewBox", "0 0 96 72");
  svg.setAttribute("aria-hidden", "true");

  const line = (x1: number, y1: number, x2: number, y2: number, className = "stroke") => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "line");
    node.setAttribute("x1", String(x1));
    node.setAttribute("y1", String(y1));
    node.setAttribute("x2", String(x2));
    node.setAttribute("y2", String(y2));
    node.setAttribute("class", className);
    svg.append(node);
  };
  const circle = (cx: number, cy: number, r: number, className = "stroke") => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    node.setAttribute("cx", String(cx));
    node.setAttribute("cy", String(cy));
    node.setAttribute("r", String(r));
    node.setAttribute("class", className);
    svg.append(node);
  };
  const rect = (x: number, y: number, width: number, height: number, className = "stroke") => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    node.setAttribute("x", String(x));
    node.setAttribute("y", String(y));
    node.setAttribute("width", String(width));
    node.setAttribute("height", String(height));
    node.setAttribute("rx", "2");
    node.setAttribute("class", className);
    svg.append(node);
  };
  const path = (d: string, className = "stroke") => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
    node.setAttribute("d", d);
    node.setAttribute("class", className);
    svg.append(node);
  };

  if (slug === "heat-temperature") {
    circle(48, 38, 18, "thermal bulb");
    line(48, 12, 48, 41, "thermal mercury");
    path("M 40 14 L 56 14 M 40 22 L 52 22 M 40 30 L 56 30", "thermal tick");
    path("M 22 57 C 34 48 62 48 74 57", "thermal wave");
    path("M 28 49 C 38 41 58 41 68 49", "thermal wave faint");
  } else if (slug === "stirling-engine") {
    rect(12, 22, 58, 24, "thermal chamber");
    rect(36, 26, 10, 16, "thermal piston regenerator");
    rect(54, 26, 8, 16, "thermal piston");
    path("M 37 29 L 45 25 M 37 35 L 45 31 M 37 41 L 45 37", "thermal heat-exchanger");
    line(46, 34, 77, 34, "thermal stroke");
    line(62, 34, 77, 42, "thermal stroke");
    circle(79, 38, 13, "thermal flywheel");
    circle(79, 38, 3.2, "thermal crank");
    line(79, 38, 88, 30, "thermal stroke");
    circle(88, 30, 3.2, "thermal crank");
    path("M 13 57 H 32 M 19 54 C 14 48 18 43 25 40 C 23 47 33 49 27 55", "thermal heat-source");
  } else if (slug === "stirling-illustration") {
    line(12, 58, 46, 58, "thermal stroke");
    line(12, 58, 12, 18, "thermal stroke");
    path("M 20 20 C 31 25 38 30 45 31", "thermal process isotherm");
    path("M 20 44 C 30 48 38 50 45 50", "thermal process isotherm");
    line(20, 20, 20, 44, "thermal process isochor");
    line(45, 31, 45, 50, "thermal process isochor");
    circle(20, 20, 2.6, "thermal bulb");
    circle(45, 31, 2.6, "thermal bulb");
    circle(45, 50, 2.6, "thermal bulb");
    circle(20, 44, 2.6, "thermal bulb");
    rect(54, 31, 24, 10, "thermal chamber");
    rect(62, 33, 4, 6, "thermal piston regenerator");
    rect(72, 33, 4, 6, "thermal piston");
    circle(84, 36, 7, "thermal flywheel");
    line(76, 36, 84, 31, "thermal stroke");
  } else if (slug === "process-builder") {
    line(18, 58, 82, 58, "thermal stroke");
    line(18, 58, 18, 12, "thermal stroke");
    path("M 30 16 C 41 27 55 32 68 31", "thermal process isotherm");
    path("M 30 42 C 42 49 56 51 68 49", "thermal process isotherm");
    line(30, 16, 30, 42, "thermal process isochor");
    line(68, 31, 68, 49, "thermal process isochor");
    circle(30, 16, 3.2, "thermal bulb");
    circle(68, 31, 3.2, "thermal bulb");
    circle(68, 49, 3.2, "thermal bulb");
    circle(30, 42, 3.2, "thermal bulb");
  } else {
    circle(48, 36, 22, "thermal bulb");
    path("M 26 50 C 38 40 58 40 70 50", "thermal wave");
  }

  return svg;
}

function renderLanguagePicker({
  label: pickerLabel,
  language,
  onChange,
}: {
  label: string;
  language: string;
  onChange: (language: string) => Promise<void>;
}) {
  const wrapper = document.createElement("div");
  wrapper.className = "language-picker";

  const label = document.createElement("span");
  label.className = "language-label";
  label.textContent = pickerLabel;

  const languages = [
    { code: "en", label: "English" },
    { code: "sv", label: "Svenska" },
  ];

  languages.forEach(({ code, label: languageLabel }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = code === language ? "language-button active" : "language-button";
    button.textContent = languageLabel;
    button.addEventListener("click", () => onChange(code));
    wrapper.append(button);
  });

  wrapper.prepend(label);
  return wrapper;
}
