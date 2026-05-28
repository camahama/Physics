import type { SimulationId } from '../../app/registry';
import { useLanguage, useUiText } from '../../app/i18n';
import { DescriptionDocument } from '../../descriptions/renderer';

type DescriptionPageProps = {
  simulationId: SimulationId;
  onBackToSimulation: () => void;
};

export function DescriptionPage({ simulationId, onBackToSimulation }: DescriptionPageProps) {
  const language = useLanguage();
  const text = useUiText();
  const moduleText = text.modules[simulationId];
  return (
    <section className="panel description-panel">
      <div className="description-header">
        <div>
          <h2>
            {moduleText.title} - {text.descriptionPage.titleSuffix}
          </h2>
          <p className="panel-lead">{text.descriptionPage.lead}</p>
        </div>
        <button type="button" className="mode-btn" onClick={onBackToSimulation}>
          {text.descriptionPage.backToModule}
        </button>
      </div>

      <article className="description-content">
        <DescriptionDocument simulationId={simulationId} language={language} />
      </article>
    </section>
  );
}
