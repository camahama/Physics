const STORAGE_KEY = "physics-language";

function isLanguage(value) {
  return value === "sv" || value === "en";
}

/** URL overrides the shared preference; Swedish is the default. */
export function resolveLanguage(defaultLanguage = "sv", legacyKey) {
  const requested = new URL(window.location.href).searchParams.get("lang");
  if (isLanguage(requested)) return requested;
  try {
    const shared = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(shared)) return shared;
    const legacy = legacyKey && window.localStorage.getItem(legacyKey);
    if (isLanguage(legacy)) return legacy;
  } catch {
    // URL selection still works when storage is unavailable.
  }
  return isLanguage(defaultLanguage) ? defaultLanguage : "sv";
}

/** Keep the current URL shareable without changing its route or other parameters. */
export function rememberLanguage(language) {
  if (!isLanguage(language)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Language selection must also work in restricted browser contexts.
  }
  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  window.history.replaceState(window.history.state, "", url);
  document.documentElement.lang = language;
}
