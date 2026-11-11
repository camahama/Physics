import { resolveLanguage, rememberLanguage } from "../../../shared/language.js";

const dictionaries = {
  en: () => import("./locales/en.json", { with: { type: "json" } }),
  sv: () => import("./locales/sv.json", { with: { type: "json" } }),
};

export async function createI18n({ defaultLanguage }) {
  const i18n = {
    language: resolveLanguage(defaultLanguage, "electricity-language"),
    dictionary: {},
    async setLanguage(nextLanguage) {
      if (nextLanguage !== "sv" && nextLanguage !== "en") {
        return;
      }

      const module = await dictionaries[nextLanguage]();
      i18n.language = nextLanguage;
      i18n.dictionary = module.default;
      rememberLanguage(nextLanguage);
    },
    t(key, values = {}) {
      const resolved = key.split(".").reduce((value, part) => value?.[part], i18n.dictionary);

      if (typeof resolved !== "string") {
        return resolved ?? key;
      }

      return resolved.replace(/\{(\w+)\}/g, (_match, token) => (
        values[token] === undefined ? `{${token}}` : String(values[token])
      ));
    },
  };

  await i18n.setLanguage(i18n.language);
  window.__electricityI18n = i18n;
  return i18n;
}
