import { useEffect, useRef, useState } from 'react';
import { RainbowSimulation, type RainbowDropSample } from '../../simulations/rainbow/rainbowSimulation';
import { useUiText } from '../../app/i18n';
import { UI_PARAMS } from '../../app/uiParams';
import { SimulationHeader } from './SimulationHeader';

const sim = new RainbowSimulation();
const W = UI_PARAMS.rainbow.canvasWidth;
const H = UI_PARAMS.rainbow.canvasHeight;

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, '#2c5f87');
  sky.addColorStop(0.45, '#5d90b4');
  sky.addColorStop(1, '#a4c0cf');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const ground = ctx.createLinearGradient(0, H * 0.55, 0, H);
  ground.addColorStop(0, '#49643f');
  ground.addColorStop(1, '#273823');
  ctx.fillStyle = ground;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
}

function drawBackgroundFromImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null): void {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, W, H);
    return;
  }
  drawBackground(ctx);
}

type LayerState = {
  drops: RainbowDropSample[];
};

function previewFillColor(r: number, g: number, b: number, intensity: number): string {
  if (intensity <= 0.001) {
    return 'rgb(0,0,0)';
  }

  const iLift = Math.pow(
    Math.max(0, Math.min(1, intensity)),
    UI_PARAMS.rainbow.intensityMapping.gamma,
  );
  const kBase = iLift / (1 + UI_PARAMS.rainbow.intensityMapping.compression * iLift);
  const k = Math.min(1, kBase * UI_PARAMS.rainbow.intensityMapping.brightnessGain);
  const rr = Math.max(0, Math.min(255, Math.floor(r * k)));
  const gg = Math.max(0, Math.min(255, Math.floor(g * k)));
  const bb = Math.max(0, Math.min(255, Math.floor(b * k)));
  return `rgb(${rr}, ${gg}, ${bb})`;
}

function dropOpacity(intensity: number): number {
  return Math.max(0, Math.min(0.42, intensity * 0.42));
}

function drawFallingDrop(ctx: CanvasRenderingContext2D, drop: RainbowDropSample): void {
  const alpha = dropOpacity(drop.intensity);
  if (alpha <= 0.01) {
    return;
  }

  const length = UI_PARAMS.rainbow.rainDropLength * (drop.radius / UI_PARAMS.rainbow.rainDropRadius);
  const tailY = Math.max(drop.y - length, 0);
  const gradient = ctx.createLinearGradient(drop.x, tailY, drop.x, drop.y + drop.radius);
  gradient.addColorStop(0, `rgba(${drop.r}, ${drop.g}, ${drop.b}, 0)`);
  gradient.addColorStop(0.45, `rgba(${drop.r}, ${drop.g}, ${drop.b}, ${alpha * 0.5})`);
  gradient.addColorStop(1, `rgba(${drop.r}, ${drop.g}, ${drop.b}, ${Math.min(1, alpha * 0.95)})`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = drop.radius * 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(drop.x, tailY);
  ctx.lineTo(drop.x, drop.y + drop.radius * 0.35);
  ctx.stroke();

  ctx.fillStyle = `rgba(${drop.r}, ${drop.g}, ${drop.b}, ${Math.min(1, alpha)})`;
  ctx.beginPath();
  ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
  ctx.fill();
}

export function RainbowPanel() {
  const text = useUiText().modules.rainbow;
  const [ui, setUi] = useState(sim.uiState());
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<LayerState | null>(null);
  const draggingRef = useRef(false);
  const previewRef = useRef<{ x: number; y: number } | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    layerRef.current = {
      drops: [],
    };

    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}landscape.jpg`;
    img.onload = () => {
      bgImageRef.current = img;
    };
    img.onerror = () => {
      bgImageRef.current = null;
    };

    const raf = { id: 0 };
    let lastUi = 0;
    let lastTs = 0;

    const draw = (ts: number) => {
      const layerState = layerRef.current;
      const deltaMs = lastTs > 0 ? ts - lastTs : 16.67;
      lastTs = ts;

      if (layerState) {
        layerState.drops = sim.rainTick(deltaMs);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && layerState) {
        drawBackgroundFromImage(ctx, bgImageRef.current);

        for (const drop of layerState.drops) {
          drawFallingDrop(ctx, drop);
        }

        const preview = previewRef.current;
        if (preview) {
          const p = sim.previewDrop(preview.x, preview.y);
          const col = previewFillColor(p.r, p.g, p.b, Math.min(1, p.intensity * 2));
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1.2;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(preview.x, preview.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      if (ts - lastUi > 120) {
        lastUi = ts;
        setUi(sim.uiState());
      }

      raf.id = window.requestAnimationFrame(draw);
    };

    raf.id = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf.id);
  }, []);

  const mapToScene = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = H / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  };

  const drawManual = (x: number, y: number, boost: boolean) => {
    const d = sim.manualDrop(x, y, boost);
    const layerState = layerRef.current;
    if (d && layerState) {
      layerState.drops = [...layerState.drops, d];
      setUi(sim.uiState());
    }
  };

  return (
    <section className="panel">
      <SimulationHeader title={text.title} lead={text.lead} />

      <div className="prism-canvas-wrap rainbow-wrap">
        <canvas
          ref={canvasRef}
          className={isDragging ? 'prism-canvas drag-hidden-cursor' : 'prism-canvas'}
          width={W}
          height={H}
          onPointerDown={(e) => {
            draggingRef.current = true;
            setIsDragging(true);
            const p = mapToScene(e);
            previewRef.current = p;
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) {
              return;
            }
            const p = mapToScene(e);
            previewRef.current = p;
          }}
          onPointerUp={() => {
            const p = previewRef.current;
            if (draggingRef.current && p) {
              drawManual(p.x, p.y, false);
            }
            draggingRef.current = false;
            setIsDragging(false);
            previewRef.current = null;
          }}
          onPointerLeave={() => {
            if (draggingRef.current && previewRef.current) {
              const p = previewRef.current;
              drawManual(p.x, p.y, false);
            }
            draggingRef.current = false;
            setIsDragging(false);
            previewRef.current = null;
          }}
          aria-label={text.canvasAria}
        />
        <div className="refraction-corner-control rainbow-corner-control">
          <label>
            <span>{text.rainIntensity}</span>
            <input
              type="range"
              min={UI_PARAMS.rainbow.rainIntensityRange.min}
              max={UI_PARAMS.rainbow.rainIntensityRange.max}
              step={UI_PARAMS.rainbow.rainIntensityRange.step}
              value={ui.rainIntensity}
              onChange={(e) => {
                sim.setRainIntensity(Number(e.target.value));
                setUi(sim.uiState());
              }}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
