/* eslint-disable react-refresh/only-export-components -- context hooks and provider form one i18n API */
import { createContext, useContext } from 'react';
import { UI_TEXT, type Language, type UiText } from './locales';

export { UI_TEXT, translateSpectrumColor } from './locales';
export type { Language, UiText } from './locales';

const LanguageContext = createContext<Language>('sv');

type LanguageProviderProps = {
  language: Language;
  children: React.ReactNode;
};

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Language {
  return useContext(LanguageContext);
}

export function useUiText(): UiText {
  return UI_TEXT[useLanguage()];
}
