import * as moment from 'moment';
import { ipcRenderer } from 'electron';

import React from 'react';
import { NonIdealState, Card, H3, Icon, Tooltip, Position } from '@blueprintjs/core';
import { Index, QuerySet } from 'sse/storage/query';
import { DateStamp } from 'renderer/widgets/dates';
import { ScheduledIssue } from 'models/issues';
import * as styles from './styles.scss';


interface UpcomingIssuesProps {
  issues: Index<ScheduledIssue>,
}
export const UpcomingIssues: React.FC<UpcomingIssuesProps> = function({ issues }) {
  const qs = new QuerySet<ScheduledIssue>(issues);
  const existingIssues = qs.all();

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

      <H3 className={styles.headerLabel}>{issue.id}</H3>

      <p className={styles.scheduleInfo}>
        <Tooltip content="Cutoff date" position={Position.RIGHT}>
          <span className={styles.cutoffDate}>
            <Icon icon="cut" />
            <DateStamp date={issue.cutoff_date} />
          </span>
        </Tooltip>
        <Tooltip content="Publication date" position={Position.LEFT}>
          <span className={styles.publicationDate}>
            <Icon icon="document-share" />
            <DateStamp date={issue.publication_date} />
          </span>
        </Tooltip>
      </p>

    </Card>
  );
};
