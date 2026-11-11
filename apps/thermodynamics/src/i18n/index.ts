import { resolveLanguage, rememberLanguage } from "../../../shared/language.js";

const dictionaries = {
  en: () => import("./locales/en.json"),
  sv: () => import("./locales/sv.json"),
};

type Language = keyof typeof dictionaries;

function isLanguage(language: string): language is Language {
  return language === "sv" || language === "en";
}

export async function createI18n({ defaultLanguage }: { defaultLanguage: Language }) {
  const i18n = {
    language: resolveLanguage(defaultLanguage, "thermodynamics-language"),
    dictionary: {} as Record<string, unknown>,
    async setLanguage(nextLanguage: string) {
      if (!isLanguage(nextLanguage)) {
        return;
      }

      const module = await dictionaries[nextLanguage]();
      i18n.language = nextLanguage;
      i18n.dictionary = module.default;
      rememberLanguage(nextLanguage);
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
