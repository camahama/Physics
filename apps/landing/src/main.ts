import "./styles.css";
import { copy } from "./i18n/en";

type PhysicsApp = {
  title: string;
  description: string;
  href: string;
  label: string;
};

const apps: PhysicsApp[] = [
  {
    title: copy.apps.electricity.title,
    description: copy.apps.electricity.description,
    href: "/electricity/",
    label: copy.apps.electricity.label,
  },
  {
    title: copy.apps.rainbow.title,
    description: copy.apps.rainbow.description,
    href: "/rainbow/",
    label: copy.apps.rainbow.label,
  },
  {
    title: copy.apps.stirling.title,
    description: copy.apps.stirling.description,
    href: "/stirling/",
    label: copy.apps.stirling.label,
  },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

const moduleHref = (path: string) =>
  new URL(path.replace(/^\/+/, ""), window.location.href).pathname;

app.innerHTML = `
  <main class="site-shell">
    <section class="hero" aria-labelledby="page-title">
      <p class="eyebrow">${copy.site.domain}</p>
      <h1 id="page-title">${copy.site.title}</h1>
      <p class="intro">${copy.site.intro}</p>
    </section>

    <section class="app-grid" aria-label="${copy.appsAriaLabel}">
      ${apps
        .map(
          (physicsApp) => `
            <a class="app-card" href="${moduleHref(physicsApp.href)}">
              <span class="status">${physicsApp.label}</span>
              <h2>${physicsApp.title}</h2>
              <p>${physicsApp.description}</p>
            </a>
          `,
        )
        .join("")}
    </section>

    <p class="package-credit">
      ${copy.site.creditPrefix}
      <br />
      <a href="mailto:${copy.site.creditEmail}">${copy.site.creditEmail}</a>.
      ${copy.site.creditLicensePrefix}
      <a href="${copy.site.creditLicenseUrl}" target="_blank" rel="license noopener noreferrer">
        ${copy.site.creditLicenseLabel}
      </a>
    </p>

    <p class="repository-link">
      <a href="${copy.site.repositoryUrl}" target="_blank" rel="noopener noreferrer">
        ${copy.site.repositoryLabel}
      </a>
    </p>
  </main>
`;
