import { useEffect, useState } from 'react';
import { LanguageProvider, UI_TEXT, type Language } from './i18n';
import { MasterMenu } from './ui/components/MasterMenu';
import { RefractionPanel } from './ui/components/RefractionPanel';
import { PrismPanel } from './ui/components/PrismPanel';
import { RaytracePanel } from './ui/components/RaytracePanel';
import { DropletPanel } from './ui/components/DropletPanel';
import { Droplet2Panel } from './ui/components/Droplet2Panel';
import { RainbowPanel } from './ui/components/RainbowPanel';
import type { SimulationId } from './app/registry';
import { DescriptionPage } from './ui/components/DescriptionPage';

type ViewState =
  | { kind: 'menu' }
  | { kind: 'simulation'; id: SimulationId }
  | { kind: 'description'; id: SimulationId };

const PHONE_QUERY = '(pointer: coarse) and (max-width: 600px), (pointer: coarse) and (max-height: 600px)';
const PRESENTATION_WIDTH = 1200;
const PRESENTATION_HEIGHT = 800;

function usePhonePresentation() {
  const [viewport, setViewport] = useState({ phone: false, portrait: false, scale: 1 });
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const originalViewport = viewportMeta?.content;
    // Block browser zoom gestures without cancelling single-finger slider input.
    const preventZoom = (event: Event) => {
      if (query.matches) event.preventDefault();
    };
    const preventMultiTouch = (event: TouchEvent) => {
      if (query.matches && event.touches.length > 1) event.preventDefault();
    };
    const update = () => {
      document.documentElement.classList.toggle('phone-presentation-locked', query.matches);
      if (viewportMeta) {
        viewportMeta.content = query.matches
          ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
          : originalViewport ?? 'width=device-width, initial-scale=1';
      }
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewport({
        phone: query.matches,
        portrait: height > width,
        scale: Math.min(width / PRESENTATION_WIDTH, height / PRESENTATION_HEIGHT, 1),
      });
    };
    update();
    query.addEventListener('change', update);
    window.addEventListener('resize', update);
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('touchstart', preventMultiTouch, { passive: false });
    document.addEventListener('touchmove', preventMultiTouch, { passive: false });
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('touchstart', preventMultiTouch);
      document.removeEventListener('touchmove', preventMultiTouch);
      document.documentElement.classList.remove('phone-presentation-locked');
      if (viewportMeta && originalViewport !== undefined) viewportMeta.content = originalViewport;
    };
  }, []);
  return viewport;
}

function App() {
  const [language, setLanguage] = useState<Language>('sv');
  const [view, setView] = useState<ViewState>({ kind: 'menu' });

  const { phone, portrait, scale } = usePhonePresentation();
  const text = UI_TEXT[language];
  const isMenu = view.kind === 'menu';
  const activeId = view.kind === 'menu' ? null : view.id;

  useEffect(() => {
    document.title = text.windowTitle;
    document.documentElement.lang = language;
  }, [language, text.windowTitle]);

  const openSimulation = (id: SimulationId) => {
    setView({ kind: 'simulation', id });
  };

  const openDescription = (id: SimulationId) => {
    setView({ kind: 'description', id });
  };

  const showInfoButton = view.kind === 'simulation';

  return (
    <LanguageProvider language={language}>
      <div className={`presentation-root${phone ? ' phone-presentation' : ''}`}>
        {phone && portrait && (
          <div className="rotate-prompt" role="status">
            <span className="rotate-phone-icon" aria-hidden="true">↻</span>
            <h1>{text.rotatePhoneTitle}</h1>
            <p>{text.rotatePhoneBody}</p>
          </div>
        )}
        <div className="presentation-frame" style={phone ? { width: 1200 * scale, height: 800 * scale } : undefined}
          inert={phone && portrait} hidden={phone && portrait}>
        <div className="stage" style={phone ? { transform: `scale(${scale})` } : undefined}>
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
      </div>
    </LanguageProvider>
  );
}

export default App;
