import { copy } from "../../i18n";
import { GyroscopeModel } from "./GyroscopeModel";
import { GyroscopeScene } from "./GyroscopeScene";

export class GyroscopeSimulationView {
  private readonly model = new GyroscopeModel({
    spinRate: 14,
    rotorInertia: 0.55,
    mass: 1.2,
    leverArm: 1,
    tiltAngle: Math.PI / 5,
    gravity: 9.81,
    friction: 0
  });
  private readonly sceneHost = document.createElement("div");
  private readonly statsValue = document.createElement("div");
  private scene?: GyroscopeScene;
  private statsTimer?: number;
  private isPaused = false;

  mount(): { element: HTMLElement; dispose: () => void } {
    const element = this.buildLayout();
    this.scene = new GyroscopeScene(this.sceneHost, this.model);
    this.scene.start();
    this.scene.setPaused(this.isPaused);
    this.renderStats();
    this.statsTimer = window.setInterval(() => this.renderStats(), 120);

    return {
      element,
      dispose: () => this.dispose()
    };
  }

  private dispose(): void {
    this.scene?.dispose();
    if (this.statsTimer) {
      window.clearInterval(this.statsTimer);
    }
  }

  private buildLayout(): HTMLElement {
    const content = document.createElement("section");
    content.className = "simulation-view";

    const header = document.createElement("div");
    header.className = "simulation-header";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = copy.gyroscope.app.eyebrow;

    const title = document.createElement("h2");
    title.className = "simulation-title";
    title.textContent = copy.gyroscope.app.title;

    const description = document.createElement("p");
    description.className = "description";
    description.textContent = copy.gyroscope.app.description;

    header.append(eyebrow, title, description);

    const layout = document.createElement("div");
    layout.className = "content-grid";

    const scenePanel = document.createElement("section");
    scenePanel.className = "panel scene-panel";

    const sceneLabel = document.createElement("h3");
    sceneLabel.textContent = copy.gyroscope.app.sceneLabel;

    this.sceneHost.className = "scene-host";
    scenePanel.append(sceneLabel, this.sceneHost);

    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.append(this.buildControls(), this.buildStatsPanel());

    layout.append(scenePanel, sidebar);
    content.append(header, layout, this.buildEquationsPanel());
    return content;
  }

  private buildControls(): HTMLElement {
    const panel = document.createElement("section");
    panel.className = "panel controls-panel";

    const heading = document.createElement("h3");
    heading.textContent = copy.gyroscope.controls.heading;

    const controls = [
      {
        label: copy.gyroscope.controls.spin,
        min: "2",
        max: "30",
        step: "0.1",
        value: "14",
        onInput: (value: number) => this.model.setParameters({ spinRate: value })
      },
      {
        label: copy.gyroscope.controls.inertia,
        min: "0.2",
        max: "1.5",
        step: "0.05",
        value: "0.55",
        onInput: (value: number) => this.model.setParameters({ rotorInertia: value })
      },
      {
        label: copy.gyroscope.controls.mass,
        min: "0.2",
        max: "3",
        step: "0.05",
        value: "1.2",
        onInput: (value: number) => this.model.setParameters({ mass: value })
      },
      {
        label: copy.gyroscope.controls.leverArm,
        min: "0.2",
        max: "1.6",
        step: "0.05",
        value: "1.0",
        onInput: (value: number) => this.model.setParameters({ leverArm: value })
      },
      {
        label: copy.gyroscope.controls.tilt,
        min: "10",
        max: "65",
        step: "1",
        value: "36",
        onInput: (value: number) => this.model.setParameters({ tiltAngle: (value * Math.PI) / 180 })
      },
      {
        label: copy.gyroscope.controls.friction,
        min: "0",
        max: "0.35",
        step: "0.01",
        value: "0.00",
        onInput: (value: number) => this.model.setParameters({ friction: value })
      }
    ];

    const pauseButton = document.createElement("button");
    pauseButton.type = "button";
    pauseButton.textContent = copy.gyroscope.controls.pause;
    pauseButton.addEventListener("click", () => {
      this.isPaused = !this.isPaused;
      pauseButton.textContent = this.isPaused
        ? copy.gyroscope.controls.play
        : copy.gyroscope.controls.pause;
      this.scene?.setPaused(this.isPaused);
      this.scene?.syncFromModel();
      this.renderStats();
    });

    panel.append(heading, ...controls.map((control) => this.createRangeControl(control)), pauseButton);
    return panel;
  }

  private buildStatsPanel(): HTMLElement {
    const panel = document.createElement("section");
    panel.className = "panel stats-panel";

    const heading = document.createElement("h3");
    heading.textContent = copy.gyroscope.stats.heading;

    this.statsValue.className = "stats-grid";
    panel.append(heading, this.statsValue);
    return panel;
  }

  private buildEquationsPanel(): HTMLElement {
    const panel = document.createElement("section");
    panel.className = "panel equations-panel";

    const heading = document.createElement("h3");
    heading.textContent = copy.gyroscope.equations.heading;

    panel.append(
      heading,
      this.createEquationBlock(copy.gyroscope.equations.displayTitle, copy.gyroscope.equations.display),
      this.createDerivationBlock(),
      this.createEquationBlock(copy.gyroscope.equations.variablesTitle, copy.gyroscope.equations.variables),
      this.createGlossaryBlock()
    );
    return panel;
  }

  private createDerivationBlock(): HTMLElement {
    const section = document.createElement("section");
    section.className = "equation-block";
    const title = document.createElement("h4");
    title.textContent = copy.gyroscope.equations.derivationTitle;
    const list = document.createElement("ol");
    list.className = "derivation-list";
    for (const step of copy.gyroscope.equations.derivation) {
      const item = document.createElement("li");
      item.textContent = step;
      list.append(item);
    }
    section.append(title, list);
    return section;
  }

  private createEquationBlock(titleText: string, equations: readonly string[]): HTMLElement {
    const section = document.createElement("section");
    section.className = "equation-block";
    const title = document.createElement("h4");
    title.textContent = titleText;
    const mathList = document.createElement("div");
    mathList.className = "equation-list";
    for (const equation of equations) {
      const formula = document.createElement("div");
      formula.className = "equation-card";
      formula.innerHTML = equation;
      mathList.append(formula);
    }
    section.append(title, mathList);
    return section;
  }

  private createGlossaryBlock(): HTMLElement {
    const section = document.createElement("section");
    section.className = "equation-block";
    const title = document.createElement("h4");
    title.textContent = copy.gyroscope.equations.glossaryTitle;
    const glossary = document.createElement("div");
    glossary.className = "glossary-grid";

    for (const entry of copy.gyroscope.equations.glossary) {
      const card = document.createElement("article");
      card.className = "glossary-card";

      const symbol = document.createElement("strong");
      symbol.className = "glossary-symbol";
      symbol.textContent = entry.symbol;

      const name = document.createElement("div");
      name.className = "glossary-name";
      name.textContent = entry.name;

      const units = document.createElement("div");
      units.className = "glossary-units";
      units.textContent = `Units: ${entry.units}`;

      const description = document.createElement("p");
      description.className = "glossary-description";
      description.textContent = entry.description;

      card.append(symbol, name, units, description);
      glossary.append(card);
    }

    section.append(title, glossary);
    return section;
  }

  private createRangeControl(options: {
    label: string;
    min: string;
    max: string;
    step: string;
    value: string;
    onInput: (value: number) => void;
  }): HTMLElement {
    const wrapper = document.createElement("label");
    wrapper.className = "range-control";
    const row = document.createElement("span");
    row.className = "range-header";
    const label = document.createElement("span");
    label.textContent = options.label;
    const value = document.createElement("output");
    value.textContent = Number(options.value).toFixed(1);
    const input = document.createElement("input");
    input.type = "range";
    input.min = options.min;
    input.max = options.max;
    input.step = options.step;
    input.value = options.value;
    input.addEventListener("input", () => {
      const nextValue = Number(input.value);
      value.textContent = nextValue.toFixed(1);
      options.onInput(nextValue);
      this.scene?.syncFromModel();
      this.renderStats();
    });
    row.append(label, value);
    wrapper.append(row, input);
    return wrapper;
  }

  private renderStats(): void {
    const state = this.model.getState();
    const stats = [
      [copy.gyroscope.stats.spin, `${state.spinRate.toFixed(2)} rad/s`],
      [copy.gyroscope.stats.tilt, `${((state.tiltAngle * 180) / Math.PI).toFixed(1)} deg`],
      [copy.gyroscope.stats.angularMomentum, state.angularMomentum.length().toFixed(2)],
      [copy.gyroscope.stats.torque, state.torque.length().toFixed(2)],
      [copy.gyroscope.stats.precession, state.precessionRate.toFixed(2)]
    ] as const;

    this.statsValue.replaceChildren(...stats.map(([label, value]) => this.createStat(label, value)));
  }

  private createStat(labelText: string, valueText: string): HTMLElement {
    const stat = document.createElement("div");
    stat.className = "stat";
    const label = document.createElement("span");
    label.className = "stat-label";
    label.textContent = labelText;
    const value = document.createElement("strong");
    value.textContent = valueText;
    stat.append(label, value);
    return stat;
  }
}
