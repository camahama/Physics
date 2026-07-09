import {
  defaultSettings,
  declinationFromSouthForAzimuth,
  formatLocationText,
  idealGnomonOrientation,
  layout,
  layoutAngleForPlateEdge,
  renderSvg,
  sanitizeSettings,
  solarAzimuthDegrees,
} from "./sundial.js";

const STORAGE_KEY = "physics-sundial-web-settings";
const SVG_SIZE = 1000;

const fields = [
  "kind", "plateWidth", "plateHeight", "gnomonLength", "gnomonOffsetX", "gnomonOffsetY",
  "customText", "monochrome", "latitude", "longitude", "declinationFromSouth",
  "startHour", "endHour", "standardTimeOffset", "gnomonFollowsIdeal",
  "gnomonAngleFromPlate", "gnomonDirectionFromDown", "hourNumeralStyle",
  "visibleHourLabels", "showsLegendAnalemma", "legendOffsetX", "legendOffsetY",
];

const dom = Object.fromEntries([...fields, "dialSvg", "subtitle", "scaleReadout", "declinationLabel", "locationMessage", "gnomonAngleOutput", "hoursOutput", "boundsOutput", "angleHelperMode", "observationDate", "observationIncludesDST", "angleResult"].map((id) => [id, document.getElementById(id)]));

let settings = loadSettings();
let latestLayout = null;
let latestAngle = null;

initialize();
render();

function initialize() {
  for (const id of fields) {
    dom[id].addEventListener("input", () => {
      readFormIntoSettings();
      if (["kind", "latitude", "declinationFromSouth"].includes(id) && settings.gnomonFollowsIdeal) setIdealGnomon(false);
      if (id === "startHour" || id === "endHour") resetVisibleHourLabels();
      render();
    });
  }

  document.getElementById("setTitleFromPosition").addEventListener("click", () => {
    settings.customText = formatLocationText(settings.latitude, settings.longitude);
    render();
  });
  document.getElementById("useBrowserLocation").addEventListener("click", useBrowserLocation);
  document.getElementById("applyLund").addEventListener("click", () => {
    settings.latitude = 55.7047;
    settings.longitude = 13.1910;
    settings.standardTimeOffset = 1;
    settings.customText = formatLocationText(settings.latitude, settings.longitude);
    if (settings.gnomonFollowsIdeal) setIdealGnomon(false);
    render();
  });
  document.getElementById("setIdealGnomon").addEventListener("click", () => {
    settings.gnomonFollowsIdeal = true;
    setIdealGnomon(false);
    render();
  });
  document.getElementById("setSimpleGnomon").addEventListener("click", () => {
    settings.gnomonFollowsIdeal = false;
    settings.gnomonAngleFromPlate = 45;
    settings.gnomonDirectionFromDown = 0;
    render();
  });
  document.getElementById("downloadSVG").addEventListener("click", downloadSVG);
  document.getElementById("printPage").addEventListener("click", () => window.print());
  document.getElementById("calculateAngle").addEventListener("click", calculateAngle);
  document.getElementById("applyAngle").addEventListener("click", () => {
    if (latestAngle == null) calculateAngle();
    if (latestAngle != null) {
      settings.declinationFromSouth = latestAngle;
      if (settings.gnomonFollowsIdeal) setIdealGnomon(false);
      render();
    }
  });

  const now = new Date();
  now.setSeconds(0, 0);
  dom.observationDate.value = toDatetimeLocalValue(now);
  dom.observationIncludesDST.checked = isProbablyDST(now);
}

function render() {
  settings = sanitizeSettings(settings);
  latestLayout = layout(settings);
  saveSettings(settings);
  writeSettingsToForm();

  const svgText = renderSvg(latestLayout, SVG_SIZE, SVG_SIZE);
  dom.dialSvg.outerHTML = svgText.replace("<svg ", `<svg id="dialSvg" role="img" aria-labelledby="svgTitle" `);
  dom.dialSvg = document.getElementById("dialSvg");

  dom.subtitle.textContent = `${titleCase(settings.kind)} dial · ${settings.plateWidth.toFixed(0)} × ${settings.plateHeight.toFixed(0)} mm · ${hourLabel(settings.startHour)} to ${hourLabel(settings.endHour)} standard time`;
  const artworkScale = (SVG_SIZE - 72) / Math.max(settings.plateWidth, settings.plateHeight);
  dom.scaleReadout.textContent = `${artworkScale.toFixed(2)} px/mm preview scale`;
  dom.declinationLabel.textContent = settings.kind === "vertical" ? "Wall angle" : "Layout angle";
  dom.gnomonAngleOutput.textContent = `${latestLayout.gnomonAngleDegrees.toFixed(1)}° from plate`;
  dom.hoursOutput.textContent = `${settings.startHour}–${settings.endHour}`;
  dom.boundsOutput.textContent = latestLayout.outOfBoundsHours.length ? latestLayout.outOfBoundsHours.join(", ") : "None";
  dom.gnomonAngleFromPlate.disabled = settings.gnomonFollowsIdeal;
  dom.gnomonDirectionFromDown.disabled = settings.gnomonFollowsIdeal;
}

function readFormIntoSettings() {
  for (const id of fields) {
    const element = dom[id];
    if (element.type === "checkbox") {
      settings[id] = element.checked;
    } else if (id === "kind" || id === "customText" || id === "hourNumeralStyle") {
      settings[id] = element.value;
    } else if (id === "visibleHourLabels") {
      settings.visibleHourLabels = parseHourLabels(element.value, settings.startHour, settings.endHour);
    } else {
      settings[id] = Number(element.value);
    }
  }
}

function writeSettingsToForm() {
  for (const id of fields) {
    const element = dom[id];
    if (element.type === "checkbox") {
      element.checked = Boolean(settings[id]);
    } else if (id === "visibleHourLabels") {
      element.value = settings.visibleHourLabels.join(", ");
    } else {
      element.value = settings[id];
    }
  }
}

function setIdealGnomon(shouldRender = true) {
  const ideal = idealGnomonOrientation(settings);
  settings.gnomonAngleFromPlate = ideal.angleFromPlate;
  settings.gnomonDirectionFromDown = ideal.directionFromDown;
  if (shouldRender) render();
}

function resetVisibleHourLabels() {
  const start = Math.min(Number(dom.startHour.value), Number(dom.endHour.value));
  const end = Math.max(Number(dom.startHour.value), Number(dom.endHour.value));
  settings.visibleHourLabels = Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function useBrowserLocation() {
  if (!navigator.geolocation) {
    dom.locationMessage.textContent = "Geolocation is not available in this browser.";
    return;
  }
  dom.locationMessage.textContent = "Requesting location…";
  navigator.geolocation.getCurrentPosition((position) => {
    settings.latitude = position.coords.latitude;
    settings.longitude = position.coords.longitude;
    settings.customText = formatLocationText(settings.latitude, settings.longitude);
    if (settings.gnomonFollowsIdeal) setIdealGnomon(false);
    dom.locationMessage.textContent = "Location updated. Check UTC offset manually.";
    render();
  }, (error) => {
    dom.locationMessage.textContent = error.message;
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
}

function calculateAngle() {
  const observed = dom.observationDate.value ? new Date(dom.observationDate.value) : new Date();
  const standardDate = new Date(observed);
  if (dom.observationIncludesDST.checked) standardDate.setHours(standardDate.getHours() - 1);
  const startOfYear = new Date(standardDate.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((standardDate - startOfYear) / 86400000) + 1;
  const clockHour = standardDate.getHours() + standardDate.getMinutes() / 60;
  const azimuth = solarAzimuthDegrees({
    latitude: settings.latitude,
    longitude: settings.longitude,
    standardTimeOffset: settings.standardTimeOffset,
    dayOfYear,
    clockHour,
  });
  latestAngle = dom.angleHelperMode.value === "sunParallelToPlateEdge"
    ? layoutAngleForPlateEdge(azimuth)
    : declinationFromSouthForAzimuth(azimuth);
  dom.angleResult.textContent = `Solar azimuth: ${azimuth.toFixed(1)}°. Recommended angle: ${latestAngle.toFixed(1)}°.`;
}

function downloadSVG() {
  const svg = renderSvg(latestLayout, SVG_SIZE, SVG_SIZE);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `sundial-layout-${new Date().toISOString().slice(0, 19).replaceAll(":", "")}.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return sanitizeSettings({ ...defaultSettings, ...saved });
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function parseHourLabels(text, start, end) {
  return [...new Set(String(text).split(/[,\s;]+/).map(Number).filter((hour) => Number.isInteger(hour) && hour >= start && hour <= end))].sort((a, b) => a - b);
}

function hourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function toDatetimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isProbablyDST(date) {
  const january = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const july = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return date.getTimezoneOffset() < Math.max(january, july);
}
