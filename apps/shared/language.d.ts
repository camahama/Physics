export type Language = "sv" | "en";
export function resolveLanguage(defaultLanguage?: string, legacyKey?: string): Language;
export function rememberLanguage(language: string): void;
