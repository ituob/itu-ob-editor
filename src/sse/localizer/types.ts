export interface SupportedLanguages { [id: string]: string }
export interface LangConfig { default: string, selected: string }
export interface Translatable<T> { [id: string]: T; }

