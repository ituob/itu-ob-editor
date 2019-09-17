import * as moment from 'moment';

import React, { useEffect, useState } from 'react';
import { Button, InputGroup, FormGroup } from '@blueprintjs/core';
import { DatePicker } from '@blueprintjs/datetime';

import { PaneHeader } from 'sse/renderer/widgets';
import { apiRequest } from 'sse/api/renderer';

import { DateStamp } from 'renderer/widgets/dates';
import { ScheduledIssue } from 'models/issues';

import * as styles from './styles.scss';


interface IssueDraft {
  id: string,
  publication_date?: Date,
  cutoff_date?: Date,
};


export const IssueScheduler: React.FC<{}> = function () {
  const [schedule, updateSchedule] = useState([] as ScheduledIssue[]);
  const [date, selectDate] = useState(null as Date | null);
  const [hoveredDate, hoverDate] = useState(null as Date | null);
  const [newIssueDraft, updateNewIssueDraft] = useState(null as IssueDraft | null);
  const [daySchedule, updateDaySchedule] = useState(null as ScheduledIssue | null);
  const [minDate, setMinDate] = useState(undefined as Date | undefined);
  const [maxDate, setMaxDate] = useState(undefined as Date | undefined);

  async function fetchSchedule() {
    const scheduledIssues = await apiRequest<ScheduledIssue[]>('ob-schedule');
    console.debug("Fetched schedule!");
    updateSchedule(scheduledIssues);
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
        updateNewIssueDraft({ id: '', cutoff_date: definitelyDate });
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

  function saveNewSchedule() {
    console.debug("Storing draft!", newIssueDraft);
    fetchSchedule();
    updateNewIssueDraft(null);
  }

  function isDisabledDay(date: Date): boolean {
    if (newIssueDraft !== null) {
      if (!newIssueDraft.cutoff_date) {
        return (
          getDaySchedule(date, schedule) !== null ||
          getDaySchedule(moment(date).subtract(1, 'days').toDate(), schedule) !== null);
      } else {
        return getDaySchedule(date, schedule) !== null;
      }
    } else {
      return false;
    }
  }

  return (
    <div className={styles.issueScheduler}>
      <PaneHeader align="right">OB schedule</PaneHeader>
      <div className={styles.paneBody}>

        <DatePicker
          modifiers={{
            isPublicationDate: (date) => getIssueWithPublication(date, schedule) !== null,
            isCutoffDate: (date) => getIssueWithCutoff(date, schedule) !== null,
            isNewPublicationDate: (date) => (
              (newIssueDraft || {id: ''} as IssueDraft).publication_date
              ? moment((newIssueDraft as IssueDraft).publication_date).isSame(date, 'day') : false),
            isNewCutoffDate: (date) => (
              (newIssueDraft || {id: ''} as IssueDraft).cutoff_date
              ? moment((newIssueDraft as IssueDraft).cutoff_date).isSame(date, 'day') : false),
          }}
          dayPickerProps={{
            onDayMouseEnter: (date) => hoverDate(date),
            onDayMouseLeave: () => hoverDate(null),
            disabledDays: isDisabledDay,
            showOutsideDays: false,
          }}
          minDate={minDate}
          maxDate={maxDate}
          value={date || undefined}
          onChange={(date, isUserChange) => isUserChange ? selectDate(date) : void 0}
        />

        {!newIssueDraft && hoveredDate
          ? <div className={styles.daySchedule}>
              <span className={styles.dayScheduleHeader}><DateStamp date={hoveredDate as Date} /></span>

              {!daySchedule && !newIssueDraft
                ? <p>Click to schedule <strong>new edition cutoff</strong> on this day.</p>
                : ''}

              {daySchedule && !newIssueDraft
                ? <p>Edition <strong>no. {daySchedule.id}</strong> is scheduled on this day.</p>
                : ''}
            </div>
          : ''}

        {newIssueDraft
          ? <ScheduleForm
              draft={newIssueDraft as IssueDraft}
              onChange={updateNewIssueDraft}
              onSave={saveNewSchedule}
              onCancel={() => { updateNewIssueDraft(null); selectDate(null); }}
            />
          : ''}
      </div>
    </div>
  );
};


interface ScheduleFormProps {
  draft: IssueDraft,
  maxId?: number,
  minId?: number,
  onChange: (draft: IssueDraft | null) => void,
  onSave: () => void,
  onCancel: () => void,
}
const ScheduleForm: React.FC<ScheduleFormProps> = function ({ draft, maxId, minId, onChange, onSave, onCancel }) {
  function validateId(val: string): string[] {
    const maybeNumId = parseInt(val, 10);
    if (isNaN(maybeNumId)) {
      return ['a number'];
    }

    const numId = maybeNumId as number;
    var requirements: string[] = [];

    if (numId < (minId || 0)) {
      requirements.push(`larger than ${minId || 'zero'}`);
    }
    if (numId > (maxId || Number.MAX_SAFE_INTEGER)) {
      requirements.push(`smaller than ${maxId || 'infinity'}`);
    }
    return requirements;
  }

  const idRequirements = validateId(draft.id);

  return (
    <div className={styles.scheduleForm}>
      <FormGroup
          label="Schedule new edition"
          labelFor="issue-id"
          intent={idRequirements.length > 0 ? 'danger' : undefined}
          helperText={idRequirements.length > 0
            ? `Should be ${idRequirements.join(', ')}`
            : undefined}>
        <InputGroup
          type="text"
          id="issue-id"
          placeholder="Edition no., e.g., 1234"
          value={draft.id}
          intent={idRequirements.length > 0 ? 'danger' : undefined}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            onChange({ ...draft, id: (evt.target as HTMLInputElement).value as string });
          }}
        />
      </FormGroup>

      <p className={styles.scheduleFormCutoffDate}>
        <span>Cutoff:</span>
        <span>
          {draft.cutoff_date !== undefined
            ? <DateStamp date={draft.cutoff_date} />
            : <>Click day to set</>}
        </span>
        <Button
          small={true}
          minimal={true}
          onClick={() => onChange({ ...draft, cutoff_date: undefined })}
          icon={draft.cutoff_date !== undefined ? 'edit' : 'blank'} />
      </p>

      <p className={styles.scheduleFormPublicationDate}>
        <span>Publication:</span>
        <span>
          {draft.publication_date !== undefined
            ? <DateStamp date={draft.publication_date} />
            : <>Click day to set</>}
        </span>
        <Button
          small={true}
          minimal={true}
          onClick={() => onChange({ ...draft, publication_date: undefined })}
          icon={draft.publication_date !== undefined ? 'edit' : 'blank'} />
      </p>

      <div className={styles.scheduleFormActions}>
        {draft.id !== '' && draft.publication_date !== undefined && draft.cutoff_date !== undefined
          ? <Button intent="primary" onClick={onSave} title="Save new issue schedule">Save</Button>
          : ''}

        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}


function getDaySchedule(forDate: Date, issues: ScheduledIssue[]): ScheduledIssue | null {
  return getIssueWithPublication(forDate, issues) || getIssueWithCutoff(forDate, issues);
}

function getIssueWithPublication(onDate: Date, issues: ScheduledIssue[]): ScheduledIssue | null {
  return issues.find(i => moment(i.publication_date).isSame(onDate, 'day')) || null;
}

function getIssueWithCutoff(onDate: Date, issues: ScheduledIssue[]): ScheduledIssue | null {
  return issues.find(i => moment(i.cutoff_date).isSame(onDate, 'day')) || null;
}
