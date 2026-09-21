import { UI_TEXT_EN as en, translateSpectrumColor, type UiText } from './en';
import { UI_TEXT_SV as sv } from './sv';

export type Language = 'sv' | 'en';

export const UI_TEXT: Record<Language, UiText> = { en, sv };

export { translateSpectrumColor };
export type { UiText };
