import * as moment from 'moment';

import React from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { NonIdealState, H5, Icon, IconName, Text } from '@blueprintjs/core';
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
  const nextIssueId = currentIssueId ? (currentIssueId + 1) : undefined;

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
                  isNext={nextIssueId === issue.id}
                  onEditClick={() => openWindow('issue-editor', { issueId: issue.id })}
                />
              </CSSTransition>)}
          </TransitionGroup>
        : <NonIdealState icon="zoom-out" title="No OB editions found" />}
    </div>
  );
};


interface DateStatusProps {
  date: Date,
  text: string,
  icon: IconName,
  dateClass?: string,
  className?: string,
}
const DateStatus: React.FC<DateStatusProps> = function ({ icon, className, dateClass, date, text }) {
  const ICON_SIZE = 16;
  return <div className={className}>
    <Text>{text}</Text> <DateStamp date={date} /><Icon iconSize={ICON_SIZE} icon={icon} className={dateClass} />
  </div>;
};


interface IssueScheduleCardProps {
  issue: ScheduledIssue,
  isCurrent: boolean,
  isNext: boolean,
  onEditClick: () => void,
}
const IssueScheduleCard: React.FC<IssueScheduleCardProps> = function ({ issue, onEditClick, isCurrent, isNext }) {
  const isPast = moment(issue.publication_date).isBefore(moment());

  let bigIcon: JSX.Element | undefined;
  if (isCurrent) {
    bigIcon = <Icon icon="play" htmlTitle="Publication in progress" intent="primary" />;
  } else if (isNext) {
    bigIcon = <Icon icon="fast-forward" htmlTitle="Planned next" intent="primary" />;
  }

  let status: JSX.Element;
  if (isPast) {
    status = <>
      <DateStatus
        dateClass={styles.cutDateLabel}
        icon="tick-circle"
        date={issue.cutoff_date}
        text="Information received by" />
      <DateStatus
        dateClass={styles.pubDateLabel}
        icon="tick-circle"
        date={issue.publication_date}
        text="Published on" />
    </>;
  } else if (isCurrent) {
    status = <>
      <DateStatus
        dateClass={styles.cutDateLabel}
        icon="tick-circle"
        date={issue.cutoff_date}
        text="Information received by" />
      <DateStatus
        dateClass={styles.pubDateLabel}
        className={styles.publicationStatusPrimary}
        icon="take-action"
        date={issue.publication_date}
        text="Preparing to publish on" />
    </>;
  } else if (isNext) {
    // const daysUntilFreeze = moment(issue.cutoff_date).diff(moment(), 'days');
    // const isTomorrow = daysUntilFreeze < 1;
    status = <>
      <DateStatus
        dateClass={styles.cutDateLabel}
        className={styles.publicationStatusPrimary}
        icon="inbox"
        date={issue.cutoff_date}
        text="Collecting information until" />
      <DateStatus
        dateClass={styles.pubDateLabel}
        icon="calendar"
        date={issue.publication_date}
        text="Planned publication on" />
    </>;
  } else {
    // const daysUntilFreeze = moment(issue.cutoff_date).diff(moment(), 'days');
    // const isTomorrow = daysUntilFreeze < 1;
    status = <>
      <DateStatus
        dateClass={styles.cutDateLabel}
        icon="calendar"
        date={issue.cutoff_date}
        text="Collecting information until" />
      <DateStatus
        dateClass={styles.pubDateLabel}
        icon="calendar"
        date={issue.publication_date}
        text="Planned publication on" />
    </>;
  }

  return (
    <SimpleEditableCard
        extended={true}
        contentsClassName={styles.issueCardContents}
        className={styles.issueCard}
        onClick={onEditClick}>

      <header className={styles.issueInfo}>
        <H5 className={styles.headerLabel}>{issue.id} {bigIcon}</H5>
      </header>

      <div className={styles.scheduleInfo}>
        <div className={styles.publicationStatus}>
          {status}
        </div>
      </div>

    </SimpleEditableCard>
  );
};
