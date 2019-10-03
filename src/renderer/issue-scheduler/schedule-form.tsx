import React from 'react';
import { Button, ButtonGroup, InputGroup, FormGroup } from '@blueprintjs/core';

import { DateStamp } from 'renderer/widgets/dates';
import * as styles from './styles.scss';


export interface IssueDraft {
  id?: number,
  publication_date?: Date,
  cutoff_date?: Date,
}


interface ScheduleFormProps {
  draft: IssueDraft,
  maxId?: number,
  minId?: number,
  onChange: (draft: IssueDraft | null) => void,
  onSave: () => void,
  onCancel: () => void,
}
export const ScheduleForm: React.FC<ScheduleFormProps> = function ({ draft, maxId, minId, onChange, onSave, onCancel }) {
  function validateId(val: number | undefined): string[] {
    if (!val) {
      return ['a number'];
    }

    const numId = val as number;

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
  const idRequirementsText = idRequirements.length > 0
    ? `Should be ${idRequirements.join(', ')}.`
    : undefined;
  const rescheduleNote = draft.id
    ? `Note: if edition ${draft.id} already exists, it will be rescheduled.`
    : undefined;

  return (
    <div className={styles.scheduleForm}>
      <FormGroup
          label="New edition no.:"
          labelFor="issue-id"
          intent={idRequirements.length > 0 ? 'danger' : undefined}
          helperText={idRequirementsText || rescheduleNote}>
        <InputGroup
          type="number"
          id="issue-id"
          placeholder="E.g., 1234"
          value={draft.id ? draft.id.toString() : ''}
          intent={idRequirements.length > 0 ? 'danger' : undefined}
          onChange={(evt: React.FormEvent<HTMLElement>) => {
            onChange({ ...draft, id: parseInt((evt.target as HTMLInputElement).value, 10) });
          }}
        />
      </FormGroup>

      <p className={styles.scheduleFormCutoffDate}>
        <strong>Cutoff:</strong>
        <span>
          {draft.cutoff_date !== undefined
            ? <DateStamp date={draft.cutoff_date} />
            : <>Click on a day to set</>}
        </span>
        <Button
          small={true}
          minimal={true}
          className={styles.editDateButton}
          onClick={() => onChange({ ...draft, cutoff_date: undefined })}
          disabled={draft.cutoff_date === undefined}
          icon={draft.cutoff_date !== undefined ? 'edit' : 'arrow-left'} />
      </p>

      <p className={styles.scheduleFormPublicationDate}>
        <strong>Publication:</strong>
        <span>
          {draft.publication_date !== undefined
            ? <DateStamp date={draft.publication_date} />
            : <>Click on a day to set</>}
        </span>
        <Button
          small={true}
          minimal={true}
          className={styles.editDateButton}
          onClick={() => onChange({ ...draft, publication_date: undefined })}
          disabled={draft.publication_date === undefined}
          icon={draft.publication_date !== undefined ? 'edit' : 'arrow-left'} />
      </p>

      <div className={styles.scheduleFormActions}>
        <ButtonGroup fill={true}>
          <Button
            intent="primary"
            icon="add"
            disabled={idRequirements.length > 0 || draft.publication_date === undefined || draft.cutoff_date === undefined}
            onClick={onSave}
            title="Save new issue schedule">Save</Button>
          <Button icon="undo" onClick={onCancel}>Cancel</Button>
        </ButtonGroup>
      </div>
    </div>
  );
};
