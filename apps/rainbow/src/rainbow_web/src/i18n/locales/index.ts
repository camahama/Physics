import en from './en';
import sv from './sv';
import {
  translateSpectrumColor,
  type Language,
  type UiText,
} from '../messages';

export const UI_TEXT: Record<Language, UiText> = { en, sv };

export { translateSpectrumColor };
export type { Language, UiText };
