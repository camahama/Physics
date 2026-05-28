import { useMemo, useState } from 'react';
import { RaytraceSimulation } from '../../simulations/raytrace/raytraceSimulation';
import { useUiText } from '../../app/i18n';
import { UI_PARAMS } from '../../app/uiParams';
import { SimulationHeader } from './SimulationHeader';

const sim = new RaytraceSimulation();

function intensityToOpacity(intensity: number): number {
  return Math.min(1, Math.max(0.08, Math.sqrt(intensity)));
}

export function RaytracePanel() {
  const text = useUiText().modules.raytrace;
  const [sourceXOffset, setSourceXOffset] = useState(sim.getState().sourceXOffset);
  const [radius, setRadius] = useState(sim.getState().radius);
  const [dragging, setDragging] = useState(false);

  const snapshot = useMemo(() => {
    sim.setSourceXOffset(sourceXOffset);
    sim.setRadius(radius);
    return sim.compute();
  }, [sourceXOffset, radius]);

  const offsetFromPointer = (evt: React.PointerEvent<SVGElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * 1000;
    return x - 500;
  };

  return (
    <section className="panel">
      <SimulationHeader title={text.title} lead={text.lead} />

      <div className="controls">
        <p className="panel-lead" style={{ margin: 0 }}>{text.dragHint}</p>
      </div>

      <div className="prism-canvas-wrap raytrace-wrap">
        <svg
          viewBox="0 0 1000 520"
          className={dragging ? 'prism-canvas drag-hidden-cursor' : 'prism-canvas'}
          role="img"
          aria-label={text.canvasAria}
          onPointerDown={(e) => {
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            setSourceXOffset(offsetFromPointer(e));
          }}
          onPointerMove={(e) => {
            if (!dragging) {
              return;
            }
            setSourceXOffset(offsetFromPointer(e));
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            setDragging(false);
          }}
          onPointerLeave={() => setDragging(false)}
        >
          <rect x="0" y="0" width="1000" height="520" fill="#0a1017" />

          <circle
            cx={snapshot.center.x}
            cy={snapshot.center.y}
            r={snapshot.radius}
            fill="rgba(40, 60, 95, 0.35)"
            stroke="rgba(140, 190, 240, 0.78)"
            strokeWidth={2}
          />

          {snapshot.segments.map((seg, index) => (
            <line
              key={`${index}-${seg.start.x.toFixed(2)}`}
              className="additive-ray"
              x1={seg.start.x}
              y1={seg.start.y}
              x2={seg.end.x}
              y2={seg.end.y}
              stroke="rgb(255,245,210)"
              strokeWidth={2.8}
              strokeLinecap="round"
              opacity={intensityToOpacity(seg.intensity)}
            />
          ))}

          <circle
            cx={snapshot.source.x}
            cy={508}
            r={18}
            fill="transparent"
          />
          <circle
            cx={snapshot.source.x}
            cy={508}
            r={7}
            fill="#fff8cc"
            stroke="#ffffff"
            strokeWidth={1}
          />
        </svg>

        <div className="raytrace-corner-control">
          <label>
            <span>{text.size} {radius.toFixed(0)}</span>
            <input
              type="range"
              min={UI_PARAMS.raytrace.radiusRange.min}
              max={UI_PARAMS.raytrace.radiusRange.max}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
