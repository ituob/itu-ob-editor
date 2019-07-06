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
    case 'REMOVE_GENERAL_MESSAGE':
      state.issues[action.id].general.messages.splice(action.index, 1);
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
        {issue.general.messages.map((msg: Message) => (
          <MessageView msg={msg} workspaceState={tt.state} />
        ))}
      </div>
    </React.Fragment>
  )
}
