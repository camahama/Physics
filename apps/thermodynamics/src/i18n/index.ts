const dictionaries = {
  en: () => import("./locales/en.json", { with: { type: "json" } }),
  sv: () => import("./locales/sv.json", { with: { type: "json" } }),
};

type Language = keyof typeof dictionaries;

function getStoredLanguage() {
  try {
    return window.localStorage.getItem("thermodynamics-language");
  } catch (_error) {
    return null;
  }
}

function setStoredLanguage(language: string) {
  try {
    window.localStorage.setItem("thermodynamics-language", language);
  } catch (_error) {
    // Ignore storage write failures in restricted browser contexts.
  }
}

function isLanguage(language: string): language is Language {
  return language in dictionaries;
}

function resolveInitialLanguage(defaultLanguage: Language) {
  const savedLanguage = getStoredLanguage();
  if (savedLanguage && isLanguage(savedLanguage)) {
    return savedLanguage;
  }

  return defaultLanguage;
}

export async function createI18n({ defaultLanguage }: { defaultLanguage: Language }) {
  const i18n = {
    language: resolveInitialLanguage(defaultLanguage),
    dictionary: {} as Record<string, unknown>,
    async setLanguage(nextLanguage: string) {
      if (!isLanguage(nextLanguage)) {
        return;
      }

      const module = await dictionaries[nextLanguage]();
      i18n.language = nextLanguage;
      i18n.dictionary = module.default;
      setStoredLanguage(nextLanguage);
    },
    t(key: string, values: Record<string, string | number> = {}) {
      const resolved = key
        .split(".")
        .reduce<unknown>((value, part) => (
          value && typeof value === "object"
            ? (value as Record<string, unknown>)[part]
            : undefined
        ), i18n.dictionary);

      if (typeof resolved !== "string") {
        return typeof resolved === "undefined" ? key : String(resolved);
      }

      return resolved.replace(/\{(\w+)\}/g, (_match, token) => (
        values[token] === undefined ? `{${token}}` : String(values[token])
      ));
    },
  };

  await i18n.setLanguage(i18n.language);
  return i18n;
}
