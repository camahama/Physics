import { useState } from 'react';
import { LanguageProvider } from './app/i18n';
import { MasterMenu } from './ui/components/MasterMenu';
import { RefractionPanel } from './ui/components/RefractionPanel';
import { PrismPanel } from './ui/components/PrismPanel';
import { RaytracePanel } from './ui/components/RaytracePanel';
import { DropletPanel } from './ui/components/DropletPanel';
import { Droplet2Panel } from './ui/components/Droplet2Panel';
import { RainbowPanel } from './ui/components/RainbowPanel';
import type { SimulationId } from './app/registry';
import { UI_TEXT, type Language } from './app/uiText';
import { DescriptionPage } from './ui/components/DescriptionPage';

type ViewState =
  | { kind: 'menu' }
  | { kind: 'simulation'; id: SimulationId }
  | { kind: 'description'; id: SimulationId };

function App() {
  const [language, setLanguage] = useState<Language>('sv');
  const [view, setView] = useState<ViewState>({ kind: 'menu' });

  const text = UI_TEXT[language];
  const isMenu = view.kind === 'menu';
  const activeId = view.kind === 'menu' ? null : view.id;

  const openSimulation = (id: SimulationId) => {
    setView({ kind: 'simulation', id });
  };

  const openDescription = (id: SimulationId) => {
    setView({ kind: 'description', id });
  };

  const showInfoButton = view.kind === 'simulation';

  return (
    <LanguageProvider language={language}>
      <div className="presentation-root">
        <div className="stage">
          <div className={isMenu ? 'stage-scroll stage-scroll-menu' : 'stage-scroll stage-scroll-workspace'}>
            {isMenu ? (
              <header className="hero">
                <h1>{text.appTitle}</h1>
                <p className="hero-copy">{text.appSubtitle}</p>
                <MasterMenu
                  activeId={activeId}
                  language={language}
                  onLanguageChange={setLanguage}
                  onPick={openSimulation}
                />
              </header>
            ) : (
              <main className="workspace">
                <div className="workspace-toolbar">
                  {showInfoButton && activeId ? (
                    <button
                      type="button"
                      className="info-btn top-action-btn"
                      onClick={() => openDescription(activeId)}
                      aria-label={`${text.panel.infoButtonAriaPrefix} ${text.modules[activeId].title}`}
                    >
                      <svg viewBox="0 0 24 24" className="info-btn-icon" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <line x1="12" y1="10.5" x2="12" y2="16" />
                        <circle cx="12" cy="7.4" r="1" className="info-btn-dot" />
                      </svg>
                    </button>
                  ) : null}

                  <button type="button" className="menu-return-btn top-action-btn" onClick={() => setView({ kind: 'menu' })}>
                    {text.menuButton}
                  </button>
                </div>

                {view.kind === 'description' ? (
                  <DescriptionPage simulationId={view.id} onBackToSimulation={() => openSimulation(view.id)} />
                ) : null}

                {view.kind === 'simulation' && activeId === 'refraction' ? (
                  <RefractionPanel />
                ) : null}
                {view.kind === 'simulation' && activeId === 'prism' ? (
                  <PrismPanel />
                ) : null}
                {view.kind === 'simulation' && activeId === 'raytrace' ? (
                  <RaytracePanel />
                ) : null}
                {view.kind === 'simulation' && activeId === 'droplet' ? (
                  <DropletPanel />
                ) : null}
                {view.kind === 'simulation' && activeId === 'droplet2' ? (
                  <Droplet2Panel />
                ) : null}
                {view.kind === 'simulation' && activeId === 'rainbow' ? (
                  <RainbowPanel />
                ) : null}

                {view.kind === 'simulation' &&
                activeId !== 'refraction' &&
                activeId !== 'prism' &&
                activeId !== 'raytrace' &&
                activeId !== 'droplet' &&
                activeId !== 'droplet2' &&
                activeId !== 'rainbow' ? (
                  <section className="panel">
                    <h2>{text.fallbackTitle}</h2>
                    <p className="panel-lead">{text.fallbackBody}</p>
                  </section>
                ) : null}
              </main>
            )}
          </div>
        </div>
      </div>
    </LanguageProvider>
  );
}

export default App;
