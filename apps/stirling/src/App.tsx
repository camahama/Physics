import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent, PointerEvent as ReactPointerEvent, ReactNode, SyntheticEvent } from "react";
import { messages, type Locale } from "./i18n/messages";
import { normalizeWhiteboardImage, type Point as OutlinePoint } from "./utils/normalizeImage";

type Point = {
  x: number;
  y: number;
};

type ClickTarget = "max" | "min" | null | "corner";
type CornerPoint = { x: number; y: number };

const CLOSE_RADIUS = 18;
const SEGMENT_HIT_DISTANCE = 14;
const DEFAULT_IMAGE_SIZE = 1000;
const DEFAULT_IMAGE_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${DEFAULT_IMAGE_SIZE}" height="${DEFAULT_IMAGE_SIZE}" viewBox="0 0 ${DEFAULT_IMAGE_SIZE} ${DEFAULT_IMAGE_SIZE}"><rect width="${DEFAULT_IMAGE_SIZE}" height="${DEFAULT_IMAGE_SIZE}" fill="white"/></svg>`
)}`;

export function App() {
  const [locale, setLocale] = useState<Locale>("sv");
  const [printLayout, setPrintLayout] = useState(false);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(DEFAULT_IMAGE_DATA_URL);
  const [normalizedImageUrl, setNormalizedImageUrl] = useState<string | null>(DEFAULT_IMAGE_DATA_URL);
  const [imageSize, setImageSize] = useState<Point | null>(null);

  const [deltaV, setDeltaV] = useState<string>("1");
  const [volumeRatio, setVolumeRatio] = useState<string>("2");
  const [pMax, setPMax] = useState<string>("1");
  const [pMin, setPMin] = useState<string>("0");
  const [maxPoint, setMaxPoint] = useState<Point | null>(null);
  const [minPoint, setMinPoint] = useState<Point | null>(null);
  const [clickTarget, setClickTarget] = useState<ClickTarget>(null);

  const [cornerPoints, setCornerPoints] = useState<CornerPoint[]>([]);
  const [cornerStepActive, setCornerStepActive] = useState(false);
  const [draggingCornerIndex, setDraggingCornerIndex] = useState<number | null>(null);

  const [contourPoints, setContourPoints] = useState<OutlinePoint[]>([]);
  const [contourStepActive, setContourStepActive] = useState(false);
  const [contourClosed, setContourClosed] = useState(false);
  const [draggingContourIndex, setDraggingContourIndex] = useState<number | null>(null);
  const [stirlingEnabled, setStirlingEnabled] = useState(false);
  const [tCold, setTCold] = useState<string>("300");
  const [tHot, setTHot] = useState<string>("400");

  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedObjectUrlRef = useRef<string | null>(null);

  const t = useMemo(() => messages[locale], [locale]);
  const hasCustomImage =
    sourceImageUrl !== DEFAULT_IMAGE_DATA_URL || normalizedImageUrl !== DEFAULT_IMAGE_DATA_URL;
  const previewImageUrl = normalizedImageUrl ?? sourceImageUrl;
  const appliedScale = useMemo(
    () => deriveAppliedScale(deltaV, volumeRatio, pMin, pMax),
    [deltaV, volumeRatio, pMin, pMax]
  );
  const outlinePoints = contourClosed ? contourPoints : [];
  const orderedCornerPoints = cornerPoints.length === 4 ? orderCornersForQuad(cornerPoints) : cornerPoints;
  const imageWidth = imageSize?.x || 1;
  const imageHeight = imageSize?.y || 1;
  const hasImageSize = Boolean(imageSize && imageSize.x > 1 && imageSize.y > 1);
  const plotPadding = useMemo(
    () => ({
      left: Math.max(54, Math.round(imageWidth * 0.055)),
      right: Math.max(10, Math.round(imageWidth * 0.012)),
      top: Math.max(28, Math.round(imageHeight * 0.035)),
      bottom: Math.max(72, Math.round(imageHeight * 0.08))
    }),
    [imageWidth, imageHeight]
  );
  const plotWidth = imageWidth + plotPadding.left + plotPadding.right;
  const plotHeight = imageHeight + plotPadding.top + plotPadding.bottom;
  const plotAreaStyle = {
    position: "absolute" as const,
    left: `${(plotPadding.left / plotWidth) * 100}%`,
    top: `${(plotPadding.top / plotHeight) * 100}%`,
    width: `${(imageWidth / plotWidth) * 100}%`,
    height: `${(imageHeight / plotHeight) * 100}%`
  };

  const revokeUploadedObjectUrl = () => {
    if (uploadedObjectUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
    }
    uploadedObjectUrlRef.current = null;
  };

  useEffect(() => () => {
    revokeUploadedObjectUrl();
  }, []);

  const onImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    revokeUploadedObjectUrl();
    const nextUrl = URL.createObjectURL(file);
    uploadedObjectUrlRef.current = nextUrl;
    setImageSize(null);
    setSourceImageUrl(nextUrl);
    setNormalizedImageUrl(null);
    resetContour();
    resetCalibration();
    setCornerPoints([]);
    setCornerStepActive(false);
    event.target.value = "";
  };

  const onUploadButtonClick = () => {
    if (!fileInputRef.current) {
      return;
    }

    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const resetToDefaultImage = () => {
    revokeUploadedObjectUrl();
    setImageSize({ x: DEFAULT_IMAGE_SIZE, y: DEFAULT_IMAGE_SIZE });
    setSourceImageUrl(DEFAULT_IMAGE_DATA_URL);
    setNormalizedImageUrl(DEFAULT_IMAGE_DATA_URL);
    resetContour();
    resetCalibration();
    setCornerPoints([]);
    setCornerStepActive(false);
    setClickTarget(null);
  };

  const onNormalizeImage = () => {
    if (!sourceImageUrl || cornerPoints.length !== 4) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      const normalized = normalizeWhiteboardImage(img, orderedCornerPoints);
      setImageSize(null);
      setNormalizedImageUrl(normalized.normalizedDataUrl);
      resetContour();
      resetCalibration();
    };
    img.onerror = () => {
      setNormalizedImageUrl(sourceImageUrl);
    };
    img.src = sourceImageUrl;
  };

  const startCornerSelection = () => {
    setCornerPoints([]);
    setCornerStepActive(true);
  };

  const startContourSelection = () => {
    setContourPoints([]);
    setContourClosed(false);
    setContourStepActive(true);
    setDraggingContourIndex(null);
  };

  const selectCalibrationPoint = (target: Exclude<ClickTarget, null | "corner">) => {
    if (target === "max") {
      setMaxPoint(null);
    } else {
      setMinPoint(null);
    }
    setClickTarget(target);
  };

  const onPreviewClick = (event: MouseEvent<HTMLImageElement>) => {
    const point = getImagePoint(event, event.currentTarget, imageWidth, imageHeight);

    if (cornerStepActive) {
      if (cornerPoints.length < 4) {
        setCornerPoints([...cornerPoints, point]);
      }
      return;
    }

    if (contourStepActive) {
      handleContourClick(point);
      return;
    }

    if (!clickTarget) {
      return;
    }

    if (clickTarget === "max") {
      setMaxPoint(point);
      setClickTarget("min");
      return;
    }

    setMinPoint(point);
    setClickTarget(null);
  };

  const handleContourClick = (point: OutlinePoint) => {
    if (contourClosed) {
      const insertIndex = findSegmentInsertIndex(contourPoints, point);
      if (insertIndex >= 0) {
        const next = [...contourPoints];
        next.splice(insertIndex + 1, 0, point);
        setContourPoints(next);
      }
      return;
    }

    if (contourPoints.length >= 3 && isNearPoint(point, contourPoints[0], CLOSE_RADIUS)) {
      setContourClosed(true);
      setContourStepActive(false);
      return;
    }

    setContourPoints([...contourPoints, point]);
  };

  const onContourPointPointerDown = (event: ReactPointerEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingContourIndex(index);
  };

  const onCornerPointPointerDown = (event: ReactPointerEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingCornerIndex(index);
  };

  const onContourSegmentClick = (event: MouseEvent<SVGLineElement>, index: number) => {
    event.stopPropagation();
    if (!previewImageRef.current) {
      return;
    }

    const point = getImagePoint(event, previewImageRef.current, imageWidth, imageHeight);
    const next = [...contourPoints];
    next.splice(index + 1, 0, point);
    setContourPoints(next);
  };

  const updateDraggingContourPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingContourIndex === null || !previewImageRef.current) {
      return;
    }

    const point = getImagePoint(event, previewImageRef.current, imageWidth, imageHeight);
    const next = [...contourPoints];
    next[draggingContourIndex] = point;
    setContourPoints(next);
  };

  const updateDraggingCornerPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingCornerIndex === null || !previewImageRef.current) {
      return;
    }

    const point = getImagePoint(event, previewImageRef.current, imageWidth, imageHeight);
    const next = [...cornerPoints];
    next[draggingCornerIndex] = point;
    setCornerPoints(next);
  };

  const resetCalibration = () => {
    setDeltaV("1");
    setVolumeRatio("2");
    setPMax("1");
    setPMin("0");
    setMaxPoint(null);
    setMinPoint(null);
    setClickTarget(null);
    setCornerPoints([]);
    setCornerStepActive(false);
    setDraggingCornerIndex(null);
  };

  const resetContour = () => {
    setContourPoints([]);
    setContourClosed(false);
    setContourStepActive(false);
    setDraggingContourIndex(null);
  };

  const pixelArea = contourClosed ? polygonArea(contourPoints) : 0;
  const calibratedArea = contourClosed
    ? getCalibratedAreaMilliJoules(contourPoints, {
        vMin: appliedScale.vMin,
        vMax: appliedScale.vMax,
        pMin: appliedScale.pMin,
        pMax: appliedScale.pMax,
        topLeft: maxPoint,
        bottomRight: minPoint
      })
    : null;
  const formattedCalibratedArea =
    calibratedArea !== null ? formatLocaleNumber(calibratedArea, locale, 3) : "--";
  const formattedMeasuredWorkJ =
    calibratedArea !== null ? formatLocaleNumber(calibratedArea / 1000, locale, 4) : "--";
  const formattedDeltaV = formatDisplayInput(deltaV, locale, 4);
  const formattedVolumeRatio = formatDisplayInput(volumeRatio, locale, 4);
  const formattedPMin = formatDisplayInput(pMin, locale, 4);
  const formattedPMax = formatDisplayInput(pMax, locale, 4);
  const formattedTCold = formatDisplayInput(tCold, locale, 4);
  const formattedTHot = formatDisplayInput(tHot, locale, 4);
  const formattedDerivedVMin = formatDerivedValue(appliedScale.vMin, locale, 4);
  const formattedDerivedVMax = formatDerivedValue(appliedScale.vMax, locale, 4);
  const pMinValue = parseNumericInput(appliedScale.pMin);
  const pMaxValue = parseNumericInput(appliedScale.pMax);
  const showStirlingWarningPressure =
    stirlingEnabled && Number.isFinite(pMinValue) && Number.isFinite(pMaxValue) && pMinValue < pMaxValue / 10;
  const stirlingWarnings = [
    showStirlingWarningPressure ? t.stirlingPressureWarning : null
  ].filter(Boolean) as string[];
  const showCalibrationAxes = maxPoint && minPoint && !clickTarget;
  const calibrationOverlay = showCalibrationAxes
    ? buildCalibrationOverlay({
        width: plotWidth,
        height: plotHeight,
        imageLeft: plotPadding.left,
        imageTop: plotPadding.top,
        imageRight: plotPadding.left + imageWidth,
        imageBottom: plotPadding.top + imageHeight,
        topLeft: { x: maxPoint.x + plotPadding.left, y: maxPoint.y + plotPadding.top },
        bottomRight: { x: minPoint.x + plotPadding.left, y: minPoint.y + plotPadding.top },
        vMin: appliedScale.vMin,
        vMax: appliedScale.vMax,
        pMin: appliedScale.pMin,
        pMax: appliedScale.pMax
      })
    : null;
  const stirlingOverlayPoints =
    stirlingEnabled && showCalibrationAxes && stirlingWarnings.length === 0
      ? buildStirlingOverlayPoints({
          topLeft: maxPoint ? { x: maxPoint.x + plotPadding.left, y: maxPoint.y + plotPadding.top } : null,
          bottomRight: minPoint ? { x: minPoint.x + plotPadding.left, y: minPoint.y + plotPadding.top } : null,
          vMin: appliedScale.vMin,
          vMax: appliedScale.vMax,
          pMin: appliedScale.pMin,
          pMax: appliedScale.pMax,
          tCold,
          tHot
        })
      : [];
  const stirlingWorkJ =
    showCalibrationAxes && stirlingWarnings.length === 0
      ? getStirlingWorkJ({
          vMin: appliedScale.vMin,
          vMax: appliedScale.vMax,
          pMin: appliedScale.pMin,
          tCold,
          tHot
        })
      : null;
  const formattedStirlingWork = stirlingWorkJ !== null ? formatLocaleNumber(stirlingWorkJ, locale, 4) : "--";

  const onToggleStirling = () => {
    setStirlingEnabled((current) => {
      const next = !current;
      if (next) {
        setContourStepActive(false);
        setDraggingContourIndex(null);
      }
      return next;
    });
  };

  const onPreviewImageLoad = (event: ChangeEvent<HTMLImageElement> | MouseEvent<HTMLImageElement> | SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    const nextWidth = target.naturalWidth;
    const nextHeight = target.naturalHeight;

    if (!nextWidth || !nextHeight) {
      return;
    }

    setImageSize((current) => {
      if (current?.x === nextWidth && current?.y === nextHeight) {
        return current;
      }
      return { x: nextWidth, y: nextHeight };
    });
  };

  const previewSection = (
    <section className={`panel preview ${printLayout ? "report-preview-panel" : ""}`}>
      {previewImageUrl ? (
        hasImageSize ? (
          <div
            className={`image-wrap ${(clickTarget ? "calibration-active" : "") + (cornerStepActive ? " corners-active" : "") + (contourStepActive ? " guide-active" : "")}`}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: printLayout ? "100%" : "92%",
              aspectRatio: `${plotWidth} / ${plotHeight}`
            }}
            onPointerMove={printLayout ? undefined : (event) => {
              updateDraggingContourPoint(event);
              updateDraggingCornerPoint(event);
            }}
            onPointerUp={printLayout ? undefined : () => {
              setDraggingContourIndex(null);
              setDraggingCornerIndex(null);
            }}
            onPointerLeave={printLayout ? undefined : () => {
              setDraggingContourIndex(null);
              setDraggingCornerIndex(null);
            }}
            onPointerCancel={printLayout ? undefined : () => {
              setDraggingContourIndex(null);
              setDraggingCornerIndex(null);
            }}
          >
            <div className="image-plane" style={plotAreaStyle}>
              <img
                ref={previewImageRef}
                src={previewImageUrl}
                alt={t.previewAlt}
                draggable={false}
                onLoad={onPreviewImageLoad}
                onDragStart={(event) => event.preventDefault()}
                onClick={printLayout ? undefined : onPreviewClick}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%"
                }}
              />

            {contourClosed && !stirlingEnabled ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(255,255,255,0.26)",
                  pointerEvents: "none",
                  zIndex: 1
                }}
              />
            ) : null}

            {cornerPoints.map((pt, idx) => (
              <div
                key={`corner-${idx}`}
                style={{
                  position: "absolute",
                  left: `${(pt.x / imageWidth) * 100}%`,
                  top: `${(pt.y / imageHeight) * 100}%`,
                  width: 10,
                  height: 10,
                  background: "red",
                  borderRadius: idx === 0 ? "30%" : "50%",
                  cursor: printLayout ? "default" : "grab",
                  transform: "translate(-50%, -50%)",
                  zIndex: 10
                }}
                onPointerDown={printLayout ? undefined : (event) => onCornerPointPointerDown(event, idx)}
              />
            ))}

            {cornerPoints.length === 4 ? (
              <svg
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 9
                }}
                width={imageWidth}
                height={imageHeight}
                viewBox={`0 0 ${imageWidth} ${imageHeight}`}
              >
                <polygon
                  points={orderedCornerPoints.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                  fill="rgba(255,0,0,0.1)"
                  stroke="red"
                  strokeWidth="3"
                />
              </svg>
            ) : null}

            {!showCalibrationAxes && maxPoint ? (
              <div
                style={{
                  position: "absolute",
                  left: `${(maxPoint.x / imageWidth) * 100}%`,
                  top: `${(maxPoint.y / imageHeight) * 100}%`,
                  width: 10,
                  height: 10,
                  background: "#2e86ab",
                  border: "2px solid #f4f8fb",
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 8
                }}
              />
            ) : null}

            {!showCalibrationAxes && minPoint ? (
              <div
                style={{
                  position: "absolute",
                  left: `${(minPoint.x / imageWidth) * 100}%`,
                  top: `${(minPoint.y / imageHeight) * 100}%`,
                  width: 10,
                  height: 10,
                  background: "#2e86ab",
                  border: "2px solid #f4f8fb",
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 8
                }}
              />
            ) : null}

            {contourClosed && stirlingEnabled ? (
              <svg
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 6
                }}
                width={imageWidth}
                height={imageHeight}
                viewBox={`0 0 ${imageWidth} ${imageHeight}`}
              >
                <polygon
                  points={contourPoints.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                    fill="rgba(255,176,0,0.24)"
                    stroke="none"
                  />
                </svg>
            ) : null}

            {contourClosed && !stirlingEnabled ? (
              <svg
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 10
                }}
                width={imageWidth}
                height={imageHeight}
                viewBox={`0 0 ${imageWidth} ${imageHeight}`}
              >
                {!printLayout ? contourPoints.map((pt, idx) => {
                  const next = contourPoints[(idx + 1) % contourPoints.length];
                  return (
                    <line
                      key={`segment-hit-${idx}`}
                      x1={pt.x}
                      y1={pt.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="transparent"
                      strokeWidth="18"
                      onClick={(event) => onContourSegmentClick(event, idx)}
                    />
                  );
                }) : null}
                <polygon
                  points={contourPoints.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                  fill="rgba(255,176,0,0.08)"
                  stroke="rgba(255,176,0,0.7)"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                  pointerEvents="none"
                />
              </svg>
            ) : contourPoints.length >= 2 && !stirlingEnabled ? (
              <svg
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 10
                }}
                width={imageWidth}
                height={imageHeight}
                viewBox={`0 0 ${imageWidth} ${imageHeight}`}
              >
                <polyline
                  points={contourPoints.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                  fill="none"
                  stroke="rgba(255,176,0,0.9)"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}

            {!stirlingEnabled ? contourPoints.map((pt, idx) => (
              <div
                key={`contour-${idx}`}
                style={{
                  position: "absolute",
                  left: `${(pt.x / imageWidth) * 100}%`,
                  top: `${(pt.y / imageHeight) * 100}%`,
                  width: 10,
                  height: 10,
                  background: "#ffb000",
                  borderRadius: idx === 0 ? "30%" : "50%",
                  cursor: contourClosed && !printLayout ? "grab" : "default",
                  transform: "translate(-50%, -50%)",
                  zIndex: 11,
                  pointerEvents: contourClosed && !printLayout ? "auto" : "none"
                }}
                onPointerDown={contourClosed && !printLayout ? (event) => onContourPointPointerDown(event, idx) : undefined}
              />
            )) : null}

            {!cornerStepActive && !stirlingEnabled && outlinePoints.length >= 3 ? (
              <svg
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 8
                }}
                width={imageWidth}
                height={imageHeight}
                viewBox={`0 0 ${imageWidth} ${imageHeight}`}
              >
                <polygon
                  points={outlinePoints.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                  fill="none"
                  stroke="#d62828"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
            </div>

            {showCalibrationAxes && calibrationOverlay ? (
              <svg
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 7
                }}
                width={plotWidth}
                height={plotHeight}
                viewBox={`0 0 ${plotWidth} ${plotHeight}`}
              >
              {stirlingOverlayPoints.length >= 4 ? (
                <polygon
                  points={stirlingOverlayPoints.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                  fill="rgba(19,123,95,0.14)"
                  stroke="#137b5f"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
              ) : null}
              <defs>
                <marker
                  id="axis-arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="7"
                  refY="5"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#2e86ab" />
                </marker>
              </defs>
              <line x1={calibrationOverlay.xAxisStart.x} y1={calibrationOverlay.xAxisStart.y} x2={calibrationOverlay.xAxisEnd.x} y2={calibrationOverlay.xAxisEnd.y} stroke="rgba(255,255,255,0.9)" strokeWidth="5.5" />
              <line x1={calibrationOverlay.xAxisStart.x} y1={calibrationOverlay.xAxisStart.y} x2={calibrationOverlay.xAxisEnd.x} y2={calibrationOverlay.xAxisEnd.y} stroke="#2e86ab" strokeWidth="2.5" markerEnd="url(#axis-arrow)" />
              <line x1={calibrationOverlay.yAxisStart.x} y1={calibrationOverlay.yAxisStart.y} x2={calibrationOverlay.yAxisEnd.x} y2={calibrationOverlay.yAxisEnd.y} stroke="rgba(255,255,255,0.9)" strokeWidth="5.5" />
              <line x1={calibrationOverlay.yAxisStart.x} y1={calibrationOverlay.yAxisStart.y} x2={calibrationOverlay.yAxisEnd.x} y2={calibrationOverlay.yAxisEnd.y} stroke="#2e86ab" strokeWidth="2.5" markerEnd="url(#axis-arrow)" />
              {calibrationOverlay.xTicks.map((tick, index) => (
                <g key={`x-tick-${index}`}>
                  <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="rgba(255,255,255,0.9)" strokeWidth="4" />
                  <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="#2e86ab" strokeWidth="1.5" />
                  <text x={tick.labelX} y={tick.labelY} fill="#124559" fontSize={calibrationOverlay.tickFontSize} fontWeight="600" textAnchor="middle" stroke="rgba(255,255,255,0.92)" strokeWidth="3" paintOrder="stroke">
                    {tick.label}
                  </text>
                </g>
              ))}
              {calibrationOverlay.yTicks.map((tick, index) => (
                <g key={`y-tick-${index}`}>
                  <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="rgba(255,255,255,0.9)" strokeWidth="4" />
                  <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="#2e86ab" strokeWidth="1.5" />
                  <text x={tick.labelX} y={tick.labelY} fill="#124559" fontSize={calibrationOverlay.tickFontSize} fontWeight="600" textAnchor="end" stroke="rgba(255,255,255,0.92)" strokeWidth="3" paintOrder="stroke">
                    {tick.label}
                  </text>
                </g>
              ))}
                <text x={calibrationOverlay.xLabel.x} y={Math.min(plotHeight - 2, calibrationOverlay.xLabel.y)} fill="#124559" fontSize={calibrationOverlay.axisLabelFontSize} fontWeight="700" textAnchor="end" stroke="rgba(255,255,255,0.94)" strokeWidth="4" paintOrder="stroke">
                  <tspan fontStyle="italic">V</tspan>
                  <tspan dx="6">/ cm³</tspan>
                </text>
                <text x={calibrationOverlay.yLabel.x} y={calibrationOverlay.yLabel.y - 10} fill="#124559" fontSize={calibrationOverlay.axisLabelFontSize} fontWeight="700" textAnchor="start" stroke="rgba(255,255,255,0.94)" strokeWidth="4" paintOrder="stroke">
                  <tspan fontStyle="italic">p</tspan>
                  <tspan dx="6">/ 10</tspan>
                  <tspan dy={-calibrationOverlay.axisLabelFontSize * 0.22} fontSize={calibrationOverlay.axisLabelFontSize * 0.72}>5</tspan>
                  <tspan dy={calibrationOverlay.axisLabelFontSize * 0.22} fontSize={calibrationOverlay.axisLabelFontSize}> Pa</tspan>
                </text>
              </svg>
            ) : null}

          </div>
        ) : (
          <div
            className="image-wrap image-wrap-loading"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: printLayout ? "100%" : "92%"
            }}
          >
            <img
              ref={previewImageRef}
              src={previewImageUrl}
              alt={t.previewAlt}
              draggable={false}
              onLoad={onPreviewImageLoad}
              onDragStart={(event) => event.preventDefault()}
              style={{
                display: "block",
                width: "100%",
                height: "auto"
              }}
            />
          </div>
        )
      ) : (
        <p>{t.noImageText}</p>
      )}
    </section>
  );

  const resultPanels = (
    <section className="result-panels">
      <section className="instrument-panel-grid">
        <article className="instrument-panel">
          <div className="instrument-head">
            <span className="instrument-label">{t.pixelAreaLabel}</span>
            <HelpBadge text={t.pixelAreaHelp} />
          </div>
          <strong className="instrument-value">{pixelArea > 0 ? pixelArea.toFixed(0) : "--"}</strong>
        </article>
        <article className="instrument-panel accent-panel">
          <div className="instrument-head">
            <span className="instrument-label">{t.calibratedAreaLabel}</span>
            <HelpBadge text={t.calibratedAreaHelp} />
          </div>
          <div className="instrument-reading">
            <strong className="instrument-value">{formattedCalibratedArea}</strong>
            <span className="instrument-unit">mJ</span>
          </div>
        </article>
      </section>
    </section>
  );

  return (
    <main className={`app-shell ${printLayout ? "print-layout" : ""}`}>
      <header className="hero">
        <div className="hero-topbar">
          <div>
            <h1>{t.appTitle}</h1>
            {!printLayout ? <p>{t.appSubtitle}</p> : null}
          </div>
          <div className="header-actions">
            {!printLayout ? (
              <div className="language-toggle" role="group" aria-label={t.languageLabel}>
                <button
                  type="button"
                  className={`language-toggle-button ${locale === "sv" ? "active" : ""}`}
                  onClick={() => setLocale("sv")}
                  aria-pressed={locale === "sv"}
                >
                  SV
                </button>
                <button
                  type="button"
                  className={`language-toggle-button ${locale === "en" ? "active" : ""}`}
                  onClick={() => setLocale("en")}
                  aria-pressed={locale === "en"}
                >
                  EN
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="action-button compact-button layout-switch-button"
              onClick={() => setPrintLayout((current) => !current)}
              aria-pressed={printLayout}
              aria-label={t.printLayoutLabel}
            >
              {printLayout ? t.workflowLayoutButton : t.printLayoutButton}
            </button>
          </div>
        </div>
      </header>
      {printLayout ? (
        <section className="panel report-paper">
          <section className="report-section">
            <div className="report-heading-row">
              <h2>{t.reportValuesTitle}</h2>
            </div>
            <div className="report-values-grid">
              <article className="report-values-card">
                <h3>{t.reportEnteredTitle}</h3>
                <dl className="report-definition-list">
                  <div><dt><ReportVariableLabel symbol="ΔV" /></dt><dd><ReportValue value={formattedDeltaV} unit={<ReportUnitLabel text="cm³" />} /></dd></div>
                  <div><dt><ReportVariableLabel symbol="r" italic /></dt><dd><ReportValue value={formattedVolumeRatio} /></dd></div>
                  <div><dt><ReportVariableLabel symbol="p" subscript="min" /></dt><dd><ReportValue value={formattedPMin} unit={<ReportUnitLabel text="· 10^5 Pa" />} /></dd></div>
                  <div><dt><ReportVariableLabel symbol="p" subscript="max" /></dt><dd><ReportValue value={formattedPMax} unit={<ReportUnitLabel text="· 10^5 Pa" />} /></dd></div>
                  <div><dt><ReportVariableLabel symbol="T" subscript={locale === "en" ? "cold" : "kall"} /></dt><dd><ReportValue value={formattedTCold} unit={<ReportUnitLabel text="K" />} /></dd></div>
                  <div><dt><ReportVariableLabel symbol="T" subscript={locale === "en" ? "hot" : "varm"} /></dt><dd><ReportValue value={formattedTHot} unit={<ReportUnitLabel text="K" />} /></dd></div>
                </dl>
              </article>
              <article className="report-values-card">
                <h3>{t.reportCalculatedTitle}</h3>
                <dl className="report-definition-list">
                  <div><dt><ReportVariableLabel symbol="V" subscript="min" /></dt><dd><ReportValue value={formattedDerivedVMin} unit={<ReportUnitLabel text="cm³" />} /></dd></div>
                  <div><dt><ReportVariableLabel symbol="V" subscript="max" /></dt><dd><ReportValue value={formattedDerivedVMax} unit={<ReportUnitLabel text="cm³" />} /></dd></div>
                  <div><dt>{t.reportPixelAreaLabel}</dt><dd><ReportValue value={pixelArea > 0 ? pixelArea.toFixed(0) : "--"} /></dd></div>
                  <div><dt>{t.reportMeasuredWorkLabel}</dt><dd><ReportValue value={formattedMeasuredWorkJ} unit={<ReportUnitLabel text="J" />} /></dd></div>
                  <div><dt>{t.reportIdealWorkLabel}</dt><dd><ReportValue value={formattedStirlingWork} unit={<ReportUnitLabel text="J" />} /></dd></div>
                </dl>
              </article>
            </div>
          </section>

          <section className="report-section report-figure-section">
            <div className="report-heading-row">
              <h2>{t.reportImageTitle}</h2>
            </div>
            {previewSection}
          </section>
        </section>
      ) : (
        <>
      <section className="panel controls">
        <div className="workflow-step">
          <div className="step-inline">
            <div className="step-heading">
              <h2>{t.step1Title}</h2>
              <HelpBadge text={t.uploadHelp} />
            </div>
            <div className="inline-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onImageSelected}
                className="visually-hidden"
              />
              <button
                type="button"
                className="action-button compact-button prominent-button"
                onClick={hasCustomImage ? resetToDefaultImage : onUploadButtonClick}
              >
                {hasCustomImage ? t.clearImageLabel : t.uploadLabel}
              </button>
            </div>
          </div>
        </div>

        <div className="workflow-step">
          <div className="step-inline">
            <div className="step-heading">
              <h2>{t.step2Title}</h2>
              <HelpBadge text={t.rectifyHelp} />
            </div>
            <div className="button-row tight-row">
              <button
                type="button"
                className={`action-button compact-button ${cornerStepActive ? "active-tool-button" : ""}`}
                onClick={startCornerSelection}
                disabled={!sourceImageUrl || Boolean(normalizedImageUrl)}
              >
                {cornerStepActive ? t.restartCornersButton : t.startCornersButton}
              </button>
              <button
                type="button"
                className={`action-button compact-button ${cornerPoints.length === 4 ? "ready-button" : ""}`}
                onClick={onNormalizeImage}
                disabled={!sourceImageUrl || cornerPoints.length !== 4}
              >
                {t.rectifyButton}
              </button>
            </div>
          </div>
        </div>

        <div className="workflow-step">
          <div className="step-inline align-start">
            <div className="step-heading">
              <h2>{t.step3Title}</h2>
              <HelpBadge text={t.calibrationHelp} />
            </div>
          </div>

          <div className="calibration-row">
            <div className="calibration-grid">
              <div className="field-row compact-field">
                <label htmlFor="delta-v"><DeltaVariable symbol="V" /> <Unit text="cm3" /></label>
                <input id="delta-v" type="text" inputMode="decimal" value={deltaV} onChange={(event) => setDeltaV(event.target.value)} />
              </div>
              <div className="field-row compact-field">
                <label htmlFor="p-min"><Variable symbol="p" subscript="min" /> <Unit text="10^5 Pa" /></label>
                <input id="p-min" type="text" inputMode="decimal" value={pMin} onChange={(event) => setPMin(event.target.value)} />
              </div>
              <div className="field-row compact-field">
                <label htmlFor="volume-ratio"><em>r</em> = <Variable symbol="V" subscript="max" /> / <Variable symbol="V" subscript="min" /></label>
                <input id="volume-ratio" type="text" inputMode="decimal" value={volumeRatio} onChange={(event) => setVolumeRatio(event.target.value)} />
              </div>
              <div className="field-row compact-field">
                <label htmlFor="p-max"><Variable symbol="p" subscript="max" /> <Unit text="10^5 Pa" /></label>
                <input id="p-max" type="text" inputMode="decimal" value={pMax} onChange={(event) => setPMax(event.target.value)} />
              </div>
            </div>
            <div className="calibration-button-stack">
              <button
                type="button"
                className={`action-button compact-button ${clickTarget === "max" ? "active-tool-button" : ""}`}
                onClick={() => selectCalibrationPoint("max")}
                disabled={!normalizedImageUrl}
              >
                <Variable symbol="V" subscript="min" />, <Variable symbol="p" subscript="max" />
              </button>
              <button
                type="button"
                className={`action-button compact-button ${clickTarget === "min" ? "active-tool-button" : ""}`}
                onClick={() => selectCalibrationPoint("min")}
                disabled={!normalizedImageUrl}
              >
                <Variable symbol="V" subscript="max" />, <Variable symbol="p" subscript="min" />
              </button>
            </div>
          </div>
        </div>

        <div className="workflow-step">
          <div className="step-inline align-start">
            <div className="step-heading">
              <h2>{t.step4Title}</h2>
              <HelpBadge text={t.contourHelp} />
            </div>
            <div className="button-row tight-row">
              <button
                type="button"
                className={`action-button compact-button ${contourStepActive ? "active-tool-button" : ""}`}
                onClick={startContourSelection}
                disabled={!showCalibrationAxes || stirlingEnabled}
              >
                {contourPoints.length > 0 ? t.restartContourButton : t.startContourButton}
              </button>
            </div>
          </div>
        </div>

        <div className="workflow-step">
          <div className="step-inline align-start">
            <div className="step-heading">
              <h2>{t.step5Title}</h2>
              <HelpBadge text={t.stirlingHelp} />
            </div>
            <div className="language-toggle" role="group" aria-label={t.step5Title}>
              <button
                type="button"
                className={`language-toggle-button ${!stirlingEnabled ? "active" : ""}`}
                onClick={() => stirlingEnabled && onToggleStirling()}
                disabled={!showCalibrationAxes}
                aria-pressed={!stirlingEnabled}
              >
                {t.stirlingOffLabel}
              </button>
              <button
                type="button"
                className={`language-toggle-button ${stirlingEnabled ? "active" : ""}`}
                onClick={() => !stirlingEnabled && onToggleStirling()}
                disabled={!showCalibrationAxes}
                aria-pressed={stirlingEnabled}
              >
                {t.stirlingOnLabel}
              </button>
            </div>
          </div>
          <div className="stirling-row">
            <div className="field-row compact-field">
              <label htmlFor="t-cold"><Variable symbol="T" subscript={locale === "en" ? "cold" : "kall"} /> <Unit text="K" /></label>
              <input
                id="t-cold"
                type="text"
                inputMode="decimal"
                value={tCold}
                onChange={(event) => setTCold(event.target.value)}
                disabled={!showCalibrationAxes}
              />
            </div>
            <div className="field-row compact-field">
              <label htmlFor="t-hot"><Variable symbol="T" subscript={locale === "en" ? "hot" : "varm"} /> <Unit text="K" /></label>
              <input
                id="t-hot"
                type="text"
                inputMode="decimal"
                value={tHot}
                onChange={(event) => setTHot(event.target.value)}
                disabled={!showCalibrationAxes}
              />
            </div>
            {stirlingEnabled ? (
              <div className="stirling-readout">
                <span className="stirling-readout-label">{t.stirlingWorkLabel}</span>
                <strong className="stirling-readout-value">{stirlingWorkJ !== null ? formatSigJ(stirlingWorkJ, locale) : "--"}</strong>
              </div>
            ) : null}
          </div>
          {stirlingWarnings.length > 0 ? (
            <div className="warning-stack">
              {stirlingWarnings.map((warning) => (
                <p key={warning} className="warning-text">{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="visual-column">
        {previewSection}
        {resultPanels}
      </div>
        </>
      )}

      <footer className="app-footer">
        <small>{t.copyrightText}</small>
      </footer>
    </main>
  );
}

type AxisTick = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  labelX: number;
  labelY: number;
};

type CalibrationOverlay = {
  xAxisStart: Point;
  xAxisEnd: Point;
  yAxisStart: Point;
  yAxisEnd: Point;
  xLabel: Point;
  yLabel: Point;
  xTicks: AxisTick[];
  yTicks: AxisTick[];
  tickFontSize: number;
  axisLabelFontSize: number;
};

function buildCalibrationOverlay(input: {
  width: number;
  height: number;
  imageLeft: number;
  imageTop: number;
  imageRight: number;
  imageBottom: number;
  topLeft: Point;
  bottomRight: Point;
  vMin: string;
  vMax: string;
  pMin: string;
  pMax: string;
}): CalibrationOverlay {
  const vMinValue = parseNumericInput(input.vMin);
  const vMaxValue = parseNumericInput(input.vMax);
  const pMinValue = parseNumericInput(input.pMin);
  const pMaxValue = parseNumericInput(input.pMax);

  const xAxisStart = {
    x: input.imageLeft,
    y: input.imageBottom
  };
  const xAxisEnd = {
    x: input.imageRight,
    y: input.imageBottom
  };
  const yAxisStart = {
    x: input.imageLeft,
    y: input.imageBottom
  };
  const yAxisEnd = {
    x: input.imageLeft,
    y: input.imageTop
  };
  const widthPixels = input.bottomRight.x - input.topLeft.x;
  const heightPixels = input.bottomRight.y - input.topLeft.y;
  const xAxisStartValue =
    Math.abs(widthPixels) > 1e-9
      ? vMinValue + (xAxisStart.x - input.topLeft.x) * ((vMaxValue - vMinValue) / widthPixels)
      : vMinValue;
  const xAxisEndValue =
    Math.abs(widthPixels) > 1e-9
      ? vMinValue + (xAxisEnd.x - input.topLeft.x) * ((vMaxValue - vMinValue) / widthPixels)
      : vMaxValue;
  const yAxisTopValue =
    Math.abs(heightPixels) > 1e-9
      ? pMaxValue + (yAxisEnd.y - input.topLeft.y) * ((pMinValue - pMaxValue) / heightPixels)
      : pMaxValue;
  const yAxisBottomValue =
    Math.abs(heightPixels) > 1e-9
      ? pMaxValue + (yAxisStart.y - input.topLeft.y) * ((pMinValue - pMaxValue) / heightPixels)
      : pMinValue;

  const xTicks = buildNumericAxisTicks({
    axis: "x",
    start: xAxisStart.x,
    end: xAxisEnd.x,
    fixed: xAxisStart.y,
    valueStart: xAxisStartValue,
    valueEnd: xAxisEndValue
  });
  const yTicks = buildNumericAxisTicks({
    axis: "y",
    start: yAxisEnd.y,
    end: yAxisStart.y,
    fixed: yAxisStart.x,
    valueStart: yAxisTopValue,
    valueEnd: yAxisBottomValue
  });
  const tickFontSize = Math.max(20, Math.min(34, input.width * 0.02));
  const axisLabelFontSize = Math.max(20, Math.min(36, input.width * 0.02));

  return {
    xAxisStart,
    xAxisEnd,
    yAxisStart,
    yAxisEnd,
    xLabel: { x: xAxisEnd.x + 7, y: xAxisEnd.y + 55 },
    yLabel: { x: yAxisEnd.x - 45, y: yAxisEnd.y + 0 },
    xTicks,
    yTicks,
    tickFontSize,
    axisLabelFontSize
  };
}

function buildNumericAxisTicks(input: {
  axis: "x" | "y";
  start: number;
  end: number;
  fixed: number;
  valueStart: number;
  valueEnd: number;
}): AxisTick[] {
  const tickValues = createNiceTickValues(input.valueStart, input.valueEnd, input.axis === "x" ? 4 : 4);

  return tickValues.map((value) => {
    const t = valueToInterpolation(value, input.valueStart, input.valueEnd);

    if (input.axis === "x") {
      const x = input.start + (input.end - input.start) * t;
      return {
        x1: x,
        y1: input.fixed - 8,
        x2: x,
        y2: input.fixed + 8,
        label: formatTickValue(value),
        labelX: x,
        labelY: input.fixed + 34
      };
    }

    const y = input.start + (input.end - input.start) * t;
    return {
      x1: input.fixed - 8,
      y1: y,
      x2: input.fixed + 8,
      y2: y,
      label: formatTickValue(value),
      labelX: input.fixed - 22,
      labelY: y + 5
    };
  });
}

function formatTickValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Math.abs(value) >= 10 || Number.isInteger(value)) {
    return value.toFixed(0);
  }
  return value.toFixed(1).replace(/\.?0+$/, "");
}

function valueToInterpolation(value: number, startValue: number, endValue: number): number {
  const span = endValue - startValue;
  if (!Number.isFinite(span) || Math.abs(span) < 1e-9) {
    return 0;
  }
  return (value - startValue) / span;
}

function createNiceTickValues(startValue: number, endValue: number, maxTickCount: number): number[] {
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
    return [0];
  }

  if (Math.abs(endValue - startValue) < 1e-9) {
    return [startValue];
  }

  const ascending = endValue > startValue;
  const minValue = ascending ? startValue : endValue;
  const maxValue = ascending ? endValue : startValue;
  const rawStep = (maxValue - minValue) / Math.max(2, maxTickCount);
  const baseStep = getNiceStep(rawStep);
  const candidateSteps = Array.from(
    new Set([baseStep / 2, baseStep, baseStep * 2].filter((step) => Number.isFinite(step) && step > 0))
  ).sort((a, b) => a - b);

  let bestTicks: number[] = [];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const step of candidateSteps) {
    const firstTick = Math.ceil(minValue / step) * step;
    const lastTick = Math.floor(maxValue / step) * step;
    const ticks: number[] = [];

    for (let value = firstTick; value <= lastTick + step * 0.5; value += step) {
      ticks.push(roundToNicePrecision(value, step));
    }

    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => ascending ? a - b : b - a);
    const count = uniqueTicks.length;
    const score = count >= 3 && count <= 5 ? Math.abs(count - maxTickCount) : Math.abs(count - 4) + 10;

    if (score < bestScore) {
      bestScore = score;
      bestTicks = uniqueTicks;
    }
  }

  if (bestTicks.length >= 3 && bestTicks.length <= 5) {
    return bestTicks;
  }

  const fallbackStep = getNiceStep((maxValue - minValue) / 3);
  const midValue = roundToNicePrecision((minValue + maxValue) / 2, fallbackStep);
  return ascending
    ? [roundToNicePrecision(minValue + fallbackStep, fallbackStep), midValue, roundToNicePrecision(maxValue - fallbackStep, fallbackStep)]
    : [roundToNicePrecision(maxValue - fallbackStep, fallbackStep), midValue, roundToNicePrecision(minValue + fallbackStep, fallbackStep)];
}

function getNiceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(Math.abs(rawStep)));
  const fraction = Math.abs(rawStep) / 10 ** exponent;

  let niceFraction = 1;
  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
}

function roundToNicePrecision(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number(value.toFixed(Math.min(6, decimals)));
}

function formatLocaleNumber(value: number, locale: Locale, maximumFractionDigits: number): string {
  return new Intl.NumberFormat(locale === "sv" ? "sv-SE" : "en-US", {
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

function formatDisplayInput(value: string, locale: Locale, maximumFractionDigits: number): string {
  const parsed = parseNumericInput(value);
  if (!Number.isFinite(parsed)) {
    return value || "--";
  }

  return new Intl.NumberFormat(locale === "sv" ? "sv-SE" : "en-US", {
    maximumFractionDigits
  }).format(parsed);
}

function formatDerivedValue(value: string, locale: Locale, maximumFractionDigits: number): string {
  const parsed = parseNumericInput(value);
  if (!Number.isFinite(parsed)) {
    return "--";
  }

  return new Intl.NumberFormat(locale === "sv" ? "sv-SE" : "en-US", {
    maximumFractionDigits
  }).format(parsed);
}

function orderCornersForQuad(points: Point[]): Point[] {
  if (points.length !== 4) {
    return points;
  }

  const center = points.reduce(
    (acc, point) => ({ x: acc.x + point.x / 4, y: acc.y + point.y / 4 }),
    { x: 0, y: 0 }
  );

  const clockwise = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });

  const topLeftIndex = clockwise.reduce((bestIndex, point, index, array) => {
    const bestPoint = array[bestIndex];
    return point.x + point.y < bestPoint.x + bestPoint.y ? index : bestIndex;
  }, 0);

  const rotated = clockwise.slice(topLeftIndex).concat(clockwise.slice(0, topLeftIndex));
  const signedArea = rotated.reduce((area, point, index) => {
    const next = rotated[(index + 1) % rotated.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2;

  return signedArea < 0 ? [rotated[0], rotated[3], rotated[2], rotated[1]] : rotated;
}

function HelpBadge({ text }: { text: string }) {
  return (
    <span className="help-badge" tabIndex={0} aria-label={text}>
      ?
      <span className="help-tooltip" role="tooltip">{text}</span>
    </span>
  );
}

function Variable({ symbol, subscript }: { symbol: string; subscript: string }) {
  return (
    <span className="scientific-label">
      <em>{symbol}</em>
      <sub>{subscript}</sub>
    </span>
  );
}

function DeltaVariable({ symbol }: { symbol: string }) {
  return (
    <span className="scientific-label">
      <span>Δ</span>
      <em>{symbol}</em>
    </span>
  );
}

function Unit({ text }: { text: string }) {
  if (text === "cm3") {
    return <span className="unit-label">/ cm³</span>;
  }

  if (text === "10^5 Pa") {
    return <span className="unit-label">/ 10⁵ Pa</span>;
  }

  if (text === "K") {
    return <span className="unit-label">/ K</span>;
  }

  return <span className="unit-label">/ {text}</span>;
}

function ReportVariableLabel({
  symbol,
  subscript,
  italic = true
}: {
  symbol: string;
  subscript?: string;
  italic?: boolean;
}) {
  if (symbol === "ΔV") {
    return (
      <math className="report-math" aria-label="Delta V">
        <mrow>
          <mi mathvariant="normal">Δ</mi>
          <mi>V</mi>
        </mrow>
      </math>
    );
  }

  if (subscript) {
    return (
      <math className="report-math" aria-label={`${symbol} ${subscript}`}>
        <msub>
          <mi mathvariant={italic ? "italic" : "normal"}>{symbol}</mi>
          <mtext>{subscript}</mtext>
        </msub>
      </math>
    );
  }

  return (
    <math className="report-math" aria-label={symbol}>
      <mi mathvariant={italic ? "italic" : "normal"}>{symbol}</mi>
    </math>
  );
}

function ReportUnitLabel({ text }: { text: string }) {
  if (text === "cm³") {
    return (
      <msup>
        <mtext>cm</mtext>
        <mn>3</mn>
      </msup>
    );
  }

  if (text === "· 10^5 Pa") {
    return (
      <mrow>
        <mo>&#x00B7;</mo>
        <msup>
          <mn>10</mn>
          <mn>5</mn>
        </msup>
        <mtext>&nbsp;Pa</mtext>
      </mrow>
    );
  }

  return <mtext>{text}</mtext>;
}

function ReportValue({ value, unit }: { value: string; unit?: ReactNode }) {
  if (!unit) {
    return (
      <math className="report-value-math" aria-label={value}>
        <mtext>{value}</mtext>
      </math>
    );
  }

  return (
    <math className="report-value-math" aria-label={`${value}`}>
      <mrow>
        <mtext>{value}</mtext>
        <mspace width="0.22em" />
        {unit}
      </mrow>
    </math>
  );
}

function getImagePoint(
  event: MouseEvent<Element> | ReactPointerEvent<Element>,
  image: HTMLImageElement,
  width: number,
  height: number
): Point {
  const rect = image.getBoundingClientRect();
  const targetWidth = width > 1 ? width : image.naturalWidth;
  const targetHeight = height > 1 ? height : image.naturalHeight;
  const relativeX = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
  const relativeY = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;
  return {
    x: clamp(relativeX * targetWidth, 0, targetWidth),
    y: clamp(relativeY * targetHeight, 0, targetHeight)
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function buildStirlingOverlayPoints(input: {
  topLeft: Point | null;
  bottomRight: Point | null;
  vMin: string;
  vMax: string;
  pMin: string;
  pMax: string;
  tCold: string;
  tHot: string;
}): Point[] {
  if (!input.topLeft || !input.bottomRight) {
    return [];
  }

  const vMin = parseNumericInput(input.vMin);
  const vMax = parseNumericInput(input.vMax);
  const pMin = parseNumericInput(input.pMin);
  const pMax = parseNumericInput(input.pMax);
  const tCold = parseNumericInput(input.tCold);
  const tHot = parseNumericInput(input.tHot);

  if (
    !Number.isFinite(vMin) ||
    !Number.isFinite(vMax) ||
    !Number.isFinite(pMin) ||
    !Number.isFinite(pMax) ||
    !Number.isFinite(tCold) ||
    !Number.isFinite(tHot) ||
    vMax <= vMin ||
    pMin <= 0 ||
    pMax <= pMin ||
    tCold <= 0 ||
    tHot <= 0
  ) {
    return [];
  }

  const ratio = tHot / tCold;
  const p1 = pMin;
  const p3 = p1 * (vMax / vMin) * ratio;
  const coldCurve: Point[] = [];
  const hotCurve: Point[] = [];
  const steps = 48;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const volumeCold = vMax - (vMax - vMin) * t;
    const coldPressure = p1 * vMax / volumeCold;
    coldCurve.push(mapPvToPlot(volumeCold, coldPressure, input.topLeft, input.bottomRight, vMin, vMax, pMin, pMax));

    const volumeHot = vMin + (vMax - vMin) * t;
    const hotPressure = p3 * vMin / volumeHot;
    hotCurve.push(mapPvToPlot(volumeHot, hotPressure, input.topLeft, input.bottomRight, vMin, vMax, pMin, pMax));
  }

  return [...coldCurve, mapPvToPlot(vMin, p3, input.topLeft, input.bottomRight, vMin, vMax, pMin, pMax), ...hotCurve.slice(1)];
}

function getStirlingWorkJ(input: {
  vMin: string;
  vMax: string;
  pMin: string;
  tCold: string;
  tHot: string;
}): number | null {
  const vMin = parseNumericInput(input.vMin);
  const vMax = parseNumericInput(input.vMax);
  const pMin = parseNumericInput(input.pMin);
  const tCold = parseNumericInput(input.tCold);
  const tHot = parseNumericInput(input.tHot);

  if (
    !Number.isFinite(vMin) ||
    !Number.isFinite(vMax) ||
    !Number.isFinite(pMin) ||
    !Number.isFinite(tCold) ||
    !Number.isFinite(tHot) ||
    vMax <= vMin ||
    pMin <= 0 ||
    tCold <= 0 ||
    tHot <= tCold
  ) {
    return null;
  }

  const nRGraphUnits = (pMin * vMax) / tCold;
  const workGraphUnits = nRGraphUnits * (tHot - tCold) * Math.log(vMax / vMin);
  return workGraphUnits * 0.1;
}

function formatSigJ(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) {
    return "--";
  }

  if (value === 0) {
    return "0 J";
  }

  const rounded = Number(value.toPrecision(4));
  const formatted = locale === "sv" ? rounded.toString().replace(".", ",") : rounded.toString();
  return `${formatted} J`;
}

function mapPvToPlot(
  volume: number,
  pressure: number,
  topLeft: Point,
  bottomRight: Point,
  vMin: number,
  vMax: number,
  pMin: number,
  pMax: number
): Point {
  const x = topLeft.x + ((volume - vMin) / (vMax - vMin)) * (bottomRight.x - topLeft.x);
  const y = topLeft.y + ((pressure - pMax) / (pMin - pMax)) * (bottomRight.y - topLeft.y);
  return { x, y };
}

function isNearPoint(a: Point, b: Point, radius: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius;
}

function findSegmentInsertIndex(points: Point[], target: Point): number {
  if (points.length < 2) {
    return -1;
  }

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    const distance = distanceToSegment(target, points[i], next);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestDistance <= SEGMENT_HIT_DISTANCE ? bestIndex : -1;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    area += points[i].x * next.y - next.x * points[i].y;
  }
  return Math.abs(area) / 2;
}

type CalibrationInputs = {
  vMin: string;
  vMax: string;
  pMin: string;
  pMax: string;
  topLeft: Point | null;
  bottomRight: Point | null;
};

function getCalibratedAreaMilliJoules(points: Point[], calibration: CalibrationInputs): number | null {
  const vMinValue = parseNumericInput(calibration.vMin);
  const vMaxValue = parseNumericInput(calibration.vMax);
  const pMinValue = parseNumericInput(calibration.pMin);
  const pMaxValue = parseNumericInput(calibration.pMax);
  const topLeft = calibration.topLeft;
  const bottomRight = calibration.bottomRight;

  if (
    !topLeft ||
    !bottomRight ||
    !Number.isFinite(vMinValue) ||
    !Number.isFinite(vMaxValue) ||
    !Number.isFinite(pMinValue) ||
    !Number.isFinite(pMaxValue)
  ) {
    return null;
  }

  const widthPixels = bottomRight.x - topLeft.x;
  const heightPixels = bottomRight.y - topLeft.y;

  if (Math.abs(widthPixels) < 1e-6 || Math.abs(heightPixels) < 1e-6) {
    return null;
  }

  const volumeScale = (vMaxValue - vMinValue) / widthPixels;
  const pressureScale = (pMinValue - pMaxValue) / heightPixels;

  if (!Number.isFinite(volumeScale) || !Number.isFinite(pressureScale)) {
    return null;
  }

  const pvArea = polygonArea(
    points.map((point) => ({
      x: vMinValue + (point.x - topLeft.x) * volumeScale,
      y: pMaxValue + (point.y - topLeft.y) * pressureScale
    }))
  );

  return pvArea * 100;
}

function parseNumericInput(value: string): number {
  const normalized = value.replace(",", ".").trim();
  if (normalized.length === 0) {
    return Number.NaN;
  }
  return Number(normalized);
}

function deriveAppliedScale(deltaV: string, volumeRatio: string, pMin: string, pMax: string) {
  const deltaVValue = parseNumericInput(deltaV);
  const ratioValue = parseNumericInput(volumeRatio);

  if (!Number.isFinite(deltaVValue) || !Number.isFinite(ratioValue) || deltaVValue <= 0 || ratioValue <= 1) {
    return {
      vMin: "",
      vMax: "",
      pMin,
      pMax
    };
  }

  return {
    vMin: String(deltaVValue / (ratioValue - 1)),
    vMax: String((deltaVValue * ratioValue) / (ratioValue - 1)),
    pMin,
    pMax
  };
}
