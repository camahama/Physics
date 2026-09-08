import React from "react";
import ReactDOM from "react-dom/client";
import type { ModuleRenderContext } from "../../config/modules.js";
import { App } from "./App";
import stirlingStyles from "./styles.css?raw";

export function renderStirlingEngineModule(_context: ModuleRenderContext): HTMLElement {
  const host = document.createElement("section");
  host.className = "react-module-host";

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = stirlingStyles.replace(":root", ":host");

  const mount = document.createElement("div");
  mount.className = "stirling-module-root";
  shadowRoot.append(style, mount);

  ReactDOM.createRoot(mount).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  return host;
}
