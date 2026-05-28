import { copy } from "../i18n";
import { GyroscopeSimulationView } from "../simulations/gyroscope/GyroscopeSimulationView";

type Route = "menu" | "gyroscope";

export class MechanicsApp {
  private route: Route = "menu";
  private activeView?: { element: HTMLElement; dispose?: () => void };

  constructor(private readonly root: HTMLElement) {}

  mount(): void {
    this.render();
  }

  private render(): void {
    this.activeView?.dispose?.();
    this.root.innerHTML = "";
    this.root.append(this.buildShell());
  }

  private buildShell(): HTMLElement {
    const shell = document.createElement("main");
    shell.className = "app-shell";

    const hero = document.createElement("section");
    hero.className = "hero";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = copy.app.eyebrow;

    const title = document.createElement("h1");
    title.textContent = copy.app.title;

    const description = document.createElement("p");
    description.className = "description";
    description.textContent = copy.app.description;

    hero.append(eyebrow, title, description);

    if (this.route !== "menu") {
      const backButton = document.createElement("button");
      backButton.type = "button";
      backButton.className = "ghost-button";
      backButton.textContent = copy.app.backToMenu;
      backButton.addEventListener("click", () => {
        this.route = "menu";
        this.render();
      });
      hero.append(backButton);
    }

    const body =
      this.route === "menu"
        ? this.buildMenuView()
        : this.mountSimulation(new GyroscopeSimulationView());

    shell.append(hero, body);
    return shell;
  }

  private buildMenuView(): HTMLElement {
    const wrapper = document.createElement("section");
    wrapper.className = "simulation-view";

    const header = document.createElement("div");
    header.className = "simulation-header";

    const title = document.createElement("h2");
    title.className = "simulation-title";
    title.textContent = copy.menu.title;

    const description = document.createElement("p");
    description.className = "description";
    description.textContent = copy.menu.description;

    header.append(title, description);

    const section = document.createElement("div");
    section.className = "menu-grid";

    section.append(
      this.createMenuCard({
        status: copy.menu.available,
        title: copy.menu.items.gyroscope.title,
        description: copy.menu.items.gyroscope.description,
        enabled: true,
        onClick: () => {
          this.route = "gyroscope";
          this.render();
        }
      }),
      this.createMenuCard({
        status: copy.menu.upcoming,
        title: copy.menu.items.angularMomentum.title,
        description: copy.menu.items.angularMomentum.description,
        enabled: false
      })
    );

    wrapper.append(header, section);
    return wrapper;
  }

  private createMenuCard(options: {
    status: string;
    title: string;
    description: string;
    enabled: boolean;
    onClick?: () => void;
  }): HTMLElement {
    const card = document.createElement("article");
    card.className = `panel menu-card${options.enabled ? "" : " is-disabled"}`;

    const status = document.createElement("p");
    status.className = "menu-status";
    status.textContent = options.status;

    const title = document.createElement("h2");
    title.className = "menu-title";
    title.textContent = options.title;

    const description = document.createElement("p");
    description.className = "menu-description";
    description.textContent = options.description;

    card.append(status, title, description);

    if (options.enabled && options.onClick) {
      const action = document.createElement("button");
      action.type = "button";
      action.textContent = copy.menu.launch;
      action.addEventListener("click", options.onClick);
      card.append(action);
    }

    return card;
  }

  private mountSimulation(
    view: GyroscopeSimulationView
  ): HTMLElement {
    this.activeView = view.mount();
    return this.activeView.element;
  }
}
