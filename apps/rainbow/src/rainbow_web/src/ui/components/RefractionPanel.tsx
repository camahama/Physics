import { useEffect, useMemo, useRef, useState } from 'react';
import { useUiText } from '../../app/i18n';
import { UI_PARAMS } from '../../app/uiParams';
import { SimulationHeader } from './SimulationHeader';

const VIEW_W = UI_PARAMS.refraction.viewWidth;
const VIEW_H = UI_PARAMS.refraction.viewHeight;
const CENTER_X = VIEW_W / 2 - 20;
const CENTER_Y = VIEW_H / 2;

const BASE_WAVELENGTH = UI_PARAMS.refraction.baseWavelength;
const OMEGA = UI_PARAMS.refraction.omega;
const BEAM_SIGMA = UI_PARAMS.refraction.beamSigma;

const SAMPLE_W = UI_PARAMS.refraction.sampleWidth;
const SAMPLE_H = UI_PARAMS.refraction.sampleHeight;

type Vec2 = { x: number; y: number };

function norm(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y);
  if (l <= 1e-9) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / l, y: v.y / l };
}

function mixChannel(base: number, tint: number, weight: number): number {
  return Math.max(0, Math.min(255, Math.round(base + tint * weight)));
}

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function RefractionPanel() {
  const text = useUiText().modules.refraction;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  const [n2, setN2] = useState(1);
  const [interfaceAngleDeg, setInterfaceAngleDeg] = useState(0);

  const slope = Math.tan(degToRad(interfaceAngleDeg));

  const geometry = useMemo(() => {
    const tangent = norm({ x: slope, y: 1 });
    const normal = norm({ x: 1, y: -slope });

    const k0 = (2 * Math.PI) / BASE_WAVELENGTH;
    const k1 = { x: k0, y: 0 };

    const kt = k0 * tangent.x;
    const kGlassMag = Math.max(1e-6, n2) * k0;
    const knSq = Math.max(0, kGlassMag * kGlassMag - kt * kt);
    const kn = Math.sqrt(knSq);

    const k2 = {
      x: kt * tangent.x + kn * normal.x,
      y: kt * tangent.y + kn * normal.y,
    };

    const dir2 = norm(k2);

    return {
      tangent,
      normal,
      k1,
      k2,
      dir2,
    };
  }, [n2, slope]);

  useEffect(() => {
    lastTsRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const off = document.createElement('canvas');
    off.width = SAMPLE_W;
    off.height = SAMPLE_H;
    const offCtx = off.getContext('2d');
    if (!offCtx) {
      return;
    }

    const renderFrame = (phaseT: number) => {
      const image = offCtx.createImageData(SAMPLE_W, SAMPLE_H);
      const data = image.data;

      for (let py = 0; py < SAMPLE_H; py += 1) {
        const y = (py / (SAMPLE_H - 1)) * VIEW_H;
        const yRel = y - CENTER_Y;
        const boundaryX = slope * yRel + CENTER_X;

        for (let px = 0; px < SAMPLE_W; px += 1) {
          const x = (px / (SAMPLE_W - 1)) * VIEW_W;
          const dx = x - CENTER_X;
          const dy = y - CENTER_Y;

          const inLeftMedium = x < boundaryX;
          const phase = inLeftMedium
            ? geometry.k1.x * dx + geometry.k1.y * dy - OMEGA * phaseT
            : geometry.k2.x * dx + geometry.k2.y * dy - OMEGA * phaseT;

          const distFromBeam = inLeftMedium
            ? Math.abs(y - CENTER_Y)
            : Math.abs(dx * geometry.dir2.y - dy * geometry.dir2.x);

          const envelope = Math.exp(-(distFromBeam * distFromBeam) / (2 * BEAM_SIGMA * BEAM_SIGMA));
          const wave = 0.5 + 0.5 * Math.sin(phase);
          const glow = envelope * (0.2 + 0.8 * wave);

          const idx = (py * SAMPLE_W + px) * 4;
          const baseR = inLeftMedium ? 8 : 16;
          const baseG = inLeftMedium ? 12 : 26;
          const baseB = inLeftMedium ? 18 : 40;
          const tintR = inLeftMedium ? 30 : 58;
          const tintG = inLeftMedium ? 165 : 210;
          const tintB = inLeftMedium ? 225 : 160;

          data[idx] = mixChannel(baseR, tintR, glow);
          data[idx + 1] = mixChannel(baseG, tintG, glow);
          data[idx + 2] = mixChannel(baseB, tintB, glow);
          data[idx + 3] = 255;
        }
      }

      offCtx.putImageData(image, 0, 0);

      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, VIEW_W, VIEW_H);

      // Draw medium boundary in front of the wave field for clarity.
      const xTop = slope * (0 - CENTER_Y) + CENTER_X;
      const xBottom = slope * (VIEW_H - CENTER_Y) + CENTER_X;
      ctx.strokeStyle = 'rgba(221, 229, 242, 0.86)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(xTop, 0);
      ctx.lineTo(xBottom, VIEW_H);
      ctx.stroke();

      // Short dashed normal at the center intersection.
      const normalHalfLen = UI_PARAMS.refraction.normalHalfLen;
      const nx0 = CENTER_X - geometry.normal.x * normalHalfLen;
      const ny0 = CENTER_Y - geometry.normal.y * normalHalfLen;
      const nx1 = CENTER_X + geometry.normal.x * normalHalfLen;
      const ny1 = CENTER_Y + geometry.normal.y * normalHalfLen;
      ctx.strokeStyle = 'rgba(250, 250, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(nx0, ny0);
      ctx.lineTo(nx1, ny1);
      ctx.stroke();
      ctx.setLineDash([]);

      // Longer direction marks starting at the normal/interface intersection.
      const markerLen = UI_PARAMS.refraction.directionMarkerLen;

      const incidentDir = norm({ x: geometry.k1.x, y: geometry.k1.y });
      const refractedDir = norm(geometry.k2);

      ctx.lineWidth = 2.2;
      ctx.strokeStyle = 'rgba(140, 212, 255, 0.95)';
      ctx.beginPath();
      ctx.moveTo(CENTER_X, CENTER_Y);
      ctx.lineTo(CENTER_X - incidentDir.x * markerLen, CENTER_Y - incidentDir.y * markerLen);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(145, 255, 190, 0.95)';
      ctx.beginPath();
      ctx.moveTo(CENTER_X, CENTER_Y);
      ctx.lineTo(CENTER_X + refractedDir.x * markerLen, CENTER_Y + refractedDir.y * markerLen);
      ctx.stroke();
    };

    let raf = 0;
    const tick = (ts: number) => {
      const prev = lastTsRef.current;
      if (prev !== null) {
        const dt = Math.min(0.05, (ts - prev) / 1000);
        phaseRef.current += dt;
      }
      lastTsRef.current = ts;

      renderFrame(phaseRef.current);
      raf = window.requestAnimationFrame(tick);
    };

    renderFrame(phaseRef.current);
    raf = window.requestAnimationFrame(tick);

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [geometry, slope]);

  return (
    <section className="panel refraction-panel">
      <SimulationHeader title={text.title} lead={text.lead} />

      <div className="prism-canvas-wrap refraction-wrap">
        <canvas
          ref={canvasRef}
          className="prism-canvas"
          width={VIEW_W}
          height={VIEW_H}
          role="img"
          aria-label={text.canvasAria}
        />

        <div className="refraction-corner-control">
          <label>
            <span>{text.interfaceAngle} {fmt(interfaceAngleDeg, 1)}°</span>
            <input
              type="range"
              min={0}
              max={45}
              step={0.1}
              value={interfaceAngleDeg}
              onChange={(e) => setInterfaceAngleDeg(Number(e.target.value))}
            />
          </label>

          <label>
            <span>{text.mediumIndex} {fmt(n2, 2)}</span>
            <input type="range" min={1} max={3} step={0.01} value={n2} onChange={(e) => setN2(Number(e.target.value))} />
          </label>
        </div>
      </div>
    </section>
  );
}
