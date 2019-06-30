import * as React from 'react';
import { LangConfig, Translatable, Trans } from '../localizer';


interface Recommendation { body: string, code: string, version: string }

export interface Publication {
  title: Translatable,
  id: string,
  url: string,
  recommendation: Recommendation,
}

export interface OBIssue {
  id: number,
  publication_date: string,
  general: any,
  amendments: any,
}

interface PublicationCardProps { pub: Publication, lang: LangConfig }
export class PublicationCard extends React.Component<PublicationCardProps, {}> {
  render() {
    return (
      <article>
        <h3>
          <Trans what={this.props.pub.title} lang={this.props.lang} />
        </h3>
      </article>
    );
  }
}

interface OBIssueCardProps { issue: OBIssue }
export class OBIssueCard extends React.Component<OBIssueCardProps, {}> {
  render() {
    return (
      <article>
        <h3>No. {this.props.issue.id}</h3>
      </article>
    );
  }
}
