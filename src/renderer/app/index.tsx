import * as React from 'react';
import * as styles from './styles.scss';
import { Workspace } from './workspace';
import { Publication, OBIssue, PublicationCard, OBIssueCard } from './publications';
import { Language, LangConfig, LangSelector } from './localizer';


interface AppProps {
  workspace: Workspace,
  defaultLang: Language,
  languages: Language[],
}
interface AppState {
  publications: Publication[],
  issues: OBIssue[],
  lang: LangConfig,
  operations: string[],
}
export class App extends React.Component<AppProps, AppState> {

  ops: { [opname: string]: string } = { initRepo: "Loading OB data repository…" };

  constructor(props: any) {
    super(props);

    this.state = {
      publications: [],
      issues: [],
      operations: [],
      lang: {
        default: this.props.defaultLang,
        selected: Object.assign({}, this.props.defaultLang),
      },
    };
  }

  handleLanguageSelection(lang: Language) {
    this.setState({ lang: Object.assign({}, this.state.lang, { selected: lang }) });
  }

  render() {
    return (
      <React.Fragment>
        <header className={styles.header}>
          <LangSelector
            available={this.props.languages}
            selected={this.state.lang.selected}
            onSelect={(lang) => this.handleLanguageSelection(lang)}
          />
          {this.state.operations.length > 0 ? <p>{this.state.operations[0]}</p> : ''}
        </header>

        <main>
          <section>
            <h2>Service publications</h2>
            {this.state.publications.length > 0
              ? <React.Fragment>
                  {this.state.publications.map((pub: Publication) =>
                    <PublicationCard key={pub.id} pub={pub} lang={this.state.lang} />
                  )}
                </React.Fragment>
              : <p>No publications in the database.</p>}
          </section>
          <section>
            <h2>OB issues</h2>
            {this.state.publications.length > 0
              ? <React.Fragment>
                  {this.state.issues.map((issue: OBIssue) =>
                    <OBIssueCard key={issue.id} issue={issue} />
                  )}
                </React.Fragment>
              : <p>No OB issues in the database.</p>}
          </section>
        </main>
      </React.Fragment>
    );
  }

  addOperation(op: string) {
    this.setState({ operations: [...this.state.operations, this.ops.initRepo] });
  }

  popOperation(op: string) {
    this.setState({ operations: this.state.operations.filter(op => op !== this.ops.initRepo) });
  }

  async componentDidMount() {
    this.setState({ publications: await this.props.workspace.getPublications() });
    this.setState({ issues: await this.props.workspace.getIssues() });
  }

}
