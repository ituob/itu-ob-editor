import AsyncLock from "async-lock";

import { ipcRenderer } from "electron";
import { getCurrentWindow } from "@electron/remote";

import React, { useMemo, useState, useEffect } from "react";
import { Spinner, NonIdealState, Button } from "@blueprintjs/core";

import { callIPC } from "@riboseinc/coulomb/ipc/renderer";
import { PaneHeader } from "@riboseinc/coulomb/renderer/widgets";

import { WindowToaster } from "renderer/toaster";
import { PublicationTitle } from "renderer/widgets/publication-title";
import { ObjectStorageStatus } from "renderer/widgets/change-status";

import { Message, AmendmentMessage, isAmendment } from "models/messages";
import { Publication } from "models/publications";
import {
  OBIssue,
  OBSection,
  OBMessageSection,
  isOBMessageSection,
  isOBAnnexesSection,
  issueFactories,
  AnnexedPosition,
} from "models/issues";

import { app } from "renderer/index";
import { ItemList } from "renderer/widgets/item-list";

import { NewGeneralMessagePrompt } from "./new-item-prompts/general-message";
import { NewAmendmentPrompt } from "./new-item-prompts/amendment";
import { NewAnnexPrompt } from "./new-item-prompts/annex";
import { MessageTitle, MessageEditor } from "./message-editor";
import { AmendmentMeta } from "./message-forms/amendment";
import { AnnexEditor } from "./annexes";

import * as styles from "./styles.scss";
import { WindowComponentProps } from "@riboseinc/coulomb/config/renderer";
import { SimpleEditableCard } from "@riboseinc/coulomb/renderer/widgets";
import { metaEditors } from "./meta";
import { useModifiedIDs } from "renderer/hooks";

const operationLock = new AsyncLock();

const Window: React.FC<WindowComponentProps> = ({ query }) => {
  const rawIssueID = query.get("objectID");
  const numIssueID: number | null = rawIssueID
    ? parseInt(rawIssueID, 10)
    : null;

  const issue = app.useOne<OBIssue, number>("issues", numIssueID).object;

  function handleChanged(evt: any, data: { ids: number[] }) {
    // Just reload the window if our issue changed
    if (numIssueID !== null && data.ids.indexOf(numIssueID) >= 0) {
      getCurrentWindow().reload();
    }
  }

  useEffect(() => {
    ipcRenderer.on("model-issues-objects-changed", handleChanged);
    return function cleanup() {
      ipcRenderer.removeListener("model-issues-objects-changed", handleChanged);
    };
  }, []);

  return useMemo(() => {
    if (issue !== null) {
      return <IssueEditor issue={issue} />;
    } else {
      return (
        <NonIdealState
          icon={<Spinner />}
          title="No issue to show right now"
          description="If you’re still seeing this, this might mean the issue failed to load."
        />
      );
    }
  }, [(issue || {}).id]);
};

export const IssueEditor: React.FC<{ issue: OBIssue }> = (props) => {
  const [issue, _updateIssue] = useState(props.issue);

  const publications = app.useMany<Publication, {}>("publications", {}).objects;

  /* Issue change status */

  const [saved, setSaved] = useState(true);

  const isUncommitted = useModifiedIDs().issues.indexOf(`${issue.id}`) >= 0;

  /* Prepare initial item selection status */

  type MetaSections = string & keyof typeof metaEditors;
  const initialItemIdx: string | undefined = undefined;
  const initialSection: OBSection | MetaSections = "metaID";

  const [selectedItem, selectItem] = useState<string | undefined>(
    initialItemIdx
  );
  const [selectedSection, selectSection] = useState<OBSection | MetaSections>(
    initialSection
  );

  // Convenience shortcuts
  const selectedMessageIdx: number | undefined =
    isOBMessageSection(selectedSection) && selectedItem !== undefined
      ? parseInt(selectedItem, 10)
      : undefined;

  const selectedAnnex =
    isOBAnnexesSection(selectedSection) && selectedItem !== undefined
      ? (issue.annexes || {})[selectedItem]
      : undefined;

  /* Storage API utilities */

  async function _commitIssue(data: OBIssue) {
    await operationLock.acquire("update-issue", async () => {
      await callIPC<
        { objectID: number; object: OBIssue; commit: boolean },
        { modified: boolean }
      >("model-issues-update-one", {
        objectID: props.issue.id,
        object: data,
        commit: true,
      });
    });
  }

  /* Issue update operations */

  async function updateIssue(data: OBIssue) {
    setSaved(false);
    //setHasUncommittedChanges(true);
    _updateIssue(data);
    //await storageUpdateIssue(data);
  }

  async function handleCommitAndQuit() {
    try {
      await _commitIssue(issue);
      setSaved(true);
    } catch (e) {
      WindowToaster.show({
        intent: "danger",
        message: "Failed to commit changes",
      });
      return;
    }
  }

  /* Message editor JSX */

  // Memoization ensures that updating items on every keystroke
  // doesn’t cause the editor pane to re-render, which may lose cursor position and undo history.
  // Only re-render if selected item index or section, meaning a switch to another item.
  const editor = useMemo(() => {
    if (metaEditors[selectedSection] !== undefined) {
      const MetaEditor = metaEditors[selectedSection];
      return <MetaEditor data={issue} onChange={handleMetaEdit} />;
    } else if (
      isOBMessageSection(selectedSection) &&
      selectedItem !== undefined
    ) {
      const message =
        issue[selectedSection].messages[parseInt(selectedItem, 10)];
      if (message) {
        return (
          <MessageEditor
            message={message}
            issue={issue}
            meta={
              isAmendment(message) ? (
                <AmendmentMeta
                  amendment={message as AmendmentMessage}
                  issue={issue}
                />
              ) : undefined
            }
            onChange={handleMessageEdit}
          />
        );
      }
    } else if (selectedAnnex !== undefined && selectedItem !== undefined) {
      return (
        <AnnexEditor
          pubId={selectedItem}
          issueId={issue.id}
          position={selectedAnnex}
          onChange={handleAnnexPositionEdit}
        />
      );
    }
    return (
      <NonIdealState
        icon="info-sign"
        title="Nothing is selected"
        description="Add or select an item on the left to start."
      />
    );
  }, [
    selectedItem,
    selectedMessageIdx,
    selectedSection,
    selectedAnnex,
    JSON.stringify([
      issue.issn,
      issue.languages,
      issue.authors,
      issue.publication_date,
      issue.cutoff_date,
    ]),
    (issue.amendments?.messages || []).length,
    (issue.general?.messages || []).length,
    Object.keys(issue.annexes || {}).length,
  ]);

  if (
    issue.amendments?.messages === undefined ||
    issue.general?.messages === undefined
  ) {
    async function deleteIssue() {
      callIPC("model-issues-delete-one", { objectID: issue.id });
      getCurrentWindow().close();
    }

    return (
      <NonIdealState
        title="Apologies"
        icon="heart-broken"
        description={
          <>
            <p>
              Data of OB issue {issue.id} appears to be malformed.
              <br />
              You may be instructed by app developers to delete it.
              <br />
              If so, click the button below.
            </p>
            <p>After deleting the issue, you can re-create it if needed.</p>
            <Button onClick={deleteIssue} intent="danger">
              Delete issue {issue.id}
            </Button>
          </>
        }
      />
    );
  }

  /* Event handling utilities */

  function handleMetaEdit(data: Partial<OBIssue>) {
    const newIssue = { ...issue, ...data };
    updateIssue(newIssue);
  }

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
    if (
      selectedMessageIdx !== undefined &&
      isOBMessageSection(selectedSection)
    ) {
      const newIssue = issueFactories.withEditedMessage(
        issue,
        selectedSection,
        selectedItem,
        updatedMessage
      );
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
      selectSection("annexes");
    }, 100);
  }

  function handleAnnexPositionEdit(
    pubId: string,
    updatedPosition: AnnexedPosition | null
  ) {
    updateIssue(
      issueFactories.withUpdatedAnnexedPublicationPosition(
        issue,
        pubId,
        updatedPosition
      )
    );
  }

  function handleAnnexRemoval(pubId: string) {
    updateIssue(issueFactories.withDeletedAnnex(issue, pubId));

    if (isOBAnnexesSection(selectedSection) && selectedItem === pubId) {
      selectItem(undefined);
    }
  }

  // IDs of publications that cannot be annexed or amended, because they already were in this issue.
  const alreadyAmendedPubIDs = issue.amendments.messages
    .map((msg) => msg as AmendmentMessage)
    .map((amd) => amd.target.publication);
  const alreadyAnnexedPubIDs = Object.keys(issue.annexes || {});

  /* Main JSX */

  return (
    <div className={styles.twoPaneEditor}>
      <div className={styles.messageListPane}>
        <ObjectStorageStatus
          objectType="OB"
          objectID={issue.id}
          haveSaved={saved && !isUncommitted}
          onCommit={handleCommitAndQuit}
        />

        <div className={styles.paneBody}>
          <div className={styles.metaSectionList}>
            <PaneHeader minor={true} align="left">
              Settings
            </PaneHeader>

            <SimpleEditableCard
              minimal
              icon="numerical"
              selected={selectedSection === "metaID"}
              onSelect={() => selectSection("metaID")}
            >
              Identifiers
            </SimpleEditableCard>
            <SimpleEditableCard
              minimal
              icon="timeline-events"
              selected={selectedSection === "metaSchedule"}
              onSelect={() => selectSection("metaSchedule")}
            >
              Schedule
            </SimpleEditableCard>
            <SimpleEditableCard
              minimal
              icon="people"
              selected={selectedSection === "metaAuthors"}
              onSelect={() => selectSection("metaAuthors")}
            >
              Authors
            </SimpleEditableCard>
            <SimpleEditableCard
              minimal
              icon="translate"
              selected={selectedSection === "metaLanguages"}
              onSelect={() => selectSection("metaLanguages")}
            >
              Languages
            </SimpleEditableCard>
            <SimpleEditableCard
              minimal
              icon="delete"
              selected={selectedSection === "metaDeleteIssue"}
              onSelect={() => selectSection("metaDeleteIssue")}
            >
              Delete issue
            </SimpleEditableCard>
          </div>

          <ItemList
            title="General Messages"
            items={issue.general.messages}
            selectedIdx={
              selectedSection === "general" ? selectedItem : undefined
            }
            onSelect={(idx) => handleItemSelection("general", idx)}
            onDelete={(idx) => handleMessageRemoval("general", idx)}
            itemTitle={(item) => <MessageTitle message={item as Message} />}
            itemIcon={() => "clipboard"}
            prompt={(highlight) => (
              <NewGeneralMessagePrompt
                highlight={highlight}
                existingMessages={issue.general.messages}
                onCreate={(item) =>
                  handleNewMessage(item as Message, "general")
                }
              />
            )}
            className={styles.generalMessageList}
          />

          <ItemList
            title="Amendments"
            items={issue.amendments.messages}
            selectedIdx={
              selectedSection === "amendments" ? selectedItem : undefined
            }
            onSelect={(idx) => handleItemSelection("amendments", idx)}
            onDelete={(idx) => handleMessageRemoval("amendments", idx)}
            itemTitle={(item) => <MessageTitle message={item as Message} />}
            itemIcon={() => "edit"}
            prompt={(highlight) => (
              <NewAmendmentPrompt
                highlight={highlight}
                issueId={issue.id}
                publicationIndex={publications}
                disabledPublicationIDs={alreadyAmendedPubIDs}
                onCreate={(item) =>
                  handleNewMessage(item as Message, "amendments")
                }
              />
            )}
            className={styles.amendmentsList}
          />

          <ItemList
            title="Annexes"
            items={issue.annexes || {}}
            selectedIdx={
              selectedSection === "annexes" ? selectedItem : undefined
            }
            onSelect={(idx) => handleItemSelection("annexes", idx)}
            onDelete={(idx) => handleAnnexRemoval(idx)}
            itemTitle={(item, idx) => <PublicationTitle id={idx} />}
            itemIcon={() => "paperclip"}
            prompt={(highlight) => (
              <NewAnnexPrompt
                highlight={highlight}
                issueId={issue.id}
                publicationIndex={publications}
                disabledPublicationIDs={alreadyAnnexedPubIDs}
                onCreate={(item) => handleNewAnnex(item as string)}
              />
            )}
            className={styles.amendmentsList}
          />
        </div>
      </div>

      <div
        className={`
          ${styles.selectedMessagePane}
          ${
            isOBAnnexesSection(selectedSection) && selectedItem !== undefined
              ? "editor-pane-annex"
              : ""
          }
          editor-pane-message-${
            selectedMessageIdx !== undefined &&
            isOBMessageSection(selectedSection)
              ? (issue[selectedSection].messages[selectedMessageIdx] || {}).type
              : ""
          }
        `}
      >
        {editor}
      </div>
    </div>
  );
};

export default Window;
