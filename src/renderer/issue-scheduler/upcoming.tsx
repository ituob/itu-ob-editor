import * as moment from 'moment';
import { remote } from 'electron';

import React from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { NonIdealState, H5, Icon, IconName, Text, Button } from '@blueprintjs/core';
import { Index, QuerySet } from 'coulomb/db/query';
import { SimpleEditableCard } from 'coulomb/renderer/widgets/editable-card-list';
import { DateStamp } from 'renderer/widgets/dates';
import { ScheduledIssue } from 'models/issues';
import { app } from 'renderer/index';
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
    <>
      {existingIssues.length > 0
        ? <div className={styles.upcomingIssues}>
            <TransitionGroup
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
                    onEditClick={() =>
                      app.openObjectEditor('issues', issue.id)
                    }
                  />
                </CSSTransition>)}
            </TransitionGroup>
          </div>
        : <NonIdealState icon="zoom-out" title="No OB editions found" />}
    </>
  );
};


interface DateStatusProps {
  date: Date,
  text: JSX.Element | string,
  icon: IconName,
  dateClass?: string,
  className?: string,
}
const DateStatus: React.FC<DateStatusProps> = function ({ icon, className, dateClass, date, text }) {
  const ICON_SIZE = 16;
  return <div className={className}>
    <Icon iconSize={ICON_SIZE} icon={icon} className={dateClass} /><Text>{text}</Text> {date ? <DateStamp date={date} /> : '(no date)'}
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
        icon="folder-close"
        date={issue.cutoff_date}
        text="Information received by" />
      <DateStatus
        dateClass={styles.pubDateLabel}
        icon="folder-shared"
        date={issue.publication_date}
        text={<>Published (<IssueWebLinks issueId={issue.id} pubDate={issue.publication_date} />) on</>} />
            
    </>;
  } else if (isCurrent) {
    status = <>
      <DateStatus
        dateClass={styles.cutDateLabel}
        icon="folder-close"
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
        icon="folder-open"
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
        className={`${styles.issueCard} {isCurrent? styles.issueCardCurrent : ''}`}>

      <header className={styles.issueInfo}>
        <div className={styles.headerLabel}>
          <H5>{issue.id} {bigIcon}</H5>
        </div>

        <div className={styles.scheduleInfo}>
          <div className={styles.publicationStatus}>
            {status}
          </div>
        </div>
      </header>

      <footer className={styles.actions}>
        {isCurrent
          ? <Button fill={true} onClick={onEditClick} intent="primary">Edit</Button>
          : <Button fill={true} onClick={onEditClick}>Open</Button>}
      </footer>

    </SimpleEditableCard>
  );
};


const IssueWebLinks: React.FC<{ issueId: number, pubDate: Date }> = function ({ issueId, pubDate }) {
  const ituUrl = `https://www.itu.int/pub/T-SP-OB.${issueId}-${pubDate.getFullYear()}`;
  const ituObUrl = `https://www.ituob.org/issues/${issueId}-en/`;

  return <span title="Edition is expected to be viewable online here. Newly added editions may take some time to appear online.">
    <a onClick={() => remote.shell.openExternal(ituUrl)}>itu.int</a>, <a onClick={() => remote.shell.openExternal(ituObUrl)}>ituob.org</a>
  </span>
};
