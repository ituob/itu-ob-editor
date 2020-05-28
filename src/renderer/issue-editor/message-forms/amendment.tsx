import update from 'immutability-helper';
import * as jsonpatch from 'fast-json-patch';
import { remote } from 'electron';

import React, { useContext, useState } from 'react';
import { Icon, Text, NonIdealState, Tabs, Tab, UL, H4, Tag, Spinner } from '@blueprintjs/core';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { OBIssue, PositionDatasets, patchDatasets } from 'models/issues';
import { Message as AmendmentMessage, DatasetChanges } from 'models/messages/amendment';
import { useLatestAnnex } from 'renderer/hooks';
import { app } from 'renderer/index';
import { DateStamp } from 'renderer/widgets/dates';
import { RecommendationTitle } from 'renderer/widgets/publication-title';
import { FreeformContents } from '../freeform-contents';
import { MessageFormProps } from '../message-editor';
import { DatasetContents } from '../annexes/position-data';
import { Publication } from 'models/publications';
import { useIPCValue } from 'coulomb/ipc/renderer';
import { Operation } from 'fast-json-patch';
import { RunningAnnex } from 'models/running-annexes';
import { ItemList } from 'renderer/widgets/item-list';
import * as styles from './amendment.scss';


export const MessageForm: React.FC<MessageFormProps> = function ({ message, onChange, issue }) {
  const lang = useContext(LangConfigContext);
  const msg = message as AmendmentMessage;

  const [changes, setChanges] = useState<DatasetChanges>(msg.datasetChanges || {});

  const pastPatches = useIPCValue
  <{ forPubID: string, asOfIssueID: number }, { changes: DatasetChanges | undefined }>
  ('model-issues-get-dataset-changes', { changes: undefined }, { forPubID: msg.target.publication, asOfIssueID: issue.id });

  const latestAnnex = useIPCValue
  <{ pubID: string, asOfIssueID: number, excluding: boolean }, { annex: RunningAnnex | undefined | null }>
  ('model-issues-get-latest-annex', { annex: undefined }, { pubID: msg.target.publication, asOfIssueID: issue.id, excluding: false });

  const latestAnnexedDatasets = latestAnnex.value.annex?.annexedTo.annexes[msg.target.publication]?.datasets || null;

  const contentsEditor = <FreeformContents
    defaultValue={(msg.contents || {})[lang.default] || {}}
    onChange={(updatedDoc) => {
      onChange({ ...msg, contents: { ...msg.contents, [lang.default]: updatedDoc } });
    }}
  />;

  if (latestAnnexedDatasets === null) {
    return contentsEditor;

  } else if (latestAnnexedDatasets === undefined) {
    return <NonIdealState
      icon={<Spinner />}
      title="Loading previously annexed version…" />;

  } else if (pastPatches.value.changes === undefined) {
    return <NonIdealState
      icon={<Spinner />}
      title="Applying amendments…" />;

  } else {

    const datasetsWithAmendments = patchDatasets(
      latestAnnexedDatasets,
      pastPatches.value.changes);

    return (
      <div className={styles.normalizedAmendment}>

        <AmendedPositionDataEditor
          datasets={datasetsWithAmendments}
          datasetChanges={changes}
          onChange={(newChanges) => {
            setChanges(newChanges);
            onChange({ ...msg, datasetChanges: newChanges });
          }} />

          <Tabs defaultSelectedTabId="changes" className={styles.changeMessageTabs}>
            <Tab
              id="changes"
              title="Review changes"
              panel={<AmendedPositionChangeReview datasets={datasetsWithAmendments} datasetChanges={changes} />}
              className={styles.changeMessageTab}
            />
            <Tab
              id="message"
              title="Add message (optional)"
              className={styles.changeMessageTab}
              panel={contentsEditor}
            />
          </Tabs>

      </div>
    );
  }
};


export const AmendmentMeta: React.FC<{ amendment: AmendmentMessage, issue: OBIssue }> =
function ({ amendment, issue }) {
  const pubId = amendment.target.publication;
  const pub = app.useOne<Publication, string>('publications', pubId).object;
  const latestAnnex = useLatestAnnex(pubId, issue.id);
  const pubUrl = pub ? pub.url : undefined;

  if (pub) {
    return <>
      {pub.recommendation
        ? <Text ellipsize={true}>Per <RecommendationTitle rec={pub.recommendation} /></Text>
        : null}
      {pubUrl
        ? <Text ellipsize={true}>SP resource: <a onClick={() => remote.shell.openExternal(pubUrl)}>{pubUrl}</a></Text>
        : null}
      {latestAnnex && latestAnnex.positionOn
        ? <div>Amending position of <DateStamp date={latestAnnex.positionOn} /> annexed to OB {latestAnnex.annexedTo.id}:</div>
        : <div><Icon icon="warning-sign" /> This publication doesn’t seem to have been annexed to OB</div>}
    </>;
  } else {
    return <>Publication amended is not found in the database</>
  }
};


interface AmendedPositionChangeReviewProps {
  datasetChanges: DatasetChanges
  datasets: PositionDatasets
}
const AmendedPositionChangeReview: React.FC<AmendedPositionChangeReviewProps> = function ({ datasets, datasetChanges }) {
  const lang = useContext(LangConfigContext);

  const changes = Object.entries(datasetChanges).
  filter(([dsID, ds]) => ds.contents.length > 0).
  map(([dsID, ds]) => {
    const nonTestOps = ds.contents.filter(op => op.op !== 'test');
    const dsTitle = (datasets[dsID]?.meta?.title || {})[lang.selected] || dsID;

    return (
      nonTestOps.map(op => <Operation datasetTitle={dsTitle} op={op} />)
    );
  });

  return <div className={styles.changeTab}>
    <UL>{changes}</UL>
  </div>;
};

const Operation: React.FC<{ datasetTitle: string, op: Operation }> = function ({ datasetTitle, op }) {
  return <p>
    [<small>{datasetTitle}</small>]
    <br />
    {op.path} — <em style={{textTransform: 'uppercase'}}>{op.op}</em>
    {" "}
    {op.op === 'add' ? <>{JSON.stringify(op.value)}</> : null}
    {op.op === 'replace' ? <>with {JSON.stringify(op.value)}</> : null}
    {(op.op === 'copy' || op.op === 'move') ? <>from {op.from}</> : null}
    {(op.op === 'copy' || op.op === 'move') ? <>from {op.from}</> : null}
  </p>;
}


interface AmendedPositionDataEditorProps {
  datasets: PositionDatasets
  datasetChanges: DatasetChanges
  onChange?: (datasetChanges: DatasetChanges) => void
}
const AmendedPositionDataEditor: React.FC<AmendedPositionDataEditorProps> =
function({ datasets, datasetChanges, onChange }) {
  const lang = useContext(LangConfigContext);

  const patched = patchDatasets(datasets, datasetChanges);

  const [selectedDatasetID, selectDatasetID] =
  useState<(string & (keyof typeof datasets)) | null>(null);

  const selectedDataset = selectedDatasetID !== null ? datasets[selectedDatasetID] : null;
  const selectedPatched = selectedDatasetID !== null ? patched[selectedDatasetID] : selectedDataset;

  let mainPane: JSX.Element;
  if (selectedPatched && selectedDataset) {
    mainPane = <DatasetContents
      schema={selectedPatched.meta.schema}
      data={selectedPatched.contents}
      onChange={onChange
        ? (newContents) => {
            if (selectedDatasetID !== null) {
              const datasetContentChanges = jsonpatch.compare(selectedDataset.contents, newContents, true);
              onChange(update(datasetChanges, {
                [selectedDatasetID]: {
                  $set: { contents: datasetContentChanges },
                },
              }));
            }
          }
        : undefined} />
  } else {
    mainPane = <NonIdealState
      title="Nothing to show"
      description="Please select a dataset on the right to make amendments." />
  }

  return (
    <div className={styles.datasets}>
      <div className={styles.mainPane}>
        {mainPane}
      </div>
      <div className={styles.navigation}>
        {Object.entries(datasets).map(([idx, dataset]) =>
          <ItemList
            key={idx}
            title={dataset.meta.title ? `“${dataset.meta.title[lang.selected]}”` : idx}
            items={{ 'contents': <>Content&emsp;<Tag round title="Dataset items">{Object.entries(dataset.contents).length}</Tag></> }}
            onSelect={() => {
              selectDatasetID(idx);
            }}
            selectedIdx={selectedDatasetID === idx ? 'contents' : undefined}
            itemIcon={item => item === 'Settings' ? 'cog' : 'th'}
            itemTitle={item => <>{item as string}</>}
          />
        )}
      </div>
    </div>
  );
};