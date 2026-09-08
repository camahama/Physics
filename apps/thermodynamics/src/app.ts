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
    path("M 20 52 H 76 M 28 52 V 24 H 68 V 52", "thermal stroke");
    path("M 34 46 C 38 30 58 30 62 46", "thermal wave");
    line(48, 24, 48, 11, "thermal mercury");
    circle(48, 11, 5, "thermal bulb");
    path("M 73 28 C 82 28 82 48 73 48", "thermal stroke");
    path("M 21 58 C 34 64 62 64 75 58", "thermal faint");
  } else if (slug === "process-builder") {
    line(18, 58, 82, 58, "thermal stroke");
    line(18, 58, 18, 12, "thermal stroke");
    path("M 28 49 H 66", "thermal process isobar");
    path("M 28 49 C 42 32 54 21 66 16", "thermal process isotherm");
    path("M 28 49 C 38 26 50 18 66 16", "thermal process adiabat");
    circle(28, 49, 4, "thermal bulb");
    circle(66, 16, 4, "thermal bulb");
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
