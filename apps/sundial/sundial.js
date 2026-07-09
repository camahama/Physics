const YEAR_LENGTH = 365;
const LATITUDE_RANGE = [-89, 89];
const MONTH_TWENTY_FIRST_DAYS = [
  [1, 21], [2, 52], [3, 80], [4, 111], [5, 141], [6, 172],
  [7, 202], [8, 233], [9, 264], [10, 294], [11, 325], [12, 355],
];

export const defaultSettings = {
  kind: "horizontal",
  latitude: 59.3293,
  longitude: 18.0686,
  standardTimeOffset: 1,
  declinationFromSouth: 0,
  gnomonLength: 40,
  gnomonAngleFromPlate: 59.3293,
  gnomonDirectionFromDown: 0,
  gnomonFollowsIdeal: true,
  plateWidth: 300,
  plateHeight: 300,
  gnomonOffsetX: 0,
  gnomonOffsetY: 100,
  startHour: 8,
  endHour: 16,
  customText: formatLocationText(59.3293, 18.0686),
  monochrome: false,
  showsLegendAnalemma: true,
  legendOffsetX: 0,
  legendOffsetY: 0,
  hourNumeralStyle: "roman",
  visibleHourLabels: [8, 9, 10, 11, 12, 13, 14, 15, 16],
};

export function layout(settings) {
  const safe = sanitizeSettings(settings);
  const normal = dialNormal(safe.kind, safe.declinationFromSouth);
  const actualGnomon = gnomonVector(safe.latitude, safe);
  const gnomonAngleDegrees = radiansToDegrees(Math.asin(Math.abs(dot(normalized(actualGnomon), normal))));
  const hours = range(safe.startHour, safe.endHour);

  const analemmas = hours.map((hour) => {
    const segments = shadowSegments(safe.latitude, stride(1, YEAR_LENGTH, 3), hour, safe);
    const points = segments.flat();
    if (points.length <= 2) return null;
    const monthMarks = MONTH_TWENTY_FIRST_DAYS
      .map(([month, day]) => {
        const point = shadowPoint(safe.latitude, day, hour, safe);
        return point ? { month, point } : null;
      })
      .filter(Boolean);
    return { hour, points, segments, monthMarks };
  }).filter(Boolean);

  const halfHourAnalemmas = range(safe.startHour, safe.endHour - 1).map((hour) => {
    const clockHour = hour + 0.5;
    const segments = shadowSegments(safe.latitude, stride(80, 264, 3), clockHour, safe);
    const points = segments.flat();
    return points.length > 2 ? { hour: clockHour, points, segments } : null;
  }).filter(Boolean);

  return {
    settings: safe,
    gnomonAngleDegrees,
    analemmas,
    halfHourAnalemmas,
    outOfBoundsHours: analemmas
      .filter((analemma) => analemma.points.some((point) => !containsPoint(plateRect(safe), point)))
      .map((analemma) => analemma.hour),
  };
}

export function sanitizeSettings(settings) {
  const safe = { ...defaultSettings, ...settings };
  safe.latitude = clamp(number(safe.latitude, defaultSettings.latitude), ...LATITUDE_RANGE);
  safe.longitude = number(safe.longitude, defaultSettings.longitude);
  safe.standardTimeOffset = number(safe.standardTimeOffset, defaultSettings.standardTimeOffset);
  safe.declinationFromSouth = normalizedSignedDegrees(number(safe.declinationFromSouth, 0));
  safe.gnomonLength = Math.max(number(safe.gnomonLength, 40), 1);
  safe.gnomonAngleFromPlate = clamp(number(safe.gnomonAngleFromPlate, 45), 0.1, 89.9);
  safe.gnomonDirectionFromDown = normalizedSignedDegrees(number(safe.gnomonDirectionFromDown, 0));
  safe.plateWidth = Math.max(number(safe.plateWidth, 300), 1);
  safe.plateHeight = Math.max(number(safe.plateHeight, 300), 1);
  safe.gnomonOffsetX = number(safe.gnomonOffsetX, 0);
  safe.gnomonOffsetY = number(safe.gnomonOffsetY, 0);
  safe.startHour = clamp(Math.round(number(safe.startHour, 8)), 0, 23);
  safe.endHour = clamp(Math.round(number(safe.endHour, 16)), safe.startHour, 23);
  safe.visibleHourLabels = Array.isArray(safe.visibleHourLabels)
    ? [...new Set(safe.visibleHourLabels.map((value) => Math.round(number(value, NaN))).filter((hour) => Number.isFinite(hour) && hour >= safe.startHour && hour <= safe.endHour))].sort((a, b) => a - b)
    : range(safe.startHour, safe.endHour);
  if (!["horizontal", "vertical"].includes(safe.kind)) safe.kind = "horizontal";
  if (!["roman", "arabic"].includes(safe.hourNumeralStyle)) safe.hourNumeralStyle = "roman";
  return safe;
}

export function idealGnomonOrientation(settings) {
  const safe = sanitizeSettings(settings);
  const normal = dialNormal(safe.kind, safe.declinationFromSouth);
  const style = styleVector(safe.latitude, normal);
  const angleFromPlate = radiansToDegrees(Math.asin(Math.abs(dot(style, normal))));
  const projection = projectedPoint(style, safe.kind, safe.declinationFromSouth);
  const directionFromDown = normalizedSignedDegrees(radiansToDegrees(Math.atan2(projection.x, -projection.y)));
  return { angleFromPlate, directionFromDown };
}

export function gnomonTipProjection(settings) {
  const safe = sanitizeSettings(settings);
  const tip = mul(gnomonVector(safe.latitude, safe), safe.gnomonLength);
  const localPoint = projectedPoint(tip, safe.kind, safe.declinationFromSouth);
  return { x: localPoint.x + safe.gnomonOffsetX, y: localPoint.y + safe.gnomonOffsetY };
}

export function solarAzimuthDegrees({ latitude, longitude, standardTimeOffset, dayOfYear, clockHour }) {
  const solar = solarVector(clamp(latitude, ...LATITUDE_RANGE), longitude, standardTimeOffset, dayOfYear, clockHour);
  return normalizedDegrees(radiansToDegrees(Math.atan2(solar.x, solar.y)));
}

export function declinationFromSouthForAzimuth(azimuth) {
  return normalizedSignedDegrees(azimuth - 180);
}

export function layoutAngleForPlateEdge(azimuth) {
  return declinationFromSouthForAzimuth(azimuth);
}

export function renderSvg(dialLayout, width = 1000, height = 1000) {
  const settings = dialLayout.settings;
  const frame = plateFrame(settings, width, height);
  const scale = frame.width / settings.plateWidth;
  const rect = plateRect(settings);
  const strokeColor = "#000000";
  const markColor = settings.monochrome ? "#333333" : "#ff8a22";
  const textColor = "#333333";
  const elements = [];

  elements.push(`<title id="svgTitle">Sundial layout</title>`);
  elements.push(`<rect class="canvas" x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" rx="8" ry="8"/>`);
  if (settings.customText.trim()) {
    elements.push(`<text class="title" x="${fmt(frame.x + frame.width / 2)}" y="${fmt(frame.y + 34)}">${escapeXml(settings.customText)}</text>`);
  }
  if (settings.showsLegendAnalemma) elements.push(legendElement(settings, frame, scale));

  elements.push(`<g id="half-hour-analemmas">`);
  for (const analemma of dialLayout.halfHourAnalemmas) {
    for (const segment of analemma.segments.flatMap((points) => clippedSegments(points, rect))) {
      if (segment.length > 1) elements.push(`<path class="half-hour" d="${pathData(segment, frame, scale)}"/>`);
    }
  }
  elements.push(`</g>`);

  elements.push(`<g id="hour-analemmas">`);
  for (const analemma of dialLayout.analemmas) {
    const guide = hourGuide(analemma, settings);
    if (guide) {
      const a = svgPoint(guide.start, frame, scale);
      const b = svgPoint(guide.end, frame, scale);
      elements.push(`<line class="hour-guide" x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}"/>`);
    }

    const sourceSegments = analemma.segments.map((segment) => analemma.segments.length === 1 ? closedAnalemmaPoints(segment) : segment);
    for (const segment of sourceSegments.flatMap((points) => clippedSegments(points, rect))) {
      if (segment.length > 1) elements.push(`<path id="hour-${analemma.hour}" class="analemma" d="${pathData(segment, frame, scale)}"/>`);
    }

    for (const mark of analemma.monthMarks) {
      if (!containsPoint(rect, mark.point)) continue;
      const point = svgPoint(mark.point, frame, scale);
      const radius = mark.month === 6 || mark.month === 12 ? 3.8 : 2.6;
      elements.push(`<circle class="month-mark" cx="${fmt(point.x)}" cy="${fmt(point.y)}" r="${fmt(radius)}"/>`);
    }
  }
  elements.push(`</g>`);

  elements.push(`<g id="hour-labels">`);
  for (const analemma of dialLayout.analemmas) {
    if (!settings.visibleHourLabels.includes(analemma.hour)) continue;
    const guide = hourGuide(analemma, settings);
    if (!guide) continue;
    const label = hourNumeralLabel(analemma.hour, settings.hourNumeralStyle);
    const position = labelPosition(guide, label, frame, scale);
    elements.push(`<rect class="hour-knockout" x="${fmt(position.background.x)}" y="${fmt(position.background.y)}" width="${fmt(position.background.width)}" height="${fmt(position.background.height)}"/>`);
    elements.push(`<text class="hour-label" x="${fmt(position.point.x)}" y="${fmt(position.point.y)}" text-anchor="${position.anchor}">${escapeXml(label)}</text>`);
  }
  elements.push(`</g>`);

  const base = svgPoint({ x: settings.gnomonOffsetX, y: settings.gnomonOffsetY }, frame, scale);
  const tip = svgPoint(gnomonTipProjection(settings), frame, scale);
  elements.push(`<g id="gnomon">
    <path class="gnomon-mark" d="M ${fmt(base.x - 7)} ${fmt(base.y)} L ${fmt(base.x + 7)} ${fmt(base.y)} M ${fmt(base.x)} ${fmt(base.y - 7)} L ${fmt(base.x)} ${fmt(base.y + 7)}"/>
    <path class="gnomon-mark" d="M ${fmt(tip.x - 4)} ${fmt(tip.y - 4)} L ${fmt(tip.x + 4)} ${fmt(tip.y + 4)} M ${fmt(tip.x + 4)} ${fmt(tip.y - 4)} L ${fmt(tip.x - 4)} ${fmt(tip.y + 4)}"/>
  </g>`);
  elements.push(`<rect class="plate" x="${fmt(frame.x)}" y="${fmt(frame.y)}" width="${fmt(frame.width)}" height="${fmt(frame.height)}"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(width)} ${fmt(height)}">
  <defs>
    <style>
      .canvas { fill: #fffdf8; stroke: #d6cec2; stroke-width: 1; }
      .plate { fill: none; stroke: ${strokeColor}; stroke-opacity: 0.35; stroke-width: 1.5; }
      .title { fill: ${textColor}; fill-opacity: 0.82; font-family: Didot, 'Bodoni 72', Georgia, serif; font-size: 30px; text-anchor: middle; dominant-baseline: central; }
      .hour-label { fill: ${textColor}; fill-opacity: 0.9; font-family: Didot, 'Bodoni 72', Georgia, serif; font-size: 19px; dominant-baseline: central; }
      .hour-knockout { fill: #fffdf8; }
      .hour-guide { fill: none; stroke: ${strokeColor}; stroke-opacity: 0.28; stroke-width: 0.8; }
      .analemma { fill: none; stroke: ${strokeColor}; stroke-opacity: 0.78; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
      .half-hour { fill: none; stroke: ${strokeColor}; stroke-opacity: 0.46; stroke-width: 0.9; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 4 4; }
      .month-mark { fill: ${markColor}; }
      .gnomon-mark { fill: none; stroke: ${markColor}; stroke-width: 1.5; stroke-linecap: round; }
      .legend-line { fill: none; stroke: ${strokeColor}; stroke-opacity: 0.68; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
      .legend-arrow { fill: none; stroke: ${strokeColor}; stroke-opacity: 0.68; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; }
      .legend-label { fill: ${textColor}; fill-opacity: 0.75; font-family: Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 600; dominant-baseline: hanging; }
    </style>
  </defs>
  ${elements.join("\n  ")}
</svg>`;
}

function shadowSegments(latitude, days, clockHour, settings) {
  const segments = [];
  let current = [];
  for (const day of days) {
    const point = shadowPoint(latitude, day, clockHour, settings);
    if (!point) {
      if (current.length > 1) segments.push(current);
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

function shadowPoint(latitude, dayOfYear, clockHour, settings) {
  const normal = dialNormal(settings.kind, settings.declinationFromSouth);
  const tip = mul(gnomonVector(latitude, settings), settings.gnomonLength);
  const solar = solarVector(latitude, settings.longitude, settings.standardTimeOffset, dayOfYear, clockHour);
  const sunOnDial = dot(solar, normal);
  if (sunOnDial <= 0.0001) return null;
  const distanceToPlane = dot(tip, normal);
  const t = distanceToPlane / sunOnDial;
  if (t <= 0) return null;
  const shadow = sub(tip, mul(solar, t));
  const localPoint = projectedPoint(shadow, settings.kind, settings.declinationFromSouth);
  return { x: localPoint.x + settings.gnomonOffsetX, y: localPoint.y + settings.gnomonOffsetY };
}

function solarVector(latitude, longitude, standardTimeOffset, dayOfYear, clockHour) {
  const declination = solarDeclination(dayOfYear);
  const standardMeridian = standardTimeOffset * 15;
  const longitudeCorrectionHours = (longitude - standardMeridian) / 15;
  const apparentHour = clockHour + longitudeCorrectionHours + equationOfTimeMinutes(dayOfYear) / 60;
  const hourAngle = degreesToRadians((apparentHour - 12) * 15);
  const latitudeRadians = degreesToRadians(latitude);
  return normalized({
    x: Math.cos(declination) * Math.sin(hourAngle),
    y: Math.cos(latitudeRadians) * Math.sin(declination) - Math.sin(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle),
    z: Math.sin(latitudeRadians) * Math.sin(declination) + Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle),
  });
}

function solarDeclination(dayOfYear) {
  const gamma = 2 * Math.PI / YEAR_LENGTH * (dayOfYear - 1);
  return 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
}

function equationOfTimeMinutes(dayOfYear) {
  const gamma = 2 * Math.PI / YEAR_LENGTH * (dayOfYear - 1);
  return 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
}

function dialNormal(kind, declinationFromSouth) {
  if (kind === "horizontal") return { x: 0, y: 0, z: 1 };
  const azimuth = degreesToRadians(180 + declinationFromSouth);
  return normalized({ x: Math.sin(azimuth), y: Math.cos(azimuth), z: 0 });
}

function styleVector(latitude, normal) {
  const latitudeRadians = degreesToRadians(latitude);
  const northPole = normalized({ x: 0, y: Math.cos(latitudeRadians), z: Math.sin(latitudeRadians) });
  return dot(northPole, normal) >= 0 ? northPole : mul(northPole, -1);
}

function gnomonVector(latitude, settings) {
  const normal = dialNormal(settings.kind, settings.declinationFromSouth);
  if (settings.gnomonFollowsIdeal) return styleVector(latitude, normal);
  const angle = degreesToRadians(clamp(settings.gnomonAngleFromPlate, 0.1, 89.9));
  const direction = degreesToRadians(settings.gnomonDirectionFromDown);
  const planarLength = Math.cos(angle);
  const localOffset = { x: Math.sin(direction) * planarLength, y: -Math.cos(direction) * planarLength };
  const tangent = localVectorToWorld(localOffset, settings.kind, settings.declinationFromSouth);
  return normalized(add(tangent, mul(normal, Math.sin(angle))));
}

function projectedPoint(point, kind, declinationFromSouth) {
  if (kind === "horizontal") {
    return rotatePoint({ x: point.x, y: -point.y }, degreesToRadians(declinationFromSouth));
  }
  const normal = dialNormal(kind, declinationFromSouth);
  const right = normalized(cross({ x: 0, y: 0, z: 1 }, normal));
  return { x: -dot(point, right), y: point.z };
}

function localPointToWorld(point, kind, declinationFromSouth) {
  if (kind === "horizontal") {
    const unrotated = rotatePoint(point, -degreesToRadians(declinationFromSouth));
    return { x: unrotated.x, y: -unrotated.y, z: 0 };
  }
  const normal = dialNormal(kind, declinationFromSouth);
  const right = normalized(cross({ x: 0, y: 0, z: 1 }, normal));
  return add(mul(right, -point.x), { x: 0, y: 0, z: point.y });
}

function localVectorToWorld(vector, kind, declinationFromSouth) {
  return sub(localPointToWorld(vector, kind, declinationFromSouth), localPointToWorld({ x: 0, y: 0 }, kind, declinationFromSouth));
}

function hourGuide(analemma, settings) {
  const rect = plateRect(settings);
  const directionPoint = analemma.monthMarks.find((mark) => mark.month === 6)?.point ?? analemma.points[0];
  if (!directionPoint) return null;
  const base = { x: settings.gnomonOffsetX, y: settings.gnomonOffsetY };
  const dx = directionPoint.x - base.x;
  const dy = directionPoint.y - base.y;
  if (Math.abs(dx) <= 0.0001 && Math.abs(dy) <= 0.0001) return null;
  const candidates = [];
  if (Math.abs(dx) > 0.0001) {
    candidates.push((rect.x - base.x) / dx, (rect.x + rect.width - base.x) / dx);
  }
  if (Math.abs(dy) > 0.0001) {
    candidates.push((rect.y - base.y) / dy, (rect.y + rect.height - base.y) / dy);
  }
  const edgePoints = candidates
    .map((t) => ({ t, point: { x: base.x + dx * t, y: base.y + dy * t } }))
    .filter(({ point }) => containsPoint(insetRect(rect, -0.001, -0.001), point))
    .sort((a, b) => a.t - b.t);
  const unique = [];
  for (const candidate of edgePoints) {
    if (!unique.some((item) => distance(item.point, candidate.point) < 0.001)) unique.push(candidate);
  }
  if (unique.length < 2) return null;
  const candidateLabelEdges = unique.map((item) => item.point).filter((point) => Math.abs(point.y - (rect.y + rect.height)) > 0.001);
  const labelChoices = candidateLabelEdges.length ? candidateLabelEdges : unique.map((item) => item.point);
  const labelEdge = labelChoices.reduce((best, point) => distance(point, directionPoint) < distance(best, directionPoint) ? point : best, labelChoices[0]);
  let labelEdgeKind = "bottom";
  if (Math.abs(labelEdge.x - rect.x) < 0.001) labelEdgeKind = "left";
  else if (Math.abs(labelEdge.x - (rect.x + rect.width)) < 0.001) labelEdgeKind = "right";
  return { start: base, end: labelEdge, labelPoint: labelEdge, labelEdge: labelEdgeKind };
}

function clippedSegments(points, rect) {
  if (points.length <= 1) return [];
  const segments = [];
  let current = [];
  for (let index = 1; index < points.length; index += 1) {
    const clipped = clippedLine(points[index - 1], points[index], rect);
    if (!clipped) {
      if (current.length) segments.push(current);
      current = [];
      continue;
    }
    if (!current.length) current.push(clipped[0]);
    else if (!samePoint(current[current.length - 1], clipped[0])) {
      segments.push(current);
      current = [clipped[0]];
    }
    current.push(clipped[1]);
  }
  if (current.length) segments.push(current);
  return segments;
}

function clippedLine(start, end, rect) {
  let t0 = 0;
  let t1 = 1;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (!clip(-dx, start.x - rect.x) || !clip(dx, rect.x + rect.width - start.x) || !clip(-dy, start.y - rect.y) || !clip(dy, rect.y + rect.height - start.y)) return null;
  return [
    { x: start.x + t0 * dx, y: start.y + t0 * dy },
    { x: start.x + t1 * dx, y: start.y + t1 * dy },
  ];
}

function closedAnalemmaPoints(points) {
  if (!points.length) return points;
  return distance(points[0], points[points.length - 1]) < 10 ? [...points, points[0]] : points;
}

function labelPosition(guide, label, frame, scale) {
  const fontSize = 19;
  const textWidth = Math.max(12, label.length * fontSize * 0.58);
  const textHeight = fontSize * 1.12;
  const horizontalPadding = 7;
  const verticalPadding = 4;
  const edgePadding = 4;
  const sourcePoint = svgPoint(guide.labelPoint, frame, scale);
  const minY = frame.y + textHeight / 2 + verticalPadding;
  const maxY = frame.y + frame.height - textHeight / 2 - verticalPadding;
  const minX = frame.x + textWidth / 2 + horizontalPadding;
  const maxX = frame.x + frame.width - textWidth / 2 - horizontalPadding;
  const clampedY = clamp(sourcePoint.y, minY, maxY);
  const clampedX = clamp(sourcePoint.x, minX, maxX);
  if (guide.labelEdge === "left") {
    const point = { x: frame.x + edgePadding, y: clampedY };
    return { point, background: { x: point.x - edgePadding, y: point.y - textHeight / 2 - verticalPadding, width: textWidth + horizontalPadding + edgePadding, height: textHeight + verticalPadding * 2 }, anchor: "start" };
  }
  if (guide.labelEdge === "right") {
    const point = { x: frame.x + frame.width - edgePadding, y: clampedY };
    return { point, background: { x: point.x - textWidth - horizontalPadding, y: point.y - textHeight / 2 - verticalPadding, width: textWidth + horizontalPadding + edgePadding, height: textHeight + verticalPadding * 2 }, anchor: "end" };
  }
  const point = { x: clampedX, y: frame.y + frame.height - textHeight / 2 - edgePadding };
  return { point, background: { x: point.x - textWidth / 2 - horizontalPadding, y: point.y - textHeight / 2 - verticalPadding, width: textWidth + horizontalPadding * 2, height: textHeight + verticalPadding + edgePadding }, anchor: "middle" };
}

function legendElement(settings, frame, scale) {
  const sourceSize = { width: 99.69, height: 140.14 };
  const artworkScale = 112 / sourceSize.height;
  const legendWidth = sourceSize.width * artworkScale;
  const origin = {
    x: frame.x + frame.width - legendWidth - 16 + settings.legendOffsetX * scale,
    y: frame.y + 18 - settings.legendOffsetY * scale,
  };
  const mirrorsLegend = settings.kind === "vertical";
  const point = (x, y) => {
    const sourceX = mirrorsLegend ? sourceSize.width - x : x;
    return { x: origin.x + sourceX * artworkScale, y: origin.y + y * artworkScale };
  };
  const curve = [
    `M ${svg(point(60.86, 84.2))}`,
    `C ${svg(point(53.79, 65.56))} ${svg(point(36.05, 37.65))} ${svg(point(33.83, 30.8))}`,
    `C ${svg(point(32.60, 27.0))} ${svg(point(31.69, 13.51))} ${svg(point(40.57, 13.29))}`,
    `C ${svg(point(49.45, 13.07))} ${svg(point(49.11, 21.89))} ${svg(point(49.0, 29.17))}`,
    `C ${svg(point(48.89, 36.45))} ${svg(point(40.67, 75.96))} ${svg(point(40.67, 91.44))}`,
    `C ${svg(point(40.67, 107.69))} ${svg(point(49.16, 127.16))} ${svg(point(57.67, 126.79))}`,
    `C ${svg(point(66.18, 126.42))} ${svg(point(64.43, 93.61))} ${svg(point(60.86, 84.2))} Z`,
  ].join(" ");
  const monthMarks = [
    [39.12, 13.28], [48.0, 21.25], [48.0, 38.91], [42.41, 70.67],
    [41.67, 101.06], [48.36, 119.64], [58.0, 126.01], [64.03, 116.64],
    [63.03, 96.54], [52.0, 64.67], [40.67, 43.65], [32.83, 24.77],
  ].map(([x, y]) => `<circle class="month-mark" cx="${fmt(point(x, y).x)}" cy="${fmt(point(x, y).y)}" r="2.7"/>`);
  const anchor = mirrorsLegend ? "end" : "start";
  const labels = [
    ["Jun 21", -3.0, -2.0], ["Sep 21", -6.0, 66.74], ["Dec 21", 61.0, 127.69], ["Mar 21", 62.0, 58.67],
  ].map(([text, x, y]) => {
    const p = point(x, y);
    return `<text class="legend-label" x="${fmt(p.x)}" y="${fmt(p.y)}" text-anchor="${anchor}">${text}</text>`;
  });
  return `<g id="legend-analemma">
    <path class="legend-line" d="${curve}"/>
    ${monthMarks.join("\n    ")}
    ${labels.join("\n    ")}
    <path class="legend-arrow" d="M ${svg(point(57.22, 84.6))} L ${svg(point(58.53, 78.61))} L ${svg(point(63.55, 81.92))}"/>
  </g>`;
}

function plateRect(settings) {
  return { x: -settings.plateWidth / 2, y: -settings.plateHeight / 2, width: settings.plateWidth, height: settings.plateHeight };
}

function plateFrame(settings, width, height) {
  const outer = { x: 36, y: 36, width: width - 72, height: height - 72 };
  const scale = Math.min(outer.width / settings.plateWidth, outer.height / settings.plateHeight);
  const plateWidth = settings.plateWidth * scale;
  const plateHeight = settings.plateHeight * scale;
  return { x: outer.x + outer.width / 2 - plateWidth / 2, y: outer.y + outer.height / 2 - plateHeight / 2, width: plateWidth, height: plateHeight };
}

function pathData(points, frame, scale) {
  const [first, ...rest] = points.map((point) => svgPoint(point, frame, scale));
  return [`M ${svg(first)}`, ...rest.map((point) => `L ${svg(point)}`)].join(" ");
}

function svgPoint(point, frame, scale) {
  return { x: frame.x + frame.width / 2 + point.x * scale, y: frame.y + frame.height / 2 - point.y * scale };
}

export function hourNumeralLabel(hour, style) {
  return style === "arabic" ? String(hour) : romanNumeral(hour);
}

function romanNumeral(value) {
  if (value <= 0) return "0";
  const numerals = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = value;
  let result = "";
  for (const [numberValue, symbol] of numerals) {
    while (remaining >= numberValue) {
      result += symbol;
      remaining -= numberValue;
    }
  }
  return result;
}

export function formatLocationText(latitude, longitude) {
  const latitudeSuffix = latitude >= 0 ? "N" : "S";
  const longitudeSuffix = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(1)} ${latitudeSuffix}, ${Math.abs(longitude).toFixed(1)} ${longitudeSuffix}`;
}

function degreesToRadians(value) { return value * Math.PI / 180; }
function radiansToDegrees(value) { return value * 180 / Math.PI; }
function normalizedDegrees(value) { const result = value % 360; return result >= 0 ? result : result + 360; }
function normalizedSignedDegrees(value) { const result = normalizedDegrees(value); return result > 180 ? result - 360 : result; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function number(value, fallback) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function range(start, end) { return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index); }
function stride(start, end, step) { const values = []; for (let value = start; value <= end; value += step) values.push(value); return values; }
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function mul(a, value) { return { x: a.x * value, y: a.y * value, z: a.z * value }; }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function magnitude(a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); }
function normalized(a) { const length = magnitude(a); return length > 0 ? mul(a, 1 / length) : a; }
function rotatePoint(point, angle) { return { x: point.x * Math.cos(angle) - point.y * Math.sin(angle), y: point.x * Math.sin(angle) + point.y * Math.cos(angle) }; }
function containsPoint(rect, point) { return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height; }
function insetRect(rect, dx, dy) { return { x: rect.x + dx, y: rect.y + dy, width: rect.width - 2 * dx, height: rect.height - 2 * dy }; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function samePoint(a, b) { return distance(a, b) < 0.000001; }
function svg(point) { return `${fmt(point.x)} ${fmt(point.y)}`; }
function fmt(value) { return String(Math.round(value * 1000) / 1000); }
function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
