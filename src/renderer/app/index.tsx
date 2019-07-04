import * as React from 'react';
import { remote } from 'electron';
import { createWindow } from '../../main/window';
import { useEffect } from 'react';
import { Card, Navbar, NavbarHeading, NavbarGroup, Button, Classes } from '@blueprintjs/core';
import { useTimeTravel } from './useTimeTravel';
import { Language } from './localizer';
import { Publication, OBIssue, PublicationCard, OBIssueCard } from './publications';
import { Workspace, WorkspaceState, QuerySet, sortIntegerAscending, sortIntegerDescending } from './workspace';


interface AppProps {
  workspace: Workspace,
  defaultLang: Language,
  qs: string,
  languages: Language[],
}

const initialWS: WorkspaceState = {
  publications: {},
  issues: {},
}

function reducer(state: WorkspaceState, action: any) {
  switch (action.type) {
    case 'FETCH_DATA':
      state.publications = action.publications;
      state.issues = action.issues;
      break;
    case 'UPDATE_ISSUE_SCHEDULE':
      state.issues[action.id].publication_date = action.publication_date;
      state.issues[action.id].cutoff_date = action.cutoff_date;
      break;
  }
}

export function App(props: AppProps): React.ReactElement {
  const langConfig = {
    default: props.defaultLang,
    selected: props.defaultLang,
  };

  const { state, dispatch, timeline, doUndo, doRedo } = useTimeTravel(
    props.workspace,
    reducer,
    initialWS);
  // Silence TS
  console.debug(timeline, doUndo, doRedo);

  useEffect(() => {
    (async function () {
      const wsState = await props.workspace.loadState();

      dispatch({
        type: 'FETCH_DATA',
        publications: wsState.publications,
        issues: wsState.issues,
      });

      window.setTimeout(() => {
        dispatch({
          type: 'UPDATE_ISSUE_SCHEDULE',
          id: 1173,
          publication_date: new Date('2019-08-20'),
          cutoff_date: new Date('2019-08-10'),
        });
      }, 5000);
    })();
  }, []);

  const publications = new QuerySet<Publication>(state.publications);
  const issues = new QuerySet<OBIssue>(state.issues, sortIntegerAscending)

  const previousIssues = issues.filter((item) => {
    return item[1].publication_date.getTime() < new Date().getTime();
  }).orderBy(sortIntegerDescending).all().slice(0, 1);

  const futureIssues = issues.filter((item) => {
    return item[1].publication_date.getTime() >= new Date().getTime();
  }).orderBy(sortIntegerAscending).all();

  return (
    <React.Fragment>
      <Navbar role="toolbar">
        <NavbarGroup>
          <NavbarHeading>{props.qs}</NavbarHeading>
          <Button className={Classes.MINIMAL} text="Hey" />
        </NavbarGroup>
      </Navbar>

      <Card>
        <h2>Service publications</h2>
        {Object.keys(state.publications).length > 0
          ? <React.Fragment>
              {publications.all().map((pub) =>
                <PublicationCard key={pub.id} pub={pub} lang={langConfig} />
              )}
            </React.Fragment>
          : <p>No publications in the database.</p>}
      </Card>

      <Card>
        <h2>OB issues</h2>
        {Object.keys(state.issues).length > 0
          ? <React.Fragment>
              {[...previousIssues, ...futureIssues].map((issue) =>
                <OBIssueCard key={issue.id} issue={issue} />
              )}
            </React.Fragment>
          : <p>No OB issues in the database.</p>}
      </Card>
    </React.Fragment>
  );
}
