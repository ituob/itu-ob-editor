import * as React from 'react';
import { Workspace } from '../workspace';

interface IssueEditorProps {
  workspace: Workspace,
  issueId: string,
}
export function IssueEditor(props: IssueEditorProps) {
  return <h1>Editing issue {props.issueId}</h1>
}
