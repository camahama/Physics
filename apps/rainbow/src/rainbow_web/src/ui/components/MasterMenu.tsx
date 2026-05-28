import type { SimulationId } from '../../app/registry';
import { SIMULATION_IDS } from '../../app/registry';
import { UI_TEXT, type Language } from '../../app/uiText';

type MasterMenuProps = {
  activeId: SimulationId | null;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onPick: (id: SimulationId) => void;
};

type MenuIconProps = {
  id: SimulationId;
};

function MenuIcon({ id }: MenuIconProps) {
  if (id === 'refraction') {
    return (
      <svg viewBox="0 0 72 72" className="menu-icon-svg" aria-hidden="true">
        <line x1="24" y1="8" x2="48" y2="64" className="menu-refrac-boundary" />
        <line x1="10" y1="40" x2="34" y2="40" className="menu-refrac-incident" />
        <line x1="34" y1="40" x2="62" y2="34" className="menu-refrac-refracted" />
      </svg>
    );
  }

  if (id === 'prism') {
    return (
      <svg viewBox="0 0 72 72" className="menu-icon-svg" aria-hidden="true">
        <line x1="8" y1="39" x2="26" y2="35" className="menu-dsotm-in" />
        <polygon points="36,12 20,56 58,56" fill="none" className="menu-dsotm-prism" />

        <line x1="26" y1="35" x2="52" y2="33" className="menu-dsotm-r1" />
        <line x1="26" y1="35" x2="52" y2="34" className="menu-dsotm-r2" />
        <line x1="26" y1="35" x2="52" y2="35" className="menu-dsotm-r3" />
        <line x1="26" y1="35" x2="52" y2="36" className="menu-dsotm-r4" />
        <line x1="26" y1="35" x2="52" y2="37" className="menu-dsotm-r5" />
        <line x1="26" y1="35" x2="52" y2="38" className="menu-dsotm-r6" />

        <line x1="52" y1="33" x2="67" y2="38" className="menu-dsotm-r1" />
        <line x1="52" y1="34" x2="67" y2="42" className="menu-dsotm-r2" />
        <line x1="52" y1="35" x2="67" y2="46" className="menu-dsotm-r3" />
        <line x1="52" y1="36" x2="67" y2="50" className="menu-dsotm-r4" />
        <line x1="52" y1="37" x2="67" y2="54" className="menu-dsotm-r5" />
        <line x1="52" y1="38" x2="67" y2="58" className="menu-dsotm-r6" />
      </svg>
    );
  }

  if (id === 'raytrace') {
    return (
      <svg viewBox="0 0 72 72" className="menu-icon-svg" aria-hidden="true">
        <circle cx="36" cy="36" r="24" fill="none" className="menu-raytrace-circle" />

        <polyline points="15,65 15,48 30,12" fill="none" className="menu-raytrace-main" />
        <polyline points="30,12 60,34 30,60" fill="none" className="menu-raytrace-main-soft" />

        <line x1="6" y1="13" x2="30" y2="66" className="menu-raytrace-faint" />
        <line x1="30" y1="12" x2="60" y2="34" className="menu-raytrace-faint" />
        <line x1="30" y1="60" x2="60" y2="34" className="menu-raytrace-faint" />

        <circle cx="15" cy="48" r="1.7" className="menu-raytrace-edge-hit" />
        <circle cx="30" cy="12" r="1.7" className="menu-raytrace-edge-hit" />
        <circle cx="60" cy="34" r="1.7" className="menu-raytrace-edge-hit" />
        <circle cx="30" cy="60" r="1.7" className="menu-raytrace-edge-hit" />
      </svg>
    );
  }

  if (id === 'droplet') {
    return (
      <svg viewBox="0 0 72 72" className="menu-icon-svg" aria-hidden="true">
        <circle cx="36" cy="36" r="22" fill="none" className="menu-stroke-main" />
        <line x1="36" y1="14" x2="36" y2="58" className="menu-stroke-guide" />
        <polyline points="14,60 14,36 30,15 58,36 66,46" fill="none" className="menu-stroke-accent" />
      </svg>
    );
  }

  if (id === 'droplet2') {
    return (
      <svg viewBox="0 0 72 72" className="menu-icon-svg" aria-hidden="true">
        <polygon points="9,9 63,9 36,28" className="menu-prism-white" />
        <rect x="32" y="28" width="8" height="34" rx="2" className="menu-prism-core" />

        <polyline points="36,28 18,42 5,55" fill="none" className="menu-prism-violet" />
        <polyline points="36,28 54,42 67,55" fill="none" className="menu-prism-violet" />

        <line x1="36" y1="28" x2="7" y2="59" className="menu-prism-rainbow-b" />
        <line x1="36" y1="28" x2="4" y2="62" className="menu-prism-rainbow-g" />
        <line x1="36" y1="28" x2="2" y2="65" className="menu-prism-rainbow-y" />
        <line x1="36" y1="28" x2="0" y2="68" className="menu-prism-rainbow-o" />
        <line x1="36" y1="28" x2="-2" y2="71" className="menu-prism-rainbow-r" />

        <line x1="36" y1="28" x2="65" y2="59" className="menu-prism-rainbow-b" />
        <line x1="36" y1="28" x2="68" y2="62" className="menu-prism-rainbow-g" />
        <line x1="36" y1="28" x2="70" y2="65" className="menu-prism-rainbow-y" />
        <line x1="36" y1="28" x2="72" y2="68" className="menu-prism-rainbow-o" />
        <line x1="36" y1="28" x2="74" y2="71" className="menu-prism-rainbow-r" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 72 72" className="menu-icon-svg" aria-hidden="true">
      <path d="M12 50 A24 24 0 0 1 60 50" fill="none" className="menu-rainbow-red" />
      <path d="M18 50 A18 18 0 0 1 54 50" fill="none" className="menu-rainbow-green" />
      <path d="M24 50 A12 12 0 0 1 48 50" fill="none" className="menu-rainbow-blue" />
    </svg>
  );
}

export function MasterMenu({ activeId, language, onLanguageChange, onPick }: MasterMenuProps) {
  const text = UI_TEXT[language];

  return (
    <>
      <div className="menu-toolbar">
        <div className="language-toggle" role="group" aria-label={text.languageLabel}>
          <button
            type="button"
            className={language === 'sv' ? 'language-btn active' : 'language-btn'}
            onClick={() => onLanguageChange('sv')}
          >
            {text.languageSwitch.sv}
          </button>
          <button
            type="button"
            className={language === 'en' ? 'language-btn active' : 'language-btn'}
            onClick={() => onLanguageChange('en')}
          >
            {text.languageSwitch.en}
          </button>
        </div>
      </div>

      <section className="menu-grid" aria-label={text.menuAriaLabel}>
        {SIMULATION_IDS.map((id) => {
          const active = id === activeId;
          return (
            <button
              key={id}
              type="button"
              className={`menu-card ${active ? 'active' : ''}`}
              onClick={() => onPick(id)}
              aria-current={active ? 'true' : undefined}
            >
              <span className={`menu-icon-wrap menu-icon-${id}`}>
                <MenuIcon id={id} />
              </span>
              <span className="menu-card-label">{text.moduleButtons[id]}</span>
            </button>
          );
        })}
      </section>
    </>
  );
}
