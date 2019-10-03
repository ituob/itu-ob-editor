import * as moment from 'moment';

import React, { useEffect, useState } from 'react';
import { Icon } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';

import { Index } from 'sse/storage/query';
import { PaneHeader } from 'sse/renderer/widgets';
import { apiRequest } from 'sse/api/renderer';

import { DateStamp } from 'renderer/widgets/dates';
import { ScheduledIssue } from 'models/issues';

import { IssueDraft, ScheduleForm } from './schedule-form';
import { UpcomingIssues } from './upcoming';

import * as styles from './styles.scss';


export const IssueScheduler: React.FC<{}> = function () {
  const [schedule, updateSchedule] = useState([] as ScheduledIssue[]);
  const [issueIndex, updateIssueIndex] = useState({} as Index<ScheduledIssue>);
  const [date, selectDate] = useState(null as Date | null);
  const [hoveredDate, hoverDate] = useState(null as Date | null);
  const [newIssueDraft, updateNewIssueDraft] = useState(null as IssueDraft | null);
  const [daySchedule, updateDaySchedule] = useState(null as ScheduledIssue | null);
  const [minDate, setMinDate] = useState(undefined as Date | undefined);
  const [maxDate, setMaxDate] = useState(undefined as Date | undefined);

  async function fetchSchedule() {
    const scheduledIssues = await apiRequest<Index<ScheduledIssue>>('ob-schedule');
    updateSchedule(Object.values(scheduledIssues));
    updateIssueIndex(scheduledIssues);
  }

  useEffect(() => { fetchSchedule() }, []);

  useEffect(() => {
    if (date !== null) {
      const definitelyDate = date as Date;

      if (newIssueDraft !== null) {
        // We are in the process of scheduling new issue
        const draft = newIssueDraft as IssueDraft;

        if (!draft.cutoff_date) {
          updateNewIssueDraft({ ...newIssueDraft, cutoff_date: definitelyDate });
        } else if (!draft.publication_date) {
          updateNewIssueDraft({ ...newIssueDraft, publication_date: definitelyDate });
        }
      } else {
        updateNewIssueDraft({ id: undefined, cutoff_date: definitelyDate });
      }
      selectDate(null);
    }
  }, [date]);

  useEffect(() => {
    if (newIssueDraft !== null) {
      const draft = newIssueDraft as IssueDraft;
      setMaxDate(draft.publication_date ? moment(draft.publication_date).subtract(1, 'days').toDate() : undefined);
      setMinDate(draft.cutoff_date ? moment(draft.cutoff_date).add(1, 'days').toDate() : undefined);
    } else {
      setMaxDate(undefined);
      setMinDate(undefined);
    }
  }, [newIssueDraft]);

  useEffect(() => {
    if (hoveredDate !== null && newIssueDraft === null) {
      updateDaySchedule(getDaySchedule(hoveredDate as Date, schedule));
    }
  }, [hoveredDate]);

  async function saveNewSchedule() {
    if (newIssueDraft && newIssueDraft.publication_date && newIssueDraft.cutoff_date) {
      const draft = newIssueDraft as ScheduledIssue;
      await apiRequest<void>('ob-schedule-add', JSON.stringify(draft));
      updateNewIssueDraft(null);
      await fetchSchedule();
    }
  }

  return (
    <div className={styles.issueScheduler}>
      <div className={styles.calendarPane}>
        <PaneHeader align="right">OB schedule</PaneHeader>
        <div className={styles.paneBody}>
          <DatePicker
            modifiers={{
              isPublicationDate: (date) => getIssueWithPublication(date, schedule) !== null,
              isCutoffDate: (date) => getIssueWithCutoff(date, schedule) !== null,
              isNewPublicationDate: (date) => (
                (newIssueDraft || {} as IssueDraft).publication_date
                ? moment((newIssueDraft as IssueDraft).publication_date).isSame(date, 'day') : false),
              isNewCutoffDate: (date) => (
                (newIssueDraft || {} as IssueDraft).cutoff_date
                ? moment((newIssueDraft as IssueDraft).cutoff_date).isSame(date, 'day') : false),
            }}
            dayPickerProps={{
              onDayMouseEnter: (date) => hoverDate(date),
              onDayMouseLeave: () => hoverDate(null),
              showOutsideDays: false,
            }}
            minDate={minDate}
            maxDate={maxDate}
            value={date || undefined}
            onChange={(date, isUserChange) => isUserChange ? selectDate(date) : void 0}
          />

          {hoveredDate
            ? <div className={styles.daySchedule}>
                {daySchedule && !newIssueDraft
                  ? <p>
                      <Icon icon="info-sign" />
                      &nbsp;
                      Edition <strong>no. {daySchedule.id}</strong> is scheduled 
                      {moment(daySchedule.publication_date).isSame(hoveredDate, 'day')
                        ? ' to be published '
                        : ' for cutoff '}
                      on this day.
                    </p>
                  : ''}

                {!newIssueDraft
                  ? <p>Click to schedule <strong>new edition cutoff</strong> on this day.</p>
                  : ''}

                {newIssueDraft && !newIssueDraft.publication_date
                  ? <p>Click to schedule <strong>publication date</strong> on this day.</p>
                  : ''}

                <span className={styles.dayScheduleHeader}><DateStamp date={hoveredDate as Date} /></span>
              </div>
            : ''}
        </div>
      </div>

      {newIssueDraft
        ? <div className={styles.selectedDayPane}>
            <PaneHeader align="left">Schedule new edition</PaneHeader>

            <div className={styles.paneBody}>
              <ScheduleForm
                draft={newIssueDraft as IssueDraft}
                onChange={updateNewIssueDraft}
                onSave={saveNewSchedule}
                onCancel={() => { updateNewIssueDraft(null) }}
              />
            </div>
          </div>
        : <div className={styles.upcomingIssuesPane}>
            <PaneHeader align="left">Upcoming issues</PaneHeader>

            <div className={styles.paneBody}>
              <UpcomingIssues issues={issueIndex} />
            </div>
          </div>
      }
    </div>
  );
};


function getDaySchedule(forDate: Date, issues: ScheduledIssue[]): ScheduledIssue | null {
  return getIssueWithPublication(forDate, issues) || getIssueWithCutoff(forDate, issues);
}

function getIssueWithPublication(onDate: Date, issues: ScheduledIssue[]): ScheduledIssue | null {
  return issues.find(i => moment(i.publication_date).isSame(onDate, 'day')) || null;
}

function getIssueWithCutoff(onDate: Date, issues: ScheduledIssue[]): ScheduledIssue | null {
  return issues.find(i => moment(i.cutoff_date).isSame(onDate, 'day')) || null;
}
