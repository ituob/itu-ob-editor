import * as moment from 'moment';

import React from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { NonIdealState, H3, Icon, Tooltip, Position } from '@blueprintjs/core';
import { Index, QuerySet } from 'sse/storage/query';
import { openWindow } from 'sse/api/renderer';
import { SimpleEditableCard } from 'sse/renderer/widgets/editable-card-list';
import { DateStamp } from 'renderer/widgets/dates';
import { ScheduledIssue } from 'models/issues';
import * as styles from './styles.scss';


export const ITEM_ENTRY_EXIT_TRANSITION_DURATION_MS = 500;


interface UpcomingIssuesProps {
  issues: Index<ScheduledIssue>,
  currentIssueId?: number,
  userIsEditing?: boolean,
}
export const UpcomingIssues: React.FC<UpcomingIssuesProps> = function({ issues, userIsEditing, currentIssueId }) {
  const qs = new QuerySet<ScheduledIssue>(issues);
  const existingIssues = qs.all();

  return (
    <div className={styles.upcomingIssues}>
      {existingIssues.length > 0
        ? <TransitionGroup
              className="upcoming-issue-list"
              exit={userIsEditing === true}
              enter={userIsEditing === true}>
            {existingIssues.map((issue) =>
              <CSSTransition
                  key={issue.id}
                  timeout={ITEM_ENTRY_EXIT_TRANSITION_DURATION_MS}
                  classNames="issueScheduleCardTransition">
                <IssueScheduleCard
                  issue={issue}
                  isCurrent={currentIssueId === issue.id}
                  onEditClick={() => openWindow('issue-editor', { issueId: issue.id })}
                />
              </CSSTransition>)}
          </TransitionGroup>
        : <NonIdealState icon="zoom-out" title="No OB editions found" />}
    </div>
  );
};


interface IssueScheduleCardProps {
  issue: ScheduledIssue,
  isCurrent: boolean,
  onEditClick: () => void,
}
const IssueScheduleCard: React.FC<IssueScheduleCardProps> = function ({ issue, onEditClick, isCurrent }) {
  const isPast = moment(issue.publication_date).isBefore(moment());

  let status: JSX.Element;
  if (isPast) {
    status = <><Icon icon="tick-circle" />Published</>;
  } else if (isCurrent) {
    status = <><Icon icon="circle-arrow-right" />Planned next</>;
  } else {
    status = <><Icon icon="calendar" />Planned</>;
  }

  return (
    <SimpleEditableCard
        extended={true}
        minimal={true}
        contentsClassName={styles.issueCardContents}
        className={isCurrent ? styles.currentIssueCard : undefined}
        onClick={onEditClick}>

      <header className={styles.issueInfo}>
        <H3 className={styles.headerLabel}>
          {issue.id}
          {isCurrent
            ? <Icon
                icon="asterisk"
                htmlTitle="This issue is published next"
                intent="primary" />
            : undefined}
        </H3>
        <div className={styles.publicationStatus}>
          {status}
        </div>
      </header>

      <div className={styles.scheduleInfo}>
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
      </div>

    </SimpleEditableCard>
  );
};
