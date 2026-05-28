import { useEffect, useMemo, useRef, useState } from 'react';
import { PrismSimulation } from '../../simulations/prism/prismSimulation';
import type { PrismMode, Vec2 } from '../../physics/prism/engine';
import { translateSpectrumColor } from '../../app/uiText';
import { useUiText } from '../../app/i18n';
import { UI_PARAMS } from '../../app/uiParams';
import { SimulationHeader } from './SimulationHeader';

const sim = new PrismSimulation();

function pointsToSvg(points: Vec2[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function len(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  if (poly.length < 3) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function pathAtTime(points: Vec2[], tSec: number, speedAir: number, speedMedium: number, poly: Vec2[]): Vec2[] {
  if (points.length <= 1) {
    return points;
  }

  const out: Vec2[] = [points[0]];
  let tLeft = tSec;

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = len(a, b);
    if (segLen <= 1e-6) {
      continue;
    }

    const mid = lerp(a, b, 0.5);
    const inMedium = poly.length > 0 && pointInPolygon(mid, poly);
    const v = inMedium ? speedMedium : speedAir;
    const dt = segLen / Math.max(1e-6, v);

    if (tLeft >= dt) {
      out.push(b);
      tLeft -= dt;
      continue;
    }

    const f = Math.max(0, Math.min(1, tLeft / dt));
    out.push(lerp(a, b, f));
    return out;
  }

  return out;
}

function totalTravelTime(points: Vec2[], speedAir: number, speedMedium: number, poly: Vec2[]): number {
  let t = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = len(a, b);
    if (segLen <= 1e-6) {
      continue;
    }
    const mid = lerp(a, b, 0.5);
    const inMedium = poly.length > 0 && pointInPolygon(mid, poly);
    const v = inMedium ? speedMedium : speedAir;
    t += segLen / Math.max(1e-6, v);
  }
  return t;
}

export function PrismPanel() {
  const uiText = useUiText();
  const text = uiText.modules.prism;
  const [mode, setMode] = useState<PrismMode>(sim.getState().mode);
  const [incidentDeg, setIncidentDeg] = useState<number>(sim.getState().incidentDeg);
  const [colorSeparation, setColorSeparation] = useState<number>(sim.getState().colorSeparation);
  const [clockSec, setClockSec] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const raceStartMs = useRef(0);

  useEffect(() => {
    if (!running) {
      return;
    }
    if (raceStartMs.current <= 0) {
      raceStartMs.current = performance.now();
    }

    let raf = 0;
    const tick = (ts: number) => {
      setClockSec((ts - raceStartMs.current) / 1000);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [running]);

  const snapshot = useMemo(() => {
    sim.setMode(mode);
    sim.setIncidentDeg(incidentDeg);
    sim.setColorSeparation(colorSeparation);
    return sim.compute();
  }, [mode, incidentDeg, colorSeparation]);

  const description = text.modeDescriptions[mode];

  const snapAngle = (value: number): number => {
    if (Math.abs(value) <= UI_PARAMS.prism.angleSnapDeg) {
      return 0;
    }
    return value;
  };

  const baseSpeed = UI_PARAMS.prism.raceBaseSpeed;
  const mediumSpeedForBand = (n: number): number => {
    if (mode === 'air') {
      return baseSpeed;
    }
    return (baseSpeed / Math.max(1e-6, n)) * UI_PARAMS.prism.mediumSlowdownFactor;
  };
  const raceDuration = useMemo(() => {
    return snapshot.rays.reduce((acc, r) => {
      const speedMedium = mediumSpeedForBand(r.band.n);
      return Math.max(acc, totalTravelTime(r.points, baseSpeed, speedMedium, snapshot.polygon));
    }, 0.1);
  }, [snapshot, mode]);

  const loopT = raceDuration > 0 ? clockSec % (raceDuration + UI_PARAMS.prism.raceLoopTailSec) : 0;
  const activeT = Math.min(loopT, raceDuration);

  return (
    <section className="panel prism-panel">
      <SimulationHeader title={text.title} lead={text.lead} />

      <div className="controls prism-controls">
        <div className="mode-row" role="group" aria-label={text.controlsAria}>
          <button
            type="button"
            className="mode-btn"
            onClick={() => {
              raceStartMs.current = 0;
              setRunning(false);
              setStarted(false);
              setClockSec(0);
            }}
          >
            {text.clear}
          </button>
          <button
            type="button"
            className={mode === 'air' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => {
              setMode('air');
              setColorSeparation(8);
              raceStartMs.current = performance.now();
              setClockSec(0);
              setStarted(true);
              setRunning(true);
            }}
          >
            {text.air}
          </button>
          <button
            type="button"
            className={mode === 'block_straight' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => {
              setMode('block_straight');
              setColorSeparation(0);
              raceStartMs.current = performance.now();
              setClockSec(0);
              setStarted(true);
              setRunning(true);
            }}
          >
            {text.straight}
          </button>
          <button
            type="button"
            className={mode === 'block_rotated' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => {
              setMode('block_rotated');
              setColorSeparation(0);
              raceStartMs.current = performance.now();
              setClockSec(0);
              setStarted(true);
              setRunning(true);
            }}
          >
            {text.rotated}
          </button>
          <button
            type="button"
            className={mode === 'triangle' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => {
              setMode('triangle');
              setColorSeparation(0);
              raceStartMs.current = performance.now();
              setClockSec(0);
              setStarted(true);
              setRunning(true);
            }}
          >
            {text.prism}
          </button>
        </div>
      </div>

      <p className="mode-description">{description}</p>

      <div className="prism-canvas-wrap prism-wrap">
        <svg viewBox="0 0 1000 460" className="prism-canvas" role="img" aria-label={text.canvasAria}>
          <rect x="0" y="0" width="1000" height="460" fill="#0a0f14" />

          {started && snapshot.polygon.length > 0 ? (
            <polygon
              points={pointsToSvg(snapshot.polygon)}
              fill="rgba(110, 150, 190, 0.24)"
              stroke="rgba(180, 210, 240, 0.7)"
              strokeWidth={2}
            />
          ) : null}

          {started && running
            ? snapshot.rays.map((ray) => {
            const speedMedium = mediumSpeedForBand(ray.band.n);
            const partial = pathAtTime(ray.points, activeT, baseSpeed, speedMedium, snapshot.polygon);
            const head = partial[partial.length - 1];

            return (
              <g key={ray.band.name}>
                <polyline
                  className="additive-ray"
                  points={pointsToSvg(partial)}
                  fill="none"
                  stroke={ray.band.color}
                  strokeWidth={3.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {head ? <circle className="additive-ray" cx={head.x} cy={head.y} r={4} fill={ray.band.color} /> : null}
              </g>
            );
          })
            : null}
        </svg>

        <div className="prism-corner-control">
          <label>
            <span>{text.angle} {incidentDeg.toFixed(1)}°</span>
            <input
              type="range"
              min={UI_PARAMS.prism.incidentDeg.min}
              max={UI_PARAMS.prism.incidentDeg.max}
              step={UI_PARAMS.prism.incidentDeg.step}
              value={incidentDeg}
              onChange={(e) => {
                setIncidentDeg(snapAngle(Number(e.target.value)));
                raceStartMs.current = performance.now();
                setRunning(true);
                setClockSec(0);
              }}
            />
          </label>
          <label>
            <span>{text.colorSeparation} {colorSeparation.toFixed(1)}</span>
            <input
              type="range"
              min={UI_PARAMS.prism.colorSeparation.min}
              max={UI_PARAMS.prism.colorSeparation.max}
              step={UI_PARAMS.prism.colorSeparation.step}
              value={colorSeparation}
              onChange={(e) => {
                setColorSeparation(Number(e.target.value));
                raceStartMs.current = performance.now();
                setRunning(true);
                setClockSec(0);
              }}
            />
          </label>
        </div>
      </div>

      <div className="legend">
        {snapshot.rays.map((ray) => (
          <div key={ray.band.name} className="legend-item">
            <span className="swatch" style={{ backgroundColor: ray.band.color }} />
            <span>
              {translateSpectrumColor(uiText, ray.band.name)} {text.legendNPrefix}{ray.band.n.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
