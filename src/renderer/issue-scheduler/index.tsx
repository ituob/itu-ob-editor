import * as moment from 'moment';

import { ipcRenderer } from 'electron';

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
  const [date, selectDate] = useState(new Date());
  const [month, selectMonth] = useState(new Date());
  const [hoveredDate, hoverDate] = useState(null as Date | null);
  const [newIssueDraft, updateNewIssueDraft] = useState(null as IssueDraft | null);
  const [daySchedule, updateDaySchedule] = useState(null as ScheduledIssue | null);
  const [minDate, setMinDate] = useState(undefined as Date | undefined);
  const [maxDate, setMaxDate] = useState(undefined as Date | undefined);
  const [userIsEditing, setUserIsEditing] = useState(true);

  async function fetchSchedule(month: Date) {
    const scheduledIssues = await apiRequest<Index<ScheduledIssue>>(
      'ob-schedule',
      JSON.stringify({ month }));
    updateSchedule(Object.values(scheduledIssues));
    updateIssueIndex(scheduledIssues);
    setTimeout(() => { setUserIsEditing(true) }, 1000);
  }

  function startOrUpdateDraft(withDate: Date) {
    if (newIssueDraft !== null) {
      // We are in the process of scheduling new issue
      const draft = newIssueDraft as IssueDraft;

      if (!draft.cutoff_date) {
        updateNewIssueDraft({ ...newIssueDraft, cutoff_date: withDate });
      } else if (!draft.publication_date) {
        updateNewIssueDraft({ ...newIssueDraft, publication_date: withDate });
      }
    } else {
      updateNewIssueDraft({ id: undefined, cutoff_date: withDate });
    }
  }

  useEffect(() => {
    setUserIsEditing(false);
    fetchSchedule(month);
  }, [month]);

  useEffect(() => {
    if (newIssueDraft !== null) {
      const draft = newIssueDraft as IssueDraft;
      setMaxDate(draft.publication_date);
      setMinDate(draft.cutoff_date);
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
      await apiRequest<void>('ob-schedule-add',
        JSON.stringify({ issueId: `${draft.id}` }),
        JSON.stringify({ newData: draft }));
      updateNewIssueDraft(null);
      await ipcRenderer.send('scheduled-new-issue', {});
      await fetchSchedule(month);
    }
  }

  return (
    <div className={styles.issueScheduler}>
      <div className={styles.calendarPane}>
        <PaneHeader align="right">OB calendar</PaneHeader>
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
            value={date}
            onChange={(newDate, isUserChange) => {
              if (isUserChange) { startOrUpdateDraft(newDate || date); }
              if (newDate !== null) { selectDate(newDate); }
              if (!moment(newDate).isSame(date, 'month')) { selectMonth(newDate); }
            }}
          />

          {hoveredDate
            ? <div className={styles.daySchedule}>
                {!newIssueDraft || !newIssueDraft.cutoff_date
                  ? <p>
                      <Icon icon="edit" />
                      &nbsp;
                      {newIssueDraft
                        ? <>Click to&nbsp;schedule the</>
                        : <>Click to&nbsp;schedule an&nbsp;edition with</>}&nbsp;<strong className={styles.cutDateLabel}>cutoff&nbsp;date</strong> on&nbsp;<DateStamp date={hoveredDate as Date} />.
                    </p>
                  : ''}

                {newIssueDraft && !newIssueDraft.publication_date && moment(hoveredDate).isAfter(minDate)
                  ? <p>
                      <Icon icon="edit" />
                      &nbsp;
                      Click to&nbsp;schedule
                      the&nbsp;<strong className={styles.pubDateLabel}>publication&nbsp;date</strong> on&nbsp;<DateStamp date={hoveredDate as Date} />.
                    </p>
                  : ''}

                {newIssueDraft && newIssueDraft.publication_date && newIssueDraft.cutoff_date
                  ? <p>
                      <Icon icon="arrow-right" />
                      &nbsp;
                      Fill&nbsp; edition details and&nbsp;save the&nbsp;new&nbsp;schedule.
                    </p>
                  : ''}

                {daySchedule && !newIssueDraft
                  ? <p>
                      <Icon icon="info-sign" />
                      &nbsp;
                      Something is already scheduled on this day.
                    </p>
                  : ''}
              </div>
            : ''}

            {!hoveredDate && newIssueDraft && newIssueDraft.publication_date && newIssueDraft.cutoff_date
              ? <div className={styles.daySchedule}>
                  <p>
                    <Icon icon="arrow-right" />
                    &nbsp;
                    Fill&nbsp; edition details and&nbsp;save the&nbsp;new&nbsp;schedule.
                  </p>
                </div>
              : ''}
        </div>
      </div>

      {newIssueDraft
        ? <div className={styles.selectedDayPane}>
            <PaneHeader align="left">Schedule edition</PaneHeader>

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
            <PaneHeader align="left">Editions</PaneHeader>

            <div className={styles.paneBody}>
              <UpcomingIssues issues={issueIndex} userIsEditing={userIsEditing} />
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
