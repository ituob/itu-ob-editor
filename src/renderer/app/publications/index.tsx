import * as React from 'react';
import { LangConfig, Translatable, Trans } from '../localizer';
import { Card, Elevation } from '@blueprintjs/core';


interface Recommendation { body: string, code: string, version: string }

export interface Publication {
  title: Translatable,
  id: string,
  url: string,
  recommendation: Recommendation,
}

interface Message {
  type: string,
  [prop: string]: any,
}
interface MessageBlock {
  messages: Message[],
}
interface AnnexBlock {
  [pubId: string]: string,
}
export interface OBIssue {
  id: number,
  publication_date: Date,
  cutoff_date: Date,
  general: MessageBlock | null,
  amendments: MessageBlock | null,
  annexes: AnnexBlock | null,
}

interface PublicationCardProps { pub: Publication, lang: LangConfig }
export class PublicationCard extends React.Component<PublicationCardProps, {}> {
  render() {
    return (
      <Card role="article" elevation={Elevation.TWO}>
        <h3><Trans what={this.props.pub.title} lang={this.props.lang} /></h3>
      </Card>
    );
  }
}

interface OBIssueCardProps { issue: OBIssue }
export class OBIssueCard extends React.Component<OBIssueCardProps, {}> {
  render() {
    return (
      <Card role="article" elevation={Elevation.TWO}>
        <h3>No. {this.props.issue.id}</h3>
        <p>{this.props.issue.publication_date.toLocaleString()}</p>
      </Card>
    );
  }
}
