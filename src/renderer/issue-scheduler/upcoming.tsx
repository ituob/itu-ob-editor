import * as moment from 'moment';
import { ipcRenderer } from 'electron';

import React from 'react';
import { NonIdealState, Card, H3 } from '@blueprintjs/core';
import { Index, QuerySet, sortIntegerAscending, sortIntegerDescending } from 'sse/storage/query';
import { DateStamp } from 'renderer/widgets/dates';
import { ScheduledIssue } from 'models/issues';
import * as styles from './styles.scss';


interface UpcomingIssuesProps {
  issues: Index<ScheduledIssue>,
}
export const UpcomingIssues: React.FC<UpcomingIssuesProps> = function({ issues }) {
  const qs = new QuerySet<ScheduledIssue>(issues);

  const previousIssues = qs.filter((item) => {
    return new Date(item[1].publication_date).getTime() < new Date().getTime();
  }).orderBy(sortIntegerDescending).all().slice(0, 1);

  const futureIssues = qs.filter(item => {
    return new Date(item[1].publication_date).getTime() >= new Date().getTime();
  }).orderBy(sortIntegerAscending).all();

  const existingIssues = [...previousIssues, ...futureIssues];

  return (
    <div className={styles.upcomingIssues}>
      {existingIssues.length > 0
        ? existingIssues.map((issue) =>
            <IssueScheduleCard
              key={issue.id}
              issue={issue}
              onEditClick={() => ipcRenderer.sendSync('open-issue-editor', `${issue.id}`)}
            />)
        : <NonIdealState icon="zoom-out" title="No OB editions found" />}
    </div>
  );
};


interface IssueScheduleCardProps {
  issue: ScheduledIssue,
  onEditClick: () => void,
}
const IssueScheduleCard: React.FC<IssueScheduleCardProps> = function ({ issue, onEditClick }) {
  const isPast = moment(issue.publication_date).isBefore(moment());

  return (
    <Card
        onClick={onEditClick}
        className={`${styles.issueScheduleCard} ${isPast ? styles.pastIssueCard : ''}`}>
      <H3>{issue.id}</H3>

      <p className={styles.scheduleInfo}>
        <span>Publication: <DateStamp date={issue.publication_date} /></span>
        <span>Cutoff: <DateStamp date={issue.cutoff_date} /></span>
      </p>
    </Card>
  );
};
