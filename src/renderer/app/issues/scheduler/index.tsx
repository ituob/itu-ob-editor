import moment from 'moment';
import { ipcRenderer, remote } from 'electron';
import * as React from 'react';
import { Callout, Position, Classes, H3, H5, Button, Card, Drawer } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';

import { OBIssue } from 'main/issues/models';

import { useWorkspace, useWorkspaceRO } from 'renderer/app/storage/api';
import { DateStamp } from 'renderer/app/dates';

import * as styles from './styles.scss';


function reducer(issues: OBIssue[], action: any) {
  switch (action.type) {
    case 'FETCH_DATA':
      issues.length = 0;
      for (let issue of action.data) {
        issues.push(issue);
      }
      break;
    case 'SCHEDULE_ISSUE':
      if (issues.find(i => i.id === action.id) !== undefined) {
        break;
      }
      issues.push({
        id: action.id as number,
        publication_date: action.publication_date as Date,
        cutoff_date: action.cutoff_date as Date,
        general: { messages: [] },
        amendments: { messages: [] },
        annexes: {},
      });
      ipcRenderer.send('scheduled-new-issue');
      break;
  }
}


interface IssueSchedule {
  publication_date: Date,
  cutoff_date: Date,
}


interface IssueSchedulerProps {}

export function IssueScheduler(props: IssueSchedulerProps) {
  const previousIssues = useWorkspaceRO<OBIssue[]>('latest-published-issues', [])
  const futureIssues = useWorkspace<OBIssue[]>('future-issues', reducer, []);

  const existingIssues = [...previousIssues, ...futureIssues.state];

  let newIssueTemplate: OBIssue;
  let minDate: Date;

  if (existingIssues.length > 0) {
    const latestIssue = existingIssues.slice(-1)[0];
    minDate = moment(latestIssue.publication_date).toDate();
    newIssueTemplate = {
      id: latestIssue.id + 1,
      publication_date: moment(latestIssue.publication_date).add(2, 'weeks').toDate(),
      cutoff_date: moment(latestIssue.cutoff_date).add(2, 'weeks').toDate(),
      general: { messages: [] },
      amendments: { messages: [] },
      annexes: {},
    };

  } else {
    minDate = moment().toDate();
    newIssueTemplate = {
      id: 1,
      publication_date: moment().add(4, 'weeks').toDate(),
      cutoff_date: moment().add(2, 'weeks').toDate(),
      general: { messages: [] },
      amendments: { messages: [] },
      annexes: {},
    };
  }

  return (
    <div className={styles.issueScheduler} style={{background: remote.systemPreferences.getColor('control-background')}}>
      {existingIssues.length > 0
        ? existingIssues.map((issue) =>
            <IssueScheduleCard
              key={issue.id}
              issue={issue}
              onEditClick={() => ipcRenderer.sendSync('open-issue-editor', `${issue.id}`)}
            />
          )
        : <p>No OB issues in the database.</p>}
      {existingIssues.length < 20
        ? <NewIssueScheduleButton
            issue={newIssueTemplate}
            minDate={minDate}
            onSchedule={(schedule: IssueSchedule) => {
              futureIssues.dispatch({
                'type': 'SCHEDULE_ISSUE',
                id: newIssueTemplate.id,
                publication_date: schedule.publication_date,
                cutoff_date: schedule.cutoff_date,
              });
            }}
          />
        : ''}
    </div>
  );
}


interface NewIssueScheduleButtonProps {
  minDate: Date,
  issue: OBIssue,
  onSchedule: (schedule: IssueSchedule) => void,
}
interface NewIssueScheduleButtonState {
  pubDate: Date | undefined,
  cutoffDate: Date | undefined,
  scheduling: boolean,
}
class NewIssueScheduleButton extends React.Component<NewIssueScheduleButtonProps, NewIssueScheduleButtonState> {
  constructor(props: NewIssueScheduleButtonProps) {
    super(props);
    let pubDate = props.issue.publication_date;
    let cutoffDate = undefined;
    this.state = { pubDate, cutoffDate, scheduling: false };
  }

  componentWillReceiveProps(props: NewIssueScheduleButtonProps) {
    let pubDate = props.issue.publication_date;
    let cutoffDate = undefined;
    this.setState({ pubDate, cutoffDate });
  }

  render() {
    return (
      <div className={styles.newIssueScheduleButton}>
        <Button
            intent="success"
            className={Classes.LARGE}
            onClick={this.startScheduling.bind(this)}>Schedule {this.props.issue.id}</Button>

        <Drawer
            size={'calc(100% - 3rem)'}
            position={Position.BOTTOM}
            title={`Schedule issue ${this.props.issue.id}`}
            isOpen={this.state.scheduling}
            onClose={this.finishScheduling.bind(this)}>
          <div className={`${styles.datePickerContainer} ${Classes.DRAWER_BODY}`}>

            <Callout intent="primary">
              <p>If both dates are selected, closing this will save new issue schedule.</p>
              <p>Click on selected day to deselect date.</p>
            </Callout>

            <Card className={styles.pickerCard}>
              <H5>Publication date</H5>
              <DatePicker
                canClearSelection={true}
                value={this.state.pubDate}
                minDate={this.props.minDate}
                maxDate={moment().add(1, 'years').toDate()}
                onChange={this.updatePublicationDate.bind(this)} />
            </Card>

            <Card className={styles.pickerCard}>
              <H5>Cutoff date</H5>
              <DatePicker
                canClearSelection={true}
                value={this.state.cutoffDate}
                minDate={this.props.minDate}
                maxDate={this.state.pubDate || undefined}
                onChange={this.updateCutoffDate.bind(this)} />
            </Card>

          </div>
        </Drawer>
      </div>
    )
  }
  startScheduling() {
    this.setState({ scheduling: true });
  }
  finishScheduling() {
    if (this.state.pubDate && this.state.cutoffDate) {
      const schedule: IssueSchedule = {
        publication_date: moment(this.state.pubDate).toDate(),
        cutoff_date: moment(this.state.cutoffDate).toDate(),
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



interface IssueScheduleCardProps {
  issue: OBIssue,
  onEditClick: () => void,
}
class IssueScheduleCard extends React.Component<IssueScheduleCardProps, {}> {
  render() {
    const isPast = moment(this.props.issue.publication_date).isBefore(moment());
    return (
      <Card
          interactive={true}
          onClick={this.props.onEditClick}
          className={`${styles.issueScheduleCard} ${isPast ? styles.pastIssueCard : ''}`}>
        <H3>{this.props.issue.id}</H3>

        <p className={styles.scheduleInfo}>
          <span>Publication: <DateStamp date={this.props.issue.publication_date} /></span>
          <span>Cutoff: <DateStamp date={this.props.issue.cutoff_date} /></span>
        </p>
      </Card>
    );
  }
}
