import { useMemo, useState } from 'react';
import { RAINBOW_BANDS } from '../../physics/droplet/engine';
import { DropletSimulation } from '../../simulations/droplet/dropletSimulation';
import { translateSpectrumColor } from '../../app/uiText';
import { useUiText } from '../../app/i18n';
import { UI_PARAMS } from '../../app/uiParams';
import { SimulationHeader } from './SimulationHeader';

const sim = new DropletSimulation();

function toPolyline(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

export function DropletPanel() {
  const uiText = useUiText();
  const text = uiText.modules.droplet;
  const initial = sim.getState();

  const [visible, setVisible] = useState<boolean[]>(initial.visible);
  const [focusedIndex, setFocusedIndex] = useState<number>(initial.focusedIndex);
  const [showPrimary, setShowPrimary] = useState<boolean>(initial.showPrimary);
  const [showSecondary, setShowSecondary] = useState<boolean>(initial.showSecondary);
  const [radius, setRadius] = useState<number>(initial.radius);
  const [primaryU, setPrimaryU] = useState<number[]>([...initial.primaryU]);
  const [secondaryU, setSecondaryU] = useState<number[]>([...initial.secondaryU]);
  const [draggingHandle, setDraggingHandle] = useState<'primary' | 'secondary' | null>(null);

  const snapshot = useMemo(() => {
    for (let i = 0; i < visible.length; i += 1) {
      sim.setVisible(i, visible[i]);
    }
    sim.setFocusedIndex(focusedIndex);
    sim.setShowPrimary(showPrimary);
    sim.setShowSecondary(showSecondary);
    sim.setRadius(radius);
    for (let i = 0; i < primaryU.length; i += 1) {
      sim.setPrimaryU(i, primaryU[i]);
      sim.setSecondaryU(i, secondaryU[i]);
    }
    return sim.compute();
  }, [visible, focusedIndex, showPrimary, showSecondary, radius, primaryU, secondaryU]);

  const pointerToScene = (evt: React.PointerEvent<SVGSVGElement | SVGCircleElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const sx = UI_PARAMS.droplet.layoutDefaults.width / rect.width;
    const sy = UI_PARAMS.droplet.layoutDefaults.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  };

  const updateFromPointer = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingHandle) {
      return;
    }

    const p = pointerToScene(evt);
    const dxRaw = p.x - snapshot.layout.center.x;
    const clampedPrimary = Math.max(-snapshot.layout.radius * 0.995, Math.min(-1e-3, dxRaw));
    const clampedSecondary = Math.max(1e-3, Math.min(snapshot.layout.radius * 0.995, dxRaw));

    if (draggingHandle === 'primary') {
      const u = Math.max(0, Math.min(0.999, Math.abs(clampedPrimary) / (snapshot.layout.radius * 0.995)));
      const next = [...primaryU];
      next[focusedIndex] = u;
      setPrimaryU(next);
    } else {
      const u = Math.max(0, Math.min(0.999, clampedSecondary / (snapshot.layout.radius * 0.995)));
      const next = [...secondaryU];
      next[focusedIndex] = u;
      setSecondaryU(next);
    }
  };

  return (
    <section className="panel">
      <SimulationHeader title={text.title} lead={text.lead} />

      <div className="droplet-layout">
        <div className="prism-canvas-wrap">
          <svg
            viewBox="0 0 1000 560"
            className={draggingHandle ? 'prism-canvas drag-hidden-cursor' : 'prism-canvas'}
            role="img"
            aria-label={text.canvasAria}
            onPointerDown={(evt) => {
              const p = pointerToScene(evt);
              const side = p.x < snapshot.layout.center.x ? 'primary' : 'secondary';
              setDraggingHandle(side);
              if (side === 'primary') {
                setShowPrimary(true);
              } else {
                setShowSecondary(true);
              }
              evt.currentTarget.setPointerCapture(evt.pointerId);
              updateFromPointer(evt);
            }}
            onPointerMove={(evt) => updateFromPointer(evt)}
            onPointerUp={(evt) => {
              if (evt.currentTarget.hasPointerCapture(evt.pointerId)) {
                evt.currentTarget.releasePointerCapture(evt.pointerId);
              }
              setDraggingHandle(null);
            }}
            onPointerLeave={() => setDraggingHandle(null)}
          >
          <rect x="0" y="0" width="1000" height="560" fill="#111720" />
          <circle
            cx={snapshot.layout.center.x}
            cy={snapshot.layout.center.y}
            r={snapshot.layout.radius}
            fill="rgba(35, 42, 90, 0.4)"
            stroke="rgba(210, 220, 245, 0.85)"
            strokeWidth={2}
          />

          {snapshot.rays.map((ray) => {
            const band = RAINBOW_BANDS[ray.bandIndex];
            const focused = ray.bandIndex === focusedIndex;
            const width = focused ? 3.8 : 2.2;
            const opacity = focused ? 1 : 0.7;

            return (
              <g key={band.name}>
                {ray.primary?.points.length ? (
                  <polyline
                    className="additive-ray"
                    points={toPolyline(ray.primary.points)}
                    fill="none"
                    stroke={band.hex}
                    strokeWidth={width}
                    opacity={opacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {ray.secondary?.points.length ? (
                  <polyline
                    className="additive-ray"
                    points={toPolyline(ray.secondary.points)}
                    fill="none"
                    stroke={band.hex}
                    strokeWidth={width}
                    opacity={opacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="7 5"
                  />
                ) : null}
              </g>
            );
          })}

          <line
            x1={snapshot.layout.center.x}
            y1={snapshot.layout.center.y - snapshot.layout.radius - 8}
            x2={snapshot.layout.center.x}
            y2={snapshot.layout.center.y + snapshot.layout.radius + 8}
            stroke="rgba(220,220,220,0.25)"
            strokeDasharray="4 4"
          />
          </svg>
        </div>

        <aside className="droplet-controls-column">
          <div className="mode-row" role="group" aria-label={text.rayFamiliesAria}>
            <button
              type="button"
              className={showPrimary ? 'mode-btn active' : 'mode-btn'}
              onClick={() => setShowPrimary((v) => !v)}
            >
              {showPrimary ? text.primaryOn : text.primaryOff}
            </button>
            <button
              type="button"
              className={showSecondary ? 'mode-btn active' : 'mode-btn'}
              onClick={() => setShowSecondary((v) => !v)}
            >
              {showSecondary ? text.secondaryOn : text.secondaryOff}
            </button>
          </div>

          <div className="droplet-color-list" role="group" aria-label={text.colorFocusAria}>
            {RAINBOW_BANDS.map((band, idx) => (
              <div key={band.name} className={focusedIndex === idx ? 'droplet-color-row active' : 'droplet-color-row'}>
                <input
                  className="droplet-checkbox"
                  type="checkbox"
                  checked={visible[idx]}
                  onChange={(e) => {
                    const next = [...visible];
                    next[idx] = e.target.checked;
                    setVisible(next);
                    if (e.target.checked) {
                      setFocusedIndex(idx);
                    }
                  }}
                />
                <span className="swatch" style={{ backgroundColor: band.hex }} />
                <button
                  type="button"
                  className="droplet-color-name"
                  onClick={() => {
                    setFocusedIndex(idx);
                    if (!visible[idx]) {
                      const next = [...visible];
                      next[idx] = true;
                      setVisible(next);
                    }
                    if (!showPrimary && !showSecondary) {
                      setShowPrimary(true);
                    }
                  }}
                >
                  {translateSpectrumColor(uiText, band.name)}
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mode-btn"
            onClick={() => {
              sim.optimizeImpacts();
              const st = sim.getState();
              setPrimaryU([...st.primaryU]);
              setSecondaryU([...st.secondaryU]);
              setShowPrimary(st.showPrimary);
              setShowSecondary(st.showSecondary);
            }}
          >
            {text.optimalAngles}
          </button>

          <label>
            {text.radius}: <strong>{radius.toFixed(0)} {text.pxSuffix}</strong>
            <input
              type="range"
              min={UI_PARAMS.droplet.radiusRange.min}
              max={UI_PARAMS.droplet.radiusRange.max}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </label>
        </aside>
      </div>

      <div className="stats">
        <div>
          <span>{text.focusedColor}</span>
          <strong>{translateSpectrumColor(uiText, RAINBOW_BANDS[focusedIndex].name)}</strong>
        </div>
        <div>
          <span>{text.primaryDeflection}</span>
          <strong>
            {snapshot.focusedPrimaryDeviation === null ? text.notAvailable : `${snapshot.focusedPrimaryDeviation.toFixed(1)}°`}
          </strong>
        </div>
        <div>
          <span>{text.secondaryDeflection}</span>
          <strong>
            {snapshot.focusedSecondaryDeviation === null ? text.notAvailable : `${snapshot.focusedSecondaryDeviation.toFixed(1)}°`}
          </strong>
        </div>
      </div>
    </section>
  );
}
