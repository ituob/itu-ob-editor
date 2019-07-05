import * as React from 'react';
import { Translatable } from '../localizer';
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
  general: MessageBlock,
  amendments: MessageBlock,
  annexes: AnnexBlock,
}

interface PublicationCardProps { pub: Publication }
export class PublicationCard extends React.Component<PublicationCardProps, {}> {
  render() {
    return (
      <Card role="article" elevation={Elevation.TWO}>
        <h3>{this.props.pub.title.en}</h3>
      </Card>
    );
  }
}
