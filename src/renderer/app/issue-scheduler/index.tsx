import * as React from 'react';
import { Position, Classes, H5, Card, Button, Drawer } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';
import { useTimeTravel, TimeTravel } from '../useTimeTravel';
import { OBIssue } from '../publications';
import { Workspace, WorkspaceState, QuerySet, sortIntegerAscending, sortIntegerDescending } from '../workspace';
import * as styles from './styles.scss';


interface OBIssueSkeleton {
  id: number,
}

/* Determine whether we were given an issue skeleton/template to schedule,
   or a proper issue to reschedule. */
function isScheduledIssue(obj: OBIssue | OBIssueSkeleton): obj is OBIssue {
  return (obj as OBIssue).publication_date !== undefined && (obj as OBIssue).cutoff_date !== undefined;
}


function reducer(state: WorkspaceState, action: any) {
  switch (action.type) {
    case 'SCHEDULE_ISSUE':
      if (!state.issues[action.id]) {
        state.issues[action.id] = {
          id: action.id as number,
          publication_date: action.publication_date as Date,
          cutoff_date: action.cutoff_date as Date,
          general: { messages: [] },
          amendments: { messages: [] },
          annexes: {},
        };
      } else {
        state.issues[action.id].publication_date = action.publication_date;
        state.issues[action.id].cutoff_date = action.cutoff_date;
      }
      break;
  }
}


interface IssueSchedulerProps { workspace: Workspace }

export function IssueScheduler(props: IssueSchedulerProps) {
  const tt: TimeTravel = useTimeTravel(props.workspace, reducer, props.workspace.state) as TimeTravel;

  const issues = new QuerySet<OBIssue>(tt.state.issues, sortIntegerAscending);

  const previousIssues = issues.filter((item) => {
    return item[1].publication_date.getTime() < new Date().getTime();
  }).orderBy(sortIntegerDescending).all().slice(0, 1);

  const futureIssues = issues.filter((item) => {
    return item[1].publication_date.getTime() >= new Date().getTime();
  }).orderBy(sortIntegerAscending).all();

  const existingIssues = [...previousIssues, ...futureIssues];

  const displayedIssues: Array<{ id: number } | OBIssue> = existingIssues.length >= 20
    ? existingIssues
    : [...existingIssues, {
      id: existingIssues.slice(-1)[0].id + 1,
    }];

  // window.setTimeout(() => {
  //   tt.dispatch({
  //     type: 'SCHEDULE_ISSUE',
  //     id: 1173,
  //     publication_date: new Date('2019-08-20'),
  //     cutoff_date: new Date('2019-08-10'),
  //   });
  // }, 5000);

  return (
    <div className={styles.issueScheduler}>
      {displayedIssues.length > 0
        ? displayedIssues.map((issue) =>
              <IssueScheduleCard key={issue.id} issue={issue} onSchedule={(issue: OBIssue) => {
                tt.dispatch({
                  'type': 'SCHEDULE_ISSUE',
                  id: issue.id,
                  publication_date: issue.publication_date,
                  cutoff_date: issue.cutoff_date,
                });
              }} />
          )
        : <p>No OB issues in the database.</p>}
    </div>
  );

}


interface IssueScheduleCardProps {
  issue: OBIssueSkeleton | OBIssue,
  onSchedule: (issue: OBIssue) => void,
}

interface IssueScheduleCardState {
  pubDate: Date | undefined,
  cutoffDate: Date | undefined,
  scheduling: boolean,
}

class IssueScheduleCard extends React.Component<IssueScheduleCardProps, IssueScheduleCardState> {
  constructor(props: IssueScheduleCardProps) {
    super(props);

    let pubDate: Date | undefined;
    let cutoffDate: Date | undefined;

    if (isScheduledIssue(this.props.issue)) {
      pubDate = this.props.issue.publication_date;
      cutoffDate = this.props.issue.cutoff_date;
    }

    this.state = { pubDate, cutoffDate, scheduling: false };
  }

  render() {

    return (
      <Card role="article">
        <H5>
          No. {this.props.issue.id}
        </H5>
        {this.state.pubDate && this.state.cutoffDate
          ? <span>
              <span>Publication: <DateStamp date={this.state.pubDate} /></span>
              &ensp;
              <span>Cutoff: <DateStamp date={this.state.cutoffDate} /></span>
              &ensp;
              <a onClick={this.startScheduling.bind(this)}>Reschedule</a>
            </span>
          : <Button onClick={this.startScheduling.bind(this)}>Schedule</Button>}
        <Drawer
            position={Position.BOTTOM}
            title={`Schedule issue ${this.props.issue.id}`}
            isOpen={this.state.scheduling}
            onClose={this.updateIssue.bind(this)}>
          <div className={`${styles.datePickerContainer} ${Classes.DRAWER_BODY}`}>
            <Card className={styles.pickerCard}>
              <H5>Publication date</H5>
              <DatePicker canClearSelection={false} value={this.state.pubDate} onChange={this.updatePublicationDate.bind(this)} />
            </Card>
            <Card className={styles.pickerCard}>
              <H5>Cutoff date</H5>
              <DatePicker canClearSelection={false} value={this.state.cutoffDate} onChange={this.updateCutoffDate.bind(this)} />
            </Card>
          </div>
        </Drawer>
      </Card>
    );
  }

  startScheduling() {
    this.setState({ scheduling: true });
  }

  updateIssue() {
    var issue = Object.assign({}, this.props.issue, {
      publication_date: this.state.pubDate,
      cutoff_date: this.state.cutoffDate,
    });
    if (isScheduledIssue(issue)) {
      this.props.onSchedule(issue);
    }
    this.setState({ scheduling: false });
  }

  updatePublicationDate(date: Date) {
    this.setState({ pubDate: date });
  }

  updateCutoffDate(date: Date) {
    this.setState({ cutoffDate: date });
  }
}


interface DateStampProps { date: Date }

function DateStamp(props: DateStampProps) {
  return (
    <React.Fragment>
      <span className={'day'}>{props.date.getDate()}</span
        ><span className={'separator'}>.</span
        ><span className={'month'}>{monthAsRoman(props.date.getMonth())}</span
        ><span className={'separator'}>.</span
        ><span className={'year'}>{props.date.getFullYear()}</span>
    </React.Fragment>
  );
}


function monthAsRoman(num: number): string {
  const romanMonths: { [num: number]: string } = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X',
    11: 'XI',
    12: 'XII',
  }
  return romanMonths[num];
}
