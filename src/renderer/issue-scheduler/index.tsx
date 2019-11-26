import * as moment from 'moment';

import { ipcRenderer } from 'electron';

import React, { useEffect, useState } from 'react';
import { Icon } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';

import { Index } from 'sse/storage/query';
import { PaneHeader } from 'sse/renderer/widgets';
import { request } from 'sse/api/renderer';
import { notifyAllWindows } from 'sse/main/window';

import { DateStamp } from 'renderer/widgets/dates';
import { HelpButton } from 'renderer/widgets/help-button';
import { WindowToaster } from 'renderer/toaster';
import { ScheduledIssue } from 'models/issues';

import { IssueDraft, ScheduleForm } from './schedule-form';
import { UpcomingIssues } from './upcoming';

import * as styles from './styles.scss';


const DEFAULT_MAX_DATE: Date = moment().add(1, 'years').toDate();


export const IssueScheduler: React.FC<{}> = function () {
  const [schedule, updateSchedule] = useState([] as ScheduledIssue[]);
  const [issueIndex, updateIssueIndex] = useState({} as Index<ScheduledIssue>);
  const [currentIssue, setCurrentIssue] = useState({ id: null } as { id: number | null });
  const [date, selectDate] = useState(new Date());
  const [month, selectMonth] = useState(new Date());
  const [hoveredDate, hoverDate] = useState(null as Date | null);
  const [newIssueDraft, updateNewIssueDraft] = useState(null as IssueDraft | null);
  const [daySchedule, updateDaySchedule] = useState(null as ScheduledIssue | null);
  const [minDate, setMinDate] = useState(undefined as Date | undefined);
  const [maxDate, setMaxDate] = useState(DEFAULT_MAX_DATE);
  const [userIsEditing, setUserIsEditing] = useState(true);
  const [schedulingInProgress, setSchedulingInProgress] = useState(false);

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
    fetchCurrentIssue();
    fetchSchedule();

    ipcRenderer.once('app-loaded', fetchCurrentIssue);
    ipcRenderer.once('app-loaded', fetchSchedule);
    ipcRenderer.on('issues-updated', fetchCurrentIssue);
    ipcRenderer.on('issues-updated', fetchSchedule);
    return function cleanup() {
      ipcRenderer.removeListener('app-loaded', fetchCurrentIssue);
      ipcRenderer.removeListener('app-loaded', fetchSchedule);
      ipcRenderer.removeListener('issues-updated', fetchCurrentIssue);
      ipcRenderer.removeListener('issues-updated', fetchSchedule);
    };
  }, []);

  useEffect(() => {
    setUserIsEditing(false);
    fetchSchedule();
  }, [month]);

  useEffect(() => {
    if (newIssueDraft !== null) {
      const draft = newIssueDraft as IssueDraft;
      setMaxDate(draft.publication_date || DEFAULT_MAX_DATE);
      setMinDate(draft.cutoff_date);
    } else {
      setMaxDate(DEFAULT_MAX_DATE);
      setMinDate(undefined);
    }
  }, [newIssueDraft]);

  useEffect(() => {
    if (hoveredDate !== null && newIssueDraft === null) {
      updateDaySchedule(getDaySchedule(hoveredDate as Date, schedule));
    }
  }, [hoveredDate]);


  /* Storage API utilities */

  async function fetchSchedule() {
    const scheduledIssues = await request<Index<ScheduledIssue>>('ob-schedule', { month });
    updateSchedule(Object.values(scheduledIssues));
    updateIssueIndex(scheduledIssues);
    setUserIsEditing(true);
  }

  async function fetchCurrentIssue() {
    console.debug('oi', 'fetching');
    const currentIssue = await request<{ id: number | null }>('current-issue-id');
    //setLoading(false);
    setCurrentIssue(currentIssue);
  }

  async function saveNewSchedule() {
    if (newIssueDraft && newIssueDraft.publication_date && newIssueDraft.cutoff_date) {
      setSchedulingInProgress(true);

      const draft = newIssueDraft as ScheduledIssue;
      try {
        await request<{ success: boolean }>('ob-schedule-add', { newData: draft });
      } catch (e) {
        for (const msg of e.errorMessageList) {
          WindowToaster.show({
            message: msg,
            intent: 'warning',
            icon: 'warning-sign',
          });
        }
        setSchedulingInProgress(false);
        return;
      }
      setSchedulingInProgress(false);
      updateNewIssueDraft(null);

      await notifyAllWindows('issues-changed');
      await fetchSchedule();
    }
  }

  return (
    <div className={styles.issueScheduler}>
      <div className={styles.issueListPane}>
        <UpcomingIssues
          issues={issueIndex}
          userIsEditing={userIsEditing}
          currentIssueId={currentIssue.id || undefined} />
      </div>

      <div className={styles.calendarPane}>
        <PaneHeader align="left" major={true} actions={<HelpButton path="schedule/" />}>
          {newIssueDraft ? "New edition" : "Schedule"}
        </PaneHeader>

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

          {!newIssueDraft && hoveredDate
            ? <div className={styles.hint}>
                <p>
                  <Icon icon="edit" />
                  &nbsp;
                  {newIssueDraft
                    ? <>Click to&nbsp;schedule the</>
                    : <>Click to&nbsp;schedule a&nbsp;new&nbsp;edition with</>}&nbsp;<strong className={styles.cutDateLabel}>cutoff&nbsp;date</strong> on&nbsp;<DateStamp date={hoveredDate as Date} />.
                </p>

                {daySchedule
                  ? <p>
                      <Icon icon="info-sign" />
                      &nbsp;
                      Something is&nbsp;already scheduled on&nbsp;this&nbsp;day.
                    </p>
                  : null}
              </div>
            : null}

            {!newIssueDraft && !hoveredDate && !newIssueDraft
              ? <div className={styles.hint}>
                  <p>
                    <Icon icon="info-sign" />
                    &nbsp;
                    Select a&nbsp;month to&nbsp;view&nbsp;OB&nbsp;schedule for&nbsp;that&nbsp;time&nbsp;period.
                  </p>
                </div>
              : null}

            {newIssueDraft
              ? <ScheduleForm
                  busy={schedulingInProgress}
                  draft={newIssueDraft as IssueDraft}
                  onChange={updateNewIssueDraft}
                  onSave={saveNewSchedule}
                  onCancel={() => { updateNewIssueDraft(null) }}
                />
              : null}
        </div>
      </div>
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
