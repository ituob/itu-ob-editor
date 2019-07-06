import * as React from 'react';
import { Navbar, NavbarHeading, NavbarGroup } from '@blueprintjs/core';
import { Storage, Workspace } from 'renderer/app/storage';
import { QuerySet } from 'renderer/app/storage/query';
import { Message, OBIssue } from 'renderer/app/issues/models';
import { useTimeTravel, TimeTravel } from 'renderer/app/useTimeTravel';
import { MessageView } from './messages';
import * as styles from './styles.scss';


function reducer(state: Workspace, action: any) {
  switch (action.type) {
    case 'ADD_GENERAL_MESSAGE':
      if (!state.issues[action.id]) {
        break;
      }
      state.issues[action.id].general.messages.push(action.message);
      break;

    case 'EDIT_GENERAL_MESSAGE':
      if (!state.issues[action.id]) {
        break;
      }
      state.issues[action.id].general.messages[action.messageIdx] = {
        ...state.issues[action.id].general.messages[action.messageIdx],
        ...action.messageData,
      };
      break;

    case 'REMOVE_GENERAL_MESSAGE':
      state.issues[action.id].general.messages.splice(action.index, 1);
      break;

    case 'ADD_RECOMMENDATION':
      break;

    case 'ADD_LIST':
      break;
  }
}


interface IssueEditorProps {
  storage: Storage,
  issueId: string,
}
export function IssueEditor(props: IssueEditorProps) {
  const tt: TimeTravel = useTimeTravel(props.storage, reducer, props.storage.workspace);
  const issues = new QuerySet<OBIssue>(tt.state.issues);
  const issue: OBIssue = issues.get(props.issueId);

  return (
    <React.Fragment>
      <Navbar>
        <NavbarGroup>
          <NavbarHeading>{props.issueId}</NavbarHeading>
        </NavbarGroup>
      </Navbar>
      <div>
        <h2 className={styles.issueSectionHeader}>General</h2>
        {[...issue.general.messages.entries()].map(([idx, msg]: [number, Message]) => (
          <MessageView
            msg={msg}
            workspace={tt.state}
            onChange={(updatedMessage) => tt.dispatch({
              type: 'EDIT_GENERAL_MESSAGE',
              id: issue.id,
              messageIdx: idx,
              messageData: updatedMessage,
            })}
          />
        ))}
      </div>
    </React.Fragment>
  )
}
