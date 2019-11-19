import { debounce } from 'throttle-debounce';

import React, { useMemo, useState, useEffect } from 'react';
import { Spinner, NonIdealState } from '@blueprintjs/core';

import { useWorkspace } from 'renderer/workspace-context';

import { request } from 'sse/api/renderer';
import { PaneHeader } from 'sse/renderer/widgets/pane-header';

import { PublicationTitle } from 'renderer/widgets/publication-title';

// import { useStorageOperation } from 'renderer/use-api';

import {
  OBIssue,
  OBSection, OBMessageSection,
  isOBSection, isOBMessageSection, isOBAnnexesSection,
  issueFactories,
} from 'models/issues';

import { Message, MessageType, AmendmentMessage } from 'models/messages';

import { ItemList } from './item-list';
import { NewGeneralMessagePrompt } from './item-list/new-general-message-menu';
import { NewAmendmentPrompt } from './item-list/new-amendment-menu';
import { NewAnnexPrompt } from './item-list/new-annex-menu';
import { MessageTitle, MessageEditor } from './message-editor';
import { AnnexEditor } from './annex-editor';

import * as styles from './styles.scss';


interface IssueEditorSelection {
  section: OBSection,
  item: string,
}

const GENERAL_MESSAGE_ORDER: MessageType[] = [
  'running_annexes',
  'approved_recommendations',
  'telephone_service',
  'telephone_service_2',
  'sanc',
  'iptn',
  'ipns',
  'mid',
  'org_changes',
  'misc_communications',
  'custom',
  'service_restrictions',
  'callback_procedures',
];


interface IssueEditorWindowProps {
  issueId: string,
  selectedSection?: string,
  selectedItem?: string,
}
export const Window: React.FC<IssueEditorWindowProps> = ({ issueId, selectedSection, selectedItem }) => {
  const [maybeIssue, updateIssue] = useState(null as OBIssue | null);

  useEffect(() => {
    storageGetIssue();
  }, []);

  async function storageGetIssue() {
    const issue = await request<OBIssue>('issue', { issueId });
    updateIssue(issue);
  }

  if (maybeIssue !== null) {
    let selection: IssueEditorSelection | undefined;
    if (selectedItem && selectedSection && isOBSection(selectedSection)) {
      selection = { section: selectedSection, item: selectedItem };
    } else {
      selection = undefined;
    }
    return <IssueEditor issue={maybeIssue as OBIssue} selection={selection} />;
  }

  return <Spinner className={styles.spinner} />;
};


export const IssueEditor: React.FC<{ issue: OBIssue, selection?: IssueEditorSelection }> = (props) => {
  const [issue, updateIssue] = useState(props.issue);
  const ws = useWorkspace();
  const [isDirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(true);
    storageUpdateIssue(props.issue.id, issue);
  }, [issue]);


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

  async function _storageUpdateIssue(issueId: number, updatedIssue: OBIssue) {
    // TODO: Handle API failure
    await request<{ success: boolean }>('issue-update', { issueId, data: updatedIssue });
    setDirty(false);
  }
  // Slow down updates to reduce the chance of race condition when user makes many edits in rapids succession
  // TODO: A lock would be better
  const storageUpdateIssue = debounce(1000, _storageUpdateIssue);


  /* Issue update operations */

  // const updateMessage = useStorageOperation<
  //   { issueId: number },
  //   { updatedMsg: Message, section: OBMessageSection, msgIdx: number },
  //   { success: boolean }>(
  //   "Edited message",
  //   'issue-update-message', { issueId: issue.id }, {},
  //   [selectedSection, selectedItem]);

  /* Message editor JSX */

  // Memoization ensures that updating items on every keystroke
  // doesn’t cause the editor pane to re-render, which may lose cursor position and undo history.
  // Only re-render if selected item index or section, meaning a switch to another item.
  const editor = useMemo(() => {

    if (isOBMessageSection(selectedSection) && selectedItem !== undefined) {
      const message = issue[selectedSection].messages[parseInt(selectedItem, 10)];
      if (message) {
        return <MessageEditor
            workspace={ws}
            message={message}
            issue={issue}
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
    let idx: number;
    if (inSection === 'general') {
      idx = GENERAL_MESSAGE_ORDER.indexOf(msg.type);
    } else {
      idx = issue[inSection].messages.length;
    }
    const newIssue = issueFactories.withAddedMessage(issue, inSection, idx, msg);
    updateIssue(newIssue)

    //storageUpdateIssue('create-message', { section: inSection, msgIdx: idx, msg: msg });

    selectSection(inSection);
    selectItem(`${idx}`);
  }

  function handleMessageEdit(updatedMessage: Message) {
    if (selectedMessageIdx !== undefined && isOBMessageSection(selectedSection)) {
      const newIssue = issueFactories.withEditedMessage(issue, selectedSection, selectedItem, updatedMessage);
      updateIssue(newIssue);

      // updateMessage(getMessageTypeTitle(updatedMessage.type), {
      //   section: selectedSection,
      //   msgIdx: selectedMessageIdx,
      //   updatedMsg: updatedMessage,
      // });

      //storageUpdateIssue('update-message', {
      //  section: selectedSection,
      //  msgIdx: selectedMessage,
      //  updatedMsg: updatedMessage,
      //});
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


  /* Main JSX */

  return (
    <div className={styles.twoPaneEditor}>
      <div className={styles.messageListPane}>

        <PaneHeader align="right" major={true} className={styles.paneHeader}>
          {isDirty ? <Spinner className={styles.paneSpinner} size={16} /> : null}
          Edition № <span className={styles.paneHeaderIssueId}>{issue.id}</span>
        </PaneHeader>
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
