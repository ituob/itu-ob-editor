import React from 'react';
import { UL } from '@blueprintjs/core';

import { RunningAnnexesMessage } from 'main/issues/messages/running_annexes';

import { DateStamp } from 'renderer/app/dates';
import { RunningAnnex, getRunningAnnexesForIssue } from 'renderer/app/issues/running-annexes';
import { MessageEditorProps } from '../message-editor';


export const RunningAnnexesEditor: React.FC<MessageEditorProps> = function (props) {
  const extraPublicationIDs = (props.message as RunningAnnexesMessage).extra_links;
  const runningAnnexes = getRunningAnnexesForIssue(
    props.issue,
    props.workspace.issues,
    props.workspace.publications);

  return (
    <React.Fragment>
      <UL key={'lists-annexed'}>
        {runningAnnexes.map((annex: RunningAnnex) => (
          <li key={annex.publication.id}>
            <strong>{annex.annexedTo.id}:</strong>
            &emsp;
            {annex.publication.title.en}
            &emsp;
            {annex.positionOn
              ? <span>(position on <DateStamp date={annex.positionOn} />)</span>
              : null}
          </li>
        ))}
      </UL>
      <UL key={'lists-external'}>
        {extraPublicationIDs.map((pubId) => (
          <li key={pubId}>{pubId}</li>
        ))}
      </UL>
    </React.Fragment>
  );
};

