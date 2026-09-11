import { renderHeatTemperatureModule } from "../modules/heat-temperature/index.js";
import { renderProcessBuilderModule } from "../modules/process-builder/index.js";
import { renderStirlingIllustrationModule } from "../modules/stirling-illustration/index.js";
import { renderStirlingEngineModule } from "../modules/stirling-engine/index.js";

export type ModuleRenderContext = {
  t: (key: string, values?: Record<string, string | number>) => string;
  language?: string;
};

export type ModuleDefinition = {
  slug: string;
  titleKey: string;
  render: (context: ModuleRenderContext) => HTMLElement;
  hiddenFromMenu?: boolean;
};

export const moduleRegistry: ModuleDefinition[] = [
  {
    slug: "stirling-engine",
    titleKey: "modules.stirlingEngine.title",
    render: renderStirlingEngineModule,
  },
  {
    slug: "stirling-illustration",
    titleKey: "modules.stirlingIllustration.title",
    render: renderStirlingIllustrationModule,
  },
  {
    slug: "process-builder",
    titleKey: "modules.processBuilder.title",
    render: renderProcessBuilderModule,
  },
  {
    slug: "heat-temperature",
    titleKey: "modules.heatTemperature.title",
    render: renderHeatTemperatureModule,
  },
];
