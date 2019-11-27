import AsyncLock from 'async-lock';
import { debounce } from 'throttle-debounce';

import { remote, ipcRenderer } from 'electron';

import React, { useMemo, useState, useEffect } from 'react';
import { Spinner, Icon, NonIdealState, Tooltip, Button } from '@blueprintjs/core';

import { useWorkspace, useModified } from 'renderer/workspace-context';

import { request } from 'sse/api/renderer';
import { notifyAllWindows } from 'sse/main/window';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';

import { PublicationTitle } from 'renderer/widgets/publication-title';

import {
  OBIssue,
  OBSection, OBMessageSection,
  isOBMessageSection, isOBAnnexesSection,
  issueFactories,
} from 'models/issues';

import { Message, AmendmentMessage, isAmendment } from 'models/messages';

import { WindowToaster } from 'renderer/toaster';

import { ItemList } from './item-list';
import { NewGeneralMessagePrompt } from './item-list/new-general-message-menu';
import { NewAmendmentPrompt } from './item-list/new-amendment-menu';
import { NewAnnexPrompt } from './item-list/new-annex-menu';
import { MessageTitle, MessageEditor } from './message-editor';
import { AmendmentMeta } from './message-forms/amendment';
import { AnnexEditor } from './annex-editor';

import * as styles from './styles.scss';


interface IssueEditorSelection {
  section: OBSection,
  item: string,
}

const operationLock = new AsyncLock();

var issueUpdate: NodeJS.Timer;


interface IssueEditorWindowProps {
  issueId: string,
  selectedSection?: OBSection,
  selectedItem?: string,
}
export const Window: React.FC<IssueEditorWindowProps> = ({ issueId, selectedSection, selectedItem }) => {
  const numIssueId = parseInt(issueId, 10);

  const [maybeIssue, updateIssue] = useState(null as OBIssue | null);

  function handleChangedIssues(evt: any, data: { objIds: number[] }) {
    // Just reload the window if our issue question changed
    if (data.objIds.indexOf(numIssueId) >= 0) {
      remote.getCurrentWindow().reload();
    }
  }

  useEffect(() => {
    storageGetIssue();

    ipcRenderer.on('issues-changed', handleChangedIssues);
    return function cleanup() {
      ipcRenderer.removeListener('issues-changed', handleChangedIssues);
    }
  }, []);

  async function storageGetIssue() {
    const issue = await request<OBIssue>('issue', { issueId: numIssueId });
    updateIssue(issue);
  }

  return useMemo(() => {
    console.debug("Rendering", (maybeIssue || {}).id);
    if (maybeIssue !== null) {
      return <IssueEditor issue={maybeIssue} />;
    }

    return <Spinner className={styles.spinner} />;
  }, [(maybeIssue || {}).id]);
};


export const IssueEditor: React.FC<{ issue: OBIssue, selection?: IssueEditorSelection }> = (props) => {
  const [issue, _updateIssue] = useState(props.issue);
  const ws = useWorkspace();

  const modified = useModified();

  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);

  const [haveSaved, setSaved] = useState(undefined as boolean | undefined);

  useEffect(() => {
    const _hasUncommittedChanges = modified.issues.indexOf(props.issue.id) >= 0;
    setHasUncommittedChanges(_hasUncommittedChanges);
  }, [modified.issues]);


  /* Prepare initial item selection status */

  let initialItemIdx: string | undefined;
  let initialSection: OBSection;

  if (props.selection) {
    initialItemIdx = props.selection.item;
    initialSection = props.selection.section;
  } else {
    initialItemIdx = undefined;
    initialSection = 'general';
  }

  const [selectedItem, selectItem] = useState(initialItemIdx);
  const [selectedSection, selectSection] = useState(initialSection);

  // Convenience shortcuts
  const selectedMessageIdx: number | undefined = isOBMessageSection(selectedSection) && selectedItem !== undefined
    ? parseInt(selectedItem, 10)
    : undefined;

  const selectedAnnex = isOBAnnexesSection(selectedSection) && selectedItem !== undefined
    ? (issue.annexes || {})[selectedItem]
    : undefined;


  /* Storage API utilities */

  async function _storageUpdateIssue(data: OBIssue, commit?: true) {
    await operationLock.acquire('update-issue', async () => {
      clearTimeout(issueUpdate);

      // TODO: Handle API failure
      const updateResult = await request<{ modified: boolean }>('issue-update', { issueId: props.issue.id, data, commit: commit });

      if (commit) {
        await ipcRenderer.send('remote-storage-trigger-sync');
      } else {
        await ipcRenderer.send('remote-storage-trigger-uncommitted-check');
      }

      issueUpdate = setTimeout(() => {
        setHasUncommittedChanges(updateResult.modified);
        setSaved(true);
      }, 500);
    });
  }
  const storageUpdateIssue = debounce(500, _storageUpdateIssue);


  /* Issue update operations */

  async function updateIssue(data: OBIssue, commit?: true) {
    setSaved(false);
    _updateIssue(data);
    await storageUpdateIssue(data, commit);
  }

  /* Message editor JSX */

  // Memoization ensures that updating items on every keystroke
  // doesn’t cause the editor pane to re-render, which may lose cursor position and undo history.
  // Only re-render if selected item index or section, meaning a switch to another item.
  const editor = useMemo(() => {
    if (isOBMessageSection(selectedSection) && selectedItem !== undefined) {
      const message = issue[selectedSection].messages[parseInt(selectedItem, 10)];
      if (message) {
        return <MessageEditor
            message={message}
            issue={issue}
            meta={isAmendment(message)
              ? <AmendmentMeta amendment={message as AmendmentMessage} issue={issue} />
              : undefined}
            onChange={handleMessageEdit}
          />;
      }
    } else if (selectedAnnex !== undefined && selectedItem !== undefined) {
      return <AnnexEditor
          pubId={selectedItem}
          issueId={issue.id}
          position={selectedAnnex ? selectedAnnex.position_on : undefined}
          onChange={handleAnnexPositionEdit}
        />;
    }
    return <NonIdealState
        icon="info-sign"
        title="Nothing is selected"
        description="Add or select an item on the left to start."
      />;

  }, [
    selectedItem,
    selectedMessageIdx,
    selectedSection,
    selectedAnnex,
    issue.amendments.messages.length,
    issue.general.messages.length,
    Object.keys(issue.annexes || {}).length,
  ]);


  /* Event handling utilities */

  function handleItemSelection(inSection: OBSection, atIndex: string) {
    selectItem(atIndex);
    selectSection(inSection); 
  }

  function handleNewMessage(msg: Message, inSection: OBMessageSection) {
    const newIssue = issueFactories.withAddedMessage(issue, inSection, msg);
    const idx = newIssue[inSection].messages.indexOf(msg);
    updateIssue(newIssue);

    selectSection(inSection);
    selectItem(`${idx}`);
  }

  function handleMessageEdit(updatedMessage: Message) {
    if (selectedMessageIdx !== undefined && isOBMessageSection(selectedSection)) {
      const newIssue = issueFactories.withEditedMessage(issue, selectedSection, selectedItem, updatedMessage);
      updateIssue(newIssue);
    }
  }

  function handleMessageRemoval(inSection: OBMessageSection, atIndex: string) {
    const idx = parseInt(atIndex, 10);
    updateIssue(issueFactories.withRemovedMessage(issue, inSection, idx));

    if (inSection === selectedSection && selectedItem === atIndex) {
      selectItem(undefined);
    }
  }

  function handleNewAnnex(pubId: string) {
    updateIssue(issueFactories.withAddedAnnex(issue, pubId));

    setTimeout(() => {
      selectItem(pubId);
      selectSection('annexes');
    }, 100);
  }

  function handleAnnexPositionEdit(pubId: string, updatedPosition: Date | undefined) {
    updateIssue(issueFactories.withUpdatedAnnexedPublicationPosition(issue, pubId, updatedPosition));
  }

  function handleAnnexRemoval(pubId: string) {
    updateIssue(issueFactories.withDeletedAnnex(issue, pubId));

    if (isOBAnnexesSection(selectedSection) && selectedItem === pubId) {
      selectItem(undefined);
    }
  }


  // IDs of publications that cannot be annexed or amended, because they already were.
  const takenPublicationIDs = [
    ...issue.amendments.messages.map(msg => (msg as AmendmentMessage)).map(amd => amd.target.publication),
    ...Object.keys(issue.annexes || {}),
  ];


  async function handleCommitAndQuit() {
    try {
      await updateIssue(issue, true);
    } catch (e) {
      WindowToaster.show({ intent: 'danger', message: "Failed to commit changes" });
      return;
    }
    await notifyAllWindows('issues-changed');
    remote.getCurrentWindow().close();
  }


  /* Changed status mark */

  let changeStatus: JSX.Element;
  let tooltipText: string;
  if (haveSaved === false) {
    changeStatus = <Icon icon="asterisk" intent="danger" />
    tooltipText = "Saving edits…";
  } else if (hasUncommittedChanges === true) {
    changeStatus = <Button
        intent="success"
        onClick={handleCommitAndQuit}
        icon="git-commit"
        small={true}
        className={styles.commitButton}>
      Done
    </Button>;
    tooltipText = "Click to commit changes";
  } else {
    changeStatus = <Icon icon="tick-circle" intent="success" />
    tooltipText = "Edition is up-to-date";
  }


  /* Main JSX */

  return (
    <div className={styles.twoPaneEditor}>
      <div className={styles.messageListPane}>

        <div className={styles.paneHeader}>
          <PaneHeader align="right" major={true}>
            <Tooltip
                className={styles.statusIcon}
                content={tooltipText}>
              {changeStatus}
            </Tooltip>
            № <span className={styles.paneHeaderIssueId}>{issue.id}</span>
          </PaneHeader>
        </div>

        <div className={styles.paneBody}>

          <ItemList
            title="General Messages"
            items={issue.general.messages}
            selectedIdx={selectedSection === 'general' ? selectedItem : undefined}
            onSelect={(idx) => handleItemSelection('general', idx)}
            onDelete={(idx) => handleMessageRemoval('general', idx)}

            itemTitle={(item) => <MessageTitle message={item as Message} />}
            itemIcon={() => "clipboard"}

            prompt={(highlight) =>
              <NewGeneralMessagePrompt
                highlight={highlight}
                existingMessages={issue.general.messages}
                onCreate={item => handleNewMessage(item as Message, 'general')} />}
          />

          <ItemList
            title="Amendments"
            items={issue.amendments.messages}
            selectedIdx={selectedSection === 'amendments' ? selectedItem : undefined}
            onSelect={(idx) => handleItemSelection('amendments', idx)}
            onDelete={(idx) => handleMessageRemoval('amendments', idx)}

            itemTitle={(item) => <MessageTitle message={item as Message} />}
            itemIcon={() => "edit"}

            prompt={(highlight) =>
              <NewAmendmentPrompt
                highlight={highlight}
                issueId={issue.id}
                issueIndex={ws.issues}
                publicationIndex={ws.publications}
                disabledPublicationIDs={takenPublicationIDs}
                onCreate={item => handleNewMessage(item as Message, 'amendments')} />}

            className={styles.amendmentsList}
          />

          <ItemList
            title="Annexes"
            items={issue.annexes || {}}
            selectedIdx={selectedSection === 'annexes' ? selectedItem : undefined}
            onSelect={(idx) => handleItemSelection('annexes', idx)}
            onDelete={(idx) => handleAnnexRemoval(idx)}

            itemTitle={(item, idx) => <PublicationTitle id={idx} />}
            itemIcon={() => "paperclip"}

            prompt={(highlight) =>
              <NewAnnexPrompt
                highlight={highlight}
                issueId={issue.id}
                issueIndex={ws.issues}
                publicationIndex={ws.publications}
                disabledPublicationIDs={takenPublicationIDs}
                onCreate={item => handleNewAnnex(item as string)} />}

            className={styles.amendmentsList}
          />

        </div>
      </div>

      <div className={`
          ${styles.selectedMessagePane}
          ${isOBAnnexesSection(selectedSection) && selectedItem !== undefined ? 'editor-pane-annex' : ''}
          editor-pane-message-${selectedMessageIdx !== undefined && isOBMessageSection(selectedSection)
            ? (issue[selectedSection].messages[selectedMessageIdx] || {}).type
            : ''}
        `}>
        {editor}
      </div>

    </div>
  );
};
