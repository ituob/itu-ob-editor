import React, { useState, useEffect } from 'react';
import { Tabs, Tab } from '@blueprintjs/core';
import { SimpleEditableCard } from 'renderer/app/widgets/editable-card-list';
import * as widgetStyles from 'renderer/app/widgets/styles.scss';

import { RunningAnnexesMessage } from 'main/issues/messages/running_annexes';

import { DateStamp } from 'renderer/app/dates';
import { RunningAnnex, getRunningAnnexesForIssue } from 'renderer/app/issues/running-annexes';
import { MessageEditorProps } from '../message-editor';
import * as styles from '../styles.scss';


export const MessageEditor: React.FC<MessageEditorProps> = function (props) {
  const [extraPubIds, updateExtraPubIds] = useState(
    (props.message as RunningAnnexesMessage).extra_links);

  useEffect(() => {
    props.onChange({ extra_links: extraPubIds });
  }, [JSON.stringify(extraPubIds)]);

  const runningAnnexes = getRunningAnnexesForIssue(
    props.issue,
    props.workspace.issues,
    props.workspace.publications);

  return (
    <>
      <h2 key="paneHeader" className={widgetStyles.paneHeader}>Lists Annexed</h2>

      <Tabs className={styles.messageEditorTabs}>
        <Tab
          id="autoAnnexes"
          title="Running annexes"
          panel={<RunningAnnexes annexes={runningAnnexes} />} />
        <Tab
          id="extraPublications"
          title="Extra publications"
          panel={
            <ExtraPublications
              pubIds={extraPubIds}
              updateIds={(newIds: string[]) => updateExtraPubIds(newIds)}
            />
          } />
      </Tabs>
    </>
  );
};


const RunningAnnexes: React.FC<{ annexes: RunningAnnex[] }> = function ({ annexes }) {
  return (
    <>
      {annexes.map((annex: RunningAnnex) => (
        <SimpleEditableCard key={annex.publication.id}>
          <strong>{annex.annexedTo.id}:</strong>
          &emsp;
          {annex.publication.title.en}
          &emsp;
          {annex.positionOn
            ? <span>(position on <DateStamp date={annex.positionOn} />)</span>
            : null}
        </SimpleEditableCard>
      ))}
    </>
  );
};

const ExtraPublications: React.FC<{ pubIds: string[], updateIds: (newIds: string[]) => void }> = function ({ pubIds, updateIds }) {
  return (
    <>
      {pubIds.map((pubId) => (
        <SimpleEditableCard
            key={pubId}
            onDelete={() => {
              updateIds(pubIds.filter(id => id !== pubId));
            }}>
          {pubId}
        </SimpleEditableCard>
      ))}
    </>
  );
};
