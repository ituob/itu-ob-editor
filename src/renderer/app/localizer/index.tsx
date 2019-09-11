import React, { useContext } from 'react';
import * as styles from './styles.scss';


export interface SupportedLanguages { [id: string]: string }
export interface LangConfig { default: string, selected: string }
export interface Translatable<T> { [id: string]: T; }


interface LangConfigContextSpec extends LangConfig {
  available: SupportedLanguages,
  select(id: string): void,
}


export const LangConfigContext = React.createContext<LangConfigContextSpec>({
  available: { en: 'English', zh: 'Chinese', ru: 'Russian' },
  default: 'en',
  selected: 'en',
  select: (id: string) => {},
});


interface TranslatableComponentProps { what: Translatable<string> }
export const Trans: React.FC<TranslatableComponentProps> = function ({ what }) {
  const lang = useContext(LangConfigContext);
  const translated = what[lang.selected];
  const untranslated = what[lang.default];

  // const translated = translatable[lang.selected.id];
  // if (!translated) {
  //   // Register missing translation
  // }

  return <span>{translated || untranslated || '(malformed translatable string)'}</span>;
};


interface LangSelectorProps {}
export const LangSelector: React.FC<LangSelectorProps> = function () {
  const lang = useContext(LangConfigContext);

  return (
    <p className={styles.langSelector}>
      {Object.keys(lang.available).map((langId: string) =>
        langId === lang.selected
        ? <strong className={styles.lang}>{lang.available[langId]}</strong>
        : <a
            className={styles.lang}
            href="javascript: void 0;"
            onClick={() => lang.select(langId)}>
            {lang.available[langId]}
          </a>
      )}
    </p>
  );
};


export function getUntranslated(
    translatables: Translatable<any>[],
    forLanguageId: string): Translatable<any>[] {
  return translatables.filter(translatable => translatable[forLanguageId] !== undefined);
};
