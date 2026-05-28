import { createContext, useContext } from 'react';
import { UI_TEXT, type Language, type UiText } from './uiText';

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
