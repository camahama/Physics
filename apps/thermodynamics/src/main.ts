import { createApp } from "./app.js";

const container = document.querySelector("#app");

if (!container) {
  throw new Error("App container was not found.");
}

function renderStartupError(target: Element, error: unknown) {
  console.error("Thermodynamics app failed to start.", error);

  const message = error instanceof Error ? error.message : String(error);

  target.innerHTML = `
    <main class="page-shell">
      <section class="module-page">
        <h1 class="module-title">Thermodynamics</h1>
        <p class="module-description">
          The app could not start correctly in this browser context.
        </p>
        <p class="status-note">
          Error: ${message}
        </p>
      </section>
    </main>
  `;
}

createApp(container).catch((error) => {
  renderStartupError(container, error);
});
