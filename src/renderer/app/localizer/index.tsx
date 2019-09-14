import React, { useContext } from 'react';
import { Icon } from '@blueprintjs/core';
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


interface LangSelectorProps {
  value?: Translatable<string | any>,
}
export const LangSelector: React.FC<LangSelectorProps> = function ({ value }) {
  const lang = useContext(LangConfigContext);

  let translated: boolean | undefined = undefined;
  let hasDefault: boolean | undefined = undefined;

  if (value) {
    translated = value[lang.selected] ? true : false;
    hasDefault = value[lang.default] ? true : false;
  }

  console.debug(value, translated, hasDefault);

  return (
    <p className={styles.langSelector}>
      {Object.keys(lang.available).map((langId: string) =>
        <>

          {langId === lang.selected
            ? <strong className={styles.lang}>
                {langId}
              </strong>
            : <a
                  className={styles.lang}
                  href="javascript: void 0;"
                  onClick={() => lang.select(langId)}>
                <span>{langId}</span>
              </a>}

          {value !== undefined
            ? <>
                {value[langId]
                  ? ''
                  : <Icon icon="error" intent="danger" />}
              </>
            : ''}

        </>
      )}
    </p>
  );
};


export function getUntranslated(
    translatables: Translatable<any>[],
    forLanguageId: string): Translatable<any>[] {
  return translatables.filter(translatable => translatable[forLanguageId] !== undefined);
};
