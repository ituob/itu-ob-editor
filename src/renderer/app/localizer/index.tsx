import * as React from 'react';
import * as styles from './styles.scss';


export interface Language { id: string, title: string }
export interface LangConfig { default: Language, selected: Language }
export interface Translatable { [lang: string]: string; }

interface TranslatableComponentProps { what: Translatable, lang: LangConfig }
export class Trans extends React.Component<TranslatableComponentProps, {}> {
  render() {
    const translatable = this.props.what
    const lang = this.props.lang
    return <span>{
      translatable[lang.selected.id] ||
      translatable[lang.default.id] ||
      translatable
    }</span>;
  }
}

interface LangSelectorProps {
  available: Language[],
  selected: Language,
  onSelect: (lang: Language) => void,
}
export class LangSelector extends React.Component<LangSelectorProps, {}> {
  render() {
    return (
      <p className={styles.langSelector}>
        {this.props.available.map((lang: Language) =>
          lang.id === this.props.selected.id
          ? <strong className={styles.lang}>{lang.title}</strong>
          : <a
              className={styles.lang}
              href="javascript: void 0;"
              onClick={() => this.props.onSelect(lang)}>
              {lang.title}
            </a>
        )}
      </p>
    );
  }
}
