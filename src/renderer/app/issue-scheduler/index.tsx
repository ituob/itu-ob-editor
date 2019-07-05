import { ipcRenderer } from 'electron';
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

interface IssueSchedule {
  publication_date: Date,
  cutoff_date: Date,
}

/* Determine whether we were given an issue skeleton/template to schedule,
   or a proper issue to reschedule. */
function isScheduledIssue(obj: OBIssue | OBIssueSkeleton): obj is OBIssue {
  return (obj as OBIssue).publication_date !== undefined && (obj as OBIssue).cutoff_date !== undefined;
}


function reducer(state: WorkspaceState, action: any) {
  switch (action.type) {
    case 'SCHEDULE_ISSUE':
      console.debug(state.issues);
      if (state.issues[action.id]) {
        break;
      }
      state.issues[action.id] = {
        id: action.id as number,
        publication_date: action.publication_date as Date,
        cutoff_date: action.cutoff_date as Date,
        general: { messages: [] },
        amendments: { messages: [] },
        annexes: {},
      };
      break;
  }
}


interface IssueSchedulerProps { workspace: Workspace }

export function IssueScheduler(props: IssueSchedulerProps) {
  const tt: TimeTravel = useTimeTravel(props.workspace, reducer, props.workspace.state);

  const issues = new QuerySet<OBIssue>(tt.state.issues, sortIntegerAscending);

  const previousIssues = issues.filter((item) => {
    return item[1].publication_date.getTime() < new Date().getTime();
  }).orderBy(sortIntegerDescending).all().slice(0, 1);

  const futureIssues = issues.filter((item) => {
    return item[1].publication_date.getTime() >= new Date().getTime();
  }).orderBy(sortIntegerAscending).all();

  const existingIssues = [...previousIssues, ...futureIssues];

  // If there are too few issues, append issue skeleton to schedule the next one
  const displayedIssues: Array<{ id: number } | OBIssue> = existingIssues.length >= 20
    ? existingIssues
    : [...existingIssues, {
      id: existingIssues.slice(-1)[0].id + 1,
    }];

  return (
    <div className={styles.issueScheduler}>
      {displayedIssues.length > 0
        ? displayedIssues.map((issue) =>
            <IssueScheduleCard
              key={issue.id}
              issue={issue}
              onSchedule={(schedule: IssueSchedule) => {
                tt.dispatch({
                  'type': 'SCHEDULE_ISSUE',
                  id: issue.id,
                  publication_date: schedule.publication_date,
                  cutoff_date: schedule.cutoff_date,
                });
              }}
              onEditClick={() => ipcRenderer.send('edit-issue', `${issue.id}`)}
            />
          )
        : <p>No OB issues in the database.</p>}
    </div>
  );

}


interface IssueScheduleCardProps {
  issue: OBIssueSkeleton | OBIssue,
  onSchedule: (schedule: IssueSchedule) => void,
  onEditClick: () => void,
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
        {this.state.pubDate && this.state.cutoffDate && !this.state.scheduling
          ? <span>
              <span>Publication: <DateStamp date={this.state.pubDate} /></span>
              &ensp;
              <span>Cutoff: <DateStamp date={this.state.cutoffDate} /></span>
              &nbsp;
              <a onClick={this.props.onEditClick}>Edit</a>
            </span>
          : <React.Fragment>
              <Button onClick={this.startScheduling.bind(this)}>Schedule</Button>

              <Drawer
                  position={Position.BOTTOM}
                  title={`Schedule issue ${this.props.issue.id}`}
                  isOpen={this.state.scheduling}
                  onClose={this.finishScheduling.bind(this)}>
                <div className={`${styles.datePickerContainer} ${Classes.DRAWER_BODY}`}>

                  <Card className={styles.pickerCard}>
                    <H5>Publication date</H5>
                    <DatePicker
                      canClearSelection={false}
                      value={this.state.pubDate}
                      onChange={this.updatePublicationDate.bind(this)} />
                  </Card>

                  <Card className={styles.pickerCard}>
                    <H5>Cutoff date</H5>
                    <DatePicker
                      canClearSelection={false}
                      value={this.state.cutoffDate}
                      onChange={this.updateCutoffDate.bind(this)} />
                  </Card>

                </div>
              </Drawer>
            </React.Fragment>
          }
      </Card>
    );
  }

  startScheduling() {
    this.setState({ scheduling: true });
  }

  finishScheduling() {
    if (this.state.pubDate && this.state.cutoffDate) {
      const schedule: IssueSchedule = {
        publication_date: this.state.pubDate,
        cutoff_date: this.state.cutoffDate,
      };
      this.props.onSchedule(schedule);
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
